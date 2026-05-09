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

// Load saved settings
chrome.storage.sync.get(
  ["senderName", "senderRole", "senderCollege", "apiKey"],
  (data) => {
    if (data.senderName) senderName.value = data.senderName;
    if (data.senderRole) senderRole.value = data.senderRole;
    if (data.senderCollege) senderCollege.value = data.senderCollege;
    if (data.apiKey) apiKeyInput.value = data.apiKey;
  }
);

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

  chrome.storage.sync.set(
    {
      senderName: name,
      senderRole: role,
      senderCollege: college,
      apiKey: key
    },
    () => {
      saveText.style.display = "block";
      saveSpinner.style.display = "none";
      saveBtn.disabled = false;

      if (chrome.runtime.lastError) {
        showToast("Failed to save settings", "error");
      } else {
        showToast("Settings saved successfully ✓", "success");
      }
    }
  );
});

function showToast(message, type = "default") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}
