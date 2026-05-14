const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-auth-copy-polish.jsx", code);

code = code.replace(
  `Content rewards, campaign tracking, and creator payouts.`,
  `Launch campaigns. Track clips. Pay creators.`
);

code = code.replace(
  `Manage clipping campaigns, verify submissions, track deposits, monitor payouts, and onboard creators, clippers, and affiliates from one premium dashboard.`,
  `SoloHub helps creators run clipping campaigns, verify performance, track deposits, and manage payouts from one clean dashboard.`
);

fs.writeFileSync(file, code);
console.log("? Auth headline copy shortened.");
