const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-discover-filters.jsx", code);

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

const block = findFunctionBlock("DiscoverPage");

const replacement = `function DiscoverPage({ campaigns, setSelectedCampaign, setPage }) {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('All');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Best Match');

  const liveCampaigns = campaigns.filter((campaign) => campaign.status === 'Live');

  const platforms = Array.from(new Set(
    liveCampaigns.flatMap((campaign) => Array.isArray(campaign.platforms) ? campaign.platforms : [])
  )).filter(Boolean);

  const categories = Array.from(new Set(
    liveCampaigns.map((campaign) => campaign.category).filter(Boolean)
  ));

  const filteredCampaigns = liveCampaigns
    .filter((campaign) => {
      const text = [
        campaign.title,
        campaign.creator,
        campaign.category,
        campaign.description,
        Array.isArray(campaign.tags) ? campaign.tags.join(' ') : '',
        Array.isArray(campaign.platforms) ? campaign.platforms.join(' ') : ''
      ].join(' ').toLowerCase();

      const matchesSearch = !search.trim() || text.includes(search.trim().toLowerCase());
      const matchesPlatform = platform === 'All' || (Array.isArray(campaign.platforms) && campaign.platforms.includes(platform));
      const matchesCategory = category === 'All' || campaign.category === category;

      return matchesSearch && matchesPlatform && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'Highest Pay') {
        return Number(b.payPerThousand || 0) - Number(a.payPerThousand || 0);
      }

      if (sortBy === 'Biggest Budget') {
        return Number(b.budget || 0) - Number(a.budget || 0);
      }

      if (sortBy === 'Newest') {
        return String(b.createdAt || b.created_at || '').localeCompare(String(a.createdAt || a.created_at || ''));
      }

      return Number(b.score || 0) - Number(a.score || 0);
    });

  const openCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setPage('submit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="discover-marketplace-page">
      <div className="section-head discover-head">
        <div>
          <Pill tone="green"><Search size={14} /> Campaign Marketplace</Pill>
          <h2>Find campaigns and submit clips.</h2>
          <p>Search live campaigns by niche, payout, platform, and creator requirements.</p>
        </div>
      </div>

      <div className="discover-filter-bar">
        <label className="discover-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, creators, categories..."
          />
        </label>

        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option>All</option>
          {platforms.map((item) => <option key={item}>{item}</option>)}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>All</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option>Best Match</option>
          <option>Highest Pay</option>
          <option>Biggest Budget</option>
          <option>Newest</option>
        </select>
      </div>

      <div className="discover-results-note">
        Showing <strong>{filteredCampaigns.length}</strong> live campaign{filteredCampaigns.length === 1 ? '' : 's'}.
      </div>

      <div className="premium-campaign-grid">
        {filteredCampaigns.map((campaign) => {
          const imageUrl = campaign.imageUrl || campaign.image_url || '';
          const platformsList = Array.isArray(campaign.platforms) ? campaign.platforms : [];
          const tagsList = Array.isArray(campaign.tags) ? campaign.tags : [];
          const score = Number(campaign.score || 80);
          const budget = Number(campaign.budget || 0);
          const paidOut = Number(campaign.paidOut || campaign.paid_out || 0);
          const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

          return (
            <article key={campaign.id} className="premium-campaign-card">
              <div className="premium-campaign-image">
                {imageUrl ? (
                  <img src={imageUrl} alt={campaign.title} />
                ) : (
                  <div className="premium-campaign-placeholder">S</div>
                )}

                <div className="premium-card-score">
                  <span>Score</span>
                  <strong>{score}</strong>
                </div>

                <div className="premium-card-badges">
                  <Pill tone="green">Live</Pill>
                  {campaign.managedBy === 'admin' || campaign.managed_by === 'admin' ? (
                    <Pill tone="purple">SoloHub Managed</Pill>
                  ) : (
                    <Pill tone="yellow">Creator Managed</Pill>
                  )}
                </div>
              </div>

              <div className="premium-campaign-content">
                <div>
                  <h3>{campaign.title}</h3>
                  <p className="premium-creator-line">
                    {campaign.creator || 'SoloHub Creator'} <CheckCircle2 size={15} />
                  </p>
                </div>

                <p className="premium-description">
                  {campaign.description || 'Create short clips from approved content and submit your public post link for admin review.'}
                </p>

                <div className="premium-tag-row">
                  {campaign.category && <span>{campaign.category}</span>}
                  {tagsList.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                </div>

                <div className="premium-pay-grid">
                  <div>
                    <span>Pay / 1,000 views</span>
                    <strong>{money(campaign.payPerThousand || 0)}</strong>
                  </div>

                  <div>
                    <span>Budget</span>
                    <strong>{money(budget)}</strong>
                  </div>
                </div>

                <div className="whop-progress">
                  <i style={{ width: progress + '%' }} />
                </div>

                <div className="premium-platforms">
                  {platformsList.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
                </div>

                <div className="premium-card-actions">
                  <button type="button" className="mini-action ghost" onClick={() => openCampaign(campaign)}>
                    View details
                  </button>

                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip <Upload size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {!filteredCampaigns.length && (
          <div className="panel empty-discover">
            <Pill tone="yellow">No campaigns found</Pill>
            <h3>No live campaigns match your filters.</h3>
            <p>Try clearing the search, changing platform, or checking again after admin approves new campaigns.</p>
            <button
              type="button"
              className="affiliate-action-btn"
              onClick={() => {
                setSearch('');
                setPlatform('All');
                setCategory('All');
                setSortBy('Best Match');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}`;

code = code.slice(0, block.start) + replacement + code.slice(block.end);

fs.writeFileSync(file, code);
console.log("? Discover marketplace filters added.");
