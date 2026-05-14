const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-onboarding-checklist.jsx", code);

// 1. Add onboarding menu item to all role menus
if (!code.includes("['onboarding', CheckCircle2, 'Getting Started']")) {
  code = code.replaceAll(
    `['activity', ShieldCheck, 'Activity'],`,
    `['activity', ShieldCheck, 'Activity'],
    ['onboarding', CheckCircle2, 'Getting Started'],`
  );

  // fallback if Activity was not found in some menu
  code = code.replaceAll(
    `['home', Home, 'Home'],`,
    `['home', Home, 'Home'],
    ['onboarding', CheckCircle2, 'Getting Started'],`
  );
}

// 2. Add OnboardingChecklist component before ActivityCenter/Submissions
if (!code.includes("function OnboardingChecklist")) {
  const insertBefore = code.includes("function ActivityCenter")
    ? "function ActivityCenter"
    : code.includes("function CreatorSubmissionsPage")
      ? "function CreatorSubmissionsPage"
      : "function SubmissionsPage";

  const idx = code.indexOf(insertBefore);
  if (idx === -1) throw new Error("Could not find component insertion point.");

  const component = `function OnboardingChecklist({ role, profile, campaigns = [], submissions = [], setPage }) {
  const clean = cleanRole(role);

  const hasPayoutProfile = Boolean(profile?.mpesa_phone || profile?.mpesaPhone);
  const hasCampaign = campaigns.length > 0;
  const hasLiveCampaign = campaigns.some((campaign) => campaign.status === 'Live');
  const hasCampaignImage = campaigns.some((campaign) => campaign.imageUrl || campaign.image_url);
  const hasCampaignResources = campaigns.some((campaign) => campaign.resourceUrl || campaign.resource_url);
  const hasPaymentReference = campaigns.some((campaign) => campaign.paymentReference || campaign.payment_reference);
  const hasSubmission = submissions.length > 0;
  const hasApprovedSubmission = submissions.some((submission) => submission.status === 'Approved' || submission.status === 'Paid');
  const hasPaidSubmission = submissions.some((submission) => submission.status === 'Paid');

  const adminSteps = [
    {
      title: 'Set platform payment details',
      description: 'Add your M-Pesa Till/Paybill once ready so creators know where to deposit campaign funds.',
      done: SOLOHUB_PAYMENT_DETAILS.status === 'Active' && SOLOHUB_PAYMENT_DETAILS.number !== 'To be added',
      action: 'Open Settings',
      page: 'adminSettings'
    },
    {
      title: 'Create or approve campaigns',
      description: 'Add managed campaigns or approve creator-submitted campaigns after confirming payment.',
      done: hasCampaign,
      action: 'Open Campaigns',
      page: 'adminCampaigns'
    },
    {
      title: 'Confirm deposits',
      description: 'Update deposit status, amount, payment reference, and admin notes before campaigns go live.',
      done: campaigns.some((campaign) => ['Paid', 'Partial'].includes(campaign.depositStatus || campaign.deposit_status)),
      action: 'Open Campaigns',
      page: 'adminCampaigns'
    },
    {
      title: 'Review submissions',
      description: 'Verify submitted views, check fraud risk, approve valid clips, and reject suspicious clips.',
      done: submissions.some((submission) => submission.status !== 'Pending Review'),
      action: 'Open Submissions',
      page: 'adminSubmissions'
    },
    {
      title: 'Manage user roles',
      description: 'Promote accounts to creator/admin or correct accounts that signed up with the wrong role.',
      done: true,
      action: 'Open Users',
      page: 'adminUsers'
    }
  ];

  const creatorSteps = [
    {
      title: 'Create your first campaign',
      description: 'Set the campaign title, budget, payout rate, platforms, and content rules.',
      done: hasCampaign,
      action: 'Create Campaign',
      page: 'createCampaign'
    },
    {
      title: 'Add campaign image and resources',
      description: 'Add a strong image and a Google Drive/resource folder so clippers know what to use.',
      done: hasCampaignImage && hasCampaignResources,
      action: 'Manage Campaigns',
      page: 'creatorCampaigns'
    },
    {
      title: 'Add payment reference',
      description: 'After paying the campaign deposit, add the M-Pesa/payment reference for admin confirmation.',
      done: hasPaymentReference,
      action: 'Manage Campaigns',
      page: 'creatorCampaigns'
    },
    {
      title: 'Wait for admin approval',
      description: 'Admin confirms your deposit and approves the campaign before clippers can submit.',
      done: hasLiveCampaign,
      action: 'View Campaigns',
      page: 'creatorCampaigns'
    },
    {
      title: 'Track clip performance',
      description: 'Monitor submitted clips, approved views, review notes, and payout impact.',
      done: hasSubmission,
      action: 'View Submissions',
      page: 'creatorSubmissions'
    }
  ];

  const clipperSteps = [
    {
      title: 'Save your payout profile',
      description: 'Add your M-Pesa name and phone number so admin can pay approved earnings.',
      done: hasPayoutProfile,
      action: 'Open Earnings',
      page: 'earnings'
    },
    {
      title: 'Find a live campaign',
      description: 'Open Discover and choose a campaign that matches your niche and platform.',
      done: hasLiveCampaign,
      action: 'Discover Campaigns',
      page: 'discover'
    },
    {
      title: 'Submit your first clip',
      description: 'Paste your TikTok, Reels, or Shorts post link and submit views for review.',
      done: hasSubmission,
      action: 'My Submissions',
      page: 'submissions'
    },
    {
      title: 'Wait for admin review',
      description: 'Admin verifies views and checks for suspicious/fake traffic before payout.',
      done: hasApprovedSubmission || hasPaidSubmission,
      action: 'My Submissions',
      page: 'submissions'
    },
    {
      title: 'Track payout status',
      description: 'Approved clips move to earnings. Paid clips show payment reference and receipt.',
      done: hasPaidSubmission,
      action: 'Open Earnings',
      page: 'earnings'
    }
  ];

  const steps = clean === 'admin' ? adminSteps : clean === 'creator' ? creatorSteps : clipperSteps;
  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  const headline = clean === 'admin'
    ? 'Set up and operate SoloHub like a real platform.'
    : clean === 'creator'
      ? 'Launch your campaign and start receiving clips.'
      : 'Start submitting clips and prepare for payouts.';

  return (
    <section className="onboarding-page">
      <div className="onboarding-hero">
        <div>
          <Pill tone="green"><CheckCircle2 size={14} /> Getting Started</Pill>
          <h2>{headline}</h2>
          <p>Complete these steps to get the most out of SoloHub.</p>
        </div>

        <div className="onboarding-progress-card">
          <span>Progress</span>
          <strong>{completed}/{steps.length}</strong>
          <div className="whop-progress">
            <i style={{ width: progress + '%' }} />
          </div>
          <small>{progress}% complete</small>
        </div>
      </div>

      <div className="onboarding-steps">
        {steps.map((step, index) => (
          <article key={step.title} className={step.done ? 'onboarding-step done' : 'onboarding-step'}>
            <div className="step-number">
              {step.done ? <CheckCircle2 size={20} /> : index + 1}
            </div>

            <div className="step-content">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>

            <button type="button" className="mini-action" onClick={() => setPage(step.page)}>
              {step.action}
            </button>
          </article>
        ))}
      </div>

      <div className="onboarding-tip-card">
        <div>
          <h3>SoloHub tip</h3>
          <p>
            {clean === 'admin'
              ? 'Use Admin ? Settings first when your Till/Paybill is ready, then campaigns and invoices will show the correct payment details automatically.'
              : clean === 'creator'
                ? 'Campaigns should have clear requirements, strong images, and resource folders. This helps clippers create better content.'
                : 'Use real public post links and avoid fake views. Admin-approved views are what count toward payout.'}
          </p>
        </div>
      </div>
    </section>
  );
}

`;

  code = code.slice(0, idx) + component + code.slice(idx);
}

// 3. Add onboarding route
if (!code.includes("page === 'onboarding'")) {
  const routeAnchor = `    if (page === 'activity') {`;

  if (code.includes(routeAnchor)) {
    code = code.replace(
      routeAnchor,
      `    if (page === 'onboarding') {
      const onboardingCampaigns = isAdmin ? campaigns : currentRole === 'creator' ? ownCampaigns : campaigns.filter((campaign) => campaign.status === 'Live');
      const onboardingSubmissions = isAdmin ? submissions : currentRole === 'creator' ? ownCreatorSubmissions : ownClipperSubmissions;
      return <OnboardingChecklist role={currentRole} profile={profile} campaigns={onboardingCampaigns} submissions={onboardingSubmissions} setPage={setPage} />;
    }

${routeAnchor}`
    );
  } else {
    const homeAnchor = `    if (page === 'home') return home;`;

    if (!code.includes(homeAnchor)) throw new Error("Could not find route insertion point.");

    code = code.replace(
      homeAnchor,
      `    if (page === 'onboarding') {
      const onboardingCampaigns = isAdmin ? campaigns : currentRole === 'creator' ? ownCampaigns : campaigns.filter((campaign) => campaign.status === 'Live');
      const onboardingSubmissions = isAdmin ? submissions : currentRole === 'creator' ? ownCreatorSubmissions : ownClipperSubmissions;
      return <OnboardingChecklist role={currentRole} profile={profile} campaigns={onboardingCampaigns} submissions={onboardingSubmissions} setPage={setPage} />;
    }

${homeAnchor}`
    );
  }
}

fs.writeFileSync(file, code);
console.log("? Onboarding checklist added.");
