const userTagInput = document.getElementById("user-tag");
const saveTagButton = document.getElementById("save-tag");
const syncNowButton = document.getElementById("sync-now");
const currentTagEl = document.getElementById("current-tag");
const lastSyncedEl = document.getElementById("last-synced");
const statusEl = document.getElementById("status");
const syncIndicatorEl = document.getElementById("sync-indicator");

function formatTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#047857";
}

function setSyncingState(isSyncing) {
  syncNowButton.disabled = isSyncing;
  syncNowButton.textContent = isSyncing ? "Syncing..." : "Sync Now";
  syncIndicatorEl.style.display = isSyncing ? "block" : "none";
}

function readLocalStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function writeLocalStorage(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

async function refreshPopupState() {
  const { user_tag: userTag, last_synced_at: lastSyncedAt } = await readLocalStorage([
    "user_tag",
    "last_synced_at"
  ]);

  const cleanedTag = typeof userTag === "string" ? userTag.trim() : "";
  currentTagEl.textContent = cleanedTag || "Not set";
  userTagInput.value = cleanedTag;
  lastSyncedEl.textContent = formatTimestamp(lastSyncedAt);
}

async function saveTag() {
  const userTag = userTagInput.value.trim();

  if (!userTag) {
    setStatus("Please set a non-empty tag.", true);
    return;
  }

  await writeLocalStorage({ user_tag: userTag });
  await refreshPopupState();
  setStatus("Tag saved.");
}

function sendSyncMessage(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "SYNC_REQUEST" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["config.js", "scripts/content.js"]
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

async function sendSyncRequestWithRetry(tabId) {
  try {
    return await sendSyncMessage(tabId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Receiving end does not exist")) {
      throw error;
    }

    await injectContentScript(tabId);
    return sendSyncMessage(tabId);
  }
}

async function triggerSyncNow() {
  const { user_tag: userTag } = await readLocalStorage(["user_tag"]);
  const cleanedTag = typeof userTag === "string" ? userTag.trim() : "";

  if (!cleanedTag) {
    setStatus("Set Your Tag before syncing.", true);
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.id || typeof activeTab.url !== "string") {
      setStatus("Could not find active tab.", true);
      return;
    }

    if (!activeTab.url.startsWith("https://neetcode.io/practice")) {
      setStatus("Open https://neetcode.io/practice, then click Sync Now.", true);
      return;
    }

    setSyncingState(true);
    setStatus("Syncing...");

    try {
      const result = await sendSyncRequestWithRetry(activeTab.id);
      if (!result?.ok) {
        if (result?.reason === "no_data") {
          setStatus("No topic data found yet. Wait for page to load fully.", true);
        } else {
          setStatus(result?.error || "Sync failed.", true);
        }
        return;
      }

      await refreshPopupState();
      setStatus("Sync complete.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed.", true);
    } finally {
      setSyncingState(false);
    }
  });
}

saveTagButton.addEventListener("click", () => {
  void saveTag();
});

syncNowButton.addEventListener("click", () => {
  void triggerSyncNow();
});

void refreshPopupState();
