const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-referral-links.jsx", code);

// 1. Add referral helper functions after roleForUser
if (!code.includes("const REFERRAL_STORAGE_KEY")) {
  code = code.replace(
`const roleForUser = (user, profile, fallbackRole = 'clipper') => {
  if (isOwnerEmail(user?.email)) return 'admin';
  return profile?.role ? cleanRole(profile.role) : cleanRole(fallbackRole);
};`,
`const roleForUser = (user, profile, fallbackRole = 'clipper') => {
  if (isOwnerEmail(user?.email)) return 'admin';
  return profile?.role ? cleanRole(profile.role) : cleanRole(fallbackRole);
};

const REFERRAL_STORAGE_KEY = 'solohub_referral_code';

const cleanReferralCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);

function captureReferralCodeFromUrl() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const rawCode = params.get('ref') || params.get('affiliate') || params.get('aff');
  const code = cleanReferralCode(rawCode);

  if (code) {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  }

  return localStorage.getItem(REFERRAL_STORAGE_KEY) || '';
}

async function claimStoredReferralCode(authUser, userRole = 'clipper', fullName = '') {
  if (!supabase || !authUser?.id) return '';

  const code = cleanReferralCode(localStorage.getItem(REFERRAL_STORAGE_KEY));

  if (!code) return '';

  // Do not create referral records for the platform owner/admin.
  if (isOwnerEmail(authUser.email)) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    return '';
  }

  const role = cleanRole(userRole) === 'creator' ? 'creator' : 'clipper';

  const request = supabase.rpc('claim_referral_code', {
    p_code: code,
    p_referral_type: role,
    p_referred_name: fullName || authUser?.user_metadata?.full_name || authUser.email || '',
    p_referred_phone: '',
    p_notes: 'Auto captured from SoloHub referral link.'
  });

  const result = typeof withSupabaseTimeout === 'function'
    ? await withSupabaseTimeout(request, 'Claim referral code')
    : await request;

  if (result.error) {
    throw result.error;
  }

  if (result.data?.ok === false) {
    throw new Error(result.data?.message || 'Referral code could not be claimed.');
  }

  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  return code;
}`
  );
}

// 2. AuthBox accepts and displays referralCode
code = code.replace(
  `function AuthBox({ user, profile, onAuthUser, onLogout }) {`,
  `function AuthBox({ user, profile, onAuthUser, onLogout, referralCode }) {`
);

if (!code.includes("Referral code applied")) {
  code = code.replace(
`      <form className="auth-form auth-form-wide" onSubmit={mode === 'signup' ? signUp : signIn}>`,
`      <form className="auth-form auth-form-wide" onSubmit={mode === 'signup' ? signUp : signIn}>
        {referralCode && (
          <div className="referral-banner">
            Referral code applied: <strong>{referralCode}</strong>
          </div>
        )}`
  );
}

// 3. HomePage accepts referralCode and passes it to AuthBox
code = code.replace(
  `function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange }) {`,
  `function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode }) {`
);

code = code.replace(
  `<AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} />`,
  `<AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} referralCode={referralCode} />`
);

// 4. Add referralCode state inside App
if (!code.includes("const [referralCode, setReferralCode]")) {
  code = code.replace(
    `const [notice, setNotice] = useState('');`,
    `const [notice, setNotice] = useState('');
  const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());`
  );
}

// If notice and loadProfile are on same line, fix that too
code = code.replace(
  `const [notice, setNotice] = useState('');  const loadProfile`,
  `const [notice, setNotice] = useState('');
  const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());

  const loadProfile`
);

// 5. Claim referral inside loadProfile after role/profile is fixed
if (!code.includes("Referral code ${claimedCode} captured")) {
  code = code.replace(
`    setProfile(fixedProfile);
    setRole(fixedProfile.role);
    setPage(defaultPageForRole(fixedProfile.role));

    return fixedProfile;`,
`    setProfile(fixedProfile);
    setRole(fixedProfile.role);
    setPage(defaultPageForRole(fixedProfile.role));

    try {
      const claimedCode = await claimStoredReferralCode(currentUser, fixedProfile.role, fixedProfile.full_name);
      if (claimedCode) {
        setReferralCode('');
        setNotice(\`Referral code \${claimedCode} captured. Admin will qualify it after value is confirmed.\`);
      }
    } catch (refErr) {
      console.warn('Referral claim failed:', refErr);
      setNotice('Referral code was found, but could not be claimed: ' + (refErr?.message || refErr));
    }

    return fixedProfile;`
  );

  // 6. Claim referral inside handleAuthUser too
  code = code.replace(
`      setProfile(fixedProfile);
      setRole(fixedProfile.role);
      setPage(options?.stayHome ? 'home' : defaultPageForRole(fixedProfile.role));

      return fixedProfile;`,
`      setProfile(fixedProfile);
      setRole(fixedProfile.role);
      setPage(options?.stayHome ? 'home' : defaultPageForRole(fixedProfile.role));

      try {
        const claimedCode = await claimStoredReferralCode(authUser, fixedProfile.role, fixedProfile.full_name);
        if (claimedCode) {
          setReferralCode('');
          setNotice(\`Referral code \${claimedCode} captured. Admin will qualify it after value is confirmed.\`);
        }
      } catch (refErr) {
        console.warn('Referral claim failed:', refErr);
        setNotice('Referral code was found, but could not be claimed: ' + (refErr?.message || refErr));
      }

      return fixedProfile;`
  );
}

// 7. Capture referral on first app load
if (!code.includes("setReferralCode(captureReferralCodeFromUrl());")) {
  code = code.replace(
`  useEffect(() => {
    loadCloudData();`,
`  useEffect(() => {
    setReferralCode(captureReferralCodeFromUrl());
    loadCloudData();`
  );
}

// 8. Pass referralCode into HomePage
code = code.replace(
`        onRoleChange={updateProfileRole}
      />`,
`        onRoleChange={updateProfileRole}
        referralCode={referralCode}
      />`
);

// 9. Pass referralCode into standalone AuthBox
code = code.replace(
  `<AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} />`,
  `<AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} referralCode={referralCode} />`
);

// 10. Add affiliate link list to AdminAffiliates
if (!code.includes("affiliate-link-list")) {
  code = code.replace(
`      <div className="affiliate-table table-wrap">`,
`      {affiliates.length > 0 && (
        <div className="affiliate-link-list">
          <h3>Affiliate referral links</h3>
          <p className="form-note">Share these links with partners. Signups from the link are recorded as Pending referrals.</p>

          {affiliates.map((affiliate) => {
            const link = \`\${window.location.origin}\${window.location.pathname}?ref=\${affiliate.code}\`;

            return (
              <div key={affiliate.id} className="affiliate-link-row">
                <div>
                  <strong>{affiliate.name}</strong>
                  <span>{affiliate.code}</span>
                </div>

                <input readOnly value={link} />

                <button
                  type="button"
                  className="mini-action"
                  onClick={() => {
                    navigator.clipboard?.writeText(link);
                    alert('Affiliate link copied.');
                  }}
                >
                  Copy link
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="affiliate-table table-wrap">`
  );
}

fs.writeFileSync(file, code);
console.log("? Referral links added. Codes from ?ref=CODE will be saved and claimed on login/signup.");
