const fs = require("fs");

const file = "src/main.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/main.before-cache-crash-repair.jsx", code);

if (!code.includes("__solohubCrashRepair")) {
  const patch = `
if (typeof window !== "undefined" && !window.__solohubCrashRepair) {
  window.__solohubCrashRepair = true;

  const safeText = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const showCrash = (title, message, stack = "") => {
    setTimeout(() => {
      if (!document.body) return;

      document.body.innerHTML =
        '<div style="min-height:100vh;background:#071018;color:#f8fafc;padding:28px;font-family:Arial,sans-serif;">' +
        '<div style="max-width:900px;margin:40px auto;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(255,255,255,.04);">' +
        '<h1 style="margin-top:0;color:#facc15;">SoloHub runtime error</h1>' +
        '<p>The app did not load cleanly. Copy this message and send it for fixing.</p>' +
        '<pre style="white-space:pre-wrap;background:#020617;padding:16px;border-radius:14px;overflow:auto;color:#bbf7d0;">' +
        safeText(title + "\\n\\n" + message + "\\n\\n" + stack) +
        '</pre>' +
        '</div></div>';
    }, 50);
  };

  window.addEventListener("error", (event) => {
    showCrash("JavaScript error", event.message, event.error?.stack || "");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    showCrash(
      "Unhandled promise rejection",
      reason?.message || reason,
      reason?.stack || ""
    );
  });

  try {
    const jsonKeys = [
      "solohub_announcements_fallback_v1",
      "solohub_affiliates_fallback_v1",
      "solohub_referrals_fallback_v1",
      "solohub_campaign_requests_fallback_v1"
    ];

    for (const key of jsonKeys) {
      const value = localStorage.getItem(key);
      if (!value) continue;

      try {
        JSON.parse(value);
      } catch {
        localStorage.removeItem(key);
        console.warn("Removed corrupted SoloHub localStorage key:", key);
      }
    }
  } catch {}

  window.addEventListener("load", () => {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then((registrations) => registrations.forEach((registration) => registration.unregister()))
          .catch(() => {});
      }

      if ("caches" in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => {});
      }
    } catch {}
  });
}

`;

  code = patch + "\n" + code;
}

fs.writeFileSync(file, code, "utf8");

console.log("✅ Added cache repair and crash reporter to src/main.jsx");
