const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-saved-campaigns.jsx", code);

// 1. Add helper functions
if (!code.includes("const SAVED_CAMPAIGNS_STORAGE_KEY")) {
  const insertBefore = code.indexOf("function Header");
  if (insertBefore === -1) throw new Error("Could not find Header insertion point.");

  const helper = `
const SAVED_CAMPAIGNS_STORAGE_KEY = 'solohub_saved_campaigns';

function getSavedCampaignIds() {
  try {
    const raw = localStorage.getItem(SAVED_CAMPAIGNS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCampaignIds(ids = []) {
  const cleanIds = Array.from(new Set(ids.filter(Boolean).map(String)));
  localStorage.setItem(SAVED_CAMPAIGNS_STORAGE_KEY, JSON.stringify(cleanIds));
  return cleanIds;
}

`;

  code = code.slice(0, insertBefore) + helper + code.slice(insertBefore);
}

// 2. Add Saved Campaigns menu item for clippers only
if (!code.includes("['savedCampaigns', BookOpen, 'Saved Campaigns']")) {
  code = code.replace(
`    ['discover', Search, 'Discover'],`,
`    ['discover', Search, 'Discover'],
    ['savedCampaigns', BookOpen, 'Saved Campaigns'],`
  );
}

// 3. Add saved campaigns state inside App
if (!code.includes("const [savedCampaignIds, setSavedCampaignIds]")) {
  code = code.replace(
    `const [paymentSettingsTick, setPaymentSettingsTick] = useState(0);`,
    `const [paymentSettingsTick, setPaymentSettingsTick] = useState(0);
  const [savedCampaignIds, setSavedCampaignIds] = useState(() => getSavedCampaignIds());`
  );
}

// 4. Add toggle function before content useMemo
if (!code.includes("const toggleSavedCampaign")) {
  const contentIndex = code.indexOf("const content = useMemo");
  if (contentIndex === -1) throw new Error("Could not find content useMemo.");

  const fn = `  const toggleSavedCampaign = (campaignId) => {
    setSavedCampaignIds((prev) => {
      const id = String(campaignId);
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [id, ...prev];

      saveCampaignIds(next);
      return next;
    });
  };

`;

  code = code.slice(0, contentIndex) + fn + code.slice(contentIndex);
}

// 5. Update DiscoverPage signature
code = code.replace(
  `function DiscoverPage({ campaigns, setSelectedCampaign, setPage })`,
  `function DiscoverPage({ campaigns, setSelectedCampaign, setPage, savedCampaignIds = [], onToggleSaved })`
);

// 6. Add Save button to Discover cards
if (!code.includes("savedCampaignIds.includes(String(campaign.id))")) {
  code = code.replace(
`          const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

          return (`,
`          const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;
          const isSaved = savedCampaignIds.includes(String(campaign.id));

          return (`
  );

  code = code.replace(
`                  <button type="button" className="mini-action ghost" onClick={() => openCampaign(campaign)}>
                    View details
                  </button>

                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip <Upload size={16} />
                  </button>`,
`                  <button type="button" className="mini-action ghost" onClick={() => openCampaign(campaign)}>
                    View details
                  </button>

                  <button type="button" className={isSaved ? "mini-action saved" : "mini-action"} onClick={() => onToggleSaved?.(campaign.id)}>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip <Upload size={16} />
                  </button>`
  );
}

// 7. Add SavedCampaignsPage component before DiscoverPage
if (!code.includes("function SavedCampaignsPage")) {
  const idx = code.indexOf("function DiscoverPage");
  if (idx === -1) throw new Error("Could not find DiscoverPage insertion point.");

  const component = `function SavedCampaignsPage({ campaigns, savedCampaignIds = [], onToggleSaved, setSelectedCampaign, setPage }) {
  const savedCampaigns = campaigns.filter((campaign) =>
    savedCampaignIds.includes(String(campaign.id))
  );

  const openCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setPage('submit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="saved-campaigns-page">
      <div className="section-head">
        <div>
          <Pill tone="green"><BookOpen size={14} /> Saved Campaigns</Pill>
          <h2>Your saved campaign shortlist.</h2>
          <p>Keep campaigns here while you prepare content, download resources, or compare payouts.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={BookOpen} label="Saved" value={savedCampaigns.length} helper="Your shortlist" />
        <StatCard icon={Megaphone} label="Live campaigns" value={campaigns.filter((c) => c.status === 'Live').length} helper="Available now" />
        <StatCard icon={Wallet} label="Best payout" value={money(Math.max(0, ...savedCampaigns.map((c) => Number(c.payPerThousand || 0))))} helper="Among saved" />
      </div>

      <div className="saved-campaign-grid">
        {savedCampaigns.map((campaign) => {
          const imageUrl = campaign.imageUrl || campaign.image_url || '';
          const platformsList = Array.isArray(campaign.platforms) ? campaign.platforms : [];

          return (
            <article key={campaign.id} className="saved-campaign-card">
              <div className="saved-campaign-thumb">
                {imageUrl ? <img src={imageUrl} alt={campaign.title} /> : <div>S</div>}
              </div>

              <div className="saved-campaign-info">
                <div>
                  <h3>{campaign.title}</h3>
                  <p>{campaign.creator || 'SoloHub Creator'} • {campaign.category || 'Campaign'}</p>
                </div>

                <div className="saved-campaign-metrics">
                  <span>Pay: <strong>{money(campaign.payPerThousand || 0)} / 1k views</strong></span>
                  <span>Budget: <strong>{money(campaign.budget || 0)}</strong></span>
                </div>

                <div className="premium-platforms">
                  {platformsList.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
                </div>

                <div className="saved-campaign-actions">
                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip
                  </button>

                  <button type="button" className="mini-action ghost" onClick={() => onToggleSaved?.(campaign.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!savedCampaigns.length && (
          <div className="panel empty-saved">
            <Pill tone="yellow">No saved campaigns</Pill>
            <h3>You have not saved any campaigns yet.</h3>
            <p>Go to Discover and save campaigns you want to submit clips for later.</p>
            <button type="button" className="affiliate-action-btn" onClick={() => setPage('discover')}>
              Open Discover
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

`;

  code = code.slice(0, idx) + component + code.slice(idx);
}

// 8. Add saved campaign route before discover route
if (!code.includes("page === 'savedCampaigns'")) {
  code = code.replace(
`    if (page === 'discover') {`,
`    if (page === 'savedCampaigns') {
      return (
        <SavedCampaignsPage
          campaigns={campaigns}
          savedCampaignIds={savedCampaignIds}
          onToggleSaved={toggleSavedCampaign}
          setSelectedCampaign={setSelectedCampaign}
          setPage={setPage}
        />
      );
    }

    if (page === 'discover') {`
  );
}

// 9. Pass saved props to DiscoverPage
code = code.replaceAll(
  `<DiscoverPage campaigns={campaigns} setSelectedCampaign={setSelectedCampaign} setPage={setPage} />`,
  `<DiscoverPage campaigns={campaigns} setSelectedCampaign={setSelectedCampaign} setPage={setPage} savedCampaignIds={savedCampaignIds} onToggleSaved={toggleSavedCampaign} />`
);

fs.writeFileSync(file, code);
console.log("? Saved Campaigns added.");
