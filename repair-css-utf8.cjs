const fs = require("fs");

const file = "src/styles.css";
const backup = "src/styles.before-utf8-repair.css";

const buffer = fs.readFileSync(file);
fs.writeFileSync(backup, buffer);

// Remove UTF-16 null bytes that PowerShell sometimes injects during Add-Content
let cleaned = Buffer.from([...buffer].filter((byte) => byte !== 0)).toString("utf8");

// Remove broken control characters, keep normal whitespace
cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

// Replace replacement characters if any appear from broken decoding
cleaned = cleaned.replace(/\uFFFD/g, "");

// Write clean UTF-8
fs.writeFileSync(file, cleaned, { encoding: "utf8" });

console.log("✅ styles.css repaired and saved as UTF-8.");
console.log("Backup saved:", backup);
