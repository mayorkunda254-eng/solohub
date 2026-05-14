const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-force-sidebar-close-on-page.jsx", code);

if (!code.includes("Force close mobile sidebar after page changes")) {
  const contentIndex = code.indexOf("const content = useMemo");

  if (contentIndex === -1) {
    throw new Error("Could not find content useMemo.");
  }

  const effect = `  // Force close mobile sidebar after page changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [page]);

`;

  code = code.slice(0, contentIndex) + effect + code.slice(contentIndex);
}

fs.writeFileSync(file, code);
console.log("? Sidebar will force-close after every page change.");
