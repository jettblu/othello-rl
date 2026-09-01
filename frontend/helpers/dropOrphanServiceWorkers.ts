export function dropOrphanServiceWorkers() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  void (async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) return;
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if (!sessionStorage.getItem("othello-cleared-sw")) {
      sessionStorage.setItem("othello-cleared-sw", "1");
      window.location.reload();
    }
  })();
}
