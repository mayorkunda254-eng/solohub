const fs = require("fs");

const file = "src/main.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/main.before-pwa.jsx", code);

if (!code.includes("navigator.serviceWorker.register('/solohub-sw.js')")) {
  code += `

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/solohub-sw.js')
      .catch((error) => console.warn('SoloHub service worker registration failed:', error));
  });
}
`;
}

fs.writeFileSync(file, code);
console.log("? Service worker registered.");
