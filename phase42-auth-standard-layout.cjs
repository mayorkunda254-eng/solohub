const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-auth-standard-layout.jsx", code);

// 1. Add clean logged-out auth page component before HomePage
if (!code.includes("function LoggedOutAuthPage")) {
  code = code.replace(
`function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode, inviteRole }) {`,
`function LoggedOutAuthPage({ user, profile, onAuthUser, onLogout, referralCode, inviteRole, cloudMode }) {
  return (
    <section className="logged-out-auth-page">
      <div className="auth-marketing-card">
        <Pill tone="green"><Sparkles size={14} /> SoloHub MVP</Pill>

        <h1>Content rewards, campaign tracking, and creator payouts.</h1>

        <p>
          Manage clipping campaigns, verify submissions, track deposits, monitor payouts,
          and onboard creators, clippers, and affiliates from one premium dashboard.
        </p>

        <div className="auth-marketing-points">
          <span><ShieldCheck size={16} /> Admin verified submissions</span>
          <span><Wallet size={16} /> Manual M-Pesa payout tracking</span>
          <span><Megaphone size={16} /> Creator campaign manager</span>
          <span><Coins size={16} /> Affiliate-ready growth</span>
        </div>

        <div className="auth-storage-pill">
          <strong>{cloudMode ? 'Cloud mode active' : 'Local mode active'}</strong>
          <span>{cloudMode ? 'Data saves in Supabase.' : 'Data saves in this browser only.'}</span>
        </div>
      </div>

      <AuthBox
        user={user}
        profile={profile}
        onAuthUser={onAuthUser}
        onLogout={onLogout}
        referralCode={referralCode}
        inviteRole={inviteRole}
      />
    </section>
  );
}

function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode, inviteRole }) {`
  );
}

// 2. Make HomePage return clean auth screen when logged out
if (!code.includes("return <LoggedOutAuthPage")) {
  code = code.replace(
`  const liveCampaigns = campaigns.filter((c) => c.status === 'Live').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'Pending Review').length;
  return (`,
`  const liveCampaigns = campaigns.filter((c) => c.status === 'Live').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'Pending Review').length;

  if (!user) {
    return <LoggedOutAuthPage user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} referralCode={referralCode} inviteRole={inviteRole} cloudMode={cloudMode} />;
  }

  return (`
  );
}

// 3. Pass referralCode/inviteRole into HomePage from App
code = code.replace(
`        onRoleChange={updateProfileRole}
      />`,
`        onRoleChange={updateProfileRole}
        referralCode={referralCode}
        inviteRole={inviteRole}
      />`
);

// 4. Make app shell standalone when logged out and remove sidebar from logged-out render
code = code.replace(
`      <div className="app-shell">
        <Sidebar role={roleForUser(user, profile, role)} page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} cloudMode={cloudMode} />
        <main>`,
`      <div className={user ? "app-shell" : "app-shell auth-shell"}>
        {user && (
          <Sidebar role={roleForUser(user, profile, role)} page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} cloudMode={cloudMode} />
        )}
        <main className={user ? "" : "auth-main"}>`
);

fs.writeFileSync(file, code);
console.log("? Auth page converted to proper standalone layout.");
