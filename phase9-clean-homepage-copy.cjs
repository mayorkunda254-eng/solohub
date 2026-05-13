const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

code = code.replaceAll(
  "MVP Progress",
  "Platform Overview"
);

code = code.replaceAll(
  "Campaigns and submissions can now connect to a real database.",
  "Manage creator campaigns, clip submissions, and payouts in one place."
);

code = code.replaceAll(
  "Use local mode to design fast. Use Supabase mode to save real cloud data.",
  "SoloHub helps creators launch clipping campaigns while clippers submit short-form content for review and payout."
);

code = code.replaceAll(
  "Storage",
  "Database"
);

code = code.replaceAll(
  "Supabase",
  "Cloud"
);

code = code.replaceAll(
  "Manual",
  "Tracked"
);

code = code.replaceAll(
  "M-Pesa tracking later",
  "Manual payout records"
);

code = code.replaceAll(
  "Phase 3 backend-ready MVP",
  "SoloHub Platform"
);

code = code.replaceAll(
  "SoloHub now supports Supabase data saving.",
  "Launch and manage content reward campaigns."
);

code = code.replaceAll(
  "Create campaigns, submit clips, approve submissions, and save them to Supabase when connected. Without Supabase keys, it still runs locally.",
  "Creators fund campaigns, clippers submit short-form posts, and admins approve performance before payout."
);

fs.writeFileSync(file, code);
console.log("? Homepage public copy cleaned.");
