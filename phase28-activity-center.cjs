const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-activity-center.jsx", code);

// 1. Add Activity menu to clipper/creator/admin
if (!code.includes("['activity', ShieldCheck, 'Activity']")) {
  code = code.replaceAll(
    `['home', Home, 'Home'],`,
    `['home', Home, 'Home'],
    ['activity', ShieldCheck, 'Activity'],`
  );

  code = code.replace(
    `['adminOverview', LayoutDashboard, 'Overview'],`,
    `['adminOverview', LayoutDashboard, 'Overview'],
    ['activity', ShieldCheck, 'Activity'],`
  );
}

// 2. Add ActivityCenter component before CreatorSubmissionsPage or SubmissionsPage
if (!code.includes("function ActivityCenter")) {
  const insertBefore = code.includes("function CreatorSubmissionsPage")
    ? "function CreatorSubmissionsPage"
    : "function SubmissionsPage";

  const component = `function ActivityCenter({ role, campaigns = [], submissions = [] }) {
  const [filter, setFilter] = useState('All');

  const events = useMemo(() => {
    const items = [];

    campaigns.forEach((campaign) => {
      const depositStatus = campaign.depositStatus || campaign.deposit_status || 'Pending';
      const depositAmount = Number(campaign.depositAmount || campaign.deposit_amount || 0);

      items.push({
        id: \`campaign-\${campaign.id}-status\`,
        group: 'Campaign',
        tone: campaign.status === 'Live' ? 'green' : campaign.status === 'Rejected' ? 'red' : 'yellow',
        title: campaign.status === 'Live'
          ? 'Campaign is live'
          : campaign.status === 'Rejected'
            ? 'Campaign rejected'
            : 'Campaign pending approval',
        description: \`\${campaign.title} • \${campaign.creator || 'Creator'}\`,
        meta: \`Status: \${campaign.status || 'Pending Approval'}\`,
        date: campaign.createdAt || campaign.created_at || '',
        copyText: \`SoloHub campaign update\\nCampaign: \${campaign.title}\\nStatus: \${campaign.status || 'Pending Approval'}\\nDeposit: \${depositStatus}\\nBudget: \${money(campaign.budget || 0)}\`
      });

      if (depositStatus !== 'Pending' || depositAmount > 0) {
        items.push({
          id: \`campaign-\${campaign.id}-deposit\`,
          group: 'Deposit',
          tone: depositStatus === 'Paid' ? 'green' : depositStatus === 'Partial' ? 'yellow' : 'red',
          title: 'Campaign deposit updated',
          description: \`\${campaign.title} • \${money(depositAmount)} received\`,
          meta: \`Deposit status: \${depositStatus} • Ref: \${campaign.paymentReference || campaign.payment_reference || 'Not provided'}\`,
          date: campaign.createdAt || campaign.created_at || '',
          copyText: \`SoloHub deposit update\\nCampaign: \${campaign.title}\\nDeposit Status: \${depositStatus}\\nDeposit Amount: \${money(depositAmount)}\\nPayment Reference: \${campaign.paymentReference || campaign.payment_reference || 'Not provided'}\`
        });
      }
    });

    submissions.forEach((submission) => {
      const status = submission.status || 'Pending Review';
      const fraudStatus = submission.fraudStatus || submission.fraud_status || 'Clear';
      const payout = Number(submission.payout || submission.approvedPayout || submission.approved_payout || 0);
      const approvedViews = Number(submission.approvedViews || submission.approved_views || 0);
      const submittedViews = Number(submission.submittedViews || submission.submitted_views || 0);

      items.push({
        id: \`submission-\${submission.id}-status\`,
        group: 'Submission',
        tone: status === 'Paid' || status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : 'yellow',
        title: status === 'Paid'
          ? 'Payout marked paid'
          : status === 'Approved'
            ? 'Clip approved'
            : status === 'Rejected'
              ? 'Clip rejected'
              : 'Clip pending review',
        description: \`\${submission.campaign || 'Campaign'} • \${submission.platform || 'Platform'}\`,
        meta: \`Submitted: \${submittedViews.toLocaleString()} views • Approved: \${approvedViews.toLocaleString()} views • Payout: \${money(payout)}\`,
        date: submission.paidAt || submission.paid_at || submission.createdAt || submission.created_at || '',
        copyText: \`SoloHub clip update\\nCampaign: \${submission.campaign || 'Campaign'}\\nStatus: \${status}\\nSubmitted Views: \${submittedViews.toLocaleString()}\\nApproved Views: \${approvedViews.toLocaleString()}\\nPayout: \${money(payout)}\\nPayment Ref: \${submission.paymentReference || submission.payment_reference || 'Not paid yet'}\`
      });

      if (fraudStatus && fraudStatus !== 'Clear') {
        items.push({
          id: \`submission-\${submission.id}-fraud\`,
          group: 'Fraud',
          tone: fraudStatus === 'Flagged' ? 'red' : 'yellow',
          title: 'Submission fraud review',
          description: \`\${submission.campaign || 'Campaign'} • Fraud status: \${fraudStatus}\`,
          meta: submission.reviewNotes || submission.review_notes || submission.notes || 'Admin review required.',
          date: submission.createdAt || submission.created_at || '',
          copyText: \`SoloHub fraud review\\nCampaign: \${submission.campaign || 'Campaign'}\\nFraud Status: \${fraudStatus}\\nNotes: \${submission.reviewNotes || submission.review_notes || submission.notes || 'Admin review required.'}\`
        });
      }
    });

    return items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [campaigns, submissions]);

  const filteredEvents = events.filter((event) => filter === 'All' ? true : event.group === filter);

  const pendingCount = events.filter((event) =>
    event.title.toLowerCase().includes('pending') ||
    event.title.toLowerCase().includes('review')
  ).length;

  const payoutCount = events.filter((event) =>
    event.title.toLowerCase().includes('payout') ||
    event.meta.toLowerCase().includes('payout')
  ).length;

  const fraudCount = events.filter((event) => event.group === 'Fraud').length;

  const copyEvent = async (event) => {
    try {
      await navigator.clipboard.writeText(event.copyText);
      alert('Activity update copied.');
    } catch (err) {
      window.prompt('Copy activity update:', event.copyText);
    }
  };

  const copyFullReport = async () => {
    const report = [
      'SOLOHUB ACTIVITY REPORT',
      '',
      'Role: ' + role,
      'Total activities: ' + filteredEvents.length,
      'Pending items: ' + pendingCount,
      'Payout updates: ' + payoutCount,
      'Fraud flags: ' + fraudCount,
      '',
      ...filteredEvents.map((event, index) => [
        (index + 1) + '. ' + event.title,
        event.description,
        event.meta,
        ''
      ].join('\\n'))
    ].join('\\n');

    try {
      await navigator.clipboard.writeText(report);
      alert('Activity report copied.');
    } catch (err) {
      window.prompt('Copy activity report:', report);
    }
  };

  return (
    <section className="activity-page">
      <div className="section-head">
        <div>
          <Pill tone="purple"><ShieldCheck size={14} /> Activity Center</Pill>
          <h2>Your SoloHub updates in one place.</h2>
          <p>Track campaign approvals, deposits, submissions, fraud reviews, and payout updates.</p>
        </div>

        <div className="activity-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            <option>Campaign</option>
            <option>Deposit</option>
            <option>Submission</option>
            <option>Fraud</option>
          </select>

          <button type="button" className="affiliate-action-btn" onClick={copyFullReport}>
            Copy report
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={ShieldCheck} label="Activities" value={filteredEvents.length} helper="Current filter" />
        <StatCard icon={Megaphone} label="Campaigns" value={campaigns.length} helper="Visible to you" />
        <StatCard icon={FileVideo} label="Submissions" value={submissions.length} helper="Visible to you" />
        <StatCard icon={Coins} label="Fraud flags" value={fraudCount} helper="Needs review" />
      </div>

      <div className="activity-feed">
        {filteredEvents.map((event) => (
          <article key={event.id} className={\`activity-card \${event.tone}\`}>
            <div className="activity-icon">
              {event.group === 'Campaign' && <Megaphone size={20} />}
              {event.group === 'Deposit' && <Wallet size={20} />}
              {event.group === 'Submission' && <FileVideo size={20} />}
              {event.group === 'Fraud' && <ShieldCheck size={20} />}
            </div>

            <div className="activity-main">
              <div className="activity-card-head">
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                </div>

                <Pill tone={event.tone}>{event.group}</Pill>
              </div>

              <div className="activity-meta">{event.meta}</div>

              <div className="activity-footer">
                <span>{event.date ? String(event.date).slice(0, 10) : 'Recently updated'}</span>
                <button type="button" className="mini-action" onClick={() => copyEvent(event)}>
                  Copy update
                </button>
              </div>
            </div>
          </article>
        ))}

        {!filteredEvents.length && (
          <div className="panel">
            <h3>No activity yet.</h3>
            <p>Updates will appear here when campaigns, submissions, deposits, and payouts change.</p>
          </div>
        )}
      </div>
    </section>
  );
}

`;

  const idx = code.indexOf(insertBefore);
  if (idx === -1) {
    throw new Error("Could not find insert position for ActivityCenter.");
  }

  code = code.slice(0, idx) + component + code.slice(idx);
}

// 3. Add route inside content useMemo
if (!code.includes("page === 'activity'")) {
  const routeAnchor = `    if (page === 'home') return home;`;

  if (!code.includes(routeAnchor)) {
    throw new Error("Could not find home route anchor.");
  }

  code = code.replace(
    routeAnchor,
    `${routeAnchor}

    if (page === 'activity') {
      const activityCampaigns = isAdmin ? campaigns : currentRole === 'creator' ? ownCampaigns : [];
      const activitySubmissions = isAdmin ? submissions : currentRole === 'creator' ? ownCreatorSubmissions : ownClipperSubmissions;
      return <ActivityCenter role={currentRole} campaigns={activityCampaigns} submissions={activitySubmissions} />;
    }`
  );
}

fs.writeFileSync(file, code);
console.log("? Activity Center added.");
