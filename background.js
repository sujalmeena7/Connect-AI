// ConnectAI — Background Service Worker
// Handles Claude API calls with timeout, validation, and message shortening

const API_TIMEOUT = 30000; // 30 seconds

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_MESSAGES") {
    handleGenerateMessages(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "VALIDATE_API_KEY") {
    validateApiKey(message.apiKey)
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

// ── Validate API Key ──────────────────────────────────────────────────────────
async function validateApiKey(apiKey) {
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5,
        messages: [{ role: "user", content: "Say OK" }]
      })
    },
    10000
  );

  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 429) throw new Error("RATE_LIMIT");
  if (!response.ok) throw new Error("VALIDATION_FAILED");

  return { valid: true };
}

// ── Generate Messages ─────────────────────────────────────────────────────────
async function handleGenerateMessages(payload) {
  const { apiKey, senderInfo, targetInfo, purpose } = payload;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
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

  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(errData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text || "";

  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      throw new Error("JSON_PARSE_ERROR");
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

  return parsed;
}

// ── Shorten Message ───────────────────────────────────────────────────────────
async function handleShortenMessage(payload) {
  const { apiKey, message, targetLength } = payload;

  if (!apiKey) throw new Error("API_KEY_MISSING");

  const limit = targetLength || 300;

  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `Shorten this LinkedIn connection message to under ${limit} characters. Keep the same tone and intent. Return ONLY the shortened message text, nothing else — no quotes, no labels:\n\n${message}`
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error(errData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const shortened = (data.content?.[0]?.text || "").trim().replace(/^["']|["']$/g, "");

  return { message: shortened, character_count: shortened.length };
}
