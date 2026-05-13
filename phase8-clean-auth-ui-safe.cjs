const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

function findFunctionBlock(functionName) {
  const regex = new RegExp(`function\\s+${functionName}\\s*\\(`);
  const match = regex.exec(code);
  if (!match) throw new Error(`Could not find ${functionName}`);

  const start = match.index;

  const bodyStartPattern = ") {";
  const bodyStart = code.indexOf(bodyStartPattern, start);
  if (bodyStart === -1) throw new Error(`Could not find body start for ${functionName}`);

  const braceStart = bodyStart + 2;

  let depth = 0;
  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) {
      return { start, end: i + 1 };
    }
  }

  throw new Error(`Could not find body end for ${functionName}`);
}

function replaceFunction(functionName, replacement) {
  const block = findFunctionBlock(functionName);
  code = code.slice(0, block.start) + replacement + code.slice(block.end);
}

replaceFunction("Header", `function Header({ role, setRole, setPage, sidebarOpen, setSidebarOpen, cloudMode, user, profile, onLogout }) {
  const displayRole = profile?.role ? cleanRole(profile.role) : cleanRole(role);

  const goDashboard = () => {
    setRole(displayRole);
    setPage(defaultPageForRole(displayRole));
  };

  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={22} /></button>

      <button className="brand" onClick={() => setPage('home')}>
        <div className="logo">S</div>
        <div>
          <strong>SoloHub</strong>
          <span>{cloudMode ? (user ? \`\${displayRole} - \${user.email}\` : 'Content rewards platform') : 'Local demo mode'}</span>
        </div>
      </button>

      <div className="topbar-right">
        {user ? (
          <>
            <Button variant="ghost" className="small" onClick={goDashboard}><LayoutDashboard size={15} /> Dashboard</Button>
            <Button variant="ghost" className="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout?.(); }}><LogOut size={15} /> Logout</Button>
          </>
        ) : (
          <Button className="small" onClick={() => setPage('home')}><UserRound size={15} /> Login</Button>
        )}
      </div>
    </header>
  );
}`);

replaceFunction("AuthBox", `function AuthBox({ user, profile, onAuthUser, onLogout }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountRole, setAccountRole] = useState('clipper');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim() && password.trim() && (mode === 'login' || fullName.trim());

  const signIn = async (e) => {
    e?.preventDefault?.();
    setMessage('');
    setBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.user) await onAuthUser(data.user, accountRole, fullName);
    setMessage('Logged in successfully.');
  };

  const signUp = async (e) => {
    e?.preventDefault?.();
    setMessage('');
    setBusy(true);

    const safeRole = accountRole === 'creator' ? 'creator' : 'clipper';

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: safeRole
        }
      }
    });

    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data?.user) await onAuthUser(data.user, safeRole, fullName.trim());

    setMessage(data?.session
      ? 'Account created and logged in.'
      : 'Account created. Confirm your email if Supabase requires confirmation.'
    );
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="panel auth-panel clean-auth">
        <div>
          <Pill tone="yellow"><UserRound size={14} /> Backend not connected</Pill>
          <h2>Connect Supabase to enable real accounts.</h2>
          <p>Add your Supabase URL and publishable key in your .env file.</p>
        </div>
      </section>
    );
  }

  if (user) {
    const currentRole = profile?.role ? cleanRole(profile.role) : 'clipper';

    return (
      <section className="panel auth-panel clean-auth logged-in-card">
        <div>
          <Pill tone="green"><UserRound size={14} /> Logged in</Pill>
          <h2>{profile?.full_name || user.email}</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Account type:</strong> {currentRole}</p>
          <p className="form-note">Your dashboard and menu are based on your saved SoloHub role.</p>
        </div>

        <div className="auth-form auth-actions-clean">
          <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><LayoutDashboard size={16} /> Continue</Button>
          <Button variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout?.(); }}><LogOut size={16} /> Logout</Button>
        </div>

        {message && <p className="form-note">{message}</p>}
      </section>
    );
  }

  return (
    <section className="panel auth-panel clean-auth">
      <div className="auth-copy">
        <Pill tone="green"><UserRound size={14} /> SoloHub Account</Pill>
        <h2>{mode === 'signup' ? 'Create your SoloHub account.' : 'Login to SoloHub.'}</h2>
        <p>
          {mode === 'signup'
            ? 'Join as a clipper to earn from campaigns, or as a creator to launch campaigns.'
            : 'Access your campaigns, submissions, approvals, and payouts.'}
        </p>
      </div>

      <form className="auth-form auth-form-wide" onSubmit={mode === 'signup' ? signUp : signIn}>
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign up</button>
        </div>

        {mode === 'signup' && (
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name or brand name" />
        )}

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />

        {mode === 'signup' && (
          <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
            <option value="clipper">Join as Clipper</option>
            <option value="creator">Join as Creator</option>
          </select>
        )}

        <Button type="submit" disabled={busy || !canSubmit}>
          {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}
        </Button>

        <p className="form-note">
          Admin accounts are assigned by the platform owner from Supabase, not public signup.
        </p>
      </form>

      {message && <p className="form-note">{message}</p>}
    </section>
  );
}`);

code = code.replace(
  /<AuthBox user=\{user\} profile=\{profile\} onAuthUser=\{onAuthUser\} onLogout=\{onLogout\} onRoleChange=\{onRoleChange\} \/>/g,
  `<AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} />`
);

code = code.replaceAll('Phase 3 backend-ready MVP', 'SoloHub MVP');
code = code.replaceAll('SoloHub now supports Supabase data saving.', 'Run content reward campaigns with creators and clippers.');
code = code.replaceAll(
  'Create campaigns, submit clips, approve submissions, and save them to Supabase when connected. Without Supabase keys, it still runs locally.',
  'Creators fund campaigns. Clippers submit short-form posts. Admin approves performance and payouts.'
);

fs.writeFileSync(file, code);
console.log("? Safe Phase 8 auth UI patch applied.");
