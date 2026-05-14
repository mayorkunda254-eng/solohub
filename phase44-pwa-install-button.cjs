const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-pwa-install-ui.jsx", code);

function findFunctionBlock(functionName) {
  const startRegex = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = startRegex.exec(code);
  if (!match) throw new Error(`Could not find function ${functionName}`);

  const start = match.index;
  const openParen = code.indexOf("(", start);

  let parenDepth = 0;
  let closeParen = -1;

  for (let i = openParen; i < code.length; i++) {
    if (code[i] === "(") parenDepth++;
    if (code[i] === ")") parenDepth--;

    if (parenDepth === 0) {
      closeParen = i;
      break;
    }
  }

  const braceStart = code.indexOf("{", closeParen);
  let depth = 0;

  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) return { start, end: i + 1 };
  }

  throw new Error(`Could not find end of ${functionName}`);
}

// 1. Add PWA install component before Header
if (!code.includes("function PwaInstallButton")) {
  const idx = code.indexOf("function Header");
  if (idx === -1) throw new Error("Header not found.");

  const component = `function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setInstalled(true);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      alert('To install SoloHub, open Chrome menu ? and choose Add to Home screen or Install app.');
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (installed) {
    return null;
  }

  return (
    <button type="button" className="small install-app-btn" onClick={installApp}>
      <Download size={15} /> Install App
    </button>
  );
}

`;

  code = code.slice(0, idx) + component + code.slice(idx);
}

// 2. Add install button to Header before Login/Dashboard area
const headerBlock = findFunctionBlock("Header");
let header = code.slice(headerBlock.start, headerBlock.end);

if (!header.includes("<PwaInstallButton />")) {
  header = header.replace(
    `<div className="topbar-right">`,
    `<div className="topbar-right">
          <PwaInstallButton />`
  );
}

code = code.slice(0, headerBlock.start) + header + code.slice(headerBlock.end);

fs.writeFileSync(file, code);
console.log("? PWA install button added.");
