// ConnectAI — Options Page Logic

const form = document.getElementById("settings-form");
const senderName = document.getElementById("sender-name");
const senderRole = document.getElementById("sender-role");
const senderCollege = document.getElementById("sender-college");
const apiKeyInput = document.getElementById("api-key");
const saveBtn = document.getElementById("save-btn");
const saveText = document.getElementById("save-text");
const saveSpinner = document.getElementById("save-spinner");
const toast = document.getElementById("toast");
const toggleKeyBtn = document.getElementById("toggle-key");
const eyeOpen = document.getElementById("eye-open");
const eyeClosed = document.getElementById("eye-closed");
const keyValidation = document.getElementById("key-validation");
const keyValidationIcon = document.getElementById("key-validation-icon");
const keyValidationMsg = document.getElementById("key-validation-msg");

const statGenerations = document.getElementById("stat-generations");
const statSaved = document.getElementById("stat-saved");

// Load saved settings — profile from sync, API key from local
chrome.storage.sync.get(
  ["senderName", "senderRole", "senderCollege"],
  (data) => {
    if (data.senderName) senderName.value = data.senderName;
    if (data.senderRole) senderRole.value = data.senderRole;
    if (data.senderCollege) senderCollege.value = data.senderCollege;
  }
);

// API key from storage.local (secure — doesn't sync to Google servers)
chrome.storage.local.get(["apiKey"], (data) => {
  if (data.apiKey) apiKeyInput.value = data.apiKey;
});

// Migration: if apiKey still in sync, migrate it
chrome.storage.sync.get(["apiKey"], (data) => {
  if (data.apiKey) {
    chrome.storage.local.get(["apiKey"], (local) => {
      if (!local.apiKey) {
        chrome.storage.local.set({ apiKey: data.apiKey });
        apiKeyInput.value = data.apiKey;
      }
      chrome.storage.sync.remove("apiKey");
    });
  }
});

// Load usage stats
chrome.storage.local.get(["generationCount", "savedMessages"], (data) => {
  statGenerations.textContent = data.generationCount || 0;
  statSaved.textContent = (data.savedMessages || []).length;
});

// Toggle API key visibility
let keyVisible = false;
toggleKeyBtn.addEventListener("click", () => {
  keyVisible = !keyVisible;
  apiKeyInput.type = keyVisible ? "text" : "password";
  eyeOpen.style.display = keyVisible ? "none" : "block";
  eyeClosed.style.display = keyVisible ? "block" : "none";
});

// Save settings
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = senderName.value.trim();
  const role = senderRole.value.trim();
  const college = senderCollege.value.trim();
  const key = apiKeyInput.value.trim();

  if (!name) {
    showToast("Please enter your name", "error");
    senderName.focus();
    return;
  }

  if (key && !key.startsWith("sk-ant-")) {
    showToast("API key format looks wrong — should start with sk-ant-", "error");
    apiKeyInput.focus();
    return;
  }

  // Show loading
  saveText.style.display = "none";
  saveSpinner.style.display = "block";
  saveBtn.disabled = true;
  hideKeyValidation();

  // Save profile to sync, API key to local
  chrome.storage.sync.set({
    senderName: name,
    senderRole: role,
    senderCollege: college
  });

  chrome.storage.local.set({ apiKey: key }, async () => {
    if (chrome.runtime.lastError) {
      saveText.style.display = "block";
      saveSpinner.style.display = "none";
      saveBtn.disabled = false;
      showToast("Failed to save settings", "error");
      return;
    }

    // Validate the API key if one was provided
    if (key) {
      showKeyValidation("validating", "Validating API key…");

      try {
        const result = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: "VALIDATE_API_KEY", apiKey: key },
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

        showKeyValidation("success", "API key is valid ✓");
        showToast("Settings saved & API key verified ✓", "success");
      } catch (err) {
        const msg = err.message || "";
        if (msg === "INVALID_API_KEY") {
          showKeyValidation("error", "Invalid API key — check and try again");
          showToast("Settings saved, but API key is invalid", "error");
        } else if (msg === "RATE_LIMIT") {
          showKeyValidation("warning", "Rate limited — key saved, try later");
          showToast("Settings saved ✓ (couldn't validate — rate limited)", "success");
        } else {
          showKeyValidation("warning", "Couldn't verify key — saved anyway");
          showToast("Settings saved ✓", "success");
        }
      }
    } else {
      showToast("Settings saved successfully ✓", "success");
    }

    saveText.style.display = "block";
    saveSpinner.style.display = "none";
    saveBtn.disabled = false;
  });
});

// ── Key validation display ────────────────────────────────────────────────────
function showKeyValidation(type, msg) {
  keyValidation.style.display = "flex";
  keyValidation.className = `key-validation ${type}`;

  const icons = { validating: "⏳", success: "✅", error: "❌", warning: "⚠️" };
  keyValidationIcon.textContent = icons[type] || "";
  keyValidationMsg.textContent = msg;
}

function hideKeyValidation() {
  keyValidation.style.display = "none";
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = "default") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}
