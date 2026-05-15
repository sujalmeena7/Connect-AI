<div align="center">
  <img src="icons/icon128.png" width="100" height="100" alt="ConnectAI Logo">
  <h1>ConnectAI</h1>
  <p><b>Hyper-Personalized LinkedIn Outreach Generator</b></p>

  <img src="https://img.shields.io/badge/Manifest-V3-0A66C2?style=for-the-badge" alt="Manifest V3">
  <img src="https://img.shields.io/badge/AI--Providers-Claude%20%7C%20OpenAI%20%7C%20Gemini-FF6B6B?style=for-the-badge" alt="Multi-AI">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge" alt="License MIT">

  <p>AI-powered Chrome extension that generates tailored LinkedIn connection requests. Automates profile scraping and crafts high-conversion DMs using your choice of <b>Claude 3.5</b>, <b>OpenAI GPT-4o</b>, or <b>Google Gemini 2.5</b>.</p>
</div>

---

## ✨ Features

- **🤖 Multi-Model AI** — Support for Claude 3.5 Sonnet, OpenAI GPT-4o mini, and Google Gemini 2.5 Flash.
- **🎯 Hyper-Personalized** — Scrapes name, role, company, skills, and recent activity to craft unique messages.
- **⚡ AI Shortening** — Automatically trims messages to stay under LinkedIn's 300-character limit.
- **✏️ Inline Editing** — Tweak your generated messages directly within the extension popup.
- **🔖 Message Bookmarks** — Save and manage your best-performing outreach templates.
- **🚀 Keyboard Shortcuts** — Press `Ctrl + Enter` to generate messages instantly.

---

## 📦 Installation

### 1. Get Your API Key
Choose your preferred AI provider and get an API key:
- **Anthropic (Claude)**: [Anthropic Console](https://console.anthropic.com/)
- **OpenAI (GPT)**: [OpenAI Platform](https://platform.openai.com/)
- **Google (Gemini)**: [Google AI Studio](https://aistudio.google.com/)

### 2. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this project folder.

---

## 🚀 Quick Start

1. **Setup**: Click the ConnectAI icon -> ⚙️ Gear icon. Enter your name, select your provider, and paste your API key.
2. **Navigate**: Go to any LinkedIn profile page (`linkedin.com/in/...`).
3. **Generate**: Open the extension, select a purpose, and hit **Generate**.
4. **Send**: Edit or shorten the message if needed, then click **Copy** and paste it into LinkedIn.

---

## 📂 Project Structure

```bash
connectai/
├── background.js       # Multi-provider API router & caching logic
├── content.js          # LinkedIn DOM scraper & SPA observer
├── popup.html/js/css   # Main extension interface & result rendering
├── options.html/js/css  # Provider selection & API key management
├── manifest.json       # Extension configuration (Manifest V3)
├── icons/              # Branded asset suite (16/48/128px)
└── LICENSE             # MIT License
```

---

## 🔒 Privacy & Security

- **Local Storage**: Your API keys are stored securely in `chrome.storage.local`. They are **never synced** to cloud servers or any third-party databases.
- **Direct API Calls**: The extension communicates directly with your chosen AI provider's API.
- **Zero Tracker Policy**: We do not track your usage, scraped data, or messages.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
