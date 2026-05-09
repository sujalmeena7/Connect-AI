<div align="center">
  <img src="icons/icon128.png" width="100" height="100" alt="ConnectAI Logo">
  <h1>ConnectAI</h1>
  <p><b>Hyper-Personalized LinkedIn Outreach Generator</b></p>

  <img src="https://img.shields.io/badge/Manifest-V3-0A66C2?style=for-the-badge" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Claude-3.5%20Sonnet-D97757?style=for-the-badge" alt="Claude 3.5">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge" alt="License MIT">

  <p>AI-powered Chrome extension that generates tailored LinkedIn connection requests. Automates profile scraping and crafts high-conversion DMs using Anthropic's Claude 3.5 Sonnet.</p>
</div>

---

## Table of Contents
- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📂 Project Structure](#-project-structure)
- [🔒 Privacy & Security](#-privacy--security)
- [⚖️ License](#-license)

---

## ✨ Features

- **🎯 Hyper-Personalized** — Scrapes name, role, company, skills, and recent activity to craft unique messages.
- **⚡ AI Shortening** — Automatically trims messages to stay under LinkedIn's 300-character limit.
- **✏️ Inline Editing** — Tweak your generated messages directly within the extension popup.
- **🔖 Message Bookmarks** — Save and manage your best-performing outreach templates.
- **🛠️ Custom Purposes** — Go beyond standard networking with custom outreach goals.
- **🚀 Keyboard Shortcuts** — Press `Ctrl + Enter` to generate messages instantly.

---

## 📦 Installation

### 1. Get Your Anthropic API Key
1. Go to the [Anthropic Console](https://console.anthropic.com/account/keys).
2. Create a new API key (starts with `sk-ant-...`).

### 2. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this project folder.

---

## 🚀 Quick Start

1. **Setup**: Click the ConnectAI icon -> ⚙️ Gear icon. Enter your name and Anthropic API key.
2. **Navigate**: Go to any LinkedIn profile page (`linkedin.com/in/...`).
3. **Generate**: Open the extension, select a purpose, and hit **Generate**.
4. **Send**: Edit or shorten the message if needed, then click **Copy** and paste it into LinkedIn.

---

## 📂 Project Structure

```bash
connectai/
├── background.js       # Service worker; Claude API calls & timeout logic
├── content.js          # LinkedIn DOM scraper; SPA observer
├── popup.html/js/css   # Main extension interface & state management
├── options.html/js/css  # Settings page & API key validation
├── manifest.json       # Extension configuration (Manifest V3)
├── icons/              # Branded asset suite (16/48/128px)
└── LICENSE             # MIT License
```

---

## 🔒 Privacy & Security

- **Local Storage**: Your API key is stored in `chrome.storage.local`. It is **never synced** to Google servers or any third-party databases.
- **Direct API Calls**: The extension communicates directly with Anthropic's API from your browser.
- **Data Disposal**: Scraped profile data is held temporarily and overwritten when you navigate to a new profile.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
