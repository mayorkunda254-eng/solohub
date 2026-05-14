const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-reports-center.jsx", code);

// 1. Add Admin Reports menu item
if (!code.includes("['adminReports', FileVideo, 'Reports']")) {
  code = code.replace(
    `['adminPayouts', Coins, 'Payouts'],`,
    `['adminPayouts', Coins, 'Payouts'],
    ['adminReports', FileVideo, 'Reports'],`
  );
}

// 2. Add report helpers before Header
if (!code.includes("function downloadCsv")) {
  const insertBefore = code.indexOf("function Header");
  if (insertBefore === -1) throw new Error("Could not find Header insertion point.");

  const helpers = `
function csvEscape(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\\n')) {
    return '"' + text.replaceAll('"', '""') + '"';
  }
  return text;
}

function rowsToCsv(rows = []) {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);

  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\\n');
}

function downloadCsv(filename, rows = []) {
  if (!rows.length) {
    alert('No data available to export.');
    return;
  }

  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

`;

  code = code.slice(0, insertBefore) + helpers + code.slice(insertBefore);
}

// 3. Add AdminReports component before AdminUsers
if (!code.includes("function AdminReports")) {
  const insertBefore = code.indexOf("function AdminUsers");
  if (insertBefore === -1) throw new Error("Could not find AdminUsers insertion point.");

  const component = `function AdminReports({ campaigns = [], submissions = [] }) {
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === 'Live');
  const pendingCampaigns = campaigns.filter((campaign) => campaign.status === 'Pending Approval');
  const pendingSubmissions = submissions.filter((submission) => submission.status === 'Pending Review');
  const approvedSubmissions = submissions.filter((submission) => submission.status === 'Approved');
  const paidSubmissions = submissions.filter((submission) => submission.status === 'Paid');

  const totalBudget = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0);

  const totalDeposit = campaigns.reduce((sum, campaign) =>
    sum + Number(campaign.depositAmount || campaign.deposit_amount || 0), 0
  );

  const totalPayoutLiability = submissions
    .filter((submission) => submission.status === 'Approved' || submission.status === 'Paid')
    .reduce((sum, submission) => sum + Number(submission.payout || submission.approvedPayout || submission.approved_payout || 0), 0);

  const totalPaid = paidSubmissions.reduce((sum, submission) =>
    sum + Number(submission.payout || submission.approvedPayout || submission.approved_payout || 0), 0
  );

  const campaignRows = campaigns.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    creator: campaign.creator,
    client_name: campaign.clientName || campaign.client_name || '',
    client_phone: campaign.clientPhone || campaign.client_phone || '',
    category: campaign.category,
    status: campaign.status,
    deposit_status: campaign.depositStatus || campaign.deposit_status || 'Pending',
    deposit_amount: campaign.depositAmount || campaign.deposit_amount || 0,
    payment_reference: campaign.paymentReference || campaign.payment_reference || '',
    budget: campaign.budget || 0,
    remaining: campaign.remaining || 0,
    pay_per_thousand: campaign.payPerThousand || campaign.pay_per_thousand || 0,
    deadline: campaign.deadline || '',
    created_at: campaign.createdAt || campaign.created_at || ''
  }));

  const submissionRows = submissions.map((submission) => ({
    id: submission.id,
    campaign: submission.campaign,
    campaign_id: submission.campaignId || submission.campaign_id || '',
    clipper: submission.clipper || submission.clipperEmail || submission.clipper_email || '',
    platform: submission.platform || '',
    post_url: submission.postUrl || submission.post_url || '',
    status: submission.status,
    fraud_status: submission.fraudStatus || submission.fraud_status || 'Clear',
    submitted_views: submission.submittedViews || submission.submitted_views || 0,
    approved_views: submission.approvedViews || submission.approved_views || 0,
    payout: submission.payout || submission.approvedPayout || submission.approved_payout || 0,
    payment_reference: submission.paymentReference || submission.payment_reference || '',
    paid_at: submission.paidAt || submission.paid_at || '',
    notes: submission.notes || submission.reviewNotes || submission.review_notes || '',
    created_at: submission.createdAt || submission.created_at || ''
  }));

  const payoutRows = submissions
    .filter((submission) => submission.status === 'Approved' || submission.status === 'Paid')
    .map((submission) => ({
      id: submission.id,
      campaign: submission.campaign,
      clipper: submission.clipper || submission.clipperEmail || submission.clipper_email || '',
      status: submission.status,
      approved_views: submission.approvedViews || submission.approved_views || 0,
      payout: submission.payout || submission.approvedPayout || submission.approved_payout || 0,
      payment_reference: submission.paymentReference || submission.payment_reference || '',
      paid_at: submission.paidAt || submission.paid_at || '',
      payout_method: submission.payoutMethod || submission.payout_method || 'Manual'
    }));

  const depositRows = campaigns.map((campaign) => ({
    id: campaign.id,
    campaign: campaign.title,
    client_name: campaign.clientName || campaign.client_name || campaign.creator || '',
    client_phone: campaign.clientPhone || campaign.client_phone || '',
    budget: campaign.budget || 0,
    deposit_status: campaign.depositStatus || campaign.deposit_status || 'Pending',
    deposit_amount: campaign.depositAmount || campaign.deposit_amount || 0,
    balance: Math.max(0, Number(campaign.budget || 0) - Number(campaign.depositAmount || campaign.deposit_amount || 0)),
    payment_reference: campaign.paymentReference || campaign.payment_reference || '',
    admin_notes: campaign.adminNotes || campaign.admin_notes || ''
  }));

  const copySummaryReport = async () => {
    const report = [
      'SOLOHUB PLATFORM SUMMARY REPORT',
      '',
      'Campaigns: ' + campaigns.length,
      'Live campaigns: ' + liveCampaigns.length,
      'Pending campaigns: ' + pendingCampaigns.length,
      'Total campaign budget: ' + money(totalBudget),
      'Total deposits confirmed: ' + money(totalDeposit),
      '',
      'Submissions: ' + submissions.length,
      'Pending submissions: ' + pendingSubmissions.length,
      'Approved submissions: ' + approvedSubmissions.length,
      'Paid submissions: ' + paidSubmissions.length,
      '',
      'Payout liability: ' + money(totalPayoutLiability),
      'Paid out: ' + money(totalPaid),
      'Unpaid approved payouts: ' + money(Math.max(0, totalPayoutLiability - totalPaid))
    ].join('\\n');

    try {
      await navigator.clipboard.writeText(report);
      alert('Summary report copied.');
    } catch (err) {
      window.prompt('Copy summary report:', report);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="reports-page">
      <div className="section-head">
        <div>
          <Pill tone="purple"><FileVideo size={14} /> Reports Center</Pill>
          <h2>Export SoloHub data and investor-ready summaries.</h2>
          <p>Download CSV files for operations, payouts, deposits, and campaign tracking.</p>
        </div>

        <button type="button" className="affiliate-action-btn" onClick={copySummaryReport}>
          Copy summary report
        </button>
      </div>

      <div className="stats-grid">
        <StatCard icon={Megaphone} label="Campaign Budget" value={money(totalBudget)} helper="All campaigns" />
        <StatCard icon={Wallet} label="Deposits" value={money(totalDeposit)} helper="Confirmed/entered" />
        <StatCard icon={FileVideo} label="Submissions" value={submissions.length} helper="All clips" />
        <StatCard icon={Coins} label="Payout Liability" value={money(totalPayoutLiability)} helper="Approved + paid" />
      </div>

      <div className="reports-grid">
        <article className="report-card">
          <h3>Campaigns report</h3>
          <p>Export campaign status, budgets, clients, deposits, and creator details.</p>
          <button type="button" className="affiliate-action-btn" onClick={() => downloadCsv('solohub-campaigns-' + today + '.csv', campaignRows)}>
            Download campaigns CSV
          </button>
        </article>

        <article className="report-card">
          <h3>Submissions report</h3>
          <p>Export clip links, submitted views, approved views, fraud status, and review notes.</p>
          <button type="button" className="affiliate-action-btn" onClick={() => downloadCsv('solohub-submissions-' + today + '.csv', submissionRows)}>
            Download submissions CSV
          </button>
        </article>

        <article className="report-card">
          <h3>Payouts report</h3>
          <p>Export approved and paid payout records for manual M-Pesa reconciliation.</p>
          <button type="button" className="affiliate-action-btn" onClick={() => downloadCsv('solohub-payouts-' + today + '.csv', payoutRows)}>
            Download payouts CSV
          </button>
        </article>

        <article className="report-card">
          <h3>Client deposits report</h3>
          <p>Export client deposit status, budget balances, and payment references.</p>
          <button type="button" className="affiliate-action-btn" onClick={() => downloadCsv('solohub-deposits-' + today + '.csv', depositRows)}>
            Download deposits CSV
          </button>
        </article>
      </div>

      <div className="report-summary-card">
        <h3>Operational snapshot</h3>

        <div className="report-summary-grid">
          <div><span>Live campaigns</span><strong>{liveCampaigns.length}</strong></div>
          <div><span>Pending campaigns</span><strong>{pendingCampaigns.length}</strong></div>
          <div><span>Pending reviews</span><strong>{pendingSubmissions.length}</strong></div>
          <div><span>Approved unpaid</span><strong>{approvedSubmissions.length}</strong></div>
          <div><span>Paid submissions</span><strong>{paidSubmissions.length}</strong></div>
          <div><span>Unpaid payout value</span><strong>{money(Math.max(0, totalPayoutLiability - totalPaid))}</strong></div>
        </div>
      </div>
    </section>
  );
}

`;

  code = code.slice(0, insertBefore) + component + code.slice(insertBefore);
}

// 4. Add admin reports route
if (!code.includes("page === 'adminReports'")) {
  code = code.replace(
    `if (page === 'adminUsers') {`,
    `if (page === 'adminReports') {
      return isAdmin ? <AdminReports campaigns={campaigns} submissions={submissions} /> : home;
    }

    if (page === 'adminUsers') {`
  );
}

fs.writeFileSync(file, code);
console.log("? Reports and CSV Export Center added.");
