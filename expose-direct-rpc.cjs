const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-expose-direct-rpc.jsx", code);

if (!code.includes("window.solohubDirectRpc = solohubDirectRpc")) {
  code = code.replace(
    "async function withSupabaseTimeout",
    `if (typeof window !== "undefined") {
  window.solohubDirectRpc = solohubDirectRpc;
}

async function withSupabaseTimeout`
  );
}

fs.writeFileSync(file, code, "utf8");

console.log("✅ Exposed window.solohubDirectRpc for browser testing.");
