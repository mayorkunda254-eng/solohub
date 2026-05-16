const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-message-clean.jsx", code);

code = code
  .replaceAll(
    "Affiliate data is still syncing: Load affiliates timed out after 15 seconds",
    "Affiliate data is syncing. You can continue using the app."
  )
  .replaceAll(
    "Affiliate data is still syncing: Load affiliates timed out after 30 seconds",
    "Affiliate data is syncing. You can continue using the app."
  )
  .replaceAll(
    "Affiliate data is still syncing: Load affiliates timed out after 45 seconds",
    "Affiliate data is syncing. You can continue using the app."
  )
  .replaceAll(
    "Affiliate data is still syncing:",
    "Affiliate data is syncing. You can continue using the app."
  );

fs.writeFileSync(file, code);

console.log("✅ Affiliate message cleaned.");
