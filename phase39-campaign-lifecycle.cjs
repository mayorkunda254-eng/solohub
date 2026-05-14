const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-campaign-lifecycle.jsx", code);

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

const block = findFunctionBlock("AdminCampaigns");
let fn = code.slice(block.start, block.end);

// Add status filter state
if (!fn.includes("statusFilter")) {
  fn = fn.replace(
    `function AdminCampaigns({ campaigns, onCampaignStatus, onCampaignFundingUpdate }) {`,
    `function AdminCampaigns({ campaigns, onCampaignStatus, onCampaignFundingUpdate }) {
  const [statusFilter, setStatusFilter] = useState('All');`
  );
}

// Add visible campaigns filter before return
if (!fn.includes("const visibleCampaigns")) {
  fn = fn.replace(
    `  return (
    <section className="panel">`,
    `  const visibleCampaigns = campaigns.filter((campaign) =>
    statusFilter === 'All' ? true : campaign.status === statusFilter
  );

  return (
    <section className="panel">`
  );
}

// Add filter bar before table
if (!fn.includes("campaign-lifecycle-filter")) {
  fn = fn.replace(
    `      <div className="table-wrap wide-table">`,
    `      <div className="campaign-lifecycle-filter">
        <label>
          Filter campaigns
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>Pending Approval</option>
            <option>Live</option>
            <option>Paused</option>
            <option>Completed</option>
            <option>Rejected</option>
          </select>
        </label>

        <span>{visibleCampaigns.length} campaign{visibleCampaigns.length === 1 ? '' : 's'} shown</span>
      </div>

      <div className="table-wrap wide-table">`
  );
}

// Change campaigns.map to visibleCampaigns.map
fn = fn.replaceAll(
  `{campaigns.map((c) => {`,
  `{visibleCampaigns.map((c) => {`
);

fn = fn.replaceAll(
  `{campaigns.map((c) => (`,
  `{visibleCampaigns.map((c) => (`
);

// Improve status pill tone
fn = fn.replaceAll(
  `c.status === 'Live' ? 'green' : c.status === 'Rejected' ? 'red' : 'yellow'`,
  `c.status === 'Live' ? 'green' : c.status === 'Rejected' ? 'red' : c.status === 'Paused' ? 'purple' : c.status === 'Completed' ? 'green' : 'yellow'`
);

// Add lifecycle buttons after Reject button
if (!fn.includes("Pause</Button>") && !fn.includes(">Pause</Button>")) {
  fn = fn.replace(
`                    <Button type="button" variant="ghost" onClick={() => onCampaignStatus(c.id, 'Rejected')}>
                      <XCircle size={16} /> Reject
                    </Button>`,
`                    <Button type="button" variant="ghost" onClick={() => onCampaignStatus(c.id, 'Rejected')}>
                      <XCircle size={16} /> Reject
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => onCampaignStatus(c.id, 'Paused')}>
                      Pause
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => onCampaignStatus(c.id, 'Completed')}>
                      Complete
                    </Button>

                    <Button type="button" onClick={() => onCampaignStatus(c.id, 'Live')}>
                      Reopen
                    </Button>`
  );
}

code = code.slice(0, block.start) + fn + code.slice(block.end);

// Lock creator edits when campaign is Live, Paused, or Completed
code = code.replaceAll(
  `const isLive = campaign.status === 'Live';`,
  `const isLive = ['Live', 'Paused', 'Completed'].includes(campaign.status);`
);

code = code.replaceAll(
  `Live campaign: payout rules, budget, minimum views, and max payout are locked.`,
  `Launched campaign: payout rules, budget, minimum views, and max payout are locked.`
);

fs.writeFileSync(file, code);
console.log("? Campaign lifecycle controls added.");
