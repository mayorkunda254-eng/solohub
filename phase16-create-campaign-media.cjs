const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Safety backup
fs.writeFileSync("src/App.before-create-campaign-media.jsx", code);

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

// Ensure Supabase campaign mapping supports image/resource fields
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

replaceFunction("CreateCampaignPage", `function CreateCampaignPage({ onCreateCampaign }) {
  const [submittingCampaign, setSubmittingCampaign] = useState(false);

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

  const submit = async () => {
    if (submittingCampaign) return;

    if (!form.title.trim()) {
      alert('Please add a campaign title.');
      return;
    }

    if (!form.description.trim()) {
      alert('Please add a campaign description.');
      return;
    }

    setSubmittingCampaign(true);

    try {
      const campaign = {
        ...form,
        payPerThousand: Number(form.payPerThousand || 0),
        budget: Number(form.budget || 0),
        remaining: Number(form.remaining || form.budget || 0),
        minimumViews: Number(form.minimumViews || 0),
        maxPayout: Number(form.maxPayout || 0),
        platforms: String(form.platforms)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        rules: String(form.rules)
          .split('\\n')
          .map((item) => item.trim())
          .filter(Boolean),
        hashtags: String(form.hashtags)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        assets: form.resourceUrl ? [form.resourceUrl] : [],
        imageUrl: form.imageUrl,
        image_url: form.imageUrl,
        resourceUrl: form.resourceUrl,
        resource_url: form.resourceUrl,
        contentRequirements: form.contentRequirements,
        content_requirements: form.contentRequirements,
        status: 'Pending Approval',
        beginnerFriendly: true,
        verified: false,
        score: 70
      };

      await onCreateCampaign(campaign);
    } finally {
      setSubmittingCampaign(false);
    }
  };

  return (
    <section className="create-premium">
      <div className="create-head">
        <Pill tone="purple">Creator Studio</Pill>
        <h2>Create a campaign for admin approval.</h2>
        <p>Add campaign details, payout rules, a premium image, resource folder, and content requirements.</p>
      </div>

      <div className="create-grid">
        <div className="create-form-card">
          <h3>Campaign details</h3>

          <div className="form-grid">
            <label>
              Campaign title
              <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. MarkTradesFX Gold Clips" />
            </label>

            <label>
              Creator / brand
              <input value={form.creator} onChange={(e) => update('creator', e.target.value)} />
            </label>

            <label>
              Category
              <input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="Forex Education, Food & Bakery..." />
            </label>

            <label>
              Campaign type
              <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option>Clipping</option>
                <option>UGC</option>
                <option>Influencer</option>
              </select>
            </label>

            <label>
              Management
              <select value={form.management} onChange={(e) => update('management', e.target.value)}>
                <option>SoloHub Managed</option>
                <option>Self Managed</option>
              </select>
            </label>

            <label>
              Pay per 1,000 views
              <input type="number" value={form.payPerThousand} onChange={(e) => update('payPerThousand', e.target.value)} />
            </label>

            <label>
              Total budget
              <input type="number" value={form.budget} onChange={(e) => { update('budget', e.target.value); update('remaining', e.target.value); }} />
            </label>

            <label>
              Minimum views
              <input type="number" value={form.minimumViews} onChange={(e) => update('minimumViews', e.target.value)} />
            </label>

            <label>
              Max payout per clip
              <input type="number" value={form.maxPayout} onChange={(e) => update('maxPayout', e.target.value)} />
            </label>

            <label>
              Deadline
              <input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
            </label>
          </div>

          <label>
            Platforms
            <input value={form.platforms} onChange={(e) => update('platforms', e.target.value)} placeholder="TikTok, Instagram Reels, YouTube Shorts" />
          </label>

          <label>
            Campaign image URL
            <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://example.com/banner.jpg" />
          </label>

          <label>
            Resource folder URL
            <input value={form.resourceUrl} onChange={(e) => update('resourceUrl', e.target.value)} placeholder="Google Drive / Dropbox / source folder" />
          </label>

          <label>
            Description
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Explain what clippers should create." />
          </label>

          <label>
            Content requirements
            <textarea value={form.contentRequirements} onChange={(e) => update('contentRequirements', e.target.value)} placeholder="Mention approved clips, captions, hashtags, do's and don'ts." />
          </label>

          <label>
            Rules
            <textarea value={form.rules} onChange={(e) => update('rules', e.target.value)} />
          </label>

          <label>
            Hashtags
            <input value={form.hashtags} onChange={(e) => update('hashtags', e.target.value)} placeholder="#SoloHub, #KenyaCreators" />
          </label>

          <Button type="button" onClick={submit} disabled={submittingCampaign}>
            {submittingCampaign ? 'Submitting...' : 'Submit campaign for approval'}
          </Button>
        </div>

        <div className="campaign-preview-card">
          <h3>Live preview</h3>

          <div className="whop-campaign-card preview">
            <div className="whop-card-top">
              <div className="whop-thumb">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Campaign preview" />
                ) : (
                  <div className="whop-thumb-fallback">S</div>
                )}
              </div>

              <div className="whop-tags">
                <span>Clipping</span>
                <span>{form.category || 'Category'}</span>
              </div>
            </div>

            <h3>{form.title || 'Campaign title'}</h3>

            <div className="whop-creator-row">
              <span>{form.creator || 'Creator brand'}</span>
              <strong>?</strong>
            </div>

            <div className="whop-meta-row">
              <div>
                <small>Budget</small>
                <strong>{money(form.budget || 0)}</strong>
              </div>

              <div>
                <small>CPM</small>
                <strong>{money(form.payPerThousand || 0)} <span>/ 1k</span></strong>
              </div>
            </div>

            <p>{form.description || 'Campaign description will appear here.'}</p>

            <button type="button" className="whop-submit-btn">Submit clip</button>
          </div>

          {form.imageUrl && (
            <div className="image-preview-large">
              <img src={form.imageUrl} alt="Campaign image preview" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}`);

fs.writeFileSync(file, code);
console.log("? Create Campaign image/resource fields added safely.");
