const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-invite-links.jsx", code);

// 1. Add invite role helpers
if (!code.includes("const INVITE_ROLE_STORAGE_KEY")) {
  const anchor = code.includes("const REFERRAL_STORAGE_KEY")
    ? "const REFERRAL_STORAGE_KEY"
    : "const roleForUser =";

  const idx = code.indexOf(anchor);
  if (idx === -1) throw new Error("Could not find helper insertion point.");

  const helper = `
const INVITE_ROLE_STORAGE_KEY = 'solohub_invite_role';

const cleanInviteRole = (value) => {
  const role = String(value || '').trim().toLowerCase();
  return ['clipper', 'creator'].includes(role) ? role : '';
};

function captureInviteRoleFromUrl() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const role = cleanInviteRole(params.get('role') || params.get('account') || params.get('type'));

  if (role) {
    localStorage.setItem(INVITE_ROLE_STORAGE_KEY, role);
  }

  return cleanInviteRole(localStorage.getItem(INVITE_ROLE_STORAGE_KEY));
}

function clearInviteRole() {
  try {
    localStorage.removeItem(INVITE_ROLE_STORAGE_KEY);
  } catch {}
}

function buildInviteLink(targetRole, refCode = '') {
  const role = cleanInviteRole(targetRole) || 'clipper';
  const url = new URL(window.location.origin + window.location.pathname);

  url.searchParams.set('role', role);

  const cleanRef = typeof cleanReferralCode === 'function'
    ? cleanReferralCode(refCode)
    : String(refCode || '').trim().toUpperCase();

  if (cleanRef) {
    url.searchParams.set('ref', cleanRef);
  }

  return url.toString();
}

`;

  code = code.slice(0, idx) + helper + code.slice(idx);
}

// 2. Add inviteRole app state
if (!code.includes("const [inviteRole, setInviteRole]")) {
  code = code.replace(
    `const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());`,
    `const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());
  const [inviteRole, setInviteRole] = useState(() => captureInviteRoleFromUrl());`
  );
}

// 3. Capture invite role on app load
if (!code.includes("setInviteRole(captureInviteRoleFromUrl());")) {
  code = code.replace(
    `setReferralCode(captureReferralCodeFromUrl());`,
    `setReferralCode(captureReferralCodeFromUrl());
    setInviteRole(captureInviteRoleFromUrl());`
  );
}

// 4. Update AuthBox signature
code = code.replace(
  `function AuthBox({ user, profile, onAuthUser, onLogout, referralCode })`,
  `function AuthBox({ user, profile, onAuthUser, onLogout, referralCode, inviteRole })`
);

code = code.replace(
  `function AuthBox({ user, profile, onAuthUser, onLogout })`,
  `function AuthBox({ user, profile, onAuthUser, onLogout, referralCode, inviteRole })`
);

// 5. Make signup role use invite role
code = code.replace(
  `const [accountRole, setAccountRole] = useState('clipper');`,
  `const [accountRole, setAccountRole] = useState(() => cleanInviteRole(inviteRole) || 'clipper');

  useEffect(() => {
    const invited = cleanInviteRole(inviteRole);
    if (invited) {
      setAccountRole(invited);
    }
  }, [inviteRole]);`
);

// 6. Clear invite role after auth success
code = code.replaceAll(
  `if (data?.user) await onAuthUser(data.user, accountRole, fullName);`,
  `if (data?.user) {
        await onAuthUser(data.user, accountRole, fullName);
        clearInviteRole();
      }`
);

code = code.replaceAll(
  `if (data?.user) await onAuthUser(data.user, undefined, fullName);`,
  `if (data?.user) {
        await onAuthUser(data.user, undefined, fullName);
      }`
);

// 7. Add invite banner inside auth form
if (!code.includes("Invite role selected")) {
  code = code.replace(
`        {referralCode && (
          <div className="referral-banner">
            Referral code applied: <strong>{referralCode}</strong>
          </div>
        )}`,
`        {referralCode && (
          <div className="referral-banner">
            Referral code applied: <strong>{referralCode}</strong>
          </div>
        )}

        {cleanInviteRole(inviteRole) && (
          <div className="invite-banner">
            Invite role selected: <strong>{cleanInviteRole(inviteRole)}</strong>
          </div>
        )}`
  );

  // fallback if referral banner was not found
  if (!code.includes("Invite role selected")) {
    code = code.replace(
      `<form className="auth-form auth-form-wide" onSubmit={mode === 'signup' ? signUp : signIn}>`,
      `<form className="auth-form auth-form-wide" onSubmit={mode === 'signup' ? signUp : signIn}>
        {cleanInviteRole(inviteRole) && (
          <div className="invite-banner">
            Invite role selected: <strong>{cleanInviteRole(inviteRole)}</strong>
          </div>
        )}`
    );
  }
}

// 8. HomePage accepts inviteRole
code = code.replace(
  `function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode })`,
  `function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode, inviteRole })`
);

code = code.replace(
  `function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange })`,
  `function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode, inviteRole })`
);

// 9. Pass inviteRole to AuthBox
code = code.replaceAll(
  `<AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} referralCode={referralCode} />`,
  `<AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} referralCode={referralCode} inviteRole={inviteRole} />`
);

code = code.replaceAll(
  `<AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} referralCode={referralCode} />`,
  `<AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} referralCode={referralCode} inviteRole={inviteRole} />`
);

code = code.replaceAll(
  `<AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} />`,
  `<AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} referralCode={referralCode} inviteRole={inviteRole} />`
);

// 10. Pass inviteRole to HomePage
code = code.replaceAll(
  `referralCode={referralCode}
      />`,
  `referralCode={referralCode}
        inviteRole={inviteRole}
      />`
);

// 11. Add InviteLinkPanel component before AdminUsers
if (!code.includes("function InviteLinkPanel")) {
  const idx = code.indexOf("function AdminUsers");
  if (idx === -1) throw new Error("Could not find AdminUsers insertion point.");

  const component = `function InviteLinkPanel() {
  const [refCode, setRefCode] = useState('');

  const copyLink = async (role) => {
    const link = buildInviteLink(role, refCode);

    try {
      await navigator.clipboard.writeText(link);
      alert(role + ' invite link copied.');
    } catch (err) {
      window.prompt('Copy invite link:', link);
    }
  };

  return (
    <div className="invite-link-panel">
      <div>
        <Pill tone="green">Invite Links</Pill>
        <h3>Send onboarding links to new users.</h3>
        <p>Use these links when onboarding creators, clippers, or affiliate traffic.</p>
      </div>

      <label>
        Optional affiliate code
        <input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="MARKFX" />
      </label>

      <div className="invite-link-actions">
        <button type="button" className="affiliate-action-btn" onClick={() => copyLink('creator')}>
          Copy creator invite
        </button>

        <button type="button" className="affiliate-action-btn secondary" onClick={() => copyLink('clipper')}>
          Copy clipper invite
        </button>
      </div>

      <div className="invite-preview">
        <span>Creator:</span>
        <input readOnly value={typeof window !== 'undefined' ? buildInviteLink('creator', refCode) : ''} />

        <span>Clipper:</span>
        <input readOnly value={typeof window !== 'undefined' ? buildInviteLink('clipper', refCode) : ''} />
      </div>
    </div>
  );
}

`;

  code = code.slice(0, idx) + component + code.slice(idx);
}

// 12. Insert InviteLinkPanel into AdminUsers page before user table
if (!code.includes("<InviteLinkPanel />")) {
  code = code.replace(
    `<div className="table-wrap admin-users-table">`,
    `<InviteLinkPanel />

      <div className="table-wrap admin-users-table">`
  );
}

fs.writeFileSync(file, code);
console.log("? Admin invite links added.");
