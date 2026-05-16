const fs = require("fs");

const file = "src/styles.css";
let css = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/styles.before-remove-phase63-css.css", css);

css = css.replace(
  /\/\* =========================================================\s*Phase 63 Cloud-Safe Fallback Polish[\s\S]*?(?=\/\* =========================================================|$)/,
  ""
);

fs.writeFileSync(file, css, "utf8");

console.log("✅ Removed Phase 63 CSS block if present.");
