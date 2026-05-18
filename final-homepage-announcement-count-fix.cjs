const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-final-homepage-announcement-count-fix.jsx", code);

let fixes = 0;

function findMatchingParen(source, openIndex) {
  let depth = 0;

  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")") depth--;

    if (depth === 0) return i;
  }

  return -1;
}

// 1. Repair HomePage function parameters
const homeStart = code.indexOf("function HomePage");

if (homeStart === -1) {
  throw new Error("Could not find function HomePage");
}

const parenStart = code.indexOf("(", homeStart);
const parenEnd = findMatchingParen(code, parenStart);

if (parenStart === -1 || parenEnd === -1) {
  throw new Error("Could not parse HomePage parameters");
}

const params = code.slice(parenStart + 1, parenEnd).trim();

if (!params.includes("announcementUnreadCount")) {
  let newParams = "";

  if (params.startsWith("{") && params.endsWith("}")) {
    const inner = params.slice(1, -1).trim();
    newParams = `{ ${inner}${inner ? ", " : ""}announcementUnreadCount = 0 }`;
  } else if (!params) {
    newParams = `{ announcementUnreadCount = 0 } = {}`;
  } else {
    newParams = `{ announcementUnreadCount = 0 } = {}`;
  }

  code = code.slice(0, parenStart + 1) + newParams + code.slice(parenEnd);
  fixes++;
}

// 2. Ensure the HomePage render receives announcementUnreadCount
code = code.replace(
  /<HomePage([\s\S]*?)\/>/,
  (match, attrs) => {
    if (attrs.includes("announcementUnreadCount=")) return match;

    fixes++;
    return `<HomePage${attrs}
        announcementUnreadCount={announcementUnreadCount || 0}
      />`;
  }
);

// 3. Ensure content useMemo refreshes when unread count changes
code = code.replace(
  /\}, \[page, campaigns, submissions, selectedCampaign, cloudMode, user, profile, role\]\);/,
  () => {
    fixes++;
    return "}, [page, campaigns, submissions, selectedCampaign, cloudMode, user, profile, role, announcementUnreadCount]);";
  }
);

fs.writeFileSync(file, code, "utf8");

console.log("✅ HomePage announcement count scope fixed.");
console.log("Fixes made:", fixes);
