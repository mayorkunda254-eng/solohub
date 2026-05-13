const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Keep campaign ownership when reading from Supabase
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

// Send campaign ownership to Supabase
if (!code.includes("creator_user_id: campaign.creator_user_id")) {
  code = code.replace(
    `  assets: Array.isArray(campaign.assets) ? campaign.assets : []`,
    `  assets: Array.isArray(campaign.assets) ? campaign.assets : [],
  creator_user_id: campaign.creator_user_id || campaign.creatorUserId || null`
  );
}

// Keep clipper ownership when reading from Supabase
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

// Send clipper ownership to Supabase
if (!code.includes("clipper_user_id: submission.clipper_user_id")) {
  code = code.replace(
    `  notes: submission.notes || ''
});`,
    `  notes: submission.notes || '',
  clipper_user_id: submission.clipper_user_id || submission.clipperUserId || null
});`
  );
}

// Replace content useMemo by locating it and stopping before the main return
const startText = "  const content = useMemo(() => {";
const start = code.indexOf(startText);

if (start === -1) {
  throw new Error("Could not find start of content useMemo.");
}

const end = code.indexOf("\n\n  return (", start);

if (end === -1) {
  throw new Error("Could not find end of content useMemo before return.");
}

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
console.log("? Phase 7 access control and dashboard filtering applied safely.");
