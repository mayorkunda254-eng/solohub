const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-campaign-share-links.jsx", code);

// 1. Add campaign share helpers before Header
if (!code.includes("function buildCampaignShareLink")) {
  const insertBefore = code.indexOf("function Header");

  if (insertBefore === -1) {
    throw new Error("Could not find Header insertion point.");
  }

  const helper = `
function getCampaignIdFromUrl() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  return String(params.get('campaign') || params.get('campaignId') || params.get('c') || '').trim();
}

function buildCampaignShareLink(campaign) {
  if (typeof window === 'undefined') return '';

  const id = campaign?.id ? String(campaign.id) : '';
  const url = new URL(window.location.origin + window.location.pathname);

  if (id) {
    url.searchParams.set('campaign', id);
  }

  return url.toString();
}

async function copyCampaignShareLink(campaign) {
  const link = buildCampaignShareLink(campaign);

  if (!link) {
    alert('Campaign link could not be created.');
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    alert('Campaign link copied.');
  } catch (err) {
    window.prompt('Copy campaign link:', link);
  }
}

function clearCampaignIdFromUrl() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.delete('campaign');
  url.searchParams.delete('campaignId');
  url.searchParams.delete('c');

  window.history.replaceState({}, '', url.toString());
}

`;

  code = code.slice(0, insertBefore) + helper + code.slice(insertBefore);
}

// 2. Add URL campaign opener inside App before content useMemo
if (!code.includes("const campaignIdFromUrl = getCampaignIdFromUrl();")) {
  const contentIndex = code.indexOf("const content = useMemo");

  if (contentIndex === -1) {
    throw new Error("Could not find content useMemo.");
  }

  const effect = `  useEffect(() => {
    const campaignIdFromUrl = getCampaignIdFromUrl();

    if (!campaignIdFromUrl || !campaigns.length) return;

    const campaignFromLink = campaigns.find((campaign) =>
      String(campaign.id) === String(campaignIdFromUrl)
    );

    if (!campaignFromLink) return;

    setSelectedCampaign(campaignFromLink);
    setPage('submit');
    clearCampaignIdFromUrl();
  }, [campaigns]);

`;

  code = code.slice(0, contentIndex) + effect + code.slice(contentIndex);
}

// 3. Add share button to Discover campaign cards
if (!code.includes("Copy link</button>")) {
  code = code.replace(
`                  <button type="button" className={isSaved ? "mini-action saved" : "mini-action"} onClick={() => onToggleSaved?.(campaign.id)}>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip <Upload size={16} />
                  </button>`,
`                  <button type="button" className={isSaved ? "mini-action saved" : "mini-action"} onClick={() => onToggleSaved?.(campaign.id)}>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>

                  <button type="button" className="mini-action ghost share-action" onClick={() => copyCampaignShareLink(campaign)}>
                    Copy link
                  </button>

                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip <Upload size={16} />
                  </button>`
  );
}

// 4. Add share button to Saved Campaigns
if (!code.includes("Copy campaign link</button>")) {
  code = code.replace(
`                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip
                  </button>

                  <button type="button" className="mini-action ghost" onClick={() => onToggleSaved?.(campaign.id)}>
                    Remove
                  </button>`,
`                  <button type="button" className="affiliate-action-btn" onClick={() => openCampaign(campaign)}>
                    Submit clip
                  </button>

                  <button type="button" className="mini-action" onClick={() => copyCampaignShareLink(campaign)}>
                    Copy campaign link
                  </button>

                  <button type="button" className="mini-action ghost" onClick={() => onToggleSaved?.(campaign.id)}>
                    Remove
                  </button>`
  );
}

// 5. Add share button to Creator Campaign Manager
if (!code.includes("Copy public link</button>")) {
  code = code.replace(
`                  <button type="button" className="mini-action" onClick={() => copyPaymentSummary(campaign)}>
                    Copy payment summary
                  </button>

                  {draft.resourceUrl && (`,
`                  <button type="button" className="mini-action" onClick={() => copyPaymentSummary(campaign)}>
                    Copy payment summary
                  </button>

                  <button type="button" className="mini-action ghost" onClick={() => copyCampaignShareLink(campaign)}>
                    Copy public link
                  </button>

                  {draft.resourceUrl && (`
  );
}

fs.writeFileSync(file, code);
console.log("? Campaign share links added.");
