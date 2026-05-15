// ConnectAI — Background Service Worker
// Handles Claude/OpenAI/Gemini API calls with timeout, validation, and message shortening

const API_TIMEOUT = 30000; // 30 seconds

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_MESSAGES") {
    handleGenerateMessages(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "VALIDATE_API_KEY") {
    validateApiKey(message)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "SHORTEN_MESSAGE") {
    handleShortenMessage(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// ── Fetch with AbortController timeout ────────────────────────────────────────
async function fetchWithTimeout(url, options, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("REQUEST_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Cache Helpers ─────────────────────────────────────────────────────────────
async function getCache(key) {
  return new Promise(resolve => {
    chrome.storage.local.get(["apiCache"], data => {
      resolve(data.apiCache?.[key]);
    });
  });
}

async function setCache(key, value) {
  return new Promise(resolve => {
    chrome.storage.local.get(["apiCache"], data => {
      const cache = data.apiCache || {};
      cache[key] = { timestamp: Date.now(), data: value };
      chrome.storage.local.set({ apiCache: cache }, resolve);
    });
  });
}

// ── Fetch with Exponential Backoff Retry ──────────────────────────────────────
async function fetchWithRetry(url, options, timeout = API_TIMEOUT, maxRetries = 3) {
  let retries = 0;
  let delay = 1000; // Start with 1s delay

  while (true) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      if (response.status === 429) {
        if (retries >= maxRetries) return response;
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
        delay *= 2;
        continue;
      }
      
      return response;
    } catch (err) {
      if (err.message === "REQUEST_TIMEOUT") {
        if (retries >= maxRetries) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// ── LLM Helper ────────────────────────────────────────────────────────────────
async function callLLM(provider, apiKey, systemPrompt, userMessage, maxTokens = 1000) {
  let url, headers, body;

  if (provider === "claude") {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    };
    body = {
      model: "claude-3-5-sonnet-20240620",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    };
  } else if (provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };
    body = {
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ]
    };
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    headers = {
      "Content-Type": "application/json"
    };
    body = {
      contents: [{ parts: [{ text: `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\nUSER REQUEST:\n${userMessage}` }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };
  } else {
    throw new Error("UNKNOWN_PROVIDER");
  }

  const response = await fetchWithRetry(url, { method: "POST", headers, body: JSON.stringify(body) });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 400 && errData.error?.message?.includes("API key")) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(errData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  let text = "";

  if (provider === "claude") {
    if (data.stop_reason && data.stop_reason !== "end_turn") {
      throw new Error(`Claude stopped prematurely (Reason: ${data.stop_reason})`);
    }
    text = data.content?.[0]?.text || "";
  } else if (provider === "openai") {
    const choice = data.choices?.[0];
    if (choice?.finish_reason && choice.finish_reason !== "stop") {
      throw new Error(`OpenAI stopped prematurely (Reason: ${choice.finish_reason})`);
    }
    text = choice?.message?.content || "";
  } else if (provider === "gemini") {
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      throw new Error(`Gemini stopped prematurely (Reason: ${candidate.finishReason}).`);
    }
    text = candidate?.content?.parts?.map(p => p.text).join("") || "";
  }

  return text;
}

// ── Validate API Key ──────────────────────────────────────────────────────────
async function validateApiKey(payload) {
  const { apiKey, apiProvider } = payload;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const provider = apiProvider || "claude";
  await callLLM(provider, apiKey, "Respond with OK", "Say OK", 5);

  return { valid: true };
}

// ── Generate Messages ─────────────────────────────────────────────────────────
async function handleGenerateMessages(payload) {
  const { apiKey, apiProvider, senderInfo, targetInfo, purpose } = payload;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const provider = apiProvider || "claude";

  // Remove varying fields like scrapedAt for consistent caching
  const targetInfoCache = { ...targetInfo };
  delete targetInfoCache.scrapedAt;
  const cacheKey = JSON.stringify({ type: "generate", provider, senderInfo, targetInfo: targetInfoCache, purpose });
  
  const cached = await getCache(cacheKey);
  // Aggressive caching for 7 days
  if (cached && (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000)) {
    return cached.data;
  }

  const systemPrompt = `You are an expert LinkedIn outreach specialist who writes hyper-personalized, genuine connection request messages that get accepted.

STRICT RULES:
1. Each message MUST be under 300 characters (LinkedIn limit)
2. NEVER use "I came across your profile" — it's overused
3. NEVER be generic or flattering without reason
4. Reference something SPECIFIC about the target person
5. Make the sender sound like a peer, not a fan
6. End with a soft, no-pressure reason to connect
7. No emojis unless context calls for it
8. Sound human — not AI-generated
9. Escape all quotes and newlines inside the JSON string values. NO literal newlines.

OUTPUT FORMAT (strict JSON, nothing else, no markdown, no code blocks):
{
  "messages": [
    {
      "label": "Direct & Professional",
      "message": "...",
      "character_count": 0
    },
    {
      "label": "Shared Interest Angle",
      "message": "...",
      "character_count": 0
    },
    {
      "label": "Casual & Peer-to-peer",
      "message": "...",
      "character_count": 0
    }
  ],
  "tip": "one line advice on which variant to use and why"
}`;

  const userMessage = `Generate LinkedIn connection messages.

SENDER:
Name: ${senderInfo.name || "Not provided"}
Role: ${senderInfo.role || "Not provided"}
College/Company: ${senderInfo.college || "Not provided"}
Purpose: ${purpose}

TARGET PERSON:
Name: ${targetInfo.fullName || "Not available"}
Role: ${targetInfo.currentRole || "Not available"}
Company: ${targetInfo.currentCompany || "Not available"}
Skills: ${targetInfo.skills || "Not available"}
Recent Activity: ${targetInfo.recentActivity || "Not available"}

Remember: Each message must be under 300 characters. Fill in the character_count field accurately.`;

  const rawText = await callLLM(provider, apiKey, systemPrompt, userMessage, 1000);

  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed;
  let parseErrorMsg = "";
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parseErrorMsg = e.message;
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch (e2) {
        throw new Error(`JSON_PARSE_ERROR|[${e2.message}] ${rawText.substring(0, 80)}`);
      }
    } else {
      throw new Error(`JSON_PARSE_ERROR|[${parseErrorMsg}] ${rawText.substring(0, 80)}`);
    }
  }

  if (parsed.messages) {
    parsed.messages = parsed.messages.map((m) => ({
      ...m,
      character_count: m.message ? m.message.length : 0
    }));
  }

  // Increment usage counter
  chrome.storage.local.get(["generationCount"], (data) => {
    const count = (data.generationCount || 0) + 1;
    chrome.storage.local.set({ generationCount: count });
  });

  await setCache(cacheKey, parsed);
  return parsed;
}

// ── Shorten Message ───────────────────────────────────────────────────────────
async function handleShortenMessage(payload) {
  const { apiKey, apiProvider, message, targetLength } = payload;

  if (!apiKey) throw new Error("API_KEY_MISSING");

  const provider = apiProvider || "claude";
  const limit = targetLength || 300;

  const cacheKey = JSON.stringify({ type: "shorten", provider, message, limit });
  const cached = await getCache(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000)) {
    return cached.data;
  }

  const systemPrompt = "You are an expert at concisely summarizing content.";
  const userMessage = `Shorten this LinkedIn connection message to under ${limit} characters. Keep the same tone and intent. Return ONLY the shortened message text, nothing else — no quotes, no labels:\n\n${message}`;

  const rawText = await callLLM(provider, apiKey, systemPrompt, userMessage, 400);
  
  const shortened = rawText.trim().replace(/^["']|["']$/g, "");
  const result = { message: shortened, character_count: shortened.length };
  
  await setCache(cacheKey, result);
  return result;
}
