const fs = require("fs");

const file = "src/App.jsx";
const code = fs.readFileSync(file, "utf8");
const lines = code.split(/\r?\n/);

const patterns = [
  "affiliate",
  "Affiliate",
  "Load affiliates",
  "setAffiliate",
  "affiliateMessage",
  "referral",
  "Referral",
  "commission",
  "withSupabaseTimeout",
  "from('affiliates'",
  'from("affiliates"',
  "from('referrals'",
  'from("referrals"'
];

const hits = [];

lines.forEach((line, index) => {
  if (patterns.some((pattern) => line.includes(pattern))) {
    hits.push(index + 1);
  }
});

const unique = [...new Set(hits)].sort((a, b) => a - b);

const chunks = [];
const used = new Set();

for (const lineNo of unique) {
  const start = Math.max(1, lineNo - 8);
  const end = Math.min(lines.length, lineNo + 12);
  const key = `${start}-${end}`;

  if (used.has(key)) continue;
  used.add(key);

  chunks.push(
    "\n\n==============================\n" +
    `LINES ${start} - ${end}\n` +
    "==============================\n" +
    lines.slice(start - 1, end).map((line, i) => {
      const actualLine = start + i;
      return String(actualLine).padStart(5, " ") + " | " + line;
    }).join("\n")
  );
}

const report = [
  "SOLOHUB AFFILIATE CODE INSPECTION",
  "File: src/App.jsx",
  "Total lines: " + lines.length,
  "Matches found: " + unique.length,
  "",
  "Detected Supabase affiliate/referral table references:",
  ...[...code.matchAll(/\.from\((['"`])([^'"`]+)\1\)/g)]
    .map((match) => "- " + match[2])
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .filter((value) => value.toLowerCase().includes("affiliate") || value.toLowerCase().includes("referral")),
  "",
  "Detected timeout calls:",
  ...[...code.matchAll(/withSupabaseTimeout\([\s\S]{0,200}?(["'`])([^"'`]+)\1\s*,\s*(\d+)/g)]
    .map((match) => "- " + match[2] + " => " + match[3] + "ms")
    .filter((value) => value.toLowerCase().includes("affiliate") || value.toLowerCase().includes("referral")),
  "",
  ...chunks
].join("\n");

fs.writeFileSync("affiliate-inspection.txt", report, "utf8");

console.log("✅ Inspection complete.");
console.log("Open this file:");
console.log("affiliate-inspection.txt");
console.log("");
console.log("Quick table refs found:");
console.log(
  [...code.matchAll(/\.from\((['"`])([^'"`]+)\1\)/g)]
    .map((match) => match[2])
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .filter((value) => value.toLowerCase().includes("affiliate") || value.toLowerCase().includes("referral"))
);
