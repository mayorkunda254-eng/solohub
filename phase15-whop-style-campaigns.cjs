const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

function findFunctionBlock(functionName) {
  const regex = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = regex.exec(code);
  if (!match) throw new Error(`Could not find function ${functionName}`);

  const start = match.index;
  const braceStart = code.indexOf("{", start);

  let depth = 0;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) {
      return { start, end: i + 1 };
    }
  }

  throw new Error(`Could not find end of function ${functionName}`);
}

function replaceFunction(functionName, replacement) {
  const block = findFunctionBlock(functionName);
  code = code.slice(0, block.start) + replacement + code.slice(block.end);
}

// Confirm these functions exist before changing the file
findFunctionBlock("DiscoverPage");
findFunctionBlock("SubmitPage");
findFunctionBlock("CreateCampaignPage");

// Add campaign image/resource fields to Supabase mapping
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
  const liveCampaigns = campaigns.filter((campaign) => campaign.status === 'Live');

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
        {liveCampaigns.map((campaign) => {
          const paidOut = Math.max(0, Number(campaign.budget || 0) - Number(campaign.remaining || 0));
          const budget = Number(campaign.budget || 0);
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
                {campaign.verified && <strong>?</strong>}
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
  const campaign = selectedCampaign || campaigns.find((item) => item.status === 'Live');
  const [postUrl, setPostUrl] = useState('');
  const [submittedViews, setSubmittedViews] = useState('');
  const [platform, setPlatform] = useState('TikTok');

  if (!campaign) {
    return (
      <section className="panel">
        <h2>No campaign selected.</h2>
        <p>Go to Discover and choose a live campaign first.</p>
      </section>
    );
  }

  const paidOut = Math.max(0, Number(campaign.budget || 0) - Number(campaign.remaining || 0));
  const budget = Number(campaign.budget || 0);
  const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

  const submit = () => {
    onSubmitClip({
      campaignId: campaign.id,
      campaign: campaign.title,
      clipper: 'SoloHub Clipper',
      platform,
      postUrl,
      submittedViews: Number(submittedViews || 0),
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
        <div><span>Deadline</span><strong>{campaign.deadline}</strong></div>
      </div>

      <div className="submit-video-box">
        <h3>Submit your clip</h3>
        <p>Paste your public TikTok, Instagram Reels, or YouTube Shorts link. Admin will verify views before payout.</p>

        <div className="submit-grid">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option>TikTok</option>
            <option>Instagram Reels</option>
            <option>YouTube Shorts</option>
          </select>

          <input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="Public post URL" />
          <input value={submittedViews} onChange={(e) => setSubmittedViews(e.target.value)} placeholder="Current views" type="number" />

          <Button onClick={submit}>Submit Video</Button>
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
            <small>{money(campaign.maxPayout)} max</small>
          </div>
        ))}
      </div>
    </section>
  );
}`);

replaceFunction("CreateCampaignPage", `function CreateCampaignPage({ onCreateCampaign }) {
  const [form, setForm] = useState({
    title: '',
    creator: 'Demo Creator',
    category: 'Education',
    type: 'Clipping',
    management: 'SoloHub Managed',
    payPerThousand: 80,
    budget: 10000,
    remaining: 10000,
    minimumViews: 1000,
    maxPayout: 1500,
    platforms: 'TikTok, Instagram Reels, YouTube Shorts',
    deadline: '',
    description: '',
    rules: 'Use approved content only.',
    hashtags: '#SoloHub',
    imageUrl: '',
    resourceUrl: '',
    contentRequirements: ''
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    const campaign = {
      ...form,
      platforms: String(form.platforms).split(',').map((item) => item.trim()).filter(Boolean),
      rules: String(form.rules).split('\\n').map((item) => item.trim()).filter(Boolean),
      hashtags: String(form.hashtags).split(',').map((item) => item.trim()).filter(Boolean),
      assets: form.resourceUrl ? [form.resourceUrl] : [],
      remaining: Number(form.remaining || form.budget || 0),
      status: 'Pending Approval',
      beginnerFriendly: true,
      verified: false,
      score: 70
    };

    onCreateCampaign(campaign);
  };

  return (
    <section className="create-premium">
      <div className="create-head">
        <Pill tone="purple">Creator Studio</Pill>
        <h2>Create a campaign for admin approval.</h2>
        <p>Add a premium campaign image, source resources, requirements, payout rules, and submission instructions.</p>
      </div>

      <div className="create-grid">
        <div className="create-form-card">
          <h3>Campaign details</h3>

          <div className="form-grid">
            <label>Campaign title<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. MarkTradesFX Gold Clips" /></label>
            <label>Creator / brand<input value={form.creator} onChange={(e) => update('creator', e.target.value)} /></label>
            <label>Category<input value={form.category} onChange={(e) => update('category', e.target.value)} /></label>
            <label>Campaign type<input value={form.type} onChange={(e) => update('type', e.target.value)} /></label>
            <label>Management<input value={form.management} onChange={(e) => update('management', e.target.value)} /></label>
            <label>Pay per 1,000 views<input type="number" value={form.payPerThousand} onChange={(e) => update('payPerThousand', e.target.value)} /></label>
            <label>Total budget<input type="number" value={form.budget} onChange={(e) => { update('budget', e.target.value); update('remaining', e.target.value); }} /></label>
            <label>Minimum views<input type="number" value={form.minimumViews} onChange={(e) => update('minimumViews', e.target.value)} /></label>
            <label>Max payout per clip<input type="number" value={form.maxPayout} onChange={(e) => update('maxPayout', e.target.value)} /></label>
            <label>Deadline<input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} /></label>
          </div>

          <label>Platforms<input value={form.platforms} onChange={(e) => update('platforms', e.target.value)} placeholder="TikTok, Instagram Reels, YouTube Shorts" /></label>
          <label>Campaign image URL<input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://..." /></label>
          <label>Resource folder URL<input value={form.resourceUrl} onChange={(e) => update('resourceUrl', e.target.value)} placeholder="Google Drive / Dropbox / source folder" /></label>
          <label>Description<textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Explain what clippers should create." /></label>
          <label>Content requirements<textarea value={form.contentRequirements} onChange={(e) => update('contentRequirements', e.target.value)} placeholder="Mention rules, caption requirements, approved clips, hashtags, and restrictions." /></label>
          <label>Rules<textarea value={form.rules} onChange={(e) => update('rules', e.target.value)} /></label>
          <label>Hashtags<input value={form.hashtags} onChange={(e) => update('hashtags', e.target.value)} /></label>

          <Button onClick={submit}>Submit campaign for approval</Button>
        </div>

        <div className="campaign-preview-card">
          <h3>Preview</h3>
          <div className="whop-campaign-card preview">
            <div className="whop-card-top">
              <div className="whop-thumb">
                {form.imageUrl ? <img src={form.imageUrl} alt="Campaign preview" /> : <div className="whop-thumb-fallback">S</div>}
              </div>
              <div className="whop-tags">
                <span>Clipping</span>
                <span>{form.category}</span>
              </div>
            </div>

            <h3>{form.title || 'Campaign title'}</h3>
            <div className="whop-creator-row"><span>{form.creator}</span><strong>?</strong></div>

            <div className="whop-meta-row">
              <div><small>Budget</small><strong>{money(form.budget)}</strong></div>
              <div><small>CPM</small><strong>{money(form.payPerThousand)} <span>/ 1k</span></strong></div>
            </div>

            <p>{form.description || 'Campaign description will appear here.'}</p>
          </div>
        </div>
      </div>
    </section>
  );
}`);

fs.writeFileSync(file, code);
console.log("? Whop-inspired campaign cards, detail page, and campaign images added.");
