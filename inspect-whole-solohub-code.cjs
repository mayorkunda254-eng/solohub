const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outFile = path.join(root, "SOLHUB_FULL_CODE_INSPECTION_REPORT.txt");

const includeExt = new Set([".jsx", ".js", ".css", ".html", ".json", ".webmanifest", ".cjs"]);
const skipDirs = new Set(["node_modules", "dist", ".git", "_cleanup_archive"]);

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (!skipDirs.has(item)) walk(full, files);
    } else {
      const ext = path.extname(item);
      if (includeExt.has(ext)) files.push(full);
    }
  }

  return files;
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function lineNoFromIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findAll(regex, text) {
  return [...text.matchAll(regex)];
}

function section(title, body = "") {
  return [
    "",
    "============================================================",
    title,
    "============================================================",
    body
  ].join("\n");
}

const files = walk(root);
const appFile = path.join(root, "src", "App.jsx");
const cssFile = path.join(root, "src", "styles.css");
const packageFile = path.join(root, "package.json");
const indexFile = path.join(root, "index.html");
const manifestFile = path.join(root, "public", "manifest.webmanifest");

const app = read(appFile);
const css = read(cssFile);
const pkg = read(packageFile);
const indexHtml = read(indexFile);
const manifest = read(manifestFile);

const report = [];

report.push("SOLOHUB FULL CODE INSPECTION REPORT");
report.push("Generated: " + new Date().toISOString());
report.push("Root: " + root);

report.push(section("1. PROJECT FILE SUMMARY",
  files.map((file) => {
    const stat = fs.statSync(file);
    return `${rel(file)} | ${(stat.size / 1024).toFixed(1)} KB`;
  }).join("\n")
));

report.push(section("2. PACKAGE.JSON",
  pkg || "package.json not found."
));

report.push(section("3. MAIN FILE SIZES", [
  `src/App.jsx exists: ${fs.existsSync(appFile)}`,
  `src/App.jsx lines: ${app ? app.split(/\r?\n/).length : 0}`,
  `src/styles.css exists: ${fs.existsSync(cssFile)}`,
  `src/styles.css lines: ${css ? css.split(/\r?\n/).length : 0}`,
  `index.html exists: ${fs.existsSync(indexFile)}`,
  `manifest exists: ${fs.existsSync(manifestFile)}`
].join("\n")));

const imports = findAll(/^import .+$/gm, app).map((m) => `${lineNoFromIndex(app, m.index)} | ${m[0]}`);

report.push(section("4. APP IMPORTS", imports.join("\n") || "No imports found."));

const functionDecls = [
  ...findAll(/function\s+([A-Za-z0-9_]+)\s*\(/g, app).map((m) => ({
    type: "function",
    name: m[1],
    line: lineNoFromIndex(app, m.index)
  })),
  ...findAll(/const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g, app).map((m) => ({
    type: "const arrow",
    name: m[1],
    line: lineNoFromIndex(app, m.index)
  }))
].sort((a, b) => a.line - b.line);

report.push(section("5. FUNCTION / COMPONENT MAP",
  functionDecls.map((f) => `${String(f.line).padStart(5)} | ${f.type.padEnd(12)} | ${f.name}`).join("\n")
));

const functionCounts = {};
for (const f of functionDecls) {
  functionCounts[f.name] = (functionCounts[f.name] || 0) + 1;
}
const duplicates = Object.entries(functionCounts)
  .filter(([, count]) => count > 1)
  .map(([name, count]) => `${name}: ${count}`);

report.push(section("6. DUPLICATE FUNCTION NAMES",
  duplicates.join("\n") || "No duplicate function names detected."
));

const pages = findAll(/page\s*===\s*['"`]([^'"`]+)['"`]/g, app)
  .map((m) => ({ page: m[1], line: lineNoFromIndex(app, m.index) }));

report.push(section("7. PAGE ROUTES DETECTED",
  pages.map((p) => `${String(p.line).padStart(5)} | ${p.page}`).join("\n") || "No page routes detected."
));

const menuItems = findAll(/\[['"`]([^'"`]+)['"`]\s*,\s*([A-Za-z0-9_]+)\s*,\s*['"`]([^'"`]+)['"`]\]/g, app)
  .map((m) => ({ id: m[1], icon: m[2], label: m[3], line: lineNoFromIndex(app, m.index) }));

report.push(section("8. SIDEBAR / MENU ITEMS",
  menuItems.map((m) => `${String(m.line).padStart(5)} | ${m.id} | ${m.label} | ${m.icon}`).join("\n") || "No menu items detected."
));

const supabaseTables = [...new Set(findAll(/\.from\((['"`])([^'"`]+)\1\)/g, app).map((m) => m[2]))].sort();
const supabaseRpcs = [...new Set(findAll(/\.rpc\((['"`])([^'"`]+)\1/g, app).map((m) => m[2]))].sort();

report.push(section("9. SUPABASE TABLES USED",
  supabaseTables.join("\n") || "No Supabase tables detected."
));

report.push(section("10. SUPABASE RPC FUNCTIONS USED",
  supabaseRpcs.join("\n") || "No Supabase RPC calls detected."
));

const timeoutCalls = findAll(/withSupabaseTimeout\([\s\S]{0,250}?\)/g, app)
  .map((m) => {
    const text = m[0].replace(/\s+/g, " ");
    return `${lineNoFromIndex(app, m.index)} | ${text}`;
  });

report.push(section("11. SUPABASE TIMEOUT CALLS",
  timeoutCalls.join("\n\n") || "No withSupabaseTimeout calls detected."
));

const riskyPatterns = [
  { name: "window.location.reload", regex: /window\.location\.reload\(/g },
  { name: "window.alert", regex: /alert\(/g },
  { name: "dangerouslySetInnerHTML", regex: /dangerouslySetInnerHTML/g },
  { name: "localStorage", regex: /localStorage\./g },
  { name: "setTimeout", regex: /setTimeout\(/g },
  { name: "catch error messages", regex: /catch\s*\((err|error)\)/g },
  { name: "white-page likely direct JSON.parse", regex: /JSON\.parse\(/g }
];

report.push(section("12. RISKY / IMPORTANT PATTERNS",
  riskyPatterns.map((p) => {
    const matches = findAll(p.regex, app);
    const lines = matches.slice(0, 40).map((m) => lineNoFromIndex(app, m.index)).join(", ");
    return `${p.name}: ${matches.length}${lines ? " | lines: " + lines : ""}`;
  }).join("\n")
));

const authHits = findAll(/signInWithPassword|signUp|signOut|getSession|onAuthStateChange|resetPassword|updateUser/g, app)
  .map((m) => `${lineNoFromIndex(app, m.index)} | ${m[0]}`);

report.push(section("13. AUTH FLOW REFERENCES",
  authHits.join("\n") || "No auth references detected."
));

const fallbackHits = findAll(/fallback|local fallback|Cloud sync|cloud sync|fallback_v1|locally/gi, app)
  .map((m) => `${lineNoFromIndex(app, m.index)} | ${m[0]}`);

report.push(section("14. FALLBACK / LOCAL STORAGE REFERENCES",
  fallbackHits.slice(0, 300).join("\n") || "No fallback references detected."
));

const possibleBrokenPlaceholders = findAll(/undefined|null|TODO|FIXME|demo mode|Browser demo mode|investor|MVP/gi, app)
  .map((m) => `${lineNoFromIndex(app, m.index)} | ${m[0]}`);

report.push(section("15. WORDING / PLACEHOLDER FLAGS",
  possibleBrokenPlaceholders.slice(0, 300).join("\n") || "No obvious placeholder flags detected."
));

const cssBroadSelectors = findAll(/header\s+\[class\*=["'][^"']+["']\]/g, css)
  .map((m) => `${lineNoFromIndex(css, m.index)} | ${m[0]}`);

report.push(section("16. BROAD HEADER CSS SELECTORS",
  cssBroadSelectors.join("\n") || "No broad header selectors detected."
));

const cssImportantCount = findAll(/!important/g, css).length;
report.push(section("17. CSS HEALTH",
  [
    `Total !important usages: ${cssImportantCount}`,
    `Total CSS lines: ${css ? css.split(/\r?\n/).length : 0}`,
    `Contains logo asset CSS: ${css.includes("solohub-top-left-logo-img")}`,
    `Contains cloud safe CSS: ${css.includes("Cloud-Safe")}`
  ].join("\n")
));

report.push(section("18. INDEX.HTML INSPECTION",
  [
    `Title: ${(indexHtml.match(/<title>(.*?)<\/title>/i) || [,""])[1]}`,
    `favicon.ico linked: ${indexHtml.includes("/favicon.ico")}`,
    `manifest linked: ${indexHtml.includes("manifest.webmanifest")}`,
    `theme-color present: ${indexHtml.includes("theme-color")}`
  ].join("\n")
));

report.push(section("19. MANIFEST INSPECTION",
  manifest || "manifest.webmanifest not found."
));

const backupFiles = files
  .filter((file) => rel(file).includes("before-") || rel(file).includes("_cleanup_archive"))
  .slice(0, 300)
  .map(rel);

report.push(section("20. BACKUP / ARCHIVE FILES VISIBLE",
  backupFiles.join("\n") || "No backup/archive files detected in scanned paths."
));

fs.writeFileSync(outFile, report.join("\n"), "utf8");

console.log("✅ Full inspection complete.");
console.log(outFile);
