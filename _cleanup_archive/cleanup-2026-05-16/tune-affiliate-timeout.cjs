const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-timeout-tune.jsx", code);

code = code
  .replaceAll("'Load affiliates', 15000", "'Load affiliates', 30000")
  .replaceAll('"Load affiliates", 15000', '"Load affiliates", 30000')
  .replaceAll("Affiliate load failed:", "Affiliate data is still syncing:");

fs.writeFileSync(file, code);

console.log("✅ Affiliate load timeout increased and message softened.");
