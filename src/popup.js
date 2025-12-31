(() => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    thresholdLikes: 1000,
    whitelistHandles: []
  };

  const elements = {
    enabled: document.getElementById("enabled"),
    threshold: document.getElementById("threshold"),
    whitelistInput: document.getElementById("whitelist-input"),
    whitelistAdd: document.getElementById("add-whitelist"),
    whitelistList: document.getElementById("whitelist")
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  const normalizeHandle = (handle) => {
    if (!handle) {
      return null;
    }
    return String(handle).trim().replace(/^@/, "").toLowerCase();
  };

  const renderWhitelist = () => {
    elements.whitelistList.innerHTML = "";
    const handles = currentSettings.whitelistHandles || [];
    if (!handles.length) {
      const empty = document.createElement("li");
      empty.textContent = "No whitelisted handles yet.";
      empty.style.opacity = "0.7";
      elements.whitelistList.appendChild(empty);
      return;
    }

    handles.forEach((handle) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = `@${handle}`;
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", async () => {
        const next = currentSettings.whitelistHandles.filter((entry) => entry !== handle);
        currentSettings.whitelistHandles = next;
        await chrome.storage.sync.set({ whitelistHandles: next });
        renderWhitelist();
      });
      item.appendChild(label);
      item.appendChild(removeButton);
      elements.whitelistList.appendChild(item);
    });
  };

  const loadSettings = () => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => resolve(items));
    });
  };

  const applySettings = (settings) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    elements.enabled.checked = Boolean(currentSettings.enabled);
    elements.threshold.value = String(currentSettings.thresholdLikes);
    renderWhitelist();
  };

  elements.enabled.addEventListener("change", async () => {
    currentSettings.enabled = elements.enabled.checked;
    await chrome.storage.sync.set({ enabled: currentSettings.enabled });
  });

  elements.threshold.addEventListener("change", async () => {
    const value = Number(elements.threshold.value);
    currentSettings.thresholdLikes = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    elements.threshold.value = String(currentSettings.thresholdLikes);
    await chrome.storage.sync.set({ thresholdLikes: currentSettings.thresholdLikes });
  });

  elements.whitelistAdd.addEventListener("click", async () => {
    const normalized = normalizeHandle(elements.whitelistInput.value);
    if (!normalized) {
      return;
    }
    const next = new Set(currentSettings.whitelistHandles.map(normalizeHandle));
    next.add(normalized);
    currentSettings.whitelistHandles = Array.from(next);
    elements.whitelistInput.value = "";
    await chrome.storage.sync.set({ whitelistHandles: currentSettings.whitelistHandles });
    renderWhitelist();
  });

  elements.whitelistInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      elements.whitelistAdd.click();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") {
      return;
    }
    const next = { ...currentSettings };
    for (const key of Object.keys(changes)) {
      next[key] = changes[key].newValue;
    }
    applySettings(next);
  });

  loadSettings().then(applySettings);
})();
