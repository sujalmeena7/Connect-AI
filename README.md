# ConnectAI — LinkedIn Cold DM Generator

A Chrome extension that generates hyper-personalized LinkedIn connection request messages using the Anthropic Claude API.

---

## ✨ Features

- **Auto-scrapes** LinkedIn profile data (name, role, company, skills, activity)
- **5 outreach purposes**: Internship Referral, General Networking, Collaboration, Job Referral, and **Custom** free-text
- **3 message variants** per generation: Direct, Shared Interest, and Casual tones
- **Inline message editing** — tweak messages directly before copying
- **AI-powered shortening** — one-click shorten for messages over LinkedIn's 300-char limit
- **Bookmark & save** your favorite messages across sessions
- **Character count badge** — green under 300, red over (LinkedIn's limit)
- **One-click copy** to clipboard
- **Keyboard shortcuts** — `Ctrl+Enter` to generate
- **API key validation** — verifies your key on save
- **Usage stats** — track total generations and saved messages
- **First-run onboarding** — guided setup for new users
- **Loading skeletons** — polished shimmer animation during generation
- **Secure storage** — API key stored in `storage.local` (never synced to Google servers)

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
4. Click **Save Settings** — your key will be validated automatically

---

## 🚀 How to Use

1. Navigate to any LinkedIn profile page (`linkedin.com/in/someone`)
2. Click the **ConnectAI icon** in your toolbar
3. You'll see:
   - The **target person's** scraped info (name, role, company, skills)
   - Your **sender info** (editable inline)
4. Select your **outreach purpose** (pill buttons) — or choose **Custom** for a free-text purpose
5. Click **Generate Messages** (or press `Ctrl+Enter`)
6. Three personalized variants appear — pick the one you like
7. **Edit** the message inline if needed, or click **✂️ Shorten** if it's over the limit
8. Click **📋 Copy** → paste into LinkedIn's "Connect" dialog
9. Click **📌** to bookmark messages you want to reuse later

---

## 🛠 Troubleshooting

| Problem | Solution |
|---|---|
| "Visit a LinkedIn Profile" message | Navigate to `linkedin.com/in/someone` first |
| "Setup Required" message | Click the gear icon → add your API key |
| Profile shows "Not available" | Click the **Refresh** button on the target card |
| API error | Check your API key in Settings; ensure it has credits |
| Rate limit error | Wait ~60 seconds and try again |
| Request timeout | The Anthropic API may be slow — retry after a moment |

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
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── .gitignore
├── LICENSE             # MIT License
└── README.md
```

---

## 🔒 Privacy & Security

- Your API key is stored in Chrome's `storage.local` — it stays on your device and is **never synced** to Google's servers.
- Profile info (name, role, college) is stored in `storage.sync` for convenience across devices — no sensitive data.
- Profile data is stored temporarily in `storage.local` and is overwritten each time you visit a new profile.
- No analytics, no tracking, no external servers.

---

## 📝 Notes

- LinkedIn's connection request message limit is **300 characters**
- Messages marked red have exceeded the limit — use the ✂️ Shorten button or edit inline
- The extension uses `claude-sonnet-4-20250514` for best message quality
- API costs are approximately $0.003–0.006 per generation (3 messages)
- The shorten feature costs an additional ~$0.001 per use

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
