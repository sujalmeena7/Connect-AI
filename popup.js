// ConnectAI — Popup Logic

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const stateNotLinkedin = document.getElementById("state-not-linkedin");
const stateNoKey = document.getElementById("state-no-key");
const stateMain = document.getElementById("state-main");

const settingsBtn = document.getElementById("settings-btn");
const goSettingsBtn = document.getElementById("go-settings-btn");

const targetAvatar = document.getElementById("target-avatar");
const targetName = document.getElementById("target-name");
const targetRole = document.getElementById("target-role");
const targetCompany = document.getElementById("target-company");
const targetSkillsTag = document.getElementById("target-skills-tag");
const rescrapeBtn = document.getElementById("rescrape-btn");

const displaySenderName = document.getElementById("display-sender-name");
const displaySenderRole = document.getElementById("display-sender-role");
const displaySenderCollege = document.getElementById("display-sender-college");
const editSenderBtn = document.getElementById("edit-sender-btn");
const senderDisplay = document.getElementById("sender-display");
const senderEdit = document.getElementById("sender-edit");
const editName = document.getElementById("edit-name");
const editRole = document.getElementById("edit-role");
const editCollege = document.getElementById("edit-college");
const saveSenderBtn = document.getElementById("save-sender-btn");
const cancelSenderBtn = document.getElementById("cancel-sender-btn");

const pillGroup = document.getElementById("purpose-group");
const customPurposeWrapper = document.getElementById("custom-purpose-wrapper");
const customPurposeInput = document.getElementById("custom-purpose-input");
const generateBtn = document.getElementById("generate-btn");
const generateText = document.getElementById("generate-text");
const generateSpinner = document.getElementById("generate-spinner");

const errorBanner = document.getElementById("error-banner");
const errorMsg = document.getElementById("error-msg");
const retryBtn = document.getElementById("retry-btn");

const skeletonSection = document.getElementById("skeleton-section");
const resultsSection = document.getElementById("results-section");
const messagesContainer = document.getElementById("messages-container");
const tipSection = document.getElementById("tip-section");
const tipText = document.getElementById("tip-text");

const toggleSavedBtn = document.getElementById("toggle-saved-btn");
const savedCountLabel = document.getElementById("saved-count-label");
const savedPanel = document.getElementById("saved-panel");
const savedMessagesContainer = document.getElementById("saved-messages-container");
const savedEmpty = document.getElementById("saved-empty");

const onboardingOverlay = document.getElementById("onboarding-overlay");
const onboardingDismiss = document.getElementById("onboarding-dismiss");

// ── State ─────────────────────────────────────────────────────────────────────
let selectedPurpose = "Internship Referral";
let customPurposeText = "";
let currentProfileData = null;
let currentSenderInfo = {};
let lastResults = null;
let isGenerating = false;
let savedMessages = [];
let showingSaved = false;

// ── Chrome Storage Helpers ────────────────────────────────────────────────────
function chromeStorageGet(area, keys) {
  return new Promise((res) => chrome.storage[area].get(keys, res));
}
function chromeStorageSet(area, data) {
  return new Promise((res) => chrome.storage[area].set(data, res));
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // Check first-run onboarding
  const { hasOnboarded } = await chromeStorageGet("local", ["hasOnboarded"]);
  if (!hasOnboarded) {
    onboardingOverlay.style.display = "flex";
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";

  const isLinkedInProfile =
    url.includes("linkedin.com/in/") && !url.includes("linkedin.com/in/settings");

  if (!isLinkedInProfile) {
    showState("not-linkedin");
    return;
  }

  // Load user settings — API key from storage.local (secure)
  const syncSettings = await chromeStorageGet("sync", [
    "senderName", "senderRole", "senderCollege"
  ]);
  let localSettings = await chromeStorageGet("local", ["apiKey", "apiProvider"]);

  // Migration: move API key from sync → local if needed
  if (!localSettings.apiKey) {
    const oldSync = await chromeStorageGet("sync", ["apiKey"]);
    if (oldSync.apiKey) {
      await chromeStorageSet("local", { apiKey: oldSync.apiKey, apiProvider: "claude" });
      chrome.storage.sync.remove("apiKey");
      localSettings = { apiKey: oldSync.apiKey, apiProvider: "claude" };
    }
  }

  if (!localSettings.apiKey) {
    showState("no-key");
    return;
  }

  currentSenderInfo = {
    name: syncSettings.senderName || "",
    role: syncSettings.senderRole || "",
    college: syncSettings.senderCollege || "",
    apiKey: localSettings.apiKey,
    apiProvider: localSettings.apiProvider || "claude"
  };

  // Load saved messages
  const { savedMessages: saved } = await chromeStorageGet("local", ["savedMessages"]);
  savedMessages = saved || [];
  updateSavedCount();

  // Load profile data
  const stored = await chromeStorageGet("local", ["profileData", "lastResults"]);
  currentProfileData = stored.profileData || null;

  // Validate profile matches current URL
  const cleanUrl = url.split("?")[0];
  if (
    !currentProfileData ||
    !currentProfileData.profileUrl ||
    !currentProfileData.profileUrl.includes(
      cleanUrl.split("/in/")[1]?.split("/")[0] || "__none__"
    )
  ) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      await sleep(1200);
      const fresh = await chromeStorageGet("local", ["profileData"]);
      currentProfileData = fresh.profileData || null;
    } catch (e) {
      console.error("[ConnectAI] Script injection error:", e);
    }
  }

  showState("main");
  renderTargetCard(currentProfileData);
  renderSenderCard(currentSenderInfo);

  // Restore last results if same profile
  if (stored.lastResults && stored.lastResults.profileUrl === cleanUrl) {
    lastResults = stored.lastResults.data;
    renderResults(lastResults);
  }
}

// ── State management ──────────────────────────────────────────────────────────
function showState(state) {
  stateNotLinkedin.style.display = "none";
  stateNoKey.style.display = "none";
  stateMain.style.display = "none";

  if (state === "not-linkedin") stateNotLinkedin.style.display = "flex";
  else if (state === "no-key") stateNoKey.style.display = "flex";
  else if (state === "main") stateMain.style.display = "block";
}

// ── Render functions ──────────────────────────────────────────────────────────
function renderTargetCard(data) {
  if (!data) {
    targetName.textContent = "Could not load profile";
    targetRole.textContent = "Try clicking Refresh";
    targetCompany.textContent = "";
    targetAvatar.textContent = "?";
    return;
  }

  const name = data.fullName !== "Not available" ? data.fullName : "Unknown";
  targetName.textContent = name;
  targetRole.textContent =
    data.currentRole !== "Not available" ? data.currentRole : "";
  targetCompany.textContent =
    data.currentCompany !== "Not available" ? data.currentCompany : "";

  const initial = name.charAt(0).toUpperCase();
  targetAvatar.textContent = initial !== "U" ? initial : "?";

  if (data.skills && data.skills !== "Not available") {
    const topSkill = data.skills.split(",")[0].trim();
    targetSkillsTag.textContent = topSkill;
    targetSkillsTag.style.display = "inline";
  } else {
    targetSkillsTag.style.display = "none";
  }
}

function renderSenderCard(sender) {
  displaySenderName.textContent = sender.name || "Not set";
  displaySenderRole.textContent = sender.role || "Not set";
  displaySenderCollege.textContent = sender.college || "Not set";
}

function renderResults(data) {
  if (!data || !data.messages) return;

  resultsSection.style.display = "block";
  skeletonSection.style.display = "none";
  messagesContainer.innerHTML = "";
  messagesContainer.style.display = "block";

  // Hide saved panel when showing fresh results
  savedPanel.style.display = "none";
  showingSaved = false;
  toggleSavedBtn.classList.remove("active");

  data.messages.forEach((msg, idx) => {
    messagesContainer.appendChild(createMessageCard(msg, idx));
  });

  // Tip
  if (data.tip) {
    tipText.textContent = data.tip;
    tipSection.style.display = "flex";
  }
}

function createMessageCard(msg, idx) {
  const charCount = msg.message ? msg.message.length : 0;
  const isOver = charCount > 300;

  const card = document.createElement("div");
  card.className = "message-card";
  card.dataset.index = idx;

  const isSaved = savedMessages.some((s) => s.message === msg.message);

  let actionsHtml = `
    <div class="message-actions">
      <button class="copy-btn" title="Copy to clipboard">📋 Copy</button>
      <button class="edit-btn" title="Edit message">✏️</button>
      <button class="save-msg-btn ${isSaved ? "saved" : ""}" title="${isSaved ? "Saved" : "Save message"}">
        ${isSaved ? "🔖" : "📌"}
      </button>`;

  if (isOver) {
    actionsHtml += `<button class="shorten-btn" title="AI-shorten to under 300 chars">✂️ Shorten</button>`;
  }

  actionsHtml += `</div>`;

  card.innerHTML = `
    <div class="message-card-header">
      <span class="message-label">${escapeHtml(msg.label)}</span>
      <span class="char-badge ${isOver ? "over" : "ok"}">${charCount}/300</span>
    </div>
    <p class="message-text">${escapeHtml(msg.message)}</p>
    ${actionsHtml}
  `;

  // Store message data on the card
  card._messageData = { ...msg };

  // Attach event handlers
  card.querySelector(".copy-btn").addEventListener("click", () => handleCopy(card));
  card.querySelector(".edit-btn").addEventListener("click", () => handleEdit(card));
  card.querySelector(".save-msg-btn").addEventListener("click", () => handleSaveMessage(card));

  const shortenBtn = card.querySelector(".shorten-btn");
  if (shortenBtn) {
    shortenBtn.addEventListener("click", () => handleShorten(card));
  }

  return card;
}

// ── Copy ──────────────────────────────────────────────────────────────────────
async function handleCopy(card) {
  const message = card._messageData.message;
  const btn = card.querySelector(".copy-btn");

  try {
    await navigator.clipboard.writeText(message);
  } catch (err) {
    const ta = document.createElement("textarea");
    ta.value = message;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  btn.innerHTML = "✅ Copied";
  btn.classList.add("copied");
  setTimeout(() => {
    btn.innerHTML = "📋 Copy";
    btn.classList.remove("copied");
  }, 2000);
}

// ── Inline Edit ───────────────────────────────────────────────────────────────
function handleEdit(card) {
  const textEl = card.querySelector(".message-text");
  const charBadge = card.querySelector(".char-badge");

  if (textEl.tagName === "TEXTAREA") return; // already editing

  const currentText = card._messageData.message;

  const textarea = document.createElement("textarea");
  textarea.className = "message-text-editable";
  textarea.value = currentText;
  textarea.rows = 4;
  textEl.replaceWith(textarea);
  textarea.focus();

  // Live char count
  const updateBadge = () => {
    const len = textarea.value.length;
    charBadge.textContent = `${len}/300`;
    charBadge.className = `char-badge ${len > 300 ? "over" : "ok"}`;

    // Show/hide shorten button dynamically
    let shortenBtn = card.querySelector(".shorten-btn");
    if (len > 300 && !shortenBtn) {
      shortenBtn = document.createElement("button");
      shortenBtn.className = "shorten-btn";
      shortenBtn.title = "AI-shorten to under 300 chars";
      shortenBtn.innerHTML = "✂️ Shorten";
      shortenBtn.addEventListener("click", () => handleShorten(card));
      card.querySelector(".message-actions").appendChild(shortenBtn);
    } else if (len <= 300 && shortenBtn) {
      shortenBtn.remove();
    }
  };

  textarea.addEventListener("input", updateBadge);

  // Save on blur
  textarea.addEventListener("blur", () => {
    const newText = textarea.value.trim();
    card._messageData.message = newText;
    card._messageData.character_count = newText.length;

    const p = document.createElement("p");
    p.className = "message-text";
    p.textContent = newText;
    textarea.replaceWith(p);

    // Update badge
    charBadge.textContent = `${newText.length}/300`;
    charBadge.className = `char-badge ${newText.length > 300 ? "over" : "ok"}`;

    // Update copy button data
    const editBtn = card.querySelector(".edit-btn");
    if (editBtn) editBtn.title = "Edit message";
  });
}

// ── Save/Bookmark Message ─────────────────────────────────────────────────────
async function handleSaveMessage(card) {
  const msg = card._messageData;
  const btn = card.querySelector(".save-msg-btn");
  const existingIndex = savedMessages.findIndex((s) => s.message === msg.message);

  if (existingIndex !== -1) {
    // Unsave
    savedMessages.splice(existingIndex, 1);
    btn.classList.remove("saved");
    btn.innerHTML = "📌";
    btn.title = "Save message";
  } else {
    // Save
    savedMessages.push({
      label: msg.label,
      message: msg.message,
      character_count: msg.message.length,
      savedAt: Date.now(),
      profileName: currentProfileData?.fullName || "Unknown"
    });
    btn.classList.add("saved");
    btn.innerHTML = "🔖";
    btn.title = "Saved";
  }

  await chromeStorageSet("local", { savedMessages });
  updateSavedCount();
}

function updateSavedCount() {
  savedCountLabel.textContent = `Saved (${savedMessages.length})`;
}

function renderSavedPanel() {
  savedMessagesContainer.innerHTML = "";

  if (savedMessages.length === 0) {
    savedEmpty.style.display = "block";
    return;
  }

  savedEmpty.style.display = "none";

  savedMessages.forEach((msg, idx) => {
    const card = document.createElement("div");
    card.className = "saved-msg-card";
    card.innerHTML = `
      <div class="message-card-header">
        <span class="message-label">${escapeHtml(msg.label)}</span>
        <span style="font-size:10px;color:#888">${msg.profileName || ""}</span>
      </div>
      <p class="message-text">${escapeHtml(msg.message)}</p>
      <div class="message-actions">
        <button class="copy-btn" title="Copy">📋 Copy</button>
        <button class="delete-saved-btn" title="Remove">🗑️ Remove</button>
      </div>
    `;

    card.querySelector(".copy-btn").addEventListener("click", async () => {
      const btn = card.querySelector(".copy-btn");
      try { await navigator.clipboard.writeText(msg.message); } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = msg.message;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      btn.innerHTML = "✅ Copied";
      btn.classList.add("copied");
      setTimeout(() => { btn.innerHTML = "📋 Copy"; btn.classList.remove("copied"); }, 2000);
    });

    card.querySelector(".delete-saved-btn").addEventListener("click", async () => {
      savedMessages.splice(idx, 1);
      await chromeStorageSet("local", { savedMessages });
      updateSavedCount();
      renderSavedPanel();
    });

    savedMessagesContainer.appendChild(card);
  });
}

// ── Shorten Message ───────────────────────────────────────────────────────────
async function handleShorten(card) {
  const btn = card.querySelector(".shorten-btn");
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.innerHTML = `<span class="spinner-tiny"></span> Shortening…`;

  try {
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "SHORTEN_MESSAGE",
          payload: {
            apiKey: currentSenderInfo.apiKey,
            apiProvider: currentSenderInfo.apiProvider,
            message: card._messageData.message,
            targetLength: 300
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response.success) resolve(response.data);
          else reject(new Error(response.error));
        }
      );
    });

    // Update the message
    card._messageData.message = result.message;
    card._messageData.character_count = result.character_count;

    const textEl = card.querySelector(".message-text") || card.querySelector(".message-text-editable");
    if (textEl.tagName === "TEXTAREA") {
      textEl.value = result.message;
    } else {
      textEl.textContent = result.message;
    }

    // Update badge
    const charBadge = card.querySelector(".char-badge");
    charBadge.textContent = `${result.character_count}/300`;
    charBadge.className = `char-badge ${result.character_count > 300 ? "over" : "ok"}`;

    // Remove shorten button if now under limit
    if (result.character_count <= 300) {
      btn.remove();
    } else {
      btn.disabled = false;
      btn.innerHTML = "✂️ Shorten";
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = "✂️ Retry";
    showError("Failed to shorten: " + (err.message || "Unknown error"));
  }
}

// ── Event Handlers ────────────────────────────────────────────────────────────

// Settings
settingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
goSettingsBtn?.addEventListener("click", () => chrome.runtime.openOptionsPage());

// Onboarding dismiss
onboardingDismiss.addEventListener("click", async () => {
  onboardingOverlay.style.display = "none";
  await chromeStorageSet("local", { hasOnboarded: true });
});

// Rescrape
rescrapeBtn.addEventListener("click", async () => {
  rescrapeBtn.textContent = "Refreshing…";
  rescrapeBtn.disabled = true;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_NOW" });
    await sleep(1000);
    const stored = await chromeStorageGet("local", ["profileData"]);
    currentProfileData = stored.profileData;
    renderTargetCard(currentProfileData);
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      await sleep(1200);
      const stored = await chromeStorageGet("local", ["profileData"]);
      currentProfileData = stored.profileData;
      renderTargetCard(currentProfileData);
    } catch (err) {
      console.error("[ConnectAI] Rescrape failed:", err);
    }
  }

  rescrapeBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
    Refresh`;
  rescrapeBtn.disabled = false;
});

// Edit sender inline
editSenderBtn.addEventListener("click", () => {
  editName.value = currentSenderInfo.name || "";
  editRole.value = currentSenderInfo.role || "";
  editCollege.value = currentSenderInfo.college || "";
  senderDisplay.style.display = "none";
  senderEdit.style.display = "block";
  editSenderBtn.textContent = "";
});

saveSenderBtn.addEventListener("click", () => {
  const name = editName.value.trim();
  const role = editRole.value.trim();
  const college = editCollege.value.trim();

  currentSenderInfo = { ...currentSenderInfo, name, role, college };
  chrome.storage.sync.set({ senderName: name, senderRole: role, senderCollege: college });

  renderSenderCard(currentSenderInfo);
  senderDisplay.style.display = "block";
  senderEdit.style.display = "none";
  editSenderBtn.textContent = "Edit";
});

cancelSenderBtn.addEventListener("click", () => {
  senderDisplay.style.display = "block";
  senderEdit.style.display = "none";
  editSenderBtn.textContent = "Edit";
});

// Purpose pills (including Custom)
pillGroup.addEventListener("click", (e) => {
  const pill = e.target.closest(".pill");
  if (!pill) return;
  pillGroup.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
  pill.classList.add("active");

  const purpose = pill.dataset.purpose;
  if (purpose === "Custom") {
    customPurposeWrapper.style.display = "block";
    customPurposeInput.focus();
    selectedPurpose = customPurposeInput.value.trim() || "Custom Outreach";
  } else {
    customPurposeWrapper.style.display = "none";
    selectedPurpose = purpose;
  }
});

customPurposeInput.addEventListener("input", () => {
  customPurposeText = customPurposeInput.value.trim();
  selectedPurpose = customPurposeText || "Custom Outreach";
});

// Toggle saved panel
toggleSavedBtn.addEventListener("click", () => {
  showingSaved = !showingSaved;
  toggleSavedBtn.classList.toggle("active", showingSaved);

  if (showingSaved) {
    messagesContainer.style.display = "none";
    tipSection.style.display = "none";
    savedPanel.style.display = "block";
    renderSavedPanel();
  } else {
    messagesContainer.style.display = "block";
    savedPanel.style.display = "none";
    if (lastResults?.tip) tipSection.style.display = "flex";
  }
});

// Generate
generateBtn.addEventListener("click", handleGenerate);
retryBtn.addEventListener("click", handleGenerate);

// Keyboard shortcut: Ctrl+Enter to generate
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter" && stateMain.style.display !== "none") {
    e.preventDefault();
    handleGenerate();
  }
});

async function handleGenerate() {
  if (isGenerating) return;

  hideError();

  if (!currentSenderInfo.name) {
    showError("Please add your name in Settings first.");
    return;
  }

  if (!currentSenderInfo.apiKey) {
    showError("API key missing. Open Settings to add it.");
    return;
  }

  isGenerating = true;
  setGeneratingState(true);

  // Show skeleton, hide old results
  skeletonSection.style.display = "block";
  resultsSection.style.display = "none";

  try {
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "GENERATE_MESSAGES",
          payload: {
            apiKey: currentSenderInfo.apiKey,
            apiProvider: currentSenderInfo.apiProvider,
            senderInfo: {
              name: currentSenderInfo.name,
              role: currentSenderInfo.role,
              college: currentSenderInfo.college
            },
            targetInfo: currentProfileData || {},
            purpose: selectedPurpose
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error));
          }
        }
      );
    });

    lastResults = result;

    // Persist results
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.storage.local.set({
      lastResults: {
        profileUrl: tab?.url?.split("?")[0] || "",
        data: result
      }
    });

    renderResults(result);
  } catch (err) {
    skeletonSection.style.display = "none";
    handleApiError(err);
  } finally {
    isGenerating = false;
    setGeneratingState(false);
  }
}

// ── Error Handling ────────────────────────────────────────────────────────────
function handleApiError(err) {
  const msg = err.message || "";
  if (msg === "API_KEY_MISSING" || msg === "INVALID_API_KEY") {
    showError("Invalid or missing API key. Check Settings.");
  } else if (msg === "RATE_LIMIT") {
    showError("Rate limit hit. Try again in a moment.");
  } else if (msg.startsWith("JSON_PARSE_ERROR")) {
    showError("Unexpected response from AI: " + msg.replace("JSON_PARSE_ERROR", "").substring(0, 100));
  } else if (msg === "REQUEST_TIMEOUT") {
    showError("Request timed out. The API may be slow — please retry.");
  } else {
    showError(msg || "Something went wrong. Please retry.");
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.style.display = "flex";
}

function hideError() {
  errorBanner.style.display = "none";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setGeneratingState(loading) {
  generateBtn.disabled = loading;
  generateText.style.display = loading ? "none" : "block";
  generateSpinner.style.display = loading ? "block" : "none";
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init().catch(console.error);
