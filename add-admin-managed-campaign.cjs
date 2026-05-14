const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Add Create Campaign to admin sidebar menu if missing
code = code.replace(
`  admin: [
    ['adminOverview', LayoutDashboard, 'Overview'],
    ['adminCampaigns', Megaphone, 'Campaigns'],
    ['adminSubmissions', ShieldCheck, 'Submissions'],
    ['adminPayouts', Coins, 'Payouts']
  ]`,
`  admin: [
    ['adminOverview', LayoutDashboard, 'Overview'],
    ['createCampaign', Plus, 'Create Managed Campaign'],
    ['adminCampaigns', Megaphone, 'Campaigns'],
    ['adminSubmissions', ShieldCheck, 'Submissions'],
    ['adminPayouts', Coins, 'Payouts']
  ]`
);

fs.writeFileSync(file, code);
console.log("? Admin Create Managed Campaign menu added.");
