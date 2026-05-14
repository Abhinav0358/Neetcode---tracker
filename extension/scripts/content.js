function getStorageValue(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function setStorageValues(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

async function upsertUserProgress(userTag, progress) {
  if (typeof NEETCODE_TRACKER_CONFIG !== "object" || !NEETCODE_TRACKER_CONFIG) {
    throw new Error("Missing extension config. Set SUPABASE_URL and SUPABASE_ANON_KEY in extension/config.js.");
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = NEETCODE_TRACKER_CONFIG;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is missing in extension/config.js.");
  }

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/user_progress?on_conflict=user_tag`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify([
        {
          user_tag: userTag,
          progress,
          updated_at: new Date().toISOString()
        }
      ])
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase upsert failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (_error) {
    return null;
  }
}

function parseSolvedCountFromLabel(labelText) {
  const match = String(labelText || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) || 0;
}

function getFallbackSolvedCount(accordionEl) {
  const tableEl = accordionEl.querySelector("app-table");
  if (!tableEl) return 0;

  const successClassCount = tableEl.querySelectorAll(".is-success").length;
  const successIconCount = tableEl.querySelectorAll("svg.text-success").length;
  return Math.max(successClassCount, successIconCount);
}

function diagnosticScrape() {
  const progress = {};
  const accordions = document.querySelectorAll("app-accordion");

  accordions.forEach((accordionEl) => {
    const titleEl = accordionEl.querySelector("button p");
    const categoryTitle = titleEl?.textContent?.trim();
    if (!categoryTitle) return;

    const sublabelEl = accordionEl.querySelector("span.sublabel");
    let solvedCount = parseSolvedCountFromLabel(sublabelEl?.textContent || "");

    if (solvedCount === 0) {
      solvedCount = getFallbackSolvedCount(accordionEl);
    }

    progress[categoryTitle] = solvedCount;
  });

  return progress;
}

async function syncProgress(source) {
  const storedTag = await getStorageValue("user_tag");
  const userTag = typeof storedTag === "string" ? storedTag.trim() : "";

  if (!userTag) {
    return { ok: false, reason: "missing_tag" };
  }

  const progress = diagnosticScrape();
  if (Object.keys(progress).length === 0) {
    return { ok: false, reason: "no_data" };
  }

  await upsertUserProgress(userTag, progress);

  const lastSyncedAt = new Date().toISOString();
  await setStorageValues({
    last_synced_at: lastSyncedAt,
    last_sync_source: source
  });

  return { ok: true, userTag, progress, lastSyncedAt };
}

async function autoSyncIfTagExists() {
  const storedTag = await getStorageValue("user_tag");
  if (typeof storedTag !== "string" || storedTag.trim().length === 0) return;

  try {
    await syncProgress("auto");
  } catch (error) {
    console.error("[NeetCode Tracker] Auto sync failed:", error);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SYNC_REQUEST") return;

  syncProgress("manual")
    .then((result) => sendResponse(result))
    .catch((error) => {
      sendResponse({
        ok: false,
        reason: "sync_error",
        error: error instanceof Error ? error.message : String(error)
      });
    });

  return true;
});

function isPracticePage() {
  const { pathname } = window.location;
  return pathname === "/practice" || pathname === "/practice/";
}

function scheduleAutoSync() {
  window.setTimeout(() => {
    void autoSyncIfTagExists();
  }, 3000);
}

if (isPracticePage()) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleAutoSync, { once: true });
  } else {
    scheduleAutoSync();
  }
}
