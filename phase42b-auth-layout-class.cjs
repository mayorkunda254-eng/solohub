const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-auth-layout-fix.jsx", code);

// Add body class for logged out / logged in layout control
if (!code.includes("solohub-logged-out")) {
  const contentIndex = code.indexOf("const content = useMemo");

  if (contentIndex === -1) {
    throw new Error("Could not find content useMemo.");
  }

  const effect = `  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('solohub-logged-out', !user);
    document.body.classList.toggle('solohub-logged-in', Boolean(user));

    return () => {
      document.body.classList.remove('solohub-logged-out');
      document.body.classList.remove('solohub-logged-in');
    };
  }, [user]);

`;

  code = code.slice(0, contentIndex) + effect + code.slice(contentIndex);
}

fs.writeFileSync(file, code);
console.log("? Logged-out auth layout class added.");
