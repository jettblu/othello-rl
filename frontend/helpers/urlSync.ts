// Coalesced URL writer. WebKit hard-throws SecurityError on rapid
// history.replaceState, which nerfed the React tree during
// all-AI games; pending updates merge and flush on one timer
const URL_SYNC_FLUSH_MS = 350;

type PendingUrlWrite = {
  pathname: string;
  query: URLSearchParams;
  timer: number;
};
let pendingUrlWrite: PendingUrlWrite | null = null;

function flushUrlSync() {
  const pending = pendingUrlWrite;
  pendingUrlWrite = null;
  if (!pending) return;
  window.clearTimeout(pending.timer);
  // Drop the write if the app navigated since it was queued.
  if (window.location.pathname !== pending.pathname) return;
  const query = pending.query.toString();
  try {
    window.history.replaceState(
      null,
      "",
      query ? `${pending.pathname}?${query}` : pending.pathname
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === "SecurityError") {
      console.warn("URL sync skipped: replaceState rate limit");
    } else {
      console.error("URL sync failed", err);
    }
  }
}

// Mobile Safari suspends background tabs with their timers; flush on hide.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushUrlSync();
  });
}

export function replaceQuery(pathname: string, updates: Record<string, string>) {
  if (pendingUrlWrite && pendingUrlWrite.pathname !== pathname) flushUrlSync();
  if (!pendingUrlWrite) {
    pendingUrlWrite = {
      pathname,
      query: new URLSearchParams(window.location.search),
      timer: window.setTimeout(flushUrlSync, URL_SYNC_FLUSH_MS),
    };
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value) pendingUrlWrite.query.set(key, value);
    else pendingUrlWrite.query.delete(key);
  }
}

export function cancelUrlSync() {
  if (pendingUrlWrite) window.clearTimeout(pendingUrlWrite.timer);
  pendingUrlWrite = null;
}
