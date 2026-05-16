const fs = require("fs");
const path = require("path");

const root = process.cwd();
const archiveRoot = path.join(root, "_cleanup_archive");
const stamp = new Date().toISOString().slice(0, 10);
const archiveDir = path.join(archiveRoot, "cleanup-" + stamp);

fs.mkdirSync(archiveDir, { recursive: true });

const keepFiles = new Set([
  "package.json",
  "package-lock.json",
  "vite.config.js",
  "index.html",
  "repair-css-utf8.cjs",
  "README.md"
]);

const archivePatterns = [
  /^phase\d+.*\.cjs$/i,
  /^fix-.*\.cjs$/i,
  /^safe-.*\.cjs$/i,
  /^force-.*\.cjs$/i,
  /^tune-.*\.cjs$/i,
  /^clean-.*\.cjs$/i,
  /^inspect-.*\.cjs$/i,
  /^repair-affiliate-loader\.cjs$/i,
  /^affiliate-.*\.cjs$/i,
  /^use-affiliate-.*\.cjs$/i,
  /^show-affiliate-.*\.cjs$/i,
  /^exact-affiliate-.*\.cjs$/i,
  /^final-.*\.cjs$/i,
  /^.*inspection.*\.txt$/i,
  /^index\.before.*\.html$/i
];

const srcArchivePatterns = [
  /^App\.before-.*\.jsx$/i,
  /^styles\.before-.*\.css$/i
];

function moveFile(from, toDir) {
  if (!fs.existsSync(from)) return false;

  const name = path.basename(from);
  const to = path.join(toDir, name);

  let finalTo = to;
  let n = 1;

  while (fs.existsSync(finalTo)) {
    finalTo = path.join(toDir, name.replace(/(\.[^.]+)$/i, `-${n}$1`));
    n++;
  }

  fs.renameSync(from, finalTo);
  return true;
}

let moved = [];

// Archive root patch/debug files
for (const item of fs.readdirSync(root)) {
  const full = path.join(root, item);
  if (!fs.statSync(full).isFile()) continue;
  if (keepFiles.has(item)) continue;

  if (archivePatterns.some((rx) => rx.test(item))) {
    if (moveFile(full, archiveDir)) moved.push(item);
  }
}

// Archive src backups
const srcDir = path.join(root, "src");
const srcArchiveDir = path.join(archiveDir, "src");
fs.mkdirSync(srcArchiveDir, { recursive: true });

if (fs.existsSync(srcDir)) {
  for (const item of fs.readdirSync(srcDir)) {
    const full = path.join(srcDir, item);
    if (!fs.statSync(full).isFile()) continue;

    if (srcArchivePatterns.some((rx) => rx.test(item))) {
      if (moveFile(full, srcArchiveDir)) moved.push("src/" + item);
    }
  }
}

// Clean App.jsx wording only, not logic
const appFile = path.join(srcDir, "App.jsx");
if (fs.existsSync(appFile)) {
  let code = fs.readFileSync(appFile, "utf8");
  fs.writeFileSync(path.join(archiveDir, "App.before-clean-wording.jsx"), code);

  code = code
    .replaceAll(
      "Affiliate tables are still syncing. Click Refresh again in a moment.",
      "Affiliate page ready. Cloud sync is unavailable for now."
    )
    .replaceAll(
      "Affiliate load error: ",
      "Affiliate sync notice: "
    )
    .replaceAll(
      "Cloud affiliate sync can be repaired later.",
      "Cloud affiliate sync is pending."
    )
    .replaceAll(
      "Supabase affiliate backend can be repaired later.",
      "Supabase affiliate sync is pending."
    );

  fs.writeFileSync(appFile, code, "utf8");
}

// Create health report
const report = {
  cleanupDate: new Date().toISOString(),
  movedCount: moved.length,
  movedFiles: moved,
  archiveDir,
  keptImportantFiles: Array.from(keepFiles),
  nextChecks: [
    "npm run build",
    "npm run dev",
    "Check login",
    "Check admin dashboard",
    "Check affiliate page",
    "Check campaign request form",
    "Check deposit proof page"
  ]
};

fs.writeFileSync(
  path.join(root, "solohub-cleanup-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("✅ SoloHub cleanup complete.");
console.log("Archived files:", moved.length);
console.log("Archive folder:", archiveDir);
console.log("Report: solohub-cleanup-report.json");
