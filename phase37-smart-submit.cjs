const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-smart-submit.jsx", code);

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

const block = findFunctionBlock("SubmitPage");

const replacement = `function SubmitPage({ selectedCampaign, campaigns, onSubmitClip }) {
  const firstLive = campaigns.find((c) => c.status === 'Live');
  const campaign = selectedCampaign || firstLive;

  const [form, setForm] = useState({
    postUrl: '',
    platform: '',
    submittedViews: '',
    notes: ''
  });

  const [checks, setChecks] = useState({
    publicPost: false,
    officialResources: false,
    realViews: false,
    noReusedContent: false
  });

  const detectPlatform = (url) => {
    const lower = String(url || '').toLowerCase();

    if (lower.includes('tiktok.com')) return 'TikTok';
    if (lower.includes('instagram.com') || lower.includes('reel')) return 'Instagram Reels';
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('shorts')) return 'YouTube Shorts';
    if (lower.includes('facebook.com')) return 'Facebook Reels';

    return '';
  };

  const updatePostUrl = (value) => {
    const detected = detectPlatform(value);

    setForm((prev) => ({
      ...prev,
      postUrl: value,
      platform: detected || prev.platform
    }));
  };

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateCheck = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyHashtags = async () => {
    const tags = Array.isArray(campaign?.hashtags) ? campaign.hashtags : [];
    const text = tags.map((tag) => String(tag).startsWith('#') ? tag : '#' + tag).join(' ');

    if (!text) {
      alert('No hashtags found for this campaign.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      alert('Campaign hashtags copied.');
    } catch (err) {
      window.prompt('Copy hashtags:', text);
    }
  };

  const copyRules = async () => {
    const rules = Array.isArray(campaign?.rules) ? campaign.rules : [];
    const requirements = campaign?.contentRequirements || campaign?.content_requirements || '';
    const text = [
      'SOLOHUB CAMPAIGN REQUIREMENTS',
      '',
      'Campaign: ' + (campaign?.title || ''),
      '',
      requirements,
      '',
      ...rules.map((rule, index) => (index + 1) + '. ' + rule)
    ].filter(Boolean).join('\\n');

    try {
      await navigator.clipboard.writeText(text);
      alert('Campaign rules copied.');
    } catch (err) {
      window.prompt('Copy campaign rules:', text);
    }
  };

  const submit = (e) => {
    e.preventDefault();

    if (!campaign) {
      alert('No live campaign available.');
      return;
    }

    if (!form.postUrl.trim()) {
      alert('Paste your public post URL.');
      return;
    }

    if (!/^https?:\\/\\//i.test(form.postUrl.trim())) {
      alert('Post URL must start with http:// or https://');
      return;
    }

    if (!form.platform.trim()) {
      alert('Choose or confirm the platform.');
      return;
    }

    if (Number(form.submittedViews || 0) <= 0) {
      alert('Enter submitted views.');
      return;
    }

    const allChecked = Object.values(checks).every(Boolean);

    if (!allChecked) {
      alert('Complete the submission checklist before submitting.');
      return;
    }

    onSubmitClip?.({
      campaignId: campaign.id,
      campaign_id: campaign.id,
      campaign: campaign.title,
      platform: form.platform,
      postUrl: form.postUrl.trim(),
      post_url: form.postUrl.trim(),
      submittedViews: Number(form.submittedViews || 0),
      submitted_views: Number(form.submittedViews || 0),
      approvedViews: 0,
      approved_views: 0,
      payout: 0,
      status: 'Pending Review',
      fraudStatus: 'Pending Review',
      fraud_status: 'Pending Review',
      notes: [
        form.notes,
        'Clipper declaration: public post, official resources used, real views only, no reused content.'
      ].filter(Boolean).join('\\n')
    });

    setForm({
      postUrl: '',
      platform: '',
      submittedViews: '',
      notes: ''
    });

    setChecks({
      publicPost: false,
      officialResources: false,
      realViews: false,
      noReusedContent: false
    });
  };

  if (!campaign) {
    return (
      <section className="panel">
        <Pill tone="yellow">No Live Campaign</Pill>
        <h2>No live campaign available.</h2>
        <p>Check Discover later after admin approves campaigns.</p>
      </section>
    );
  }

  const imageUrl = campaign.imageUrl || campaign.image_url || '';
  const resourceUrl = campaign.resourceUrl || campaign.resource_url || '';
  const requirements = campaign.contentRequirements || campaign.content_requirements || 'Follow campaign instructions and use approved content only.';
  const rules = Array.isArray(campaign.rules) ? campaign.rules : [];
  const hashtags = Array.isArray(campaign.hashtags) ? campaign.hashtags : [];
  const platforms = Array.isArray(campaign.platforms) ? campaign.platforms : ['TikTok', 'Instagram Reels', 'YouTube Shorts'];

  return (
    <section className="smart-submit-page">
      <div className="smart-submit-hero">
        <div className="smart-submit-image">
          {imageUrl ? <img src={imageUrl} alt={campaign.title} /> : <div>S</div>}
        </div>

        <div className="smart-submit-copy">
          <Pill tone="green"><Upload size={14} /> Submit Clip</Pill>
          <h2>{campaign.title}</h2>
          <p>{campaign.description}</p>

          <div className="smart-submit-meta">
            <span>Pay: <strong>{money(campaign.payPerThousand || 0)} / 1k views</strong></span>
            <span>Budget: <strong>{money(campaign.budget || 0)}</strong></span>
            <span>Creator: <strong>{campaign.creator || 'SoloHub Creator'}</strong></span>
          </div>

          <div className="smart-submit-actions">
            {resourceUrl && (
              <a className="mini-action link-action" href={resourceUrl} target="_blank" rel="noreferrer">
                Open resources
              </a>
            )}

            <button type="button" className="mini-action" onClick={copyHashtags}>
              Copy hashtags
            </button>

            <button type="button" className="mini-action ghost" onClick={copyRules}>
              Copy rules
            </button>

            <button type="button" className="mini-action ghost" onClick={() => copyCampaignShareLink(campaign)}>
              Copy campaign link
            </button>
          </div>
        </div>
      </div>

      <div className="smart-submit-grid">
        <div className="submit-guidance-card">
          <h3>Campaign requirements</h3>
          <p>{requirements}</p>

          {rules.length > 0 && (
            <div className="submit-rule-list">
              {rules.map((rule, index) => (
                <div key={rule}>
                  <strong>{index + 1}</strong>
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          )}

          {hashtags.length > 0 && (
            <div className="premium-tag-row submit-tags">
              {hashtags.map((tag) => (
                <span key={tag}>{String(tag).startsWith('#') ? tag : '#' + tag}</span>
              ))}
            </div>
          )}
        </div>

        <form className="submit-form-card" onSubmit={submit}>
          <h3>Submit your public post</h3>

          <label>
            Public post URL
            <input
              value={form.postUrl}
              onChange={(e) => updatePostUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@user/video/..."
            />
          </label>

          <label>
            Platform
            <select value={form.platform} onChange={(e) => update('platform', e.target.value)}>
              <option value="">Choose platform</option>
              {platforms.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label>
            Submitted views
            <input
              type="number"
              value={form.submittedViews}
              onChange={(e) => update('submittedViews', e.target.value)}
              placeholder="Current public views"
            />
          </label>

          <label>
            Notes for admin
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Mention anything admin should know about this clip."
            />
          </label>

          <div className="submission-checklist">
            <h4>Submission checklist</h4>

            <button type="button" className={checks.publicPost ? 'checked' : ''} onClick={() => updateCheck('publicPost')}>
              <CheckCircle2 size={18} /> My post is public and accessible.
            </button>

            <button type="button" className={checks.officialResources ? 'checked' : ''} onClick={() => updateCheck('officialResources')}>
              <CheckCircle2 size={18} /> I used approved campaign resources/instructions.
            </button>

            <button type="button" className={checks.realViews ? 'checked' : ''} onClick={() => updateCheck('realViews')}>
              <CheckCircle2 size={18} /> My views are real and not artificially boosted.
            </button>

            <button type="button" className={checks.noReusedContent ? 'checked' : ''} onClick={() => updateCheck('noReusedContent')}>
              <CheckCircle2 size={18} /> I am not submitting duplicate/reused content.
            </button>
          </div>

          <button type="submit" className="affiliate-action-btn submit-final-btn">
            Submit for review
          </button>
        </form>
      </div>
    </section>
  );
}`;

code = code.slice(0, block.start) + replacement + code.slice(block.end);

fs.writeFileSync(file, code);
console.log("? Smart clip submission form added.");
