const fs = require("fs");

const file = "src/main.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/main.before-delay-crash-reporter.jsx", code);

// Delay crash screen display from 50ms to 1500ms.
// This prevents the crash reporter from flashing during successful login refresh.
code = code.replace(
  /setTimeout\(\(\) => \{\s*if \(!document\.body\) return;/,
  `setTimeout(() => {
      if (window.__solohubLoginRefreshFix) return;
      if (!document.body) return;`
);

code = code.replace(
  /},\s*50\);/g,
  `}, 1500);`
);

fs.writeFileSync(file, code, "utf8");

console.log("✅ Crash reporter delayed to avoid login flash.");
