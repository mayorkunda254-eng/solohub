const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Preserve creator ownership when reading campaigns
if (!code.includes("creatorUserId: row.creator_user_id")) {
  code = code.replace(
    `  assets: row.assets || []
});`,
    `  assets: row.assets || [],
  creatorUserId: row.creator_user_id ?? row.creatorUserId ?? null,
  creator_user_id: row.creator_user_id ?? row.creatorUserId ?? null
});`
  );
}

// Preserve clipper ownership when reading submissions
if (!code.includes("clipperUserId: row.clipper_user_id")) {
  code = code.replace(
    `  createdAt: row.created_at ? String(row.created_at).slice(0, 10) : row.createdAt || today
});`,
    `  createdAt: row.created_at ? String(row.created_at).slice(0, 10) : row.createdAt || today,
  clipperUserId: row.clipper_user_id ?? row.clipperUserId ?? null,
  clipper_user_id: row.clipper_user_id ?? row.clipperUserId ?? null
});`
  );
}

// Preserve clipper ownership when saving submissions
if (!code.includes("clipper_user_id: submission.clipper_user_id")) {
  code = code.replace(
    `  notes: submission.notes || ''
});`,
    `  notes: submission.notes || '',
  clipper_user_id: submission.clipper_user_id || submission.clipperUserId || null
});`
  );
}

// Find the full const content = useMemo(() => { ... }, [...]); block by brace counting
const contentRegex = /[ \t]*const[ \t]+content[ \t]*=[ \t]*useMemo[ \t]*\(\s*\(\s*\)\s*=>\s*\{/m;
const match = contentRegex.exec(code);

if (!match) {
  console.log("Could not find content useMemo. Showing useMemo lines:");
  const lines = code.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("useMemo") || line.includes("content")) {
      console.log(`${index + 1}: ${line}`);
    }
  });
  throw new Error("Could not find content useMemo block.");
}

const start = match.index;
const braceStart = code.indexOf("{", start);

let depth = 0;
let arrowBlockEnd = -1;

for (let i = braceStart; i < code.length; i++) {
  if (code[i] === "{") depth++;
  if (code[i] === "}") depth--;

  if (depth === 0) {
    arrowBlockEnd = i + 1;
    break;
  }
}

if (arrowBlockEnd === -1) {
  throw new Error("Could not find end of content useMemo arrow block.");
}

// Continue until the semicolon ending useMemo(...);
let end = code.indexOf(";", arrowBlockEnd);
if (end === -1) {
  throw new Error("Could not find semicolon after content useMemo block.");
}
end = end + 1;

const newContentBlock = `  const content = useMemo(() => {
    const currentRole = profile?.role ? cleanRole(profile.role) : cleanRole(role);
    const currentUserId = user?.id || null;

    const home = (
      <HomePage
        setRole={setRole}
        setPage={setPage}
        campaigns={campaigns}
        submissions={submissions}
        cloudMode={cloudMode}
        user={user}
        profile={profile}
        onAuthUser={handleAuthUser}
        onLogout={logout}
        onRoleChange={updateProfileRole}
      />
    );

    if (cloudMode && !user && page !== 'home') {
      return home;
    }

    const isAdmin = currentRole === 'admin';

    const ownCampaigns = isAdmin
      ? campaigns
      : campaigns.filter((campaign) =>
          campaign.creatorUserId === currentUserId ||
          campaign.creator_user_id === currentUserId
        );

    const ownCampaignIds = new Set(ownCampaigns.map((campaign) => campaign.id));

    const ownClipperSubmissions = isAdmin
      ? submissions
      : submissions.filter((submission) =>
          submission.clipperUserId === currentUserId ||
          submission.clipper_user_id === currentUserId
        );

    const ownCreatorSubmissions = isAdmin
      ? submissions
      : submissions.filter((submission) =>
          ownCampaignIds.has(submission.campaignId) ||
          ownCampaignIds.has(submission.campaign_id) ||
          ownCampaigns.some((campaign) => campaign.title === submission.campaign)
        );

    if (page === 'home') return home;

    if (page === 'discover') {
      return <DiscoverPage campaigns={campaigns} setSelectedCampaign={setSelectedCampaign} setPage={setPage} />;
    }

    if (page === 'submit') {
      return <SubmitPage selectedCampaign={selectedCampaign} campaigns={campaigns} onSubmitClip={submitClip} />;
    }

    if (page === 'submissions') {
      return <SubmissionsPage submissions={ownClipperSubmissions} />;
    }

    if (page === 'earnings') {
      return <EarningsPage submissions={ownClipperSubmissions} />;
    }

    if (page === 'academy') return <AcademyPage />;

    if (page === 'creatorDashboard') {
      return <CreatorDashboard campaigns={ownCampaigns} submissions={ownCreatorSubmissions} />;
    }

    if (page === 'createCampaign') {
      return <CreateCampaignPage onCreateCampaign={createCampaign} />;
    }

    if (page === 'creatorCampaigns') {
      return <CreatorCampaigns campaigns={ownCampaigns} />;
    }

    if (page === 'creatorSubmissions') {
      return <SubmissionsPage submissions={ownCreatorSubmissions} title="Creator Submissions" />;
    }

    if (page === 'adminOverview') {
      return isAdmin ? <AdminOverview campaigns={campaigns} submissions={submissions} cloudMode={cloudMode} /> : home;
    }

    if (page === 'adminCampaigns') {
      return isAdmin ? <AdminCampaigns campaigns={campaigns} onCampaignStatus={campaignStatus} /> : home;
    }

    if (page === 'adminSubmissions') {
      return isAdmin ? <AdminSubmissions submissions={submissions} campaigns={campaigns} onReviewSubmission={reviewSubmission} /> : home;
    }

    if (page === 'adminPayouts') {
      return isAdmin ? <AdminPayouts submissions={submissions} onMarkPaid={markPaid} /> : home;
    }

    return home;
  }, [page, campaigns, submissions, selectedCampaign, cloudMode, user, profile, role]);`;

code = code.slice(0, start) + newContentBlock + code.slice(end);

fs.writeFileSync(file, code);
console.log("? Phase 7 access control and dashboard filtering applied.");
