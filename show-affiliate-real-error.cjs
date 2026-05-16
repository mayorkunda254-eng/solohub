const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-debug-error.jsx", code);

code = code.replace(
  "setMessage('Affiliate tables are still syncing. Click Refresh again in a moment.');",
  "setMessage('Affiliate load error: ' + (err?.message || JSON.stringify(err) || err));"
);

code = code.replace(
  "setMessage('Affiliate tables need Supabase checking. Try Refresh after running the SQL repair.');",
  "setMessage('Affiliate load error: ' + (err?.message || JSON.stringify(err) || err));"
);

code = code.replace(
  "setMessage('Affiliate data could not load. Check Supabase tables and policies, then refresh.');",
  "setMessage('Affiliate load error: ' + (err?.message || JSON.stringify(err) || err));"
);

fs.writeFileSync(file, code);

console.log("✅ Affiliate page will now show the exact Supabase error.");
