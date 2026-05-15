const fs = require("fs");

const file = "src/styles.css";
let css = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/styles.before-css-cleanup.css", css);

const removeBlock = (title) => {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    String.raw`\/\*\s*=+\s*[\r\n]+\s*${escaped}\s*[\r\n]+\s*=+\s*\*\/[\s\S]*?(?=\/\*\s*=+\s*[\r\n]+|$)`,
    "g"
  );

  css = css.replace(pattern, "");
};

// Remove older auth layout experiments
[
  "Phase 42 Auth / Login UI Premium Cleanup",
  "Phase 42B Proper Logged-Out Auth Layout",
  "Phase 42C Auth Layout Real Fix",
  "Phase 42 Final Auth Standard Layout",
  "Real Standalone Auth Layout",
  "Final Auth UI Proportion Fix",
  "Final Auth Balance Cleanup",
  "Simple Professional Centered Auth Page"
].forEach(removeBlock);

// Remove older mobile/sidebar experiments
[
  "Mobile Sidebar Close + Backdrop Fix",
  "Sidebar Hard Mobile Close Fix",
  "Final Mobile Sidebar Fix",
  "Mobile Sidebar Unmount Support"
].forEach(removeBlock);

// Remove excessive blank lines
css = css
  .replace(/\r\n/g, "\n")
  .replace(/\n{4,}/g, "\n\n\n")
  .trim();

const finalStabilizer = `

/* =========================================================
   SoloHub Final UI Stabilizer
   Keep this section at the bottom of the file.
   ========================================================= */

/* --- Logged-out auth screen --- */

body.solohub-logged-out {
  overflow-x: hidden !important;
}

body.solohub-logged-out .auth-shell,
body.solohub-logged-out .app-shell {
  display: flex !important;
  justify-content: center !important;
  align-items: flex-start !important;
  width: 100vw !important;
  max-width: 100vw !important;
  min-height: calc(100dvh - 90px) !important;
  padding: 42px 16px 80px !important;
  margin: 0 !important;
  grid-template-columns: none !important;
}

body.solohub-logged-out .auth-main,
body.solohub-logged-out main {
  width: 100% !important;
  max-width: 560px !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: block !important;
}

body.solohub-logged-out .logged-out-auth-page,
body.solohub-logged-out .simple-auth-page {
  width: 100% !important;
  max-width: 560px !important;
  margin: 0 auto !important;
  padding: 0 !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  justify-items: center !important;
  gap: 18px !important;
  transform: none !important;
  position: static !important;
  left: auto !important;
  right: auto !important;
}

body.solohub-logged-out .auth-marketing-card,
body.solohub-logged-out .simple-auth-intro {
  display: none !important;
}

body.solohub-logged-out .auth-panel-premium,
body.solohub-logged-out .logged-out-auth-page .auth-panel-premium,
body.solohub-logged-out .simple-auth-page .auth-panel-premium {
  width: 100% !important;
  max-width: 480px !important;
  min-width: 0 !important;
  margin: 0 auto !important;
  padding: 34px !important;
  justify-self: center !important;
  align-self: center !important;
  transform: none !important;
}

body.solohub-logged-out .auth-panel-premium h2 {
  font-size: 42px !important;
  line-height: 1.05 !important;
  text-align: left !important;
}

body.solohub-logged-out .auth-panel-premium form,
body.solohub-logged-out .auth-form-wide {
  width: 100% !important;
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 15px !important;
}

body.solohub-logged-out .auth-panel-premium input,
body.solohub-logged-out .auth-panel-premium select,
body.solohub-logged-out .auth-submit-btn {
  width: 100% !important;
}

body.solohub-logged-out .simple-auth-points {
  width: 100% !important;
  max-width: 480px !important;
  margin: 0 auto !important;
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 10px !important;
}

body.solohub-logged-out .simple-auth-points span {
  min-height: 58px !important;
  padding: 10px !important;
  border-radius: 15px !important;
}

body.solohub-logged-out .sidebar,
body.solohub-logged-out .sidebar-backdrop {
  display: none !important;
}

/* --- Mobile/tablet sidebar drawer --- */

@media (max-width: 1280px) {
  .app-shell {
    grid-template-columns: 1fr !important;
  }

  .sidebar {
    position: fixed !important;
    top: 84px !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
    width: calc(100vw - 20px) !important;
    max-width: 420px !important;
    max-height: calc(100dvh - 96px) !important;
    overflow-y: auto !important;
    z-index: 3000 !important;

    transform: translateX(-120%) !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    display: block !important;
  }

  .sidebar.show,
  .sidebar[data-open='true'] {
    transform: translateX(0) !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }

  .sidebar-backdrop {
    position: fixed !important;
    inset: 84px 0 0 0 !important;
    z-index: 2500 !important;
    background: rgba(0, 0, 0, 0.72) !important;
    border: 0 !important;

    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    display: block !important;
  }

  .sidebar-backdrop.show {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }

  .mobile-only {
    display: inline-grid !important;
  }

  .mobile-sidebar-close {
    display: inline-flex !important;
  }
}

@media (min-width: 1281px) {
  .mobile-only {
    display: none !important;
  }

  .mobile-sidebar-close {
    display: none !important;
  }

  .sidebar-backdrop {
    display: none !important;
  }

  .sidebar {
    position: sticky !important;
    top: 110px !important;
    transform: none !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }
}

/* --- Form and dropdown readability --- */

select,
input,
textarea {
  color: #f8fafc !important;
}

select {
  background:
    linear-gradient(145deg, rgba(15, 23, 32, 0.98), rgba(7, 11, 16, 0.98)) !important;
  color: #f8fafc !important;
  border: 1px solid rgba(245, 196, 83, 0.22) !important;
}

select option {
  background: #0b1118 !important;
  color: #f8fafc !important;
}

input::placeholder,
textarea::placeholder {
  color: #7f8ea3 !important;
}

/* --- PWA install button --- */

.install-app-btn {
  border: 1px solid rgba(245, 196, 83, 0.28) !important;
  background:
    linear-gradient(135deg, rgba(245, 196, 83, 0.16), rgba(184, 115, 24, 0.12)) !important;
  color: #fff4bf !important;
  box-shadow: 0 16px 38px rgba(245, 196, 83, 0.10) !important;
}

/* --- Small screen auth --- */

@media (max-width: 650px) {
  body.solohub-logged-out .auth-shell,
  body.solohub-logged-out .app-shell {
    padding: 22px 12px 60px !important;
  }

  body.solohub-logged-out .auth-panel-premium,
  body.solohub-logged-out .logged-out-auth-page .auth-panel-premium,
  body.solohub-logged-out .simple-auth-page .auth-panel-premium {
    max-width: 100% !important;
    padding: 24px !important;
    border-radius: 24px !important;
  }

  body.solohub-logged-out .auth-panel-premium h2 {
    font-size: 34px !important;
  }

  body.solohub-logged-out .simple-auth-points {
    max-width: 100% !important;
    grid-template-columns: 1fr !important;
  }
}
`;

css += finalStabilizer;

fs.writeFileSync(file, css);
console.log("? CSS cleanup complete. Backup saved as src/styles.before-css-cleanup.css");
