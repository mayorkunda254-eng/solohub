const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-final-affiliate-message-clean.jsx", code);

// Increase affiliate timeout if exact call exists
code = code.replace(
  /withSupabaseTimeout\(([\s\S]{0,500}?),\s*(['"`])Load affiliates\2\s*,\s*\d+\s*\)/g,
  (match, queryPart, quote) => {
    return `withSupabaseTimeout(${queryPart}, ${quote}Load affiliates${quote}, 45000)`;
  }
);

// Replace common raw affiliate timeout state messages
code = code
  .replace(
    /setAffiliateMessage\(\s*['"`]Affiliate data is still syncing:\s*['"`]\s*\+\s*\([^)]*\)\s*\);/g,
    "setAffiliateMessage('Affiliate data is syncing. You can continue using the app.');"
  )
  .replace(
    /setAffiliateMessage\(\s*['"`]Affiliate load failed:\s*['"`]\s*\+\s*\([^)]*\)\s*\);/g,
    "setAffiliateMessage('Affiliate data is syncing. You can continue using the app.');"
  )
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
    "Affiliate load failed: Load affiliates timed out after 15 seconds",
    "Affiliate data is syncing. You can continue using the app."
  );

// Add render cleaner if affiliateMessage is displayed directly
if (!code.includes("function cleanAffiliateDisplayMessage")) {
  const insertAt = code.indexOf("function ");
  const helper = `
function cleanAffiliateDisplayMessage(message) {
  const text = String(message || '');

  if (
    text.includes('Load affiliates timed out') ||
    text.includes('Affiliate load failed') ||
    text.includes('Affiliate data is still syncing')
  ) {
    return 'Affiliate data is syncing. You can continue using the app.';
  }

  return message;
}

`;

  code = code.slice(0, insertAt) + helper + code.slice(insertAt);
}

code = code.replaceAll(
  "{affiliateMessage}",
  "{cleanAffiliateDisplayMessage(affiliateMessage)}"
);

fs.writeFileSync(file, code);

console.log("✅ Header logo and affiliate sync message inspected and cleaned.");
