const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-smooth-login-refresh.jsx", code);

// Replace the slow 350ms login reload delay with a faster one
code = code.replace(
  /setTimeout\(\(\) => \{\s*window\.location\.reload\(\);\s*\},\s*350\s*\);/g,
  `setTimeout(() => {
          window.location.reload();
        }, 20);`
);

// If another login refresh delay exists, reduce it too
code = code.replace(
  /setTimeout\(\(\) => \{\s*window\.location\.reload\(\);\s*\},\s*\d+\s*\);/g,
  `setTimeout(() => {
          window.location.reload();
        }, 20);`
);

fs.writeFileSync(file, code, "utf8");

console.log("✅ Login refresh made faster.");
