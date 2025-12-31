(() => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    thresholdLikes: 1000,
    whitelistHandles: []
  };

  const hiddenMap = new Map();
  let currentSettings = { ...DEFAULT_SETTINGS };
  let scanToken = 0;

  const style = document.createElement("style");
  style.textContent = `
    .xltf-placeholder {
      border: 1px dashed #c4c4c4;
      border-radius: 12px;
      padding: 12px 14px;
      margin: 12px 0;
      background: #f8f8f8;
      color: #333;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 14px;
    }
    .xltf-placeholder strong {
      display: block;
      margin-bottom: 8px;
    }
    .xltf-placeholder button {
      margin-right: 8px;
      border: 1px solid #333;
      background: #fff;
      color: #111;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      cursor: pointer;
    }
  `;
  document.documentElement.appendChild(style);

  const normalizeHandle = (handle) => {
    if (!handle) {
      return null;
    }
    return String(handle).trim().replace(/^@/, "").toLowerCase();
  };

  const formatCount = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    }
    return String(value);
  };

  const getLikeCount = (article) => {
    const likeButton = article.querySelector('[data-testid="like"]');
    if (!likeButton) {
      return null;
    }

    const aria = likeButton.getAttribute("aria-label");
    const rawText = aria || likeButton.textContent;
    if (!rawText) {
      return null;
    }

    return window.XLTF.parseLikeCount(rawText);
  };

  const getHandle = (article) => {
    const handleCandidates = article.querySelectorAll('a[href^="/"] span');
    for (const candidate of handleCandidates) {
      const text = candidate.textContent ? candidate.textContent.trim() : "";
      if (text.startsWith("@") && text.length > 1) {
        return normalizeHandle(text);
      }
    }
    return null;
  };

  const restoreArticle = (article) => {
    const placeholder = hiddenMap.get(article);
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    article.style.display = "";
    article.removeAttribute("data-xltf-hidden");
    hiddenMap.delete(article);
  };

  const restoreAllHidden = () => {
    for (const article of hiddenMap.keys()) {
      restoreArticle(article);
    }
  };

  const addToWhitelist = async (handle) => {
    const normalized = normalizeHandle(handle);
    if (!normalized) {
      return;
    }

    const next = new Set(currentSettings.whitelistHandles.map(normalizeHandle));
    next.add(normalized);
    const updated = Array.from(next);
    currentSettings.whitelistHandles = updated;

    await chrome.storage.sync.set({ whitelistHandles: updated });
  };

  const hideArticle = (article, likeCount, handle) => {
    if (article.hasAttribute("data-xltf-hidden")) {
      return;
    }

    const placeholder = document.createElement("div");
    placeholder.className = "xltf-placeholder";

    const title = document.createElement("strong");
    title.textContent = `Hidden: ${formatCount(likeCount)} likes (threshold ${formatCount(currentSettings.thresholdLikes)})`;

    const showButton = document.createElement("button");
    showButton.textContent = "Show";
    showButton.addEventListener("click", () => restoreArticle(article));

    const whitelistButton = document.createElement("button");
    whitelistButton.textContent = handle ? `Whitelist @${handle}` : "Whitelist author";
    whitelistButton.disabled = !handle;
    whitelistButton.addEventListener("click", async () => {
      if (handle) {
        await addToWhitelist(handle);
      }
      restoreArticle(article);
    });

    placeholder.appendChild(title);
    placeholder.appendChild(showButton);
    placeholder.appendChild(whitelistButton);

    article.style.display = "none";
    article.setAttribute("data-xltf-hidden", "true");
    article.parentNode.insertBefore(placeholder, article);
    hiddenMap.set(article, placeholder);
  };

  const shouldHide = (article) => {
    if (!currentSettings.enabled) {
      return false;
    }

    const likeCount = getLikeCount(article);
    if (likeCount === null) {
      return false;
    }

    const handle = getHandle(article);
    const whitelist = new Set(currentSettings.whitelistHandles.map(normalizeHandle));
    if (handle && whitelist.has(handle)) {
      return false;
    }

    return likeCount > currentSettings.thresholdLikes;
  };

  const processArticle = (article) => {
    if (!article || !(article instanceof HTMLElement)) {
      return;
    }

    if (article.dataset.xltfScan === String(scanToken)) {
      return;
    }
    article.dataset.xltfScan = String(scanToken);

    if (shouldHide(article)) {
      const likeCount = getLikeCount(article);
      const handle = getHandle(article);
      if (likeCount !== null) {
        hideArticle(article, likeCount, handle);
      }
    } else if (article.hasAttribute("data-xltf-hidden")) {
      restoreArticle(article);
    }
  };

  const scanAll = () => {
    scanToken += 1;
    const articles = document.querySelectorAll("article");
    articles.forEach(processArticle);
  };

  const scanFromNode = (node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    if (node.tagName === "ARTICLE") {
      processArticle(node);
    }
    const articles = node.querySelectorAll("article");
    articles.forEach(processArticle);
  };

  const loadSettings = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        resolve(items);
      });
    });
  };

  const init = async () => {
    currentSettings = await loadSettings();
    if (currentSettings.enabled) {
      scanAll();
    }

    const observer = new MutationObserver((mutations) => {
      if (!currentSettings.enabled) {
        return;
      }
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(scanFromNode);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") {
        return;
      }
      const next = { ...currentSettings };
      for (const key of Object.keys(changes)) {
        next[key] = changes[key].newValue;
      }
      currentSettings = { ...DEFAULT_SETTINGS, ...next };

      if (!currentSettings.enabled) {
        restoreAllHidden();
        return;
      }
      scanAll();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
