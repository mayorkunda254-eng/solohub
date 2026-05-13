const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// 1. Make toCampaign keep creator ownership fields
code = code.replace(
`  assets: row.assets || []
});`,
`  assets: row.assets || [],
  creatorUserId: row.creator_user_id ?? row.creatorUserId ?? null,
  creator_user_id: row.creator_user_id ?? row.creatorUserId ?? null
});`
);

// 2. Make toCampaignDb send creator ownership fields
code = code.replace(
`  assets: Array.isArray(campaign.assets) ? campaign.assets : []`,
`  assets: Array.isArray(campaign.assets) ? campaign.assets : [],
  creator_user_id: campaign.creator_user_id || campaign.creatorUserId || null`
);

// 3. Make toSubmission keep clipper ownership fields
code = code.replace(
`  createdAt: row.created_at ? String(row.created_at).slice(0, 10) : row.createdAt || today
});`,
`  createdAt: row.created_at ? String(row.created_at).slice(0, 10) : row.createdAt || today,
  clipperUserId: row.clipper_user_id ?? row.clipperUserId ?? null,
  clipper_user_id: row.clipper_user_id ?? row.clipperUserId ?? null
});`
);

// 4. Make toSubmissionDb send clipper ownership fields
code = code.replace(
`  notes: submission.notes || ''
});`,
`  notes: submission.notes || '',
  clipper_user_id: submission.clipper_user_id || submission.clipperUserId || null
});`
);

// 5. Replace content useMemo with filtered dashboard access
const oldBlock = `  const content = useMemo(() => {
    if (page === 'home') return <HomePage setRole={setRole} setPage={setPage} campaigns={campaigns} submissions={submissions} cloudMode={cloudMode} user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} />;
    if (page === 'discover') return <DiscoverPage campaigns={campaigns} setSelectedCampaign={setSelectedCampaign} setPage={setPage} />;
    if (page === 'submit') return <SubmitPage selectedCampaign={selectedCampaign} campaigns={campaigns} onSubmitClip={submitClip} />;
    if (page === 'submissions') return <SubmissionsPage submissions={submissions} />;
    if (page === 'earnings') return <EarningsPage submissions={submissions} />;
    if (page === 'academy') return <AcademyPage />;
    if (page === 'creatorDashboard') return <CreatorDashboard campaigns={campaigns} submissions={submissions} />;
    if (page === 'createCampaign') return <CreateCampaignPage onCreateCampaign={createCampaign} />;
    if (page === 'creatorCampaigns') return <CreatorCampaigns campaigns={campaigns} />;
    if (page === 'creatorSubmissions') return <SubmissionsPage submissions={submissions} title="Creator Submissions" />;
    if (page === 'adminOverview') return <AdminOverview campaigns={campaigns} submissions={submissions} cloudMode={cloudMode} />;
    if (page === 'adminCampaigns') return <AdminCampaigns campaigns={campaigns} onCampaignStatus={campaignStatus} />;
    if (page === 'adminSubmissions') return <AdminSubmissions submissions={submissions} campaigns={campaigns} onReviewSubmission={reviewSubmission} />;
    if (page === 'adminPayouts') return <AdminPayouts submissions={submissions} onMarkPaid={markPaid} />;
    return <HomePage setRole={setRole} setPage={setPage} campaigns={campaigns} submissions={submissions} cloudMode={cloudMode} />;
  }, [page, campaigns, submissions, selectedCampaign, cloudMode, user, profile]);`;

const newBlock = `  const content = useMemo(() => {
    const currentRole = profile?.role ? cleanRole(profile.role) : cleanRole(role);
    const currentUserId = user?.id || null;

    const home = <HomePage setRole={setRole} setPage={setPage} campaigns={campaigns} submissions={submissions} cloudMode={cloudMode} user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} />;

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
    if (page === 'discover') return <DiscoverPage campaigns={campaigns} setSelectedCampaign={setSelectedCampaign} setPage={setPage} />;
    if (page === 'submit') return <SubmitPage selectedCampaign={selectedCampaign} campaigns={campaigns} onSubmitClip={submitClip} />;
    if (page === 'submissions') return <SubmissionsPage submissions={ownClipperSubmissions} />;
    if (page === 'earnings') return <EarningsPage submissions={ownClipperSubmissions} />;
    if (page === 'academy') return <AcademyPage />;

    if (page === 'creatorDashboard') return <CreatorDashboard campaigns={ownCampaigns} submissions={ownCreatorSubmissions} />;
    if (page === 'createCampaign') return <CreateCampaignPage onCreateCampaign={createCampaign} />;
    if (page === 'creatorCampaigns') return <CreatorCampaigns campaigns={ownCampaigns} />;
    if (page === 'creatorSubmissions') return <SubmissionsPage submissions={ownCreatorSubmissions} title="Creator Submissions" />;

    if (page === 'adminOverview') return isAdmin ? <AdminOverview campaigns={campaigns} submissions={submissions} cloudMode={cloudMode} /> : home;
    if (page === 'adminCampaigns') return isAdmin ? <AdminCampaigns campaigns={campaigns} onCampaignStatus={campaignStatus} /> : home;
    if (page === 'adminSubmissions') return isAdmin ? <AdminSubmissions submissions={submissions} campaigns={campaigns} onReviewSubmission={reviewSubmission} /> : home;
    if (page === 'adminPayouts') return isAdmin ? <AdminPayouts submissions={submissions} onMarkPaid={markPaid} /> : home;

    return home;
  }, [page, campaigns, submissions, selectedCampaign, cloudMode, user, profile, role]);`;

if (!code.includes(oldBlock)) {
  throw new Error("Could not find the content useMemo block. Send me App.jsx if this fails.");
}

code = code.replace(oldBlock, newBlock);

fs.writeFileSync(file, code);
console.log("? Phase 7 access control and dashboard filtering applied.");
