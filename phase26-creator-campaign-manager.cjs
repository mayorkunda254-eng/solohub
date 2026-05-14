const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-creator-manager.jsx", code);

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

  throw new Error(`Could not find end of function ${functionName}`);
}

// 1. Add creator campaign update function before content useMemo
if (!code.includes("const updateCreatorCampaign")) {
  const contentIndex = code.indexOf("const content = useMemo");

  if (contentIndex === -1) {
    throw new Error("Could not find content useMemo.");
  }

  const updateFunction = `  const updateCreatorCampaign = async (id, changes) => {
    try {
      if (!id) {
        alert('Missing campaign ID.');
        return;
      }

      const existing = campaigns.find((campaign) => campaign.id === id);

      if (!existing) {
        alert('Campaign not found.');
        return;
      }

      if (existing.status === 'Live') {
        const blockedFields = ['pay_per_thousand', 'payPerThousand', 'budget', 'max_payout', 'maxPayout', 'minimum_views', 'minimumViews'];
        const hasBlockedChange = blockedFields.some((field) => Object.prototype.hasOwnProperty.call(changes, field));

        if (hasBlockedChange) {
          alert('Live campaign payout and budget rules are locked. Ask admin for changes.');
          return;
        }
      }

      const patch = {
        title: changes.title ?? existing.title,
        description: changes.description ?? existing.description,
        image_url: changes.imageUrl ?? changes.image_url ?? existing.imageUrl ?? existing.image_url ?? '',
        resource_url: changes.resourceUrl ?? changes.resource_url ?? existing.resourceUrl ?? existing.resource_url ?? '',
        content_requirements: changes.contentRequirements ?? changes.content_requirements ?? existing.contentRequirements ?? existing.content_requirements ?? '',
        rules: Array.isArray(changes.rules) ? changes.rules : Array.isArray(existing.rules) ? existing.rules : [],
        hashtags: Array.isArray(changes.hashtags) ? changes.hashtags : Array.isArray(existing.hashtags) ? existing.hashtags : [],
        deadline: changes.deadline ?? existing.deadline ?? '',
        payment_reference: changes.paymentReference ?? changes.payment_reference ?? existing.paymentReference ?? existing.payment_reference ?? '',
        admin_notes: changes.adminNotes ?? changes.admin_notes ?? existing.adminNotes ?? existing.admin_notes ?? ''
      };

      if (cloudMode) {
        const data = await updateCampaignDirect(id, patch);

        if (!data) {
          alert('Campaign update failed: no campaign returned.');
          return;
        }

        setCampaigns((prev) =>
          prev.map((campaign) => campaign.id === id ? toCampaign(data) : campaign)
        );

        setNotice('Campaign updated.');
        alert('Campaign updated.');
        return;
      }

      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === id
            ? {
                ...campaign,
                ...changes,
                imageUrl: patch.image_url,
                image_url: patch.image_url,
                resourceUrl: patch.resource_url,
                resource_url: patch.resource_url,
                contentRequirements: patch.content_requirements,
                content_requirements: patch.content_requirements,
                paymentReference: patch.payment_reference,
                payment_reference: patch.payment_reference
              }
            : campaign
        )
      );

      setNotice('Campaign updated locally.');
      alert('Campaign updated locally.');
    } catch (err) {
      console.error('Creator campaign update failed:', err);
      alert('Campaign update failed: ' + (err?.message || err));
      setNotice('Campaign update failed: ' + (err?.message || err));
    }
  };

`;

  code = code.slice(0, contentIndex) + updateFunction + code.slice(contentIndex);
}

// 2. Replace CreatorCampaigns with manager version
const block = findFunctionBlock("CreatorCampaigns");

const replacement = `function CreatorCampaigns({ campaigns, submissions = [], onCreatorCampaignUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const getCampaignSubmissions = (campaign) =>
    submissions.filter((submission) =>
      submission.campaignId === campaign.id ||
      submission.campaign_id === campaign.id ||
      submission.campaign === campaign.title
    );

  const getStats = (campaign) => {
    const campaignSubs = getCampaignSubmissions(campaign);
    const approved = campaignSubs.filter((submission) => submission.status === 'Approved' || submission.status === 'Paid');
    const paid = campaignSubs.filter((submission) => submission.status === 'Paid');

    const approvedViews = approved.reduce((sum, submission) =>
      sum + Number(submission.approvedViews || submission.approved_views || 0), 0
    );

    const approvedPayout = approved.reduce((sum, submission) =>
      sum + Number(submission.payout || submission.approvedPayout || 0), 0
    );

    const paidOut = paid.reduce((sum, submission) =>
      sum + Number(submission.payout || submission.approvedPayout || 0), 0
    );

    return {
      submitted: campaignSubs.length,
      approved: approved.length,
      approvedViews,
      approvedPayout,
      paidOut,
      remaining: Math.max(0, Number(campaign.budget || 0) - paidOut)
    };
  };

  const getDraft = (campaign) => {
    const draft = drafts[campaign.id] || {};

    return {
      title: draft.title ?? campaign.title ?? '',
      description: draft.description ?? campaign.description ?? '',
      imageUrl: draft.imageUrl ?? campaign.imageUrl ?? campaign.image_url ?? '',
      resourceUrl: draft.resourceUrl ?? campaign.resourceUrl ?? campaign.resource_url ?? '',
      contentRequirements: draft.contentRequirements ?? campaign.contentRequirements ?? campaign.content_requirements ?? '',
      rules: draft.rules ?? (Array.isArray(campaign.rules) ? campaign.rules.join('\\n') : campaign.rules || ''),
      hashtags: draft.hashtags ?? (Array.isArray(campaign.hashtags) ? campaign.hashtags.join(', ') : campaign.hashtags || ''),
      deadline: draft.deadline ?? campaign.deadline ?? '',
      paymentReference: draft.paymentReference ?? campaign.paymentReference ?? campaign.payment_reference ?? '',
      adminNotes: draft.adminNotes ?? campaign.adminNotes ?? campaign.admin_notes ?? ''
    };
  };

  const updateDraft = (id, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value
      }
    }));
  };

  const saveCampaign = async (campaign) => {
    const draft = getDraft(campaign);

    await onCreatorCampaignUpdate?.(campaign.id, {
      title: draft.title,
      description: draft.description,
      imageUrl: draft.imageUrl,
      image_url: draft.imageUrl,
      resourceUrl: draft.resourceUrl,
      resource_url: draft.resourceUrl,
      contentRequirements: draft.contentRequirements,
      content_requirements: draft.contentRequirements,
      rules: String(draft.rules).split('\\n').map((item) => item.trim()).filter(Boolean),
      hashtags: String(draft.hashtags).split(',').map((item) => item.trim()).filter(Boolean),
      deadline: draft.deadline,
      paymentReference: draft.paymentReference,
      payment_reference: draft.paymentReference,
      adminNotes: draft.adminNotes,
      admin_notes: draft.adminNotes
    });

    setEditingId(null);
  };

  const buildPaymentSummary = (campaign) => {
    const draft = getDraft(campaign);
    const budget = Number(campaign.budget || 0);
    const depositAmount = Number(campaign.depositAmount || campaign.deposit_amount || 0);
    const balance = Math.max(0, budget - depositAmount);

    return [
      'SOLOHUB CAMPAIGN PAYMENT SUMMARY',
      '',
      'Campaign: ' + campaign.title,
      'Creator: ' + campaign.creator,
      'Campaign Budget: ' + money(budget),
      'Deposit Status: ' + (campaign.depositStatus || campaign.deposit_status || 'Pending'),
      'Deposit Received: ' + money(depositAmount),
      'Balance: ' + money(balance),
      'Payment Reference: ' + (draft.paymentReference || 'Not provided yet'),
      '',
      'PAYMENT INSTRUCTIONS',
      'Business Name: ' + SOLOHUB_PAYMENT_DETAILS.businessName,
      'Method: ' + SOLOHUB_PAYMENT_DETAILS.method,
      'Till / Paybill: ' + SOLOHUB_PAYMENT_DETAILS.number,
      'Account Reference: ' + SOLOHUB_PAYMENT_DETAILS.reference,
      '',
      SOLOHUB_PAYMENT_DETAILS.note
    ].join('\\n');
  };

  const copyPaymentSummary = async (campaign) => {
    const text = buildPaymentSummary(campaign);

    try {
      await navigator.clipboard.writeText(text);
      alert('Payment summary copied.');
    } catch (err) {
      console.warn('Copy failed:', err);
      window.prompt('Copy payment summary:', text);
    }
  };

  if (!campaigns.length) {
    return (
      <section className="panel">
        <Pill tone="purple">Creator Campaigns</Pill>
        <h2>No campaigns yet.</h2>
        <p>Create your first campaign and submit it for admin approval.</p>
      </section>
    );
  }

  return (
    <section className="creator-manager">
      <div className="section-head">
        <div>
          <Pill tone="purple"><Megaphone size={14} /> Creator Campaign Manager</Pill>
          <h2>Manage your campaigns, assets, and performance.</h2>
          <p>You can edit campaign content before it goes live. Budget and payout rules are locked after launch.</p>
        </div>
      </div>

      <div className="creator-campaign-grid">
        {campaigns.map((campaign) => {
          const draft = getDraft(campaign);
          const stats = getStats(campaign);
          const isEditing = editingId === campaign.id;
          const isLive = campaign.status === 'Live';
          const budget = Number(campaign.budget || 0);
          const depositStatus = campaign.depositStatus || campaign.deposit_status || 'Pending';
          const depositAmount = Number(campaign.depositAmount || campaign.deposit_amount || 0);
          const progress = budget > 0 ? Math.min(100, Math.round((stats.paidOut / budget) * 100)) : 0;

          return (
            <article key={campaign.id} className="creator-campaign-card">
              <div className="creator-campaign-cover">
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt={campaign.title} />
                ) : (
                  <div className="creator-cover-fallback">S</div>
                )}

                <div className="creator-cover-badges">
                  <Pill tone={campaign.status === 'Live' ? 'green' : campaign.status === 'Rejected' ? 'red' : 'yellow'}>
                    {campaign.status}
                  </Pill>
                  <Pill tone={depositStatus === 'Paid' ? 'green' : depositStatus === 'Partial' ? 'yellow' : 'yellow'}>
                    Deposit: {depositStatus}
                  </Pill>
                </div>
              </div>

              <div className="creator-campaign-body">
                <div className="creator-title-row">
                  <div>
                    <h3>{campaign.title}</h3>
                    <p>{campaign.category} • {money(campaign.payPerThousand)} / 1k views</p>
                  </div>

                  <button type="button" className="mini-action" onClick={() => setEditingId(isEditing ? null : campaign.id)}>
                    {isEditing ? 'Close' : 'Manage'}
                  </button>
                </div>

                <div className="creator-metrics">
                  <div><span>Budget</span><strong>{money(budget)}</strong></div>
                  <div><span>Deposit</span><strong>{money(depositAmount)}</strong></div>
                  <div><span>Paid out</span><strong>{money(stats.paidOut)}</strong></div>
                  <div><span>Remaining</span><strong>{money(stats.remaining)}</strong></div>
                  <div><span>Submissions</span><strong>{stats.submitted}</strong></div>
                  <div><span>Approved views</span><strong>{Number(stats.approvedViews).toLocaleString()}</strong></div>
                </div>

                <div className="whop-progress">
                  <i style={{ width: progress + '%' }} />
                </div>

                <div className="creator-card-actions">
                  <button type="button" className="mini-action" onClick={() => copyPaymentSummary(campaign)}>
                    Copy payment summary
                  </button>

                  {draft.resourceUrl && (
                    <a className="mini-action link-action" href={draft.resourceUrl} target="_blank" rel="noreferrer">
                      Open resources
                    </a>
                  )}
                </div>

                {isEditing && (
                  <div className="creator-edit-panel">
                    <h4>Campaign content manager</h4>

                    {isLive && (
                      <div className="creator-lock-note">
                        Live campaign: payout rules, budget, minimum views, and max payout are locked.
                      </div>
                    )}

                    <label>
                      Title
                      <input value={draft.title} onChange={(e) => updateDraft(campaign.id, 'title', e.target.value)} disabled={isLive} />
                    </label>

                    <label>
                      Campaign image URL
                      <input value={draft.imageUrl} onChange={(e) => updateDraft(campaign.id, 'imageUrl', e.target.value)} placeholder="https://..." />
                    </label>

                    <label>
                      Resource folder URL
                      <input value={draft.resourceUrl} onChange={(e) => updateDraft(campaign.id, 'resourceUrl', e.target.value)} placeholder="Google Drive / source folder" />
                    </label>

                    <label>
                      Description
                      <textarea value={draft.description} onChange={(e) => updateDraft(campaign.id, 'description', e.target.value)} />
                    </label>

                    <label>
                      Content requirements
                      <textarea value={draft.contentRequirements} onChange={(e) => updateDraft(campaign.id, 'contentRequirements', e.target.value)} />
                    </label>

                    <label>
                      Rules
                      <textarea value={draft.rules} onChange={(e) => updateDraft(campaign.id, 'rules', e.target.value)} />
                    </label>

                    <label>
                      Hashtags
                      <input value={draft.hashtags} onChange={(e) => updateDraft(campaign.id, 'hashtags', e.target.value)} />
                    </label>

                    <label>
                      Deadline
                      <input type="date" value={draft.deadline} onChange={(e) => updateDraft(campaign.id, 'deadline', e.target.value)} />
                    </label>

                    <label>
                      Payment reference / M-Pesa code
                      <input value={draft.paymentReference} onChange={(e) => updateDraft(campaign.id, 'paymentReference', e.target.value)} placeholder="Enter payment confirmation code" />
                    </label>

                    <label>
                      Creator notes to admin
                      <textarea value={draft.adminNotes} onChange={(e) => updateDraft(campaign.id, 'adminNotes', e.target.value)} placeholder="Notes about payment, content, or campaign request." />
                    </label>

                    <button type="button" className="affiliate-action-btn" onClick={() => saveCampaign(campaign)}>
                      Save campaign updates
                    </button>
                  </div>
                )}

                <div className="creator-submissions-preview">
                  <h4>Recent submissions</h4>

                  {getCampaignSubmissions(campaign).slice(0, 5).map((submission) => (
                    <div key={submission.id} className="creator-submission-row">
                      <div>
                        <strong>{submission.platform}</strong>
                        <span>{Number(submission.submittedViews || 0).toLocaleString()} submitted views</span>
                      </div>

                      <Pill tone={submission.status === 'Approved' || submission.status === 'Paid' ? 'green' : submission.status === 'Rejected' ? 'red' : 'yellow'}>
                        {submission.status}
                      </Pill>
                    </div>
                  ))}

                  {!getCampaignSubmissions(campaign).length && (
                    <p className="form-note">No submissions yet.</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}`;

code = code.slice(0, block.start) + replacement + code.slice(block.end);

// 3. Pass submissions and update handler to CreatorCampaigns
code = code.replaceAll(
  `<CreatorCampaigns campaigns={ownCampaigns} />`,
  `<CreatorCampaigns campaigns={ownCampaigns} submissions={ownCreatorSubmissions} onCreatorCampaignUpdate={updateCreatorCampaign} />`
);

code = code.replaceAll(
  `<CreatorCampaigns campaigns={campaigns} />`,
  `<CreatorCampaigns campaigns={campaigns} submissions={submissions} onCreatorCampaignUpdate={updateCreatorCampaign} />`
);

fs.writeFileSync(file, code);
console.log("? Creator campaign manager added.");
