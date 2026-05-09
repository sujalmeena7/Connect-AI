// ConnectAI — Content Script
// Scrapes LinkedIn profile data and stores in chrome.storage.local

(function () {
  function getText(selector, fallback = "Not available") {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : fallback;
  }

  function getMultipleTexts(selectors, fallback = "Not available") {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) return el.innerText.trim();
    }
    return fallback;
  }

  function scrapeProfile() {
    const profileData = {};

    // Full name
    profileData.fullName = getMultipleTexts([
      "h1.text-heading-xlarge",
      "h1[class*='heading']",
      ".pv-top-card--list li:first-child",
      "h1"
    ]);

    // Current role / headline
    profileData.currentRole = getMultipleTexts([
      ".text-body-medium.break-words",
      "[data-generated-suggestion-target]",
      ".pv-top-card .text-body-medium",
      ".ph5 .text-body-medium"
    ]);

    // Location
    profileData.location = getMultipleTexts([
      ".text-body-small.inline.t-black--light.break-words",
      "[class*='location']",
      ".pv-top-card--list-bullet li"
    ]);

    // Current company — from experience section
    const expEntries = document.querySelectorAll(
      "#experience ~ .pvs-list__outer-container .pvs-entity, " +
      "[id*='experience'] .pvs-entity"
    );

    if (expEntries.length > 0) {
      const firstExp = expEntries[0];
      const companyEl = firstExp.querySelector(
        ".t-14.t-normal, span[aria-hidden='true']:nth-child(2)"
      );
      profileData.currentCompany = companyEl
        ? companyEl.innerText.trim().split("\n")[0]
        : "Not available";
    } else {
      // Fallback: try to extract from role/headline
      const roleText = profileData.currentRole;
      if (roleText.includes(" at ")) {
        profileData.currentCompany = roleText.split(" at ").pop().trim();
      } else {
        profileData.currentCompany = "Not available";
      }
    }

    // Skills — top 3
    const skillEls = document.querySelectorAll(
      "#skills ~ .pvs-list__outer-container .pvs-entity .t-bold span[aria-hidden='true'], " +
      "[id*='skills'] .pvs-entity span[aria-hidden='true']"
    );

    const skills = [];
    skillEls.forEach((el) => {
      const text = el.innerText.trim();
      if (text && !text.includes("Show") && skills.length < 3) {
        skills.push(text);
      }
    });
    profileData.skills = skills.length > 0 ? skills.join(", ") : "Not available";

    // Recent activity — first post snippet
    const activityEls = document.querySelectorAll(
      ".feed-shared-update-v2__description span[aria-hidden='true'], " +
      ".share-native-update-v2__commentary span[aria-hidden='true'], " +
      "[class*='activity'] span[aria-hidden='true']"
    );

    let activity = "Not available";
    for (const el of activityEls) {
      const text = el.innerText.trim();
      if (text && text.length > 20) {
        activity = text.substring(0, 100) + (text.length > 100 ? "..." : "");
        break;
      }
    }
    profileData.recentActivity = activity;

    // Profile URL
    profileData.profileUrl = window.location.href.split("?")[0];

    // Timestamp
    profileData.scrapedAt = Date.now();

    return profileData;
  }

  function storeProfileData() {
    try {
      const data = scrapeProfile();
      chrome.storage.local.set({ profileData: data }, () => {
        console.log("[ConnectAI] Profile data stored:", data);
      });
    } catch (err) {
      console.error("[ConnectAI] Scraping error:", err);
      chrome.storage.local.set({
        profileData: {
          fullName: "Not available",
          currentRole: "Not available",
          currentCompany: "Not available",
          location: "Not available",
          skills: "Not available",
          recentActivity: "Not available",
          profileUrl: window.location.href,
          scrapedAt: Date.now(),
          error: err.message
        }
      });
    }
  }

  // Run on page load
  if (document.readyState === "complete") {
    storeProfileData();
  } else {
    window.addEventListener("load", storeProfileData);
  }

  // Re-scrape when LinkedIn navigates (SPA routing)
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(storeProfileData, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for explicit scrape requests from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "SCRAPE_NOW") {
      setTimeout(() => {
        storeProfileData();
        sendResponse({ success: true });
      }, 500);
      return true;
    }
  });
})();
