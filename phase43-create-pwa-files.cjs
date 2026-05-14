const fs = require("fs");
const path = require("path");

fs.mkdirSync("public", { recursive: true });

// 1. SoloHub SVG icon
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7d36a"/>
      <stop offset="48%" stop-color="#b87318"/>
      <stop offset="100%" stop-color="#6d3f06"/>
    </linearGradient>
    <radialGradient id="glow" cx="35%" cy="25%" r="75%">
      <stop offset="0%" stop-color="#23d18b" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#071018" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#glow)"/>
  <rect x="50" y="50" width="412" height="412" rx="96" fill="url(#gold)" stroke="#fff4bf" stroke-opacity="0.35" stroke-width="8"/>
  <text x="256" y="312" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="190" font-weight="900" fill="#071018">S</text>
</svg>`;

fs.writeFileSync("public/solohub-icon.svg", iconSvg);

// 2. Manifest
const manifest = {
  name: "SoloHub",
  short_name: "SoloHub",
  description: "Content rewards platform for creators, clippers, affiliates, submissions, and payouts.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#071018",
  theme_color: "#071018",
  orientation: "portrait-primary",
  icons: [
    {
      src: "/solohub-icon.svg",
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ],
  shortcuts: [
    {
      name: "Discover Campaigns",
      short_name: "Discover",
      description: "Find live SoloHub campaigns.",
      url: "/?page=discover",
      icons: [{ src: "/solohub-icon.svg", sizes: "512x512", type: "image/svg+xml" }]
    },
    {
      name: "Login",
      short_name: "Login",
      description: "Login to SoloHub.",
      url: "/",
      icons: [{ src: "/solohub-icon.svg", sizes: "512x512", type: "image/svg+xml" }]
    }
  ]
};

fs.writeFileSync("public/manifest.webmanifest", JSON.stringify(manifest, null, 2));

// 3. Service worker
const sw = `const CACHE_NAME = 'solohub-cache-v1';

const CORE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/solohub-icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/'))
      )
  );
});
`;

fs.writeFileSync("public/solohub-sw.js", sw);

console.log("? PWA manifest, icon, and service worker created.");
