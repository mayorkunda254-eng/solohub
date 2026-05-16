const fs = require("fs");

const file = "src/main.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/main.before-disable-sw-cache.jsx", code);

// Disable any service worker registration lines
code = code.replace(
  /navigator\.serviceWorker\.register\([\s\S]*?\);/g,
  "console.log('SoloHub service worker disabled during development.');"
);

// Force unregister immediately
if (!code.includes("__soloHubForceUnregisterSw")) {
  const patch = `
if (typeof window !== "undefined" && !window.__soloHubForceUnregisterSw) {
  window.__soloHubForceUnregisterSw = true;

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
}

`;
  code = patch + code;
}

fs.writeFileSync(file, code, "utf8");

console.log("✅ Service worker cache disabled for development.");
