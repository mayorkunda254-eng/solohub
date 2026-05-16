const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-exact-affiliate-timeout-fix.jsx", code);

let fixes = 0;

// Exact fix: add 45-second timeout to Load affiliates call
code = code.replace(
  /(\.from\('affiliates'\)[\s\S]*?\.order\('created_at',\s*\{\s*ascending:\s*false\s*\}\),\s*[\r\n\s]*)'Load affiliates'(\s*[\r\n\s]*\))/,
  (match, before, after) => {
    fixes++;
    return `${before}'Load affiliates', 45000${after}`;
  }
);

// Exact fix: add 45-second timeout to Load referrals call
code = code.replace(
  /(\.from\('referrals'\)[\s\S]*?\.order\('created_at',\s*\{\s*ascending:\s*false\s*\}\),\s*[\r\n\s]*)'Load referrals'(\s*[\r\n\s]*\))/,
  (match, before, after) => {
    fixes++;
    return `${before}'Load referrals', 45000${after}`;
  }
);

// Remove affiliate popup alert
code = code.replace(
  /alert\('Affiliate data is still syncing: '\s*\+\s*\(err\?\.\message\s*\|\|\s*err\)\);/g,
  () => {
    fixes++;
    return "";
  }
);

// Clean affiliate UI message
code = code.replace(
  /setMessage\('Affiliate data is still syncing: '\s*\+\s*\(err\?\.\message\s*\|\|\s*err\)\);/g,
  () => {
    fixes++;
    return "setMessage('Affiliate tables are still syncing. Click Refresh again in a moment.');";
  }
);

fs.writeFileSync(file, code);

console.log("✅ Exact affiliate timeout fixes applied:", fixes);

if (fixes < 2) {
  console.log("⚠️ Few replacements were made. Inspect these lines:");
  console.log("Select-String -Path .\\src\\App.jsx -Pattern \"Load affiliates|Load referrals|Affiliate data is still syncing\" -Context 3,3");
}
