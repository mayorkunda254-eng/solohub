const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-forgot-password.jsx", code);

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

  throw new Error(`Could not find end of ${functionName}`);
}

// 1. Add password reset helpers before Header
if (!code.includes("function getPasswordResetRedirectUrl")) {
  const insertBefore = code.indexOf("function Header");
  if (insertBefore === -1) throw new Error("Could not find Header insertion point.");

  const helpers = `
function getPasswordResetRedirectUrl() {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('resetPassword', '1');
  return url.toString();
}

function isPasswordResetUrl() {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const hash = String(window.location.hash || '').toLowerCase();

  return params.get('resetPassword') === '1' || hash.includes('type=recovery');
}

function clearPasswordResetUrl() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.delete('resetPassword');

  if (url.hash && url.hash.toLowerCase().includes('type=recovery')) {
    url.hash = '';
  }

  window.history.replaceState({}, '', url.toString());
}

`;

  code = code.slice(0, insertBefore) + helpers + code.slice(insertBefore);
}

// 2. Replace AuthBox with password reset capable version
const authBlock = findFunctionBlock("AuthBox");

const replacement = `function AuthBox({ user, profile, onAuthUser, onLogout, referralCode, inviteRole }) {
  const [mode, setMode] = useState(() => isPasswordResetUrl() ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountRole, setAccountRole] = useState(() => cleanInviteRole(inviteRole) || 'clipper');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const invited = cleanInviteRole(inviteRole);

    if (invited) {
      setAccountRole(invited);
    }
  }, [inviteRole]);

  useEffect(() => {
    if (isPasswordResetUrl()) {
      setMode('reset');
      setAuthMessage('Enter your new password to complete account recovery.');
    }

    if (!supabase?.auth?.onAuthStateChange) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setAuthMessage('Recovery link confirmed. Enter your new password.');
      }
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }

    setLoading(true);
    setAuthMessage('Logging in...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;

      if (data?.user) {
        await onAuthUser?.(data.user, undefined, fullName);
        setAuthMessage('Logged in successfully.');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setAuthMessage('Login failed: ' + (err?.message || err));
      alert('Login failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }

    if (password.length < 6) {
      alert('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);
    setAuthMessage('Creating account...');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            role: accountRole,
            referral_code: referralCode || ''
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        await onAuthUser?.(data.user, accountRole, fullName);
        clearInviteRole();
        setAuthMessage('Account created. If email confirmation is enabled, check your inbox.');
      }
    } catch (err) {
      console.error('Signup failed:', err);
      setAuthMessage('Signup failed: ' + (err?.message || err));
      alert('Signup failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }

    if (!email.trim()) {
      alert('Enter your email address first.');
      return;
    }

    setLoading(true);
    setAuthMessage('Sending password reset email...');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getPasswordResetRedirectUrl()
      });

      if (error) throw error;

      setResetEmailSent(true);
      setAuthMessage('Password reset email sent. Check your inbox or spam folder.');
      alert('Password reset email sent. Check your inbox or spam folder.');
    } catch (err) {
      console.error('Password reset failed:', err);
      setAuthMessage('Password reset failed: ' + (err?.message || err));
      alert('Password reset failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert('Supabase is not configured.');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password should be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setLoading(true);
    setAuthMessage('Updating password...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      clearPasswordResetUrl();
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
      setAuthMessage('Password updated. Please login again.');
      alert('Password updated successfully. Please login again.');

      await onLogout?.();
    } catch (err) {
      console.error('Password update failed:', err);
      setAuthMessage('Password update failed: ' + (err?.message || err));
      alert('Password update failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const formHandler = mode === 'signup'
    ? signUp
    : mode === 'forgot'
      ? sendPasswordReset
      : mode === 'reset'
        ? updatePassword
        : signIn;

  if (user && mode !== 'reset') {
    const displayRole = roleForUser(user, profile, profile?.role || accountRole || 'clipper');

    return (
      <div className="auth-panel">
        <Pill tone="green"><UserRound size={14} /> Logged in</Pill>
        <h2>{user.email}</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Account type:</strong> {displayRole}</p>
        <p className="form-note">Your dashboard and menu are based on your saved SoloHub role.</p>

        <div className="auth-actions-row">
          <Button type="button" className="small" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <LayoutDashboard size={15} /> Continue
          </Button>

          <Button type="button" variant="ghost" className="small" onClick={onLogout}>
            <LogOut size={15} /> Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-panel auth-panel-premium">
      <Pill tone="green"><UserRound size={14} /> SoloHub Account</Pill>

      <h2>
        {mode === 'signup'
          ? 'Create your SoloHub account.'
          : mode === 'forgot'
            ? 'Reset your password.'
            : mode === 'reset'
              ? 'Create a new password.'
              : 'Login to SoloHub.'}
      </h2>

      <p>
        {mode === 'signup'
          ? 'Choose your account type and start using SoloHub.'
          : mode === 'forgot'
            ? 'Enter your email and we will send a password reset link.'
            : mode === 'reset'
              ? 'Enter a new password for your SoloHub account.'
              : 'Access your campaigns, submissions, approvals, and payouts.'}
      </p>

      {authMessage && <div className="auth-status-message">{authMessage}</div>}

      {mode !== 'forgot' && mode !== 'reset' && (
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>

          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Sign up
          </button>
        </div>
      )}

      <form className="auth-form auth-form-wide" onSubmit={formHandler}>
        {referralCode && mode === 'signup' && (
          <div className="referral-banner">
            Referral code applied: <strong>{referralCode}</strong>
          </div>
        )}

        {cleanInviteRole(inviteRole) && mode === 'signup' && (
          <div className="invite-banner">
            Invite role selected: <strong>{cleanInviteRole(inviteRole)}</strong>
          </div>
        )}

        {mode === 'signup' && (
          <>
            <label>
              Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </label>

            <label>
              Account type
              <select value={accountRole} onChange={(e) => setAccountRole(cleanRole(e.target.value))}>
                <option value="clipper">Clipper</option>
                <option value="creator">Creator</option>
              </select>
            </label>
          </>
        )}

        {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </label>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          </label>
        )}

        {mode === 'reset' && (
          <>
            <label>
              New password
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" required />
            </label>

            <label>
              Confirm new password
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
            </label>
          </>
        )}

        <button type="submit" className="affiliate-action-btn auth-submit-btn" disabled={loading}>
          {loading
            ? 'Please wait...'
            : mode === 'signup'
              ? 'Create account'
              : mode === 'forgot'
                ? resetEmailSent ? 'Send reset email again' : 'Send reset email'
                : mode === 'reset'
                  ? 'Update password'
                  : 'Login'}
        </button>
      </form>

      <div className="auth-secondary-actions">
        {mode === 'login' && (
          <button type="button" onClick={() => setMode('forgot')}>
            Forgot password?
          </button>
        )}

        {mode === 'forgot' && (
          <button type="button" onClick={() => setMode('login')}>
            Back to login
          </button>
        )}

        {mode === 'reset' && (
          <button type="button" onClick={() => {
            clearPasswordResetUrl();
            setMode('login');
          }}>
            Back to login
          </button>
        )}
      </div>

      {mode === 'signup' && (
        <p className="form-note">
          Admin accounts are assigned by the platform owner from SoloHub admin tools.
        </p>
      )}

      {mode === 'forgot' && (
        <p className="form-note">
          Check your email inbox and spam folder. The reset link will bring you back to SoloHub.
        </p>
      )}
    </div>
  );
}`;

code = code.slice(0, authBlock.start) + replacement + code.slice(authBlock.end);

fs.writeFileSync(file, code);
console.log("? Forgot password and reset password flow added.");
