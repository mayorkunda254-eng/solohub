const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-creator-submissions-page.jsx", code);

if (!code.includes("function CreatorSubmissionsPage")) {
  code = code.replace(
`function SubmissionsPage`,
`function CreatorSubmissionsPage({ submissions, campaigns = [] }) {
  const [filter, setFilter] = useState('All');

  const filtered = submissions.filter((submission) =>
    filter === 'All' ? true : submission.status === filter
  );

  const totalSubmittedViews = filtered.reduce((sum, submission) =>
    sum + Number(submission.submittedViews || submission.submitted_views || 0), 0
  );

  const totalApprovedViews = filtered.reduce((sum, submission) =>
    sum + Number(submission.approvedViews || submission.approved_views || 0), 0
  );

  const totalApprovedPayout = filtered.reduce((sum, submission) =>
    sum + Number(submission.payout || submission.approvedPayout || submission.approved_payout || 0), 0
  );

  const copyCreatorReport = async () => {
    const report = [
      'SOLOHUB CREATOR SUBMISSION REPORT',
      '',
      'Total submissions: ' + filtered.length,
      'Submitted views: ' + totalSubmittedViews.toLocaleString(),
      'Approved views: ' + totalApprovedViews.toLocaleString(),
      'Approved payout: ' + money(totalApprovedPayout),
      '',
      ...filtered.map((submission, index) => [
        (index + 1) + '. ' + (submission.campaign || 'Campaign'),
        'Platform: ' + (submission.platform || '-'),
        'Status: ' + (submission.status || '-'),
        'Submitted views: ' + Number(submission.submittedViews || submission.submitted_views || 0).toLocaleString(),
        'Approved views: ' + Number(submission.approvedViews || submission.approved_views || 0).toLocaleString(),
        'Payout: ' + money(submission.payout || submission.approvedPayout || submission.approved_payout || 0),
        'Link: ' + (submission.postUrl || submission.post_url || '-'),
        ''
      ].join('\\n'))
    ].join('\\n');

    try {
      await navigator.clipboard.writeText(report);
      alert('Creator submission report copied.');
    } catch (err) {
      window.prompt('Copy report:', report);
    }
  };

  const statusTone = (status) => {
    if (status === 'Approved' || status === 'Paid') return 'green';
    if (status === 'Rejected') return 'red';
    return 'yellow';
  };

  return (
    <section className="creator-submissions-page">
      <div className="section-head">
        <div>
          <Pill tone="purple"><ShieldCheck size={14} /> Creator Submissions</Pill>
          <h2>Track clip performance across your campaigns.</h2>
          <p>Review submitted clips, approved views, payout impact, and admin verification notes.</p>
        </div>

        <div className="creator-submission-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            <option>Pending Review</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Paid</option>
          </select>

          <button type="button" className="affiliate-action-btn" onClick={copyCreatorReport}>
            Copy report
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={FileVideo} label="Submissions" value={filtered.length} helper="Filtered clips" />
        <StatCard icon={Search} label="Submitted Views" value={totalSubmittedViews.toLocaleString()} helper="Claimed by clippers" />
        <StatCard icon={ShieldCheck} label="Approved Views" value={totalApprovedViews.toLocaleString()} helper="Verified by admin" />
        <StatCard icon={Wallet} label="Approved Payout" value={money(totalApprovedPayout)} helper="Creator payout liability" />
      </div>

      <div className="creator-submission-grid">
        {filtered.map((submission) => {
          const campaign = campaigns.find((item) =>
            item.id === submission.campaignId ||
            item.id === submission.campaign_id ||
            item.title === submission.campaign
          );

          return (
            <article key={submission.id} className="creator-submission-card">
              <div className="creator-submission-top">
                <div>
                  <h3>{submission.campaign}</h3>
                  <p>{submission.platform || '-'} • {campaign?.category || 'Campaign clip'}</p>
                </div>

                <Pill tone={statusTone(submission.status)}>
                  {submission.status}
                </Pill>
              </div>

              <div className="creator-submission-metrics">
                <div>
                  <span>Submitted</span>
                  <strong>{Number(submission.submittedViews || submission.submitted_views || 0).toLocaleString()}</strong>
                </div>

                <div>
                  <span>Approved</span>
                  <strong>{Number(submission.approvedViews || submission.approved_views || 0).toLocaleString()}</strong>
                </div>

                <div>
                  <span>Payout</span>
                  <strong>{money(submission.payout || submission.approvedPayout || submission.approved_payout || 0)}</strong>
                </div>

                <div>
                  <span>Fraud</span>
                  <strong>{submission.fraudStatus || submission.fraud_status || 'Clear'}</strong>
                </div>
              </div>

              <div className="creator-review-note">
                <strong>Admin review note</strong>
                <p>{submission.reviewNotes || submission.review_notes || submission.notes || 'No review note yet.'}</p>
              </div>

              <div className="creator-submission-footer">
                <a href={submission.postUrl || submission.post_url} target="_blank" rel="noreferrer">
                  Open post
                </a>

                <span>{submission.createdAt || submission.created_at || ''}</span>
              </div>
            </article>
          );
        })}

        {!filtered.length && (
          <div className="panel">
            <h3>No submissions found.</h3>
            <p>There are no submissions under this filter yet.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function SubmissionsPage`
  );
}

code = code.replaceAll(
  `<SubmissionsPage submissions={ownCreatorSubmissions} title="Creator Submissions" />`,
  `<CreatorSubmissionsPage submissions={ownCreatorSubmissions} campaigns={ownCampaigns} />`
);

code = code.replaceAll(
  `<SubmissionsPage submissions={submissions} title="Creator Submissions" />`,
  `<CreatorSubmissionsPage submissions={submissions} campaigns={campaigns} />`
);

fs.writeFileSync(file, code);
console.log("? Creator submissions performance page added.");
