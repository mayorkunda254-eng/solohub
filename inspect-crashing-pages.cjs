const fs = require("fs");
const path = require("path");

const file = path.join("src", "App.jsx");
const outFile = "SOLOHUB_PAGE_CRASH_INSPECTION.txt";

if (!fs.existsSync(file)) {
  throw new Error("src/App.jsx not found.");
}

const code = fs.readFileSync(file, "utf8");
const lines = code.split(/\r?\n/);

function lineNo(index) {
  return code.slice(0, index).split(/\r?\n/).length;
}

function lineContext(lineNumber, before = 5, after = 8) {
  const start = Math.max(1, lineNumber - before);
  const end = Math.min(lines.length, lineNumber + after);

  return lines
    .slice(start - 1, end)
    .map((line, i) => {
      const n = start + i;
      return String(n).padStart(5, " ") + " | " + line;
    })
    .join("\n");
}

function findAll(regex) {
  const results = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    results.push({
      text: match[0],
      groups: match.slice(1),
      index: match.index,
      line: lineNo(match.index)
    });
  }

  return results;
}

function section(title, body = "") {
  return [
    "",
    "============================================================",
    title,
    "============================================================",
    body || "No results."
  ].join("\n");
}

function extractFunctionBlock(name) {
  const functionStart = code.indexOf(`function ${name}`);
  if (functionStart === -1) return null;

  const braceStart = code.indexOf("{", functionStart);
  let depth = 0;

  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) {
      return {
        name,
        startIndex: functionStart,
        endIndex: i + 1,
        startLine: lineNo(functionStart),
        endLine: lineNo(i + 1),
        body: code.slice(functionStart, i + 1)
      };
    }
  }

  return null;
}

const report = [];

report.push("SOLOHUB PAGE CRASH INSPECTION");
report.push("Generated: " + new Date().toISOString());
report.push("File: src/App.jsx");
report.push("Total lines: " + lines.length);

// 1. Routes
const routes = findAll(/if\s*\(\s*page\s*===\s*['"`]([^'"`]+)['"`]\s*\)\s*\{/g);
report.push(section(
  "1. PAGE ROUTES DETECTED",
  routes.map((r) => `${String(r.line).padStart(5)} | ${r.groups[0]}`).join("\n")
));

// 2. Component functions
const components = findAll(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g);
report.push(section(
  "2. COMPONENTS DETECTED",
  components.map((c) => `${String(c.line).padStart(5)} | ${c.groups[0]}`).join("\n")
));

// 3. Known runtime crash names
const crashPatterns = [
  "announcementUnreadCount",
  "unreadAnnouncementCount",
  "setAnnouncementUnreadCount",
  "setUnreadAnnouncementCount",
  "handleCampaignStatus",
  "handleCampaignFundingUpdate",
  "campaignStatus",
  "updateCampaignFunding",
  "solohubDirectRpc",
  "solohub_public_announcements",
  "solohub_admin_announcements",
  "solohub_admin_profiles"
];

const crashHits = [];
for (const pattern of crashPatterns) {
  const regex = new RegExp("\\b" + pattern + "\\b", "g");
  const hits = findAll(regex);

  if (hits.length) {
    crashHits.push(
      `\n${pattern}: ${hits.length} occurrence(s)\n` +
      hits.slice(0, 30).map((h) => `  line ${h.line}`).join("\n")
    );
  } else {
    crashHits.push(`\n${pattern}: 0 occurrence(s)`);
  }
}

report.push(section("3. KNOWN CRASH / HANDLER NAME REFERENCES", crashHits.join("\n")));

// 4. Detailed contexts for stale names
const detailedNames = [
  "announcementUnreadCount",
  "unreadAnnouncementCount",
  "handleCampaignStatus",
  "handleCampaignFundingUpdate"
];

let detailed = "";

for (const name of detailedNames) {
  const hits = findAll(new RegExp("\\b" + name + "\\b", "g"));
  detailed += `\n\n----- ${name} (${hits.length}) -----\n`;

  if (!hits.length) {
    detailed += "No references found.\n";
    continue;
  }

  for (const hit of hits.slice(0, 20)) {
    detailed += "\n" + lineContext(hit.line, 4, 6) + "\n";
  }
}

report.push(section("4. DETAILED CONTEXT FOR LIKELY CRASH NAMES", detailed));

// 5. HomePage block inspection
const homePage = extractFunctionBlock("HomePage");

if (homePage) {
  const homeRefs = [
    ...homePage.body.matchAll(/\b(?:announcementUnreadCount|unreadAnnouncementCount|setAnnouncementUnreadCount|setUnreadAnnouncementCount)\b/g)
  ];

  report.push(section(
    "5. HOMEPAGE INSPECTION",
    [
      `HomePage lines: ${homePage.startLine} - ${homePage.endLine}`,
      `Unread count references in HomePage: ${homeRefs.length}`,
      "",
      homeRefs.map((m) => {
        const globalIndex = homePage.startIndex + m.index;
        return lineContext(lineNo(globalIndex), 4, 6);
      }).join("\n\n") || "No unread count references inside HomePage."
    ].join("\n")
  ));
} else {
  report.push(section("5. HOMEPAGE INSPECTION", "HomePage function not found."));
}

// 6. HomePage render usage
const homeUsage = findAll(/<HomePage[\s\S]*?\/>/g);
report.push(section(
  "6. HOMEPAGE RENDER USAGE",
  homeUsage.map((h) => lineContext(h.line, 4, 8)).join("\n\n") || "No <HomePage /> usage found."
));

// 7. Admin route handler usage
const adminHandlerHits = findAll(/<(?:AdminCampaigns|AdminDepositProofsPage|AdminUsers|AdminAnnouncementsPage|AnnouncementsPage)[\s\S]{0,350}?\/>/g);
report.push(section(
  "7. KEY PAGE COMPONENT RENDER USAGE",
  adminHandlerHits.map((h) => lineContext(h.line, 4, 10)).join("\n\n") || "No key page component render usage found."
));

// 8. Supabase timeout calls
const timeoutHits = findAll(/withSupabaseTimeout\([\s\S]{0,260}?\)/g);
report.push(section(
  "8. SUPABASE TIMEOUT CALLS",
  timeoutHits.map((h) => `${String(h.line).padStart(5)} | ${h.text.replace(/\s+/g, " ")}`).join("\n\n")
));

// 9. Direct Supabase table reads
const tableHits = findAll(/\.from\(['"`]([^'"`]+)['"`]\)/g);
const tableGrouped = {};
for (const hit of tableHits) {
  const table = hit.groups[0];
  tableGrouped[table] = tableGrouped[table] || [];
  tableGrouped[table].push(hit.line);
}

report.push(section(
  "9. SUPABASE TABLE USAGE",
  Object.entries(tableGrouped)
    .map(([table, hitLines]) => `${table}: ${hitLines.length} occurrence(s) | lines: ${hitLines.slice(0, 40).join(", ")}`)
    .join("\n")
));

// 10. Page render section around routing
const routeStart = code.indexOf("if (page ===");
if (routeStart !== -1) {
  const routeLine = lineNo(routeStart);
  report.push(section(
    "10. ROUTING AREA CONTEXT",
    lineContext(routeLine, 10, 180)
  ));
}

// 11. Build a short diagnosis
const wrongHomeUnread =
  homePage &&
  homePage.body.includes("announcementUnreadCount") &&
  !/function\s+HomePage\s*\(\s*\{[\s\S]*?announcementUnreadCount/.test(homePage.body.slice(0, 500));

const wrongHomeUnread2 =
  homePage &&
  homePage.body.includes("unreadAnnouncementCount") &&
  !/function\s+HomePage\s*\(\s*\{[\s\S]*?unreadAnnouncementCount/.test(homePage.body.slice(0, 500));

const diagnosis = [];

if (wrongHomeUnread) {
  diagnosis.push("Possible issue: HomePage uses announcementUnreadCount but does not receive it as a prop.");
}

if (wrongHomeUnread2) {
  diagnosis.push("Possible issue: HomePage uses unreadAnnouncementCount but does not receive it as a prop.");
}

if (code.includes("handleCampaignStatus")) {
  diagnosis.push("Possible issue: stale handleCampaignStatus still exists.");
}

if (code.includes("handleCampaignFundingUpdate")) {
  diagnosis.push("Possible issue: stale handleCampaignFundingUpdate still exists.");
}

if (!code.includes("solohubDirectRpc")) {
  diagnosis.push("Possible issue: solohubDirectRpc helper missing.");
}

if (!diagnosis.length) {
  diagnosis.push("No obvious static crash issue found. Runtime/browser page test needed next.");
}

report.push(section("11. QUICK DIAGNOSIS", diagnosis.join("\n")));

fs.writeFileSync(outFile, report.join("\n"), "utf8");

console.log("✅ Page crash inspection complete.");
console.log("Open report:", outFile);
