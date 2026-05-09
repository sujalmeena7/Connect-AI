# ConnectAI — LinkedIn Cold DM Generator

A Chrome extension that generates hyper-personalized LinkedIn connection request messages using the Anthropic Claude API.

---

## ✨ Features

- **Auto-scrapes** LinkedIn profile data (name, role, company, skills, activity)
- **4 outreach purposes**: Internship Referral, General Networking, Collaboration, Job Referral
- **3 message variants** per generation: Direct, Shared Interest, and Casual tones
- **Character count badge** — green under 300, red over (LinkedIn's limit)
- **One-click copy** to clipboard
- **Remembers** last generated messages per profile session

---

## 📦 Installation

### 1. Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/account/keys)
2. Sign in or create an account
3. Click **"Create Key"** and copy the key (starts with `sk-ant-api03-...`)

### 2. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"**
4. Select the `connectai/` folder
5. The ConnectAI extension icon will appear in your toolbar

### 3. Configure the Extension

1. Click the ConnectAI icon in the toolbar
2. Click the **⚙️ gear icon** (or right-click → Options)
3. Fill in:
   - Your **full name**
   - Your **current role** (e.g. "3rd Year CS Student at MIT")
   - Your **college or company**
   - Your **Anthropic API key**
4. Click **Save Settings**

---

## 🚀 How to Use

1. Navigate to any LinkedIn profile page (`linkedin.com/in/someone`)
2. Click the **ConnectAI icon** in your toolbar
3. You'll see:
   - The **target person's** scraped info (name, role, company, skills)
   - Your **sender info** (editable inline)
4. Select your **outreach purpose** (pill buttons)
5. Click **Generate Messages**
6. Three personalized variants appear — pick the one you like
7. Click **Copy Message** → paste into LinkedIn's "Connect" dialog

---

## 🛠 Troubleshooting

| Problem | Solution |
|---|---|
| "Visit a LinkedIn Profile" message | Navigate to `linkedin.com/in/someone` first |
| "Setup Required" message | Click the gear icon → add your API key |
| Profile shows "Not available" | Click the **Refresh** button on the target card |
| API error | Check your API key in Settings; ensure it has credits |
| Rate limit error | Wait ~60 seconds and try again |

---

## 📁 File Structure

```
connectai/
├── manifest.json       # Extension config (Manifest V3)
├── popup.html          # Main popup UI
├── popup.js            # Popup logic & state management
├── popup.css           # Popup styles
├── content.js          # LinkedIn profile scraper
├── background.js       # Service worker; Claude API calls
├── options.html        # Settings page
├── options.js          # Settings logic
├── options.css         # Settings styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔒 Privacy

- Your API key is stored locally in Chrome's `storage.sync` — it never leaves your browser except to call the Anthropic API directly.
- Profile data is stored temporarily in `storage.local` and is overwritten each time you visit a new profile.
- No analytics, no tracking, no servers.

---

## 📝 Notes

- LinkedIn's connection request message limit is **300 characters**
- Messages marked red have exceeded the limit and should be shortened before sending
- The extension uses `claude-sonnet-4-20250514` for best message quality
- API costs are approximately $0.003–0.006 per generation (3 messages)
