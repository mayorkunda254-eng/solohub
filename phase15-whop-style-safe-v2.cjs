const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Safety backup
fs.writeFileSync("src/App.before-whop-v2.jsx", code);

function findFunctionBlock(functionName) {
  const startRegex = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = startRegex.exec(code);

  if (!match) {
    throw new Error(`Could not find function ${functionName}`);
  }

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

  if (closeParen === -1) {
    throw new Error(`Could not find closing params for ${functionName}`);
  }

  const braceStart = code.indexOf("{", closeParen);

  if (braceStart === -1) {
    throw new Error(`Could not find body start for ${functionName}`);
  }

  let depth = 0;

  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) {
      return { start, end: i + 1 };
    }
  }

  throw new Error(`Could not find body end for ${functionName}`);
}

function replaceFunction(functionName, replacement) {
  const block = findFunctionBlock(functionName);
  code = code.slice(0, block.start) + replacement + code.slice(block.end);
}

// Add campaign media fields to Supabase row mapping
if (!code.includes("imageUrl: row.image_url")) {
  code = code.replace(
    /assets:\s*row\.assets\s*\|\|\s*\[\](,?)/,
    `assets: row.assets || [],
  imageUrl: row.image_url || row.imageUrl || '',
  image_url: row.image_url || row.imageUrl || '',
  resourceUrl: row.resource_url || row.resourceUrl || '',
  resource_url: row.resource_url || row.resourceUrl || '',
  contentRequirements: row.content_requirements || row.contentRequirements || '',
  content_requirements: row.content_requirements || row.contentRequirements || ''$1`
  );
}

// Add campaign media fields to DB insert/update mapping
if (!code.includes("image_url: campaign.image_url")) {
  code = code.replace(
    /assets:\s*Array\.isArray\(campaign\.assets\)\s*\?\s*campaign\.assets\s*:\s*\[\](,?)/,
    `assets: Array.isArray(campaign.assets) ? campaign.assets : [],
  image_url: campaign.image_url || campaign.imageUrl || '',
  resource_url: campaign.resource_url || campaign.resourceUrl || '',
  content_requirements: campaign.content_requirements || campaign.contentRequirements || ''$1`
  );
}

replaceFunction("DiscoverPage", `function DiscoverPage({ campaigns, setSelectedCampaign, setPage }) {
  const live = campaigns.filter((c) => c.status === 'Live');

  const openCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setPage('submit');
  };

  return (
    <section className="whop-page">
      <div className="whop-page-head">
        <div>
          <Pill tone="purple">Content Rewards</Pill>
          <h2>Campaigns</h2>
          <p>Discover active campaigns, review requirements, and submit your clips.</p>
        </div>
        <div className="whop-search">Search campaigns</div>
      </div>

      <div className="whop-campaign-grid">
        {live.map((campaign) => {
          const budget = Number(campaign.budget || 0);
          const remaining = Number(campaign.remaining || 0);
          const paidOut = Math.max(0, budget - remaining);
          const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

          return (
            <article key={campaign.id} className="whop-campaign-card" onClick={() => openCampaign(campaign)}>
              <div className="whop-card-top">
                <div className="whop-thumb">
                  {campaign.imageUrl ? (
                    <img src={campaign.imageUrl} alt={campaign.title} />
                  ) : (
                    <div className="whop-thumb-fallback">S</div>
                  )}
                </div>

                <div className="whop-tags">
                  <span>Clipping</span>
                  <span>{campaign.category}</span>
                </div>
              </div>

              <h3>{campaign.title}</h3>

              <div className="whop-creator-row">
                <span>{campaign.creator}</span>
                <strong>?</strong>
              </div>

              <div className="whop-meta-row">
                <div>
                  <small>Paid Out</small>
                  <strong>{money(paidOut)} <span>/ {money(budget)}</span></strong>
                </div>
                <div>
                  <small>CPM</small>
                  <strong>{money(campaign.payPerThousand)} <span>/ 1k views</span></strong>
                </div>
              </div>

              <div className="whop-progress">
                <i style={{ width: progress + '%' }} />
              </div>

              <div className="whop-card-bottom">
                <div>
                  <small>Minimum views</small>
                  <strong>{Number(campaign.minimumViews || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <small>Max payout</small>
                  <strong>{money(campaign.maxPayout)}</strong>
                </div>
              </div>

              <button type="button" className="whop-submit-btn" onClick={(e) => { e.stopPropagation(); openCampaign(campaign); }}>
                Submit clip
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}`);

replaceFunction("SubmitPage", `function SubmitPage({ selectedCampaign, campaigns, onSubmitClip }) {
  const firstLive = campaigns.find((c) => c.status === 'Live');
  const campaign = selectedCampaign || firstLive;

  const [form, setForm] = useState({
    platform: 'TikTok',
    postUrl: '',
    submittedViews: ''
  });

  if (!campaign) {
    return (
      <section className="panel">
        <h2>No campaign selected.</h2>
        <p>Go to Discover and choose a live campaign first.</p>
      </section>
    );
  }

  const budget = Number(campaign.budget || 0);
  const remaining = Number(campaign.remaining || 0);
  const paidOut = Math.max(0, budget - remaining);
  const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    if (!form.postUrl) {
      alert('Please paste your public post URL.');
      return;
    }

    onSubmitClip({
      campaignId: campaign.id,
      campaign: campaign.title,
      clipper: 'SoloHub Clipper',
      platform: form.platform,
      postUrl: form.postUrl,
      submittedViews: Number(form.submittedViews || 0),
      payout: 0,
      status: 'Pending Review'
    });
  };

  return (
    <section className="campaign-detail">
      <div className="campaign-detail-hero">
        <div>
          <Pill tone="purple">Content Rewards</Pill>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>

          <div className="campaign-detail-tags">
            <span>Clipping</span>
            <span>{campaign.category}</span>
            <span>{money(campaign.payPerThousand)} / 1k views</span>
          </div>
        </div>

        <div className="campaign-detail-image">
          {campaign.imageUrl ? (
            <img src={campaign.imageUrl} alt={campaign.title} />
          ) : (
            <div className="campaign-detail-fallback">SoloHub</div>
          )}
        </div>
      </div>

      <div className="campaign-budget-card">
        <div className="budget-line">
          <strong>{money(budget)} budget</strong>
          <span>{money(paidOut)} paid out</span>
        </div>
        <div className="whop-progress large">
          <i style={{ width: progress + '%' }} />
        </div>
      </div>

      <div className="campaign-info-table">
        <div><span>Category</span><strong>{campaign.category}</strong></div>
        <div><span>Type</span><strong>{campaign.type}</strong></div>
        <div><span>Platforms</span><strong>{Array.isArray(campaign.platforms) ? campaign.platforms.join(', ') : campaign.platforms}</strong></div>
        <div><span>Deadline</span><strong>{campaign.deadline || 'Open'}</strong></div>
      </div>

      <div className="submit-video-box">
        <h3>Submit your clip</h3>
        <p>Paste your public TikTok, Instagram Reels, or YouTube Shorts link. Admin will verify views before payout.</p>

        <div className="submit-grid">
          <select value={form.platform} onChange={(e) => update('platform', e.target.value)}>
            <option>TikTok</option>
            <option>Instagram Reels</option>
            <option>YouTube Shorts</option>
          </select>

          <input value={form.postUrl} onChange={(e) => update('postUrl', e.target.value)} placeholder="Public post URL" />
          <input value={form.submittedViews} onChange={(e) => update('submittedViews', e.target.value)} placeholder="Current views" type="number" />

          <Button type="button" onClick={submit}>Submit Video</Button>
        </div>
      </div>

      <div className="campaign-requirements">
        <h3>Requirements</h3>
        <p>{campaign.contentRequirements || campaign.rules?.join(' ') || 'Use approved campaign content only. Follow the creator instructions carefully.'}</p>

        {campaign.resourceUrl && (
          <a className="resource-card" href={campaign.resourceUrl} target="_blank" rel="noreferrer">
            <strong>Campaign Resources</strong>
            <span>Open source folder</span>
          </a>
        )}
      </div>

      <div className="earnings-cards">
        {(Array.isArray(campaign.platforms) ? campaign.platforms : ['TikTok']).map((item) => (
          <div key={item} className="earning-card">
            <strong>{item}</strong>
            <span>{money(campaign.payPerThousand)} / 1k views</span>
            <small>{money(campaign.maxPayout)} max payout</small>
          </div>
        ))}
      </div>
    </section>
  );
}`);

fs.writeFileSync(file, code);
console.log("? Whop-style Discover and campaign detail pages patched safely.");
