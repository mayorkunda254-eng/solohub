import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Coins,
  Eye,
  FileVideo,
  Home,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wallet,
  XCircle
} from 'lucide-react';
import { academyLessons, seedCampaigns, seedSubmissions } from './data.js';
import { isSupabaseConfigured, supabase } from './supabaseClient.js';

const money = (value) => `KES ${Number(value || 0).toLocaleString()}`;
const today = new Date().toISOString().slice(0, 10);

const defaultPageForRole = (nextRole) => nextRole === 'clipper' ? 'discover' : nextRole === 'creator' ? 'creatorDashboard' : 'adminOverview';
const cleanRole = (value) => {
  const role = String(value || '').toLowerCase().trim();
  return ['clipper', 'creator', 'admin'].includes(role) ? role : 'clipper';
};

const OWNER_ADMIN_EMAILS = ['mayorkunda254@gmail.com'];

const isOwnerEmail = (email) => OWNER_ADMIN_EMAILS.includes(String(email || '').trim().toLowerCase());

const roleForUser = (user, profile, fallbackRole = 'clipper') => {
  if (isOwnerEmail(user?.email)) return 'admin';
  return profile?.role ? cleanRole(profile.role) : cleanRole(fallbackRole);
};

const SOLOHUB_PAYMENT_DETAILS = {
  businessName: 'SoloHub',
  method: 'M-Pesa Till / Paybill',
  status: 'Coming soon',
  number: 'To be added',
  reference: 'Campaign title or client phone',
  note: 'After payment, enter the M-Pesa confirmation code in the Payment Reference field.'
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
}

async function withSupabaseTimeout(request, label = 'Supabase request', ms = 15000) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(label + ' timed out after ' + Math.round(ms / 1000) + ' seconds'));
    }, ms);
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}


function useLocalState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  });

  const update = (next) => {
    const nextValue = typeof next === 'function' ? next(value) : next;
    setValue(nextValue);
    localStorage.setItem(key, JSON.stringify(nextValue));
  };

  return [value, update];
}

const toCampaign = (row) => ({
  id: row.id,
  title: row.title,
  creator: row.creator,
  category: row.category,
  type: row.type,
  management: row.management,
  payPerThousand: Number(row.pay_per_thousand ?? row.payPerThousand ?? 0),
  budget: Number(row.budget || 0),
  remaining: Number(row.remaining || 0),
  minimumViews: Number(row.minimum_views ?? row.minimumViews ?? 0),
  maxPayout: Number(row.max_payout ?? row.maxPayout ?? 0),
  platforms: row.platforms || [],
  deadline: row.deadline,
  beginnerFriendly: Boolean(row.beginner_friendly ?? row.beginnerFriendly),
  verified: Boolean(row.verified),
  score: Number(row.score || 70),
  status: row.status || 'Pending Approval',
  description: row.description || '',
  rules: row.rules || [],
  hashtags: row.hashtags || [],
  assets: row.assets || [],
  imageUrl: row.image_url || row.imageUrl || '',
  image_url: row.image_url || row.imageUrl || '',
  resourceUrl: row.resource_url || row.resourceUrl || '',
  resource_url: row.resource_url || row.resourceUrl || '',
  contentRequirements: row.content_requirements || row.contentRequirements || '',
  content_requirements: row.content_requirements || row.contentRequirements || '',
  clientName: row.client_name || row.clientName || '',
  client_name: row.client_name || row.clientName || '',
  clientEmail: row.client_email || row.clientEmail || '',
  client_email: row.client_email || row.clientEmail || '',
  clientPhone: row.client_phone || row.clientPhone || '',
  client_phone: row.client_phone || row.clientPhone || '',
  depositStatus: row.deposit_status || row.depositStatus || 'Pending',
  deposit_status: row.deposit_status || row.depositStatus || 'Pending',
  depositAmount: Number(row.deposit_amount || row.depositAmount || 0),
  deposit_amount: Number(row.deposit_amount || row.depositAmount || 0),
  paymentReference: row.payment_reference || row.paymentReference || '',
  payment_reference: row.payment_reference || row.paymentReference || '',
  adminNotes: row.admin_notes || row.adminNotes || '',
  admin_notes: row.admin_notes || row.adminNotes || ''
});

const toCampaignDb = (campaign) => ({
  title: campaign.title,
  creator: campaign.creator,
  category: campaign.category,
  type: campaign.type,
  management: campaign.management,
  pay_per_thousand: Number(campaign.payPerThousand || 0),
  budget: Number(campaign.budget || 0),
  remaining: Number(campaign.remaining || campaign.budget || 0),
  minimum_views: Number(campaign.minimumViews || 0),
  max_payout: Number(campaign.maxPayout || 0),
  platforms: campaign.platforms || [],
  deadline: campaign.deadline || null,
  beginner_friendly: Boolean(campaign.beginnerFriendly),
  verified: Boolean(campaign.verified),
  score: Number(campaign.score || 70),
  status: campaign.status || 'Pending Approval',
  description: campaign.description || '',
  rules: campaign.rules || [],
  hashtags: campaign.hashtags || [],
  assets: campaign.assets || [],
  image_url: campaign.image_url || campaign.imageUrl || '',
  resource_url: campaign.resource_url || campaign.resourceUrl || '',
  content_requirements: campaign.content_requirements || campaign.contentRequirements || '',
  client_name: campaign.client_name || campaign.clientName || '',
  client_email: campaign.client_email || campaign.clientEmail || '',
  client_phone: campaign.client_phone || campaign.clientPhone || '',
  deposit_status: campaign.deposit_status || campaign.depositStatus || 'Pending',
  deposit_amount: Number(campaign.deposit_amount || campaign.depositAmount || 0),
  payment_reference: campaign.payment_reference || campaign.paymentReference || '',
  admin_notes: campaign.admin_notes || campaign.adminNotes || ''
});

const toSubmission = (row) => ({
  id: row.id,
  campaignId: row.campaign_id ?? row.campaignId,
  campaign: row.campaign,
  clipper: row.clipper,
  platform: row.platform,
  postUrl: row.post_url ?? row.postUrl,
  caption: row.caption || '',
  submittedViews: Number(row.submitted_views ?? row.submittedViews ?? 0),
  approvedViews: Number(row.approved_views ?? row.approvedViews ?? 0),
  payout: Number(row.payout || 0),
  status: row.status || 'Pending Review',
  notes: row.notes || '',
  createdAt: row.created_at ? String(row.created_at).slice(0, 10) : row.createdAt || today
});

const toSubmissionDb = (submission) => ({
  campaign_id: typeof submission.campaignId === 'string' && submission.campaignId.includes('-') ? submission.campaignId : null,
  campaign: submission.campaign,
  clipper: submission.clipper,
  platform: submission.platform,
  post_url: submission.postUrl,
  caption: submission.caption || '',
  submitted_views: Number(submission.submittedViews || 0),
  approved_views: Number(submission.approvedViews || 0),
  payout: Number(submission.payout || 0),
  status: submission.status || 'Pending Review',
  notes: submission.notes || ''
});

function Pill({ children, tone = 'default' }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function Button({ children, variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`btn ${variant} ${className}`} {...props}>{children}</button>;
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon size={20} /></div>
      <div>
        <p>{label}</p>
        <h3>{value}</h3>
        {helper && <small>{helper}</small>}
      </div>
    </div>
  );
}

function Header({ role, setRole, setPage, sidebarOpen, setSidebarOpen, cloudMode, user, profile, onLogout }) {
  const displayRole = roleForUser(user, profile, role);

  const goDashboard = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const targetRole = roleForUser(user, profile, role);
    setRole(targetRole);
    setPage(defaultPageForRole(targetRole));

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const goLogin = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setPage('home');

    setTimeout(() => {
      const authPanel = document.querySelector('.auth-panel');
      if (authPanel) {
        authPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={22} /></button>

      <button type="button" className="brand" onClick={goLogin}>
        <div className="logo">S</div>
        <div>
          <strong>SoloHub</strong>
          <span>{cloudMode ? (user ? `${displayRole} - ${user.email}` : 'Content rewards platform') : 'Local demo mode'}</span>
        </div>
      </button>

      <div className="topbar-right">
        {user ? (
          <>
            <Button type="button" variant="ghost" className="small" onClick={goDashboard}><LayoutDashboard size={15} /> Dashboard</Button>
            <Button variant="ghost" className="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout?.(); }}><LogOut size={15} /> Logout</Button>
          </>
        ) : (
          <Button type="button" className="small" onClick={goLogin}><UserRound size={15} /> Login</Button>
        )}
      </div>
    </header>
  );
}



const navs = {
  clipper: [
    ['home', Home, 'Home'],
    ['discover', Search, 'Discover'],
    ['submissions', FileVideo, 'My Submissions'],
    ['earnings', Wallet, 'Earnings'],
    ['academy', BookOpen, 'Academy']
  ],
  creator: [
    ['home', Home, 'Home'],
    ['creatorDashboard', LayoutDashboard, 'Dashboard'],
    ['createCampaign', Plus, 'Create Campaign'],
    ['creatorCampaigns', Megaphone, 'My Campaigns'],
    ['creatorSubmissions', ShieldCheck, 'Submissions']
  ],
  admin: [
    ['adminOverview', LayoutDashboard, 'Overview'],
    ['createCampaign', Plus, 'Create Managed Campaign'],
    ['adminCampaigns', Megaphone, 'Campaigns'],
    ['adminSubmissions', ShieldCheck, 'Submissions'],
    ['adminAffiliates', Coins, 'Affiliates'],
    ['adminPayouts', Coins, 'Payouts']
  ]
};

function Sidebar({ role, page, setPage, open, setOpen, cloudMode }) {
  return (
    <aside className={`sidebar ${open ? 'show' : ''}`}>
      <div className="side-title">{role} menu</div>
      {navs[role].map(([id, Icon, label]) => (
        <button key={id} className={page === id ? 'active' : ''} onClick={() => { setPage(id); setOpen(false); }}>
          <Icon size={18} /> {label}
        </button>
      ))}
      <div className="side-note">
        <ShieldCheck size={18} />
        <span>{cloudMode ? 'Data saves in Supabase.' : 'Data saves in this browser only.'}</span>
      </div>
    </aside>
  );
}

function AuthBox({ user, profile, onAuthUser, onLogout, referralCode }) {
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
      console.error('Auth error:', error);
      alert(error.message);
      setMessage(error.message);
      return;
    }

    if (data?.user) await onAuthUser(data.user, undefined, fullName, { preserveExistingRole: true });
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
    const currentRole = roleForUser(user, profile, 'clipper');

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
        {referralCode && (
          <div className="referral-banner">
            Referral code applied: <strong>{referralCode}</strong>
          </div>
        )}
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

        <Button
          type="button"
          disabled={busy || !canSubmit}
          onClick={mode === 'signup' ? signUp : signIn}
        >
          {busy ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Login'}
        </Button>

        <p className="form-note">
          Admin accounts are assigned by the platform owner from Supabase, not public signup.
        </p>
      </form>

      {message && <p className="form-note">{message}</p>}
    </section>
  );
}

function Hero({ setRole, setPage, cloudMode }) {
  const goClipper = () => {
    setRole('clipper');
    setPage('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goCreator = () => {
    setRole('creator');
    setPage('createCampaign');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goSignup = () => {
    setPage('home');
    setTimeout(() => {
      const authPanel = document.querySelector('.auth-panel');
      if (authPanel) {
        authPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  return (
    <>
      <section className="public-landing-hero">
        <div className="landing-hero-copy">
          <Pill tone="green"><Sparkles size={14} /> Premium content rewards platform</Pill>

          <h1>
            Creators fund campaigns.
            <span> Clippers earn from views.</span>
          </h1>

          <p>
            SoloHub helps brands, creators, and community managers launch clipping campaigns,
            verify submissions, track payouts, and grow through affiliate referrals.
          </p>

          <div className="landing-actions">
            <Button type="button" onClick={goClipper}>Explore campaigns <Search size={16} /></Button>
            <Button type="button" variant="ghost" onClick={goCreator}>Launch campaign <Megaphone size={16} /></Button>
            <Button type="button" variant="ghost" onClick={goSignup}>Join SoloHub <UserRound size={16} /></Button>
          </div>

          <div className="landing-trust-row">
            <span><ShieldCheck size={16} /> Admin verified payouts</span>
            <span><Wallet size={16} /> Manual M-Pesa tracking</span>
            <span><Coins size={16} /> Affiliate-ready growth</span>
          </div>
        </div>

        <div className="landing-money-panel">
          <div className="landing-vault-card">
            <div className="vault-glow">S</div>
            <div>
              <small>Reward pool</small>
              <strong>KES 250,000+</strong>
              <span>Campaign potential</span>
            </div>
          </div>

          <div className="landing-mini-grid">
            <div>
              <small>For creators</small>
              <strong>Launch campaigns</strong>
              <span>Set budget, rules, assets, and payout rate.</span>
            </div>

            <div>
              <small>For clippers</small>
              <strong>Submit clips</strong>
              <span>Post short videos and get reviewed for payout.</span>
            </div>

            <div>
              <small>For affiliates</small>
              <strong>Refer users</strong>
              <span>Earn commissions after value is confirmed.</span>
            </div>

            <div>
              <small>Storage mode</small>
              <strong>{cloudMode ? 'Cloud' : 'Local'}</strong>
              <span>{cloudMode ? 'Supabase connected' : 'Browser demo mode'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-paths">
        <div className="landing-path-card">
          <div className="path-icon"><Megaphone size={24} /></div>
          <h3>Creators</h3>
          <p>Create campaigns with budgets, approved assets, platform rules, hashtags, and payout limits.</p>
          <button type="button" onClick={goCreator}>Create campaign</button>
        </div>

        <div className="landing-path-card featured">
          <div className="path-icon"><Upload size={24} /></div>
          <h3>Clippers</h3>
          <p>Find live campaigns, submit public post links, and wait for verified views before payout.</p>
          <button type="button" onClick={goClipper}>Find campaigns</button>
        </div>

        <div className="landing-path-card">
          <div className="path-icon"><Coins size={24} /></div>
          <h3>Affiliates</h3>
          <p>Share referral links and earn commissions when creators fund campaigns or clippers qualify.</p>
          <button type="button" onClick={goSignup}>Become partner</button>
        </div>
      </section>
    </>
  );
}

function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange, referralCode }) {
  const liveCampaigns = campaigns.filter((c) => c.status === 'Live').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'Pending Review').length;
  return (
    <>
      <Hero setRole={setRole} setPage={setPage} cloudMode={cloudMode} />
      <AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} referralCode={referralCode} />
      <section className="panel">
        <div className="section-head">
          <div>
            <Pill tone="purple"><LayoutDashboard size={14} /> SoloHub System</Pill>
            <h2>Built for campaigns, submissions, payouts, and referrals.</h2>
            <p>Creators launch campaigns, clippers submit posts, admins verify performance, and affiliates drive growth.</p>
          </div>
        </div>
        <div className="stats-grid">
          <StatCard icon={Megaphone} label="Live campaigns" value={liveCampaigns} helper="Ready for clippers" />
          <StatCard icon={ShieldCheck} label="Pending reviews" value={pendingSubmissions} helper="Admin action needed" />
          <StatCard icon={Wallet} label="Storage" value={cloudMode ? 'Supabase' : 'Local'} helper={cloudMode ? 'Cloud database' : 'Browser only'} />
          <StatCard icon={Coins} label="Payments" value="Manual" helper="M-Pesa records later" />
        </div>
      </section>
    </>
  );
}

function CampaignCard({ campaign, onOpen, onSubmit }) {
  return (
    <article className="campaign-card">
      <div className="campaign-top">
        <div>
          <Pill tone={campaign.beginnerFriendly ? 'green' : 'yellow'}>{campaign.beginnerFriendly ? 'Beginner friendly' : 'Intermediate'}</Pill>
          <h3>{campaign.title}</h3>
          <p>{campaign.creator} {campaign.verified && <BadgeCheck size={15} className="inline-icon" />}</p>
        </div>
        <div className="score"><span>Score</span><strong>{campaign.score}</strong></div>
      </div>
      <div className="campaign-meta">
        <span>{campaign.category}</span>
        <span>{campaign.type}</span>
        <span>{campaign.management}</span>
      </div>
      <div className="campaign-money">
        <div><span>Pay / 1,000 views</span><strong>{money(campaign.payPerThousand)}</strong></div>
        <div><span>Budget left</span><strong>{money(campaign.remaining)}</strong></div>
      </div>
      <p className="description">{campaign.description}</p>
      <div className="platforms">{campaign.platforms.map((p) => <Pill key={p}>{p}</Pill>)}</div>
      <div className="card-actions">
        <Button variant="ghost" onClick={() => onOpen(campaign)}>View details</Button>
        <Button onClick={() => onSubmit(campaign)}>Submit clip <Upload size={16} /></Button>
      </div>
    </article>
  );
}

function DiscoverPage({ campaigns, setSelectedCampaign, setPage }) {
  const live = campaigns.filter((c) => c.status === 'Live');

  const openCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setPage('submit');
  };

  return (
    <section className="whop-page">
      <div className="whop-page-head">
        <div>
          <Pill tone="purple">Content Rewards</Pill>
          <h2>Campaigns</h2>
          <p>Discover active campaigns, review requirements, and submit your clips.</p>
        </div>
        <div className="whop-search">Search campaigns</div>
      </div>

      <div className="whop-campaign-grid">
        {live.map((campaign) => {
          const budget = Number(campaign.budget || 0);
          const remaining = Number(campaign.remaining || 0);
          const paidOut = Math.max(0, budget - remaining);
          const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

          return (
            <article key={campaign.id} className="whop-campaign-card" onClick={() => openCampaign(campaign)}>
              <div className="whop-card-top">
                <div className="whop-thumb">
                  {campaign.imageUrl ? (
                    <img src={campaign.imageUrl} alt={campaign.title} />
                  ) : (
                    <div className="whop-thumb-fallback">S</div>
                  )}
                </div>

                <div className="whop-tags">
                  <span>Clipping</span>
                  <span>{campaign.category}</span>
                </div>
              </div>

              <h3>{campaign.title}</h3>

              <div className="whop-creator-row">
                <span>{campaign.creator}</span>
                <strong>?</strong>
              </div>

              <div className="whop-meta-row">
                <div>
                  <small>Paid Out</small>
                  <strong>{money(paidOut)} <span>/ {money(budget)}</span></strong>
                </div>
                <div>
                  <small>CPM</small>
                  <strong>{money(campaign.payPerThousand)} <span>/ 1k views</span></strong>
                </div>
              </div>

              <div className="whop-progress">
                <i style={{ width: progress + '%' }} />
              </div>

              <div className="whop-card-bottom">
                <div>
                  <small>Minimum views</small>
                  <strong>{Number(campaign.minimumViews || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <small>Max payout</small>
                  <strong>{money(campaign.maxPayout)}</strong>
                </div>
              </div>

              <button type="button" className="whop-submit-btn" onClick={(e) => { e.stopPropagation(); openCampaign(campaign); }}>
                Submit clip
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CampaignModal({ campaign, onClose }) {
  if (!campaign) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <Pill tone="purple">{campaign.category}</Pill>
        <h2>{campaign.title}</h2>
        <p>{campaign.description}</p>
        <div className="details-grid">
          <div><span>Pay rate</span><strong>{money(campaign.payPerThousand)} / 1,000 views</strong></div>
          <div><span>Minimum views</span><strong>{Number(campaign.minimumViews).toLocaleString()}</strong></div>
          <div><span>Max payout</span><strong>{money(campaign.maxPayout)}</strong></div>
          <div><span>Deadline</span><strong>{campaign.deadline || 'Open'}</strong></div>
        </div>
        <h3>Rules</h3>
        <ul className="rule-list">{campaign.rules.map((r, index) => <li key={index}>{r}</li>)}</ul>
        <h3>Hashtags</h3>
        <div className="platforms">{campaign.hashtags.map((h) => <Pill key={h}>{h}</Pill>)}</div>
      </div>
    </div>
  );
}

function SubmitPage({ selectedCampaign, campaigns, onSubmitClip }) {
  const firstLive = campaigns.find((c) => c.status === 'Live');
  const campaign = selectedCampaign || firstLive;

  const [form, setForm] = useState({
    platform: 'TikTok',
    postUrl: '',
    submittedViews: ''
  });

  if (!campaign) {
    return (
      <section className="panel">
        <h2>No campaign selected.</h2>
        <p>Go to Discover and choose a live campaign first.</p>
      </section>
    );
  }

  const budget = Number(campaign.budget || 0);
  const remaining = Number(campaign.remaining || 0);
  const paidOut = Math.max(0, budget - remaining);
  const progress = budget > 0 ? Math.min(100, Math.round((paidOut / budget) * 100)) : 0;

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = () => {
    if (!form.postUrl) {
      alert('Please paste your public post URL.');
      return;
    }

    onSubmitClip({
      campaignId: campaign.id,
      campaign: campaign.title,
      clipper: 'SoloHub Clipper',
      platform: form.platform,
      postUrl: form.postUrl,
      submittedViews: Number(form.submittedViews || 0),
      payout: 0,
      status: 'Pending Review'
    });
  };

  return (
    <section className="campaign-detail">
      <div className="campaign-detail-hero">
        <div>
          <Pill tone="purple">Content Rewards</Pill>
          <h1>{campaign.title}</h1>
          <p>{campaign.description}</p>

          <div className="campaign-detail-tags">
            <span>Clipping</span>
            <span>{campaign.category}</span>
            <span>{money(campaign.payPerThousand)} / 1k views</span>
          </div>
        </div>

        <div className="campaign-detail-image">
          {campaign.imageUrl ? (
            <img src={campaign.imageUrl} alt={campaign.title} />
          ) : (
            <div className="campaign-detail-fallback">SoloHub</div>
          )}
        </div>
      </div>

      <div className="campaign-budget-card">
        <div className="budget-line">
          <strong>{money(budget)} budget</strong>
          <span>{money(paidOut)} paid out</span>
        </div>
        <div className="whop-progress large">
          <i style={{ width: progress + '%' }} />
        </div>
      </div>

      <div className="campaign-info-table">
        <div><span>Category</span><strong>{campaign.category}</strong></div>
        <div><span>Type</span><strong>{campaign.type}</strong></div>
        <div><span>Platforms</span><strong>{Array.isArray(campaign.platforms) ? campaign.platforms.join(', ') : campaign.platforms}</strong></div>
        <div><span>Deadline</span><strong>{campaign.deadline || 'Open'}</strong></div>
      </div>

      <div className="submit-video-box">
        <h3>Submit your clip</h3>
        <p>Paste your public TikTok, Instagram Reels, or YouTube Shorts link. Admin will verify views before payout.</p>

        <div className="submit-grid">
          <select value={form.platform} onChange={(e) => update('platform', e.target.value)}>
            <option>TikTok</option>
            <option>Instagram Reels</option>
            <option>YouTube Shorts</option>
          </select>

          <input value={form.postUrl} onChange={(e) => update('postUrl', e.target.value)} placeholder="Public post URL" />
          <input value={form.submittedViews} onChange={(e) => update('submittedViews', e.target.value)} placeholder="Current views" type="number" />

          <Button type="button" onClick={submit}>Submit Video</Button>
        </div>
      </div>

      <div className="campaign-requirements">
        <h3>Requirements</h3>
        <p>{campaign.contentRequirements || campaign.rules?.join(' ') || 'Use approved campaign content only. Follow the creator instructions carefully.'}</p>

        {campaign.resourceUrl && (
          <a className="resource-card" href={campaign.resourceUrl} target="_blank" rel="noreferrer">
            <strong>Campaign Resources</strong>
            <span>Open source folder</span>
          </a>
        )}
      </div>

      <div className="earnings-cards">
        {(Array.isArray(campaign.platforms) ? campaign.platforms : ['TikTok']).map((item) => (
          <div key={item} className="earning-card">
            <strong>{item}</strong>
            <span>{money(campaign.payPerThousand)} / 1k views</span>
            <small>{money(campaign.maxPayout)} max payout</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function SubmissionsPage({ submissions, title = 'My Submissions' }) {
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><FileVideo size={14} /> Submissions</Pill><h2>{title}</h2></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Campaign</th><th>Clipper</th><th>Platform</th><th>Views</th><th>Payout</th><th>Status</th><th>Link</th></tr></thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td>{s.campaign}</td>
                <td>{s.clipper}</td>
                <td>{s.platform}</td>
                <td>{Number(s.submittedViews).toLocaleString()}</td>
                <td>{money(s.payout)}</td>
                <td><Pill tone={s.status === 'Approved' || s.status === 'Paid' ? 'green' : s.status === 'Rejected' ? 'red' : 'yellow'}>{s.status}</Pill></td>
                <td><a href={s.postUrl} target="_blank" rel="noreferrer"><LinkIcon size={16} /></a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EarningsPage({ submissions, profile, onUpdatePayoutProfile }) {
  const [form, setForm] = useState({
    mpesaName: profile?.mpesa_name || profile?.mpesaName || profile?.full_name || '',
    mpesaPhone: profile?.mpesa_phone || profile?.mpesaPhone || '',
    backupPhone: profile?.backup_phone || profile?.backupPhone || '',
    payoutNotes: profile?.payout_notes || profile?.payoutNotes || ''
  });

  useEffect(() => {
    setForm({
      mpesaName: profile?.mpesa_name || profile?.mpesaName || profile?.full_name || '',
      mpesaPhone: profile?.mpesa_phone || profile?.mpesaPhone || '',
      backupPhone: profile?.backup_phone || profile?.backupPhone || '',
      payoutNotes: profile?.payout_notes || profile?.payoutNotes || ''
    });
  }, [profile]);

  const approved = submissions.filter((s) => s.status === 'Approved');
  const paid = submissions.filter((s) => s.status === 'Paid');
  const pendingReview = submissions.filter((s) => s.status === 'Pending Review');

  const approvedTotal = approved.reduce((sum, s) => sum + Number(s.payout || s.approvedPayout || 0), 0);
  const paidTotal = paid.reduce((sum, s) => sum + Number(s.payout || s.approvedPayout || 0), 0);
  const pendingTotal = pendingReview.length;

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = () => {
    onUpdatePayoutProfile?.(form);
  };

  const buildReceipt = (submission) => {
    const amount = Number(submission.payout || submission.approvedPayout || 0);
    const paidAt = submission.paidAt || submission.paid_at || '';
    const paymentReference = submission.paymentReference || submission.payment_reference || 'Pending';
    const method = submission.payoutMethod || submission.payout_method || 'Manual';

    return [
      'SOLOHUB CLIPPER PAYOUT RECEIPT',
      '',
      'Clipper: ' + (profile?.full_name || form.mpesaName || 'Clipper'),
      'M-Pesa Name: ' + (form.mpesaName || 'Not set'),
      'M-Pesa Phone: ' + (form.mpesaPhone || 'Not set'),
      '',
      'Campaign: ' + (submission.campaign || 'Campaign'),
      'Platform: ' + (submission.platform || '-'),
      'Submitted Views: ' + Number(submission.submittedViews || 0).toLocaleString(),
      'Approved Views: ' + Number(submission.approvedViews || submission.approved_views || 0).toLocaleString(),
      'Payout Amount: ' + money(amount),
      'Status: ' + submission.status,
      'Payment Method: ' + method,
      'Payment Reference: ' + paymentReference,
      paidAt ? 'Paid At: ' + String(paidAt).slice(0, 19).replace('T', ' ') : '',
      '',
      'Note: SoloHub payouts are based on admin-approved views after verification.'
    ].filter(Boolean).join('\n');
  };

  const copyReceipt = async (submission) => {
    const text = buildReceipt(submission);

    try {
      await navigator.clipboard.writeText(text);
      alert('Payout receipt copied.');
    } catch (err) {
      console.warn('Copy failed:', err);
      window.prompt('Copy payout receipt:', text);
    }
  };

  return (
    <section className="clipper-payout-page">
      <div className="section-head">
        <div>
          <Pill tone="green"><Wallet size={14} /> Clipper Earnings</Pill>
          <h2>Your payout profile and earning receipts.</h2>
          <p>Save your M-Pesa details so admin can process approved payouts correctly.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={ShieldCheck} label="Pending Review" value={pendingTotal} helper="Waiting for admin" />
        <StatCard icon={CheckCircle2} label="Approved Balance" value={money(approvedTotal)} helper="Ready for payout" />
        <StatCard icon={Wallet} label="Paid Earnings" value={money(paidTotal)} helper="Completed payouts" />
      </div>

      <div className="clipper-payout-grid">
        <div className="clipper-payout-card">
          <h3>M-Pesa payout profile</h3>

          <label>
            M-Pesa registered name
            <input value={form.mpesaName} onChange={(e) => update('mpesaName', e.target.value)} placeholder="Full M-Pesa name" />
          </label>

          <label>
            M-Pesa phone number
            <input value={form.mpesaPhone} onChange={(e) => update('mpesaPhone', e.target.value)} placeholder="+254..." />
          </label>

          <label>
            Backup phone / WhatsApp
            <input value={form.backupPhone} onChange={(e) => update('backupPhone', e.target.value)} placeholder="+254..." />
          </label>

          <label>
            Payout notes
            <textarea value={form.payoutNotes} onChange={(e) => update('payoutNotes', e.target.value)} placeholder="Any payout notes for admin." />
          </label>

          <button type="button" className="affiliate-action-btn" onClick={saveProfile}>
            Save payout profile
          </button>
        </div>

        <div className="clipper-payout-card">
          <h3>Payout rules</h3>

          <div className="payout-rule-list">
            <div>
              <strong>1. Submit clip</strong>
              <span>Paste your public TikTok, Reels, or Shorts link.</span>
            </div>

            <div>
              <strong>2. Admin verifies views</strong>
              <span>Fake or suspicious views can be reduced, flagged, or rejected.</span>
            </div>

            <div>
              <strong>3. Approved payout</strong>
              <span>Your payout is based on approved views, not claimed views.</span>
            </div>

            <div>
              <strong>4. Paid manually</strong>
              <span>Admin marks payout paid after sending funds through M-Pesa or manual method.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="table-wrap wide-table">
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Submitted</th>
              <th>Approved</th>
              <th>Payout</th>
              <th>Status</th>
              <th>Payment Ref</th>
              <th>Paid Date</th>
              <th>Receipt</th>
            </tr>
          </thead>

          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.campaign}</strong>
                  <div className="table-subtext">{s.platform}</div>
                </td>

                <td>{Number(s.submittedViews || 0).toLocaleString()}</td>
                <td>{Number(s.approvedViews || s.approved_views || 0).toLocaleString()}</td>
                <td>{money(s.payout || s.approvedPayout || 0)}</td>

                <td>
                  <Pill tone={s.status === 'Paid' ? 'green' : s.status === 'Approved' ? 'yellow' : s.status === 'Rejected' ? 'red' : 'purple'}>
                    {s.status}
                  </Pill>
                </td>

                <td>{s.paymentReference || s.payment_reference || '-'}</td>
                <td>{s.paidAt || s.paid_at ? String(s.paidAt || s.paid_at).slice(0, 10) : '-'}</td>

                <td>
                  <button type="button" className="mini-action" onClick={() => copyReceipt(s)}>
                    Copy receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AcademyPage() {
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><BookOpen size={14} /> SoloHub Academy</Pill><h2>Teach beginners how to earn with clipping.</h2></div></div>
      <div className="lesson-grid">{academyLessons.map((lesson, index) => <div className="lesson" key={lesson}><span>{String(index + 1).padStart(2, '0')}</span><strong>{lesson}</strong><p>Lesson content will be added later.</p></div>)}</div>
    </section>
  );
}

function CreatorDashboard({ campaigns, submissions }) {
  const totalBudget = campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const totalViews = submissions.reduce((sum, s) => sum + Number(s.approvedViews || 0), 0);
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><LayoutDashboard size={14} /> Creator Dashboard</Pill><h2>Creator campaign overview.</h2></div></div>
      <div className="stats-grid">
        <StatCard icon={Megaphone} label="Campaigns" value={campaigns.length} helper="All campaigns" />
        <StatCard icon={Coins} label="Total budget" value={money(totalBudget)} helper="Demo deposits" />
        <StatCard icon={Eye} label="Approved views" value={totalViews.toLocaleString()} helper="From submissions" />
      </div>
    </section>
  );
}

function CreateCampaignPage({ onCreateCampaign }) {
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: '',
    creator: 'Demo Creator',
    category: 'Education',
    type: 'Clipping',
    management: 'SoloHub Managed',
    payPerThousand: 80,
    budget: 10000,
    remaining: 10000,
    minimumViews: 1000,
    maxPayout: 1500,
    platforms: 'TikTok, Instagram Reels, YouTube Shorts',
    deadline: '',
    description: '',
    rules: 'Use approved content only.',
    hashtags: '#SoloHub',
    imageUrl: '',
    resourceUrl: '',
    contentRequirements: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    depositStatus: 'Pending',
    depositAmount: 0,
    paymentReference: '',
    adminNotes: ''
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingImage(true);

    try {
      const publicUrl = await uploadCampaignImageFile(file);
      update('imageUrl', publicUrl);
      alert('Campaign image uploaded successfully.');
    } catch (err) {
      console.error('Campaign image upload failed:', err);
      alert('Image upload failed: ' + (err?.message || err));
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const submit = async () => {
    if (submittingCampaign) return;

    if (!form.title.trim()) {
      alert('Please add a campaign title.');
      return;
    }

    if (!form.description.trim()) {
      alert('Please add a campaign description.');
      return;
    }

    setSubmittingCampaign(true);

    try {
      const campaign = {
        ...form,
        payPerThousand: Number(form.payPerThousand || 0),
        budget: Number(form.budget || 0),
        remaining: Number(form.remaining || form.budget || 0),
        minimumViews: Number(form.minimumViews || 0),
        maxPayout: Number(form.maxPayout || 0),
        platforms: String(form.platforms)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        rules: String(form.rules)
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        hashtags: String(form.hashtags)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        assets: form.resourceUrl ? [form.resourceUrl] : [],
        imageUrl: form.imageUrl,
        image_url: form.imageUrl,
        resourceUrl: form.resourceUrl,
        resource_url: form.resourceUrl,
        contentRequirements: form.contentRequirements,
        content_requirements: form.contentRequirements,
        clientName: form.clientName,
        client_name: form.clientName,
        clientEmail: form.clientEmail,
        client_email: form.clientEmail,
        clientPhone: form.clientPhone,
        client_phone: form.clientPhone,
        depositStatus: form.depositStatus,
        deposit_status: form.depositStatus,
        depositAmount: Number(form.depositAmount || 0),
        deposit_amount: Number(form.depositAmount || 0),
        paymentReference: form.paymentReference,
        payment_reference: form.paymentReference,
        adminNotes: form.adminNotes,
        admin_notes: form.adminNotes,
        status: 'Pending Approval',
        beginnerFriendly: true,
        verified: false,
        score: 70
      };

      await onCreateCampaign(campaign);
    } finally {
      setSubmittingCampaign(false);
    }
  };

  return (
    <section className="create-premium">
      <div className="create-head">
        <Pill tone="purple">Creator Studio</Pill>
        <h2>Create a campaign for admin approval.</h2>
        <p>Add campaign details, payout rules, a premium image, resource folder, and content requirements.</p>
      </div>

      <div className="create-grid">
        <div className="create-form-card">
          <h3>Campaign details</h3>

          <div className="form-grid">
            <label>
              Campaign title
              <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. MarkTradesFX Gold Clips" />
            </label>

            <label>
              Creator / brand
              <input value={form.creator} onChange={(e) => update('creator', e.target.value)} />
            </label>

            <label>
              Category
              <input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="Forex Education, Food & Bakery..." />
            </label>

            <label>
              Campaign type
              <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option>Clipping</option>
                <option>UGC</option>
                <option>Influencer</option>
              </select>
            </label>

            <label>
              Management
              <select value={form.management} onChange={(e) => update('management', e.target.value)}>
                <option>SoloHub Managed</option>
                <option>Self Managed</option>
              </select>
            </label>

            <label>
              Pay per 1,000 views
              <input type="number" value={form.payPerThousand} onChange={(e) => update('payPerThousand', e.target.value)} />
            </label>

            <label>
              Total budget
              <input type="number" value={form.budget} onChange={(e) => { update('budget', e.target.value); update('remaining', e.target.value); }} />
            </label>

            <label>
              Minimum views
              <input type="number" value={form.minimumViews} onChange={(e) => update('minimumViews', e.target.value)} />
            </label>

            <label>
              Max payout per clip
              <input type="number" value={form.maxPayout} onChange={(e) => update('maxPayout', e.target.value)} />
            </label>

            <label>
              Deadline
              <input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
            </label>
          </div>

          <label>
            Platforms
            <input value={form.platforms} onChange={(e) => update('platforms', e.target.value)} placeholder="TikTok, Instagram Reels, YouTube Shorts" />
          </label>

          <label>
            Campaign image URL
            <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://example.com/banner.jpg" />
          </label>

          <label className="upload-field">
            Upload campaign image
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageUpload} />
            <span className="form-note">Recommended: 1200�700 image, under 5MB.</span>
          </label>

          <label>
            Resource folder URL
            <input value={form.resourceUrl} onChange={(e) => update('resourceUrl', e.target.value)} placeholder="Google Drive / Dropbox / source folder" />
          </label>

          <div className="payment-instructions-box">
            <div>
              <Pill tone="yellow">Campaign Deposit</Pill>
              <h3>Payment instructions</h3>
              <p>Use this section to guide creators/clients on where to deposit the campaign budget before the campaign goes live.</p>
            </div>

            <div className="payment-instruction-grid">
              <div>
                <span>Business name</span>
                <strong>{SOLOHUB_PAYMENT_DETAILS.businessName}</strong>
              </div>

              <div>
                <span>Payment method</span>
                <strong>{SOLOHUB_PAYMENT_DETAILS.method}</strong>
              </div>

              <div>
                <span>Till / Paybill</span>
                <strong>{SOLOHUB_PAYMENT_DETAILS.number}</strong>
                <small>{SOLOHUB_PAYMENT_DETAILS.status}</small>
              </div>

              <div>
                <span>Account reference</span>
                <strong>{SOLOHUB_PAYMENT_DETAILS.reference}</strong>
              </div>
            </div>

            <p className="form-note">{SOLOHUB_PAYMENT_DETAILS.note}</p>
          </div>

          <div className="funding-section">
            <h3>Client & funding details</h3>

            <div className="form-grid">
              <label>
                Client / brand name
                <input value={form.clientName} onChange={(e) => update('clientName', e.target.value)} placeholder="Client or company name" />
              </label>

              <label>
                Client email
                <input value={form.clientEmail} onChange={(e) => update('clientEmail', e.target.value)} placeholder="client@email.com" />
              </label>

              <label>
                Client phone / WhatsApp
                <input value={form.clientPhone} onChange={(e) => update('clientPhone', e.target.value)} placeholder="+254..." />
              </label>

              <label>
                Deposit status
                <select value={form.depositStatus} onChange={(e) => update('depositStatus', e.target.value)}>
                  <option>Pending</option>
                  <option>Partial</option>
                  <option>Paid</option>
                  <option>Refunded</option>
                </select>
              </label>

              <label>
                Deposit amount
                <input type="number" value={form.depositAmount} onChange={(e) => update('depositAmount', e.target.value)} placeholder="KES amount received" />
              </label>

              <label>
                Payment reference
                <input value={form.paymentReference} onChange={(e) => update('paymentReference', e.target.value)} placeholder="M-Pesa code / bank ref" />
              </label>
            </div>

            <label>
              Admin notes
              <textarea value={form.adminNotes} onChange={(e) => update('adminNotes', e.target.value)} placeholder="Internal notes about the client, deposit, agreement, or campaign management." />
            </label>
          </div>

          <label>
            Description
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Explain what clippers should create." />
          </label>

          <label>
            Content requirements
            <textarea value={form.contentRequirements} onChange={(e) => update('contentRequirements', e.target.value)} placeholder="Mention approved clips, captions, hashtags, do's and don'ts." />
          </label>

          <label>
            Rules
            <textarea value={form.rules} onChange={(e) => update('rules', e.target.value)} />
          </label>

          <label>
            Hashtags
            <input value={form.hashtags} onChange={(e) => update('hashtags', e.target.value)} placeholder="#SoloHub, #KenyaCreators" />
          </label>

          <Button type="button" onClick={submit} disabled={submittingCampaign || uploadingImage}>
            {uploadingImage ? 'Uploading image...' : submittingCampaign ? 'Submitting...' : 'Submit campaign for approval'}
          </Button>
        </div>

        <div className="campaign-preview-card">
          <h3>Live preview</h3>

          <div className="whop-campaign-card preview">
            <div className="whop-card-top">
              <div className="whop-thumb">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Campaign preview" />
                ) : (
                  <div className="whop-thumb-fallback">S</div>
                )}
              </div>

              <div className="whop-tags">
                <span>Clipping</span>
                <span>{form.category || 'Category'}</span>
              </div>
            </div>

            <h3>{form.title || 'Campaign title'}</h3>

            <div className="whop-creator-row">
              <span>{form.creator || 'Creator brand'}</span>
              <strong>?</strong>
            </div>

            <div className="whop-meta-row">
              <div>
                <small>Budget</small>
                <strong>{money(form.budget || 0)}</strong>
              </div>

              <div>
                <small>CPM</small>
                <strong>{money(form.payPerThousand || 0)} <span>/ 1k</span></strong>
              </div>
            </div>

            <p>{form.description || 'Campaign description will appear here.'}</p>

            <button type="button" className="whop-submit-btn">Submit clip</button>
          </div>

          {form.imageUrl && (
            <div className="image-preview-large">
              <img src={form.imageUrl} alt="Campaign image preview" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CreatorCampaigns({ campaigns }) {
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><Megaphone size={14} /> My Campaigns</Pill><h2>Campaigns created in SoloHub.</h2></div></div>
      <div className="campaign-grid">{campaigns.map((c) => <CampaignCard key={c.id} campaign={c} onOpen={() => {}} onSubmit={() => {}} />)}</div>
    </section>
  );
}

function AdminOverview({ campaigns, submissions, cloudMode }) {
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><LayoutDashboard size={14} /> Admin Overview</Pill><h2>Control campaigns, submissions, and payouts.</h2></div></div>
      <div className="stats-grid">
        <StatCard icon={Megaphone} label="Campaigns" value={campaigns.length} helper="Total records" />
        <StatCard icon={ShieldCheck} label="Pending campaigns" value={campaigns.filter((c) => c.status === 'Pending Approval').length} helper="Need approval" />
        <StatCard icon={FileVideo} label="Submissions" value={submissions.length} helper="All submissions" />
        <StatCard icon={Wallet} label="Storage" value={cloudMode ? 'Cloud' : 'Local'} helper="Current mode" />
      </div>
    </section>
  );
}

function AdminCampaigns({ campaigns, onCampaignStatus, onCampaignFundingUpdate }) {
  const [drafts, setDrafts] = useState({});

  const depositTone = (status) => {
    if (status === 'Paid') return 'green';
    if (status === 'Partial') return 'yellow';
    if (status === 'Refunded') return 'red';
    return 'yellow';
  };

  const getDraft = (campaign) => {
    const draft = drafts[campaign.id] || {};

    return {
      depositStatus: draft.depositStatus ?? campaign.depositStatus ?? campaign.deposit_status ?? 'Pending',
      depositAmount: draft.depositAmount ?? campaign.depositAmount ?? campaign.deposit_amount ?? 0,
      paymentReference: draft.paymentReference ?? campaign.paymentReference ?? campaign.payment_reference ?? '',
      adminNotes: draft.adminNotes ?? campaign.adminNotes ?? campaign.admin_notes ?? ''
    };
  };

  const updateDraft = (id, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value
      }
    }));
  };

  const saveDeposit = async (campaign) => {
    const draft = getDraft(campaign);

    await onCampaignFundingUpdate(campaign.id, {
      depositStatus: draft.depositStatus,
      depositAmount: draft.depositAmount,
      paymentReference: draft.paymentReference,
      adminNotes: draft.adminNotes
    });
  };

  const buildClientPaymentSummary = (campaign) => {
    const draft = getDraft(campaign);

    const clientName = campaign.clientName || campaign.client_name || campaign.creator || 'Client';
    const clientPhone = campaign.clientPhone || campaign.client_phone || '';
    const campaignTitle = campaign.title || 'Campaign';
    const budget = Number(campaign.budget || 0);
    const depositAmount = Number(draft.depositAmount || 0);
    const balance = Math.max(0, budget - depositAmount);

    return [
      'SOLOHUB CAMPAIGN PAYMENT SUMMARY',
      '',
      'Client: ' + clientName,
      clientPhone ? 'Phone: ' + clientPhone : '',
      'Campaign: ' + campaignTitle,
      'Campaign Budget: ' + money(budget),
      'Deposit Status: ' + draft.depositStatus,
      'Deposit Received: ' + money(depositAmount),
      'Balance: ' + money(balance),
      'Payment Reference: ' + (draft.paymentReference || 'Not provided yet'),
      '',
      'PAYMENT INSTRUCTIONS',
      'Business Name: ' + SOLOHUB_PAYMENT_DETAILS.businessName,
      'Method: ' + SOLOHUB_PAYMENT_DETAILS.method,
      'Till / Paybill: ' + SOLOHUB_PAYMENT_DETAILS.number,
      'Account Reference: ' + SOLOHUB_PAYMENT_DETAILS.reference,
      '',
      SOLOHUB_PAYMENT_DETAILS.note,
      '',
      'After payment, send the confirmation code to SoloHub admin for campaign approval.'
    ].filter(Boolean).join('\n');
  };

  const copyPaymentSummary = async (campaign) => {
    const text = buildClientPaymentSummary(campaign);

    try {
      await navigator.clipboard.writeText(text);
      alert('Client payment summary copied.');
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
      window.prompt('Copy this payment summary:', text);
    }
  };

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));

  const printClientInvoice = (campaign) => {
    const draft = getDraft(campaign);

    const clientName = campaign.clientName || campaign.client_name || campaign.creator || 'Client';
    const clientPhone = campaign.clientPhone || campaign.client_phone || '';
    const clientEmail = campaign.clientEmail || campaign.client_email || '';
    const campaignTitle = campaign.title || 'Campaign';
    const budget = Number(campaign.budget || 0);
    const depositAmount = Number(draft.depositAmount || 0);
    const balance = Math.max(0, budget - depositAmount);
    const today = new Date().toLocaleDateString();

    const html = '<!doctype html>' +
      '<html><head><title>SoloHub Campaign Invoice</title>' +
      '<style>' +
      'body{font-family:Arial,sans-serif;background:#f4f4f5;color:#111827;padding:30px;}' +
      '.invoice{max-width:850px;margin:auto;background:white;border-radius:24px;padding:36px;box-shadow:0 20px 70px rgba(0,0,0,.12);}' +
      '.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #111827;padding-bottom:20px;margin-bottom:24px;}' +
      '.brand{font-size:32px;font-weight:900;color:#111827;}' +
      '.tag{color:#b7791f;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}' +
      'h1{margin:20px 0 8px;font-size:28px;}' +
      'table{width:100%;border-collapse:collapse;margin-top:24px;}' +
      'td,th{border-bottom:1px solid #e5e7eb;padding:14px;text-align:left;}' +
      'th{background:#111827;color:#fff;}' +
      '.total{font-size:22px;font-weight:900;color:#047857;}' +
      '.box{background:#fffbeb;border:1px solid #f5c453;border-radius:18px;padding:18px;margin-top:24px;}' +
      '.footer{margin-top:30px;color:#6b7280;font-size:13px;}' +
      '@media print{body{background:white;padding:0}.invoice{box-shadow:none;border-radius:0}}' +
      '</style></head><body>' +
      '<div class="invoice">' +
      '<div class="top"><div><div class="brand">SoloHub</div><div class="tag">Campaign Payment Summary</div></div><div><strong>Date:</strong> ' + escapeHtml(today) + '<br/><strong>Status:</strong> ' + escapeHtml(draft.depositStatus) + '</div></div>' +
      '<h1>' + escapeHtml(campaignTitle) + '</h1>' +
      '<p><strong>Client:</strong> ' + escapeHtml(clientName) + '</p>' +
      '<p><strong>Phone:</strong> ' + escapeHtml(clientPhone || '-') + ' &nbsp; <strong>Email:</strong> ' + escapeHtml(clientEmail || '-') + '</p>' +
      '<table><thead><tr><th>Description</th><th>Amount / Detail</th></tr></thead><tbody>' +
      '<tr><td>Campaign budget</td><td>' + escapeHtml(money(budget)) + '</td></tr>' +
      '<tr><td>Deposit received</td><td>' + escapeHtml(money(depositAmount)) + '</td></tr>' +
      '<tr><td>Balance</td><td class="total">' + escapeHtml(money(balance)) + '</td></tr>' +
      '<tr><td>Payment reference</td><td>' + escapeHtml(draft.paymentReference || 'Not provided yet') + '</td></tr>' +
      '<tr><td>Admin notes</td><td>' + escapeHtml(draft.adminNotes || '-') + '</td></tr>' +
      '</tbody></table>' +
      '<div class="box"><h3>Payment Instructions</h3>' +
      '<p><strong>Business Name:</strong> ' + escapeHtml(SOLOHUB_PAYMENT_DETAILS.businessName) + '</p>' +
      '<p><strong>Payment Method:</strong> ' + escapeHtml(SOLOHUB_PAYMENT_DETAILS.method) + '</p>' +
      '<p><strong>Till / Paybill:</strong> ' + escapeHtml(SOLOHUB_PAYMENT_DETAILS.number) + '</p>' +
      '<p><strong>Account Reference:</strong> ' + escapeHtml(SOLOHUB_PAYMENT_DETAILS.reference) + '</p>' +
      '<p>' + escapeHtml(SOLOHUB_PAYMENT_DETAILS.note) + '</p></div>' +
      '<div class="footer">This is a SoloHub campaign payment summary. Campaign goes live after admin confirms deposit.</div>' +
      '</div></body></html>';

    const invoiceWindow = window.open('', '_blank');

    if (!invoiceWindow) {
      alert('Popup blocked. Please allow popups to print invoice.');
      return;
    }

    invoiceWindow.document.open();
    invoiceWindow.document.write(html);
    invoiceWindow.document.close();
    invoiceWindow.focus();

    setTimeout(() => {
      invoiceWindow.print();
    }, 300);
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <Pill tone="purple"><Megaphone size={14} /> Campaign Approval</Pill>
          <h2>Confirm deposits before campaigns go live.</h2>
          <p>Update payment reference and deposit status first. Campaigns should only be approved after deposit is Partial or Paid.</p>
        </div>
      </div>

      <div className="table-wrap wide-table">
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Creator / Client</th>
              <th>Contact</th>
              <th>Budget</th>
              <th>Deposit status</th>
              <th>Deposit amount</th>
              <th>Payment ref</th>
              <th>Admin notes</th>
              <th>Campaign status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {campaigns.map((c) => {
              const draft = getDraft(c);

              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <div className="table-subtext">{c.category}</div>
                  </td>

                  <td>
                    <strong>{c.creator}</strong>
                    <div className="table-subtext">{c.clientName || c.client_name || 'No client name'}</div>
                  </td>

                  <td>
                    <div>{c.clientPhone || c.client_phone || '-'}</div>
                    <div className="table-subtext">{c.clientEmail || c.client_email || ''}</div>
                  </td>

                  <td>{money(c.budget)}</td>

                  <td>
                    <select
                      className="mini-select"
                      value={draft.depositStatus}
                      onChange={(e) => updateDraft(c.id, 'depositStatus', e.target.value)}
                    >
                      <option>Pending</option>
                      <option>Partial</option>
                      <option>Paid</option>
                      <option>Refunded</option>
                    </select>

                    <div className="table-subtext">
                      <Pill tone={depositTone(draft.depositStatus)}>{draft.depositStatus}</Pill>
                    </div>
                  </td>

                  <td>
                    <input
                      className="mini-input"
                      type="number"
                      value={draft.depositAmount}
                      onChange={(e) => updateDraft(c.id, 'depositAmount', e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="mini-input"
                      value={draft.paymentReference}
                      onChange={(e) => updateDraft(c.id, 'paymentReference', e.target.value)}
                      placeholder="M-Pesa code"
                    />
                  </td>

                  <td>
                    <textarea
                      className="mini-textarea"
                      value={draft.adminNotes}
                      onChange={(e) => updateDraft(c.id, 'adminNotes', e.target.value)}
                      placeholder="Internal deposit notes"
                    />
                  </td>

                  <td>
                    <Pill tone={c.status === 'Live' ? 'green' : c.status === 'Rejected' ? 'red' : 'yellow'}>
                      {c.status}
                    </Pill>
                  </td>

                  <td className="row-actions">
                    <Button type="button" onClick={() => saveDeposit(c)}>
                      Save deposit
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => copyPaymentSummary(c)}>
                      Copy summary
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => printClientInvoice(c)}>
                      Print invoice
                    </Button>

                    <Button type="button" onClick={() => onCampaignStatus(c.id, 'Live')}>
                      <CheckCircle2 size={16} /> Approve
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => onCampaignStatus(c.id, 'Rejected')}>
                      <XCircle size={16} /> Reject
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminSubmissions({ submissions, campaigns, onReviewSubmission }) {
  const review = (submission, status) => {
    const campaign = campaigns.find((c) => c.id === submission.campaignId || c.title === submission.campaign);
    const approvedViews = status === 'Approved' ? Number(submission.submittedViews || 0) : 0;
    let payout = campaign ? (approvedViews / 1000) * Number(campaign.payPerThousand || 0) : 0;
    if (campaign?.maxPayout && payout > campaign.maxPayout) payout = campaign.maxPayout;
    onReviewSubmission(submission.id, { status, approvedViews, payout: Math.round(payout), notes: status === 'Approved' ? 'Approved by admin.' : 'Rejected by admin.' });
  };

  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><ShieldCheck size={14} /> Submission Review</Pill><h2>Approve or reject clip submissions.</h2></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Campaign</th><th>Clipper</th><th>Views</th><th>Payout</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td>{s.campaign}</td>
                <td>{s.clipper}</td>
                <td>{Number(s.submittedViews).toLocaleString()}</td>
                <td>{money(s.payout)}</td>
                <td><Pill tone={s.status === 'Approved' || s.status === 'Paid' ? 'green' : s.status === 'Rejected' ? 'red' : 'yellow'}>{s.status}</Pill></td>
                <td className="row-actions">
                  <Button onClick={() => review(s, 'Approved')}><CheckCircle2 size={16} /> Approve</Button>
                  <Button variant="ghost" onClick={() => review(s, 'Rejected')}><XCircle size={16} /> Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');

  const [affiliateForm, setAffiliateForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    type: 'General',
    creatorCommissionPercent: 5,
    clipperCommissionAmount: 100,
    notes: ''
  });

  const [referralForm, setReferralForm] = useState({
    affiliateId: '',
    referralType: 'creator',
    referredName: '',
    referredEmail: '',
    referredPhone: '',
    campaignBudget: 0,
    commissionAmount: 0,
    notes: ''
  });

  const loadAffiliateData = async () => {
    setLoading(true);
    setMessage('Loading affiliate data...');

    try {
      if (!supabase) throw new Error('Supabase is not configured.');

      const { data: affiliatesData, error: affiliatesError } = await withSupabaseTimeout(
        supabase
          .from('affiliates')
          .select('*')
          .order('created_at', { ascending: false }),
        'Load affiliates'
      );

      if (affiliatesError) throw affiliatesError;

      const { data: referralsData, error: referralsError } = await withSupabaseTimeout(
        supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false }),
        'Load referrals'
      );

      if (referralsError) throw referralsError;

      setAffiliates(affiliatesData || []);
      setReferrals(referralsData || []);
      setMessage('Affiliate data loaded.');
    } catch (err) {
      console.error('Affiliate load failed:', err);
      setMessage('Affiliate load failed: ' + (err?.message || err));
      alert('Affiliate load failed: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliateData();
  }, []);

  const updateAffiliate = (key, value) => {
    setAffiliateForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateReferral = (key, value) => {
    setReferralForm((prev) => ({ ...prev, [key]: value }));
  };

  const createAffiliate = async () => {
    if (busyAction) return;

    if (!affiliateForm.name.trim()) {
      alert('Add affiliate name.');
      return;
    }

    if (!affiliateForm.code.trim()) {
      alert('Add affiliate code.');
      return;
    }

    setBusyAction('affiliate');
    setMessage('Creating affiliate...');

    try {
      if (!supabase) throw new Error('Supabase is not configured.');

      const { data: userData } = await supabase.auth.getUser();

      const payload = {
        name: affiliateForm.name.trim(),
        code: affiliateForm.code.trim().toUpperCase(),
        email: affiliateForm.email.trim(),
        phone: affiliateForm.phone.trim(),
        type: affiliateForm.type,
        creator_commission_percent: Number(affiliateForm.creatorCommissionPercent || 0),
        clipper_commission_amount: Number(affiliateForm.clipperCommissionAmount || 0),
        notes: affiliateForm.notes,
        status: 'Active',
        created_by: userData?.user?.id || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await withSupabaseTimeout(
        supabase
          .from('affiliates')
          .upsert(payload, { onConflict: 'code' })
          .select('*')
          .single(),
        'Create affiliate'
      );

      if (error) throw error;

      setAffiliates((prev) => [data, ...prev]);
      setReferralForm((prev) => ({ ...prev, affiliateId: data.id }));

      setAffiliateForm({
        name: '',
        code: '',
        email: '',
        phone: '',
        type: 'General',
        creatorCommissionPercent: 5,
        clipperCommissionAmount: 100,
        notes: ''
      });

      setMessage('Affiliate created and selected.');
      alert('Affiliate created and selected.');
    } catch (err) {
      console.error('Affiliate create failed:', err);
      setMessage('Affiliate create failed: ' + (err?.message || err));
      alert('Affiliate create failed: ' + (err?.message || err));
    } finally {
      setBusyAction('');
    }
  };

  const selectedAffiliate = affiliates.find((item) => item.id === referralForm.affiliateId);

  const calculateCommission = () => {
    if (referralForm.commissionAmount) return Number(referralForm.commissionAmount || 0);

    if (!selectedAffiliate) {
      if (referralForm.referralType === 'creator') {
        return Math.round((Number(referralForm.campaignBudget || 0) * Number(affiliateForm.creatorCommissionPercent || 0)) / 100);
      }

      return Number(affiliateForm.clipperCommissionAmount || 0);
    }

    if (referralForm.referralType === 'creator') {
      return Math.round((Number(referralForm.campaignBudget || 0) * Number(selectedAffiliate.creator_commission_percent || 0)) / 100);
    }

    return Number(selectedAffiliate.clipper_commission_amount || 0);
  };

  const createReferral = async () => {
    if (busyAction) return;

    if (!referralForm.referredName.trim()) {
      alert('Add referred person or brand name.');
      return;
    }

    setBusyAction('referral');
    setMessage('Recording referral...');

    try {
      if (!supabase) throw new Error('Supabase is not configured.');

      const { data: userData } = await supabase.auth.getUser();
      let activeAffiliateId = referralForm.affiliateId;

      if (!activeAffiliateId && affiliates.length === 1) {
        activeAffiliateId = affiliates[0].id;
      }

      if (!activeAffiliateId && affiliateForm.name.trim() && affiliateForm.code.trim()) {
        const affiliatePayload = {
          name: affiliateForm.name.trim(),
          code: affiliateForm.code.trim().toUpperCase(),
          email: affiliateForm.email.trim(),
          phone: affiliateForm.phone.trim(),
          type: affiliateForm.type,
          creator_commission_percent: Number(affiliateForm.creatorCommissionPercent || 0),
          clipper_commission_amount: Number(affiliateForm.clipperCommissionAmount || 0),
          notes: affiliateForm.notes,
          status: 'Active',
          created_by: userData?.user?.id || null,
          updated_at: new Date().toISOString()
        };

        const { data: createdAffiliate, error: affiliateError } = await withSupabaseTimeout(
          supabase
            .from('affiliates')
            .upsert(affiliatePayload, { onConflict: 'code' })
            .select('*')
            .single(),
          'Auto-create affiliate'
        );

        if (affiliateError) throw affiliateError;

        activeAffiliateId = createdAffiliate.id;
        setAffiliates((prev) => [createdAffiliate, ...prev]);
        setReferralForm((prev) => ({ ...prev, affiliateId: createdAffiliate.id }));
      }

      if (!activeAffiliateId) {
        throw new Error('Choose affiliate or fill the Create Affiliate form first.');
      }

      const commission = Number(referralForm.commissionAmount || calculateCommission() || 0);

      const payload = {
        affiliate_id: activeAffiliateId,
        referral_type: referralForm.referralType,
        referred_name: referralForm.referredName.trim(),
        referred_email: referralForm.referredEmail.trim(),
        referred_phone: referralForm.referredPhone.trim(),
        campaign_budget: Number(referralForm.campaignBudget || 0),
        commission_amount: commission,
        status: 'Pending',
        notes: referralForm.notes,
        created_by: userData?.user?.id || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await withSupabaseTimeout(
        supabase
          .from('referrals')
          .insert(payload)
          .select('*')
          .single(),
        'Record referral'
      );

      if (error) throw error;

      setReferrals((prev) => [data, ...prev]);

      setReferralForm({
        affiliateId: activeAffiliateId,
        referralType: 'creator',
        referredName: '',
        referredEmail: '',
        referredPhone: '',
        campaignBudget: 0,
        commissionAmount: 0,
        notes: ''
      });

      setMessage('Referral recorded.');
      alert('Referral recorded.');
    } catch (err) {
      console.error('Referral create failed:', err);
      setMessage('Referral create failed: ' + (err?.message || err));
      alert('Referral create failed: ' + (err?.message || err));
    } finally {
      setBusyAction('');
    }
  };

  const updateReferralStatus = async (referral, status) => {
    if (busyAction) return;

    setBusyAction(referral.id);
    setMessage('Updating referral...');

    try {
      const patch = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'Qualified') patch.qualified_at = new Date().toISOString();
      if (status === 'Paid') patch.paid_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('referrals')
        .update(patch)
        .eq('id', referral.id)
        .select('*')
        .single();

      if (error) throw error;

      setReferrals((prev) => prev.map((item) => item.id === referral.id ? data : item));

      setMessage('Referral marked as ' + status + '.');
      alert('Referral marked as ' + status + '.');
    } catch (err) {
      console.error('Referral update failed:', err);
      setMessage('Referral update failed: ' + (err?.message || err));
      alert('Referral update failed: ' + (err?.message || err));
    } finally {
      setBusyAction('');
    }
  };

  const totalPending = referrals
    .filter((item) => item.status === 'Pending' || item.status === 'Qualified')
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  const totalPaid = referrals
    .filter((item) => item.status === 'Paid')
    .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

  return (
    <section className="affiliate-page">
      <div className="section-head">
        <div>
          <Pill tone="purple">Affiliate Program</Pill>
          <h2>Track referrals and partner commissions.</h2>
          <p>Pay affiliates only after a creator funds a campaign or a clipper gets an approved submission.</p>
          {message && <p className="form-note affiliate-message">{message}</p>}
        </div>

        <button type="button" className="affiliate-action-btn secondary" onClick={loadAffiliateData} disabled={loading || Boolean(busyAction)}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard icon={Coins} label="Affiliates" value={affiliates.length} helper="Active partners" />
        <StatCard icon={ShieldCheck} label="Referrals" value={referrals.length} helper="Tracked leads" />
        <StatCard icon={Wallet} label="Unpaid commission" value={money(totalPending)} helper="Pending/qualified" />
        <StatCard icon={CheckCircle2} label="Paid commission" value={money(totalPaid)} helper="Completed payouts" />
      </div>

      <div className="affiliate-grid">
        <div className="affiliate-card">
          <h3>Create affiliate</h3>

          <label>Name<input value={affiliateForm.name} onChange={(e) => updateAffiliate('name', e.target.value)} placeholder="e.g. Mark FX Partner" /></label>
          <label>Affiliate code<input value={affiliateForm.code} onChange={(e) => updateAffiliate('code', e.target.value.toUpperCase())} placeholder="MARKFX" /></label>
          <label>Email<input value={affiliateForm.email} onChange={(e) => updateAffiliate('email', e.target.value)} /></label>
          <label>Phone<input value={affiliateForm.phone} onChange={(e) => updateAffiliate('phone', e.target.value)} /></label>

          <label>Type
            <select value={affiliateForm.type} onChange={(e) => updateAffiliate('type', e.target.value)}>
              <option>General</option>
              <option>Creator Partner</option>
              <option>Clipper Partner</option>
              <option>Agency</option>
              <option>Community Manager</option>
            </select>
          </label>

          <label>Creator commission %
            <input type="number" value={affiliateForm.creatorCommissionPercent} onChange={(e) => updateAffiliate('creatorCommissionPercent', e.target.value)} />
          </label>

          <label>Clipper commission flat
            <input type="number" value={affiliateForm.clipperCommissionAmount} onChange={(e) => updateAffiliate('clipperCommissionAmount', e.target.value)} />
          </label>

          <label>Notes<textarea value={affiliateForm.notes} onChange={(e) => updateAffiliate('notes', e.target.value)} /></label>

          <button type="button" className="affiliate-action-btn" onClick={createAffiliate} disabled={busyAction === 'affiliate'}>
            {busyAction === 'affiliate' ? 'Creating...' : 'Create affiliate'}
          </button>
        </div>

        <div className="affiliate-card">
          <h3>Record referral</h3>

          <label>Affiliate
            <select value={referralForm.affiliateId} onChange={(e) => updateReferral('affiliateId', e.target.value)}>
              <option value="">Choose affiliate</option>
              {affiliates.map((affiliate) => (
                <option key={affiliate.id} value={affiliate.id}>{affiliate.name} - {affiliate.code}</option>
              ))}
            </select>
          </label>

          <label>Referral type
            <select value={referralForm.referralType} onChange={(e) => updateReferral('referralType', e.target.value)}>
              <option value="creator">Creator/client</option>
              <option value="clipper">Clipper</option>
            </select>
          </label>

          <label>Referred name<input value={referralForm.referredName} onChange={(e) => updateReferral('referredName', e.target.value)} /></label>
          <label>Email<input value={referralForm.referredEmail} onChange={(e) => updateReferral('referredEmail', e.target.value)} /></label>
          <label>Phone<input value={referralForm.referredPhone} onChange={(e) => updateReferral('referredPhone', e.target.value)} /></label>

          <label>Campaign budget
            <input type="number" value={referralForm.campaignBudget} onChange={(e) => updateReferral('campaignBudget', e.target.value)} />
          </label>

          <label>Commission amount
            <input type="number" value={referralForm.commissionAmount || calculateCommission()} onChange={(e) => updateReferral('commissionAmount', e.target.value)} />
          </label>

          <label>Notes<textarea value={referralForm.notes} onChange={(e) => updateReferral('notes', e.target.value)} /></label>

          <button type="button" className="affiliate-action-btn" onClick={createReferral} disabled={busyAction === 'referral'}>
            {busyAction === 'referral' ? 'Recording...' : 'Record referral'}
          </button>
        </div>
      </div>

      {affiliates.length > 0 && (
        <div className="affiliate-link-list">
          <h3>Affiliate referral links</h3>
          <p className="form-note">Share these links with partners. Signups from the link are recorded as Pending referrals.</p>

          {affiliates.map((affiliate) => {
            const link = `${window.location.origin}${window.location.pathname}?ref=${affiliate.code}`;

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

      <div className="affiliate-table table-wrap">
        <table>
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Code</th>
              <th>Referral</th>
              <th>Type</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {referrals.map((referral) => {
              const affiliate = affiliates.find((item) => item.id === referral.affiliate_id);

              return (
                <tr key={referral.id}>
                  <td>{affiliate?.name || 'Unknown'}</td>
                  <td>{affiliate?.code || '-'}</td>
                  <td>{referral.referred_name}</td>
                  <td>{referral.referral_type}</td>
                  <td>{money(referral.commission_amount)}</td>
                  <td>
                    <Pill tone={referral.status === 'Paid' ? 'green' : referral.status === 'Rejected' ? 'red' : 'yellow'}>
                      {referral.status}
                    </Pill>
                  </td>
                  <td className="row-actions">
                    <button type="button" className="mini-action" onClick={() => updateReferralStatus(referral, 'Qualified')}>Qualify</button>
                    <button type="button" className="mini-action" onClick={() => updateReferralStatus(referral, 'Paid')}>Mark paid</button>
                    <button type="button" className="mini-action ghost" onClick={() => updateReferralStatus(referral, 'Rejected')}>Reject</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminPayouts({ submissions, onMarkPaid }) {
  const payable = submissions.filter((s) => ['Approved', 'Eligible for Payout', 'Paid'].includes(s.status));
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><Coins size={14} /> Payout Tracking</Pill><h2>Manual M-Pesa payout records.</h2></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Clipper</th><th>Campaign</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {payable.map((s) => (
              <tr key={s.id}>
                <td>{s.clipper}</td>
                <td>{s.campaign}</td>
                <td>{money(s.payout)}</td>
                <td><Pill tone={s.status === 'Paid' ? 'green' : 'yellow'}>{s.status}</Pill></td>
                <td>{s.status !== 'Paid' && <Button onClick={() => onMarkPaid(s)}>Mark paid</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function App() {
  const [role, setRole] = useLocalState('solohub-role', 'clipper');
  const [page, setPage] = useLocalState('solohub-page', 'home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const cloudMode = isSupabaseConfigured;
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaigns, setCampaigns] = useLocalState('solohub-campaigns-phase3', seedCampaigns);
  const [submissions, setSubmissions] = useLocalState('solohub-submissions-phase3', seedSubmissions);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());  const loadProfile = async (currentUser, preferredRole = '', fullName = '') => {
    if (!cloudMode || !currentUser) return null;

    const ownerAdmin = isOwnerEmail(currentUser.email);

    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (selectError) {
      console.error('Profile load failed:', selectError);
      setNotice(`Profile load failed: ${selectError.message}`);
      return null;
    }

    const finalRole = ownerAdmin
      ? 'admin'
      : cleanRole(existing?.role || preferredRole || currentUser.user_metadata?.role || role || 'clipper');

    const profilePayload = {
      id: currentUser.id,
      email: currentUser.email || existing?.email || '',
      full_name: existing?.full_name || fullName || currentUser.user_metadata?.full_name || currentUser.email || '',
      role: finalRole,
      updated_at: new Date().toISOString()
    };

    let savedProfile = { ...(existing || {}), ...profilePayload };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.warn('Profile upsert failed. Using local profile state:', error);
      setNotice(`Profile save warning: ${error.message}`);
    } else if (data) {
      savedProfile = data;
    }

    const fixedProfile = {
      ...savedProfile,
      role: ownerAdmin ? 'admin' : cleanRole(savedProfile.role || finalRole)
    };

    setProfile(fixedProfile);
    setRole(fixedProfile.role);
    setPage(defaultPageForRole(fixedProfile.role));

    try {
      const claimedCode = await claimStoredReferralCode(currentUser, fixedProfile.role, fixedProfile.full_name);
      if (claimedCode) {
        setReferralCode('');
        setNotice(`Referral code ${claimedCode} captured. Admin will qualify it after value is confirmed.`);
      }
    } catch (refErr) {
      console.warn('Referral claim failed:', refErr);
      setNotice('Referral code was found, but could not be claimed: ' + (refErr?.message || refErr));
    }

    return fixedProfile;
  };  const handleAuthUser = async (authUser, preferredRole = '', fullName = '', options = {}) => {
    try {
      if (!authUser?.id) return null;

      const ownerAdmin = isOwnerEmail(authUser.email);
      setUser(authUser);

      let existingProfile = null;

      if (cloudMode) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Profile lookup failed:', profileError);
        }

        existingProfile = profileData || null;
      }

      const finalRole = ownerAdmin
        ? 'admin'
        : cleanRole(existingProfile?.role || preferredRole || authUser?.user_metadata?.role || 'clipper');

      const profilePayload = {
        id: authUser.id,
        email: authUser.email || existingProfile?.email || '',
        full_name: existingProfile?.full_name || fullName || authUser?.user_metadata?.full_name || authUser.email || '',
        role: finalRole,
        updated_at: new Date().toISOString()
      };

      let savedProfile = profilePayload;

      if (cloudMode) {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })
          .select('*')
          .single();

        if (error) {
          console.warn('Profile save failed. Using local profile state:', error);
          setNotice(`Profile save warning: ${error.message}`);
        } else if (data) {
          savedProfile = data;
        }
      }

      const fixedProfile = {
        ...savedProfile,
        role: ownerAdmin ? 'admin' : cleanRole(savedProfile.role || finalRole)
      };

      setProfile(fixedProfile);
      setRole(fixedProfile.role);
      setPage(options?.stayHome ? 'home' : defaultPageForRole(fixedProfile.role));

      try {
        const claimedCode = await claimStoredReferralCode(authUser, fixedProfile.role, fixedProfile.full_name);
        if (claimedCode) {
          setReferralCode('');
          setNotice(`Referral code ${claimedCode} captured. Admin will qualify it after value is confirmed.`);
        }
      } catch (refErr) {
        console.warn('Referral claim failed:', refErr);
        setNotice('Referral code was found, but could not be claimed: ' + (refErr?.message || refErr));
      }

      return fixedProfile;
    } catch (err) {
      console.error('Auth profile handling failed:', err);
      alert('Auth profile handling failed: ' + (err?.message || err));
      return null;
    }
  };

const updateProfileRole = async (nextRole) => {
    if (!user || !cloudMode) {
      alert('You must be logged in first.');
      return;
    }

    const safeRole = cleanRole(nextRole);

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
      role: safeRole,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Role update failed:', error);
      setNotice(`Role update failed: ${error.message}`);
      alert(`Role update failed: ${error.message}`);
      return;
    }

    const fixedProfile = { ...data, role: cleanRole(data.role) };
    setProfile(fixedProfile);
    setRole(fixedProfile.role);
    setPage(defaultPageForRole(fixedProfile.role));
    setNotice(`Profile role updated to ${fixedProfile.role}.`);
    alert(`Role updated to ${fixedProfile.role}.`);
  };



  const logout = async () => {
    setNotice('Logging out...');

    try {
      const signOutPromise = cloudMode && supabase?.auth
        ? supabase.auth.signOut({ scope: 'local' })
        : Promise.resolve({ error: null });

      const timeout = new Promise((resolve) =>
        setTimeout(() => resolve({ error: null, timedOut: true }), 2500)
      );

      await Promise.race([signOutPromise, timeout]);
    } catch (err) {
      console.warn('Supabase signOut failed; clearing local session anyway:', err);
    }

    try {
      const removeMatchingKeys = (storage) => {
        const keys = [];
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i);
          if (
            key &&
            (
              key.startsWith('sb-') ||
              key.toLowerCase().includes('supabase') ||
              key.toLowerCase().includes('auth-token')
            )
          ) {
            keys.push(key);
          }
        }
        keys.forEach((key) => storage.removeItem(key));
      };

      removeMatchingKeys(localStorage);
      removeMatchingKeys(sessionStorage);
    } catch (err) {
      console.warn('Could not clear auth storage:', err);
    }

    setUser(null);
    setProfile(null);
    setSelectedCampaign(null);
    setSidebarOpen(false);
    setRole('clipper');
    setPage('home');
    setNotice('Logged out successfully.');

    setTimeout(() => {
      window.location.replace(window.location.origin + window.location.pathname);
    }, 150);
  };

  const loadCloudData = async () => {
    if (!cloudMode) return;
    setLoading(true);
    setNotice('');
    const [campaignRes, submissionRes] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('submissions').select('*').order('created_at', { ascending: false })
    ]);

    if (campaignRes.error || submissionRes.error) {
      setNotice(campaignRes.error?.message || submissionRes.error?.message || 'Could not load Supabase data.');
    } else {
      setCampaigns(campaignRes.data.map(toCampaign));
      setSubmissions(submissionRes.data.map(toSubmission));
      setNotice('Synced with Supabase.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCloudData();

    if (!cloudMode) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      if (currentUser) await loadProfile(currentUser);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) await loadProfile(currentUser);
      if (!currentUser) setProfile(null);
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCampaign = async (campaign) => {
    const cleanCampaign = {
      ...campaign,
      creator_user_id: user?.id || null,
      title: String(campaign.title || '').trim(),
      creator: String(campaign.creator || 'SoloHub Creator').trim(),
      category: String(campaign.category || 'General').trim(),
      description: String(campaign.description || '').trim(),
      status: 'Pending Approval'
    };

    if (!cleanCampaign.title || !cleanCampaign.description) {
      const msg = 'Campaign title and description are required.';
      setNotice(msg);
      alert(msg);
      return false;
    }

    try {
      if (cloudMode) {
        const payload = toCampaignDb(cleanCampaign);
        console.log('Saving SoloHub campaign to Supabase:', payload);

        const { data, error } = await supabase
          .from('campaigns')
          .insert([payload])
          .select('*')
          .single();

        if (error) {
          console.error('Supabase campaign insert error:', error);
          const msg = `Campaign save failed: ${error.message}`;
          setNotice(msg);
          alert(msg);
          return false;
        }

        setCampaigns((prev) => [toCampaign(data), ...prev]);
        setNotice('Campaign saved to Supabase and sent for approval.');
        alert('Campaign submitted successfully. Opening admin approval page.');
      } else {
        setCampaigns((prev) => [cleanCampaign, ...prev]);
        setNotice('Campaign saved locally and sent for approval.');
        alert('Campaign saved locally. Opening admin approval page.');
      }

      setRole('admin');
      setPage('adminCampaigns');
      return true;
    } catch (err) {
      console.error('Campaign submit crashed:', err);
      const msg = `Campaign submit crashed: ${err?.message || err}`;
      setNotice(msg);
      alert(msg);
      return false;
    }
  };  const updateCampaignFunding = async (id, funding) => {
    try {
      if (!id) {
        alert('Missing campaign ID.');
        return;
      }

      const patch = {
        deposit_status: funding.depositStatus || funding.deposit_status || 'Pending',
        deposit_amount: Number(funding.depositAmount || funding.deposit_amount || 0),
        payment_reference: funding.paymentReference || funding.payment_reference || '',
        admin_notes: funding.adminNotes || funding.admin_notes || ''
      };

      if (cloudMode) {
        const data = await updateCampaignDirect(id, patch);

        if (!data) {
          alert('Deposit update failed: no campaign returned.');
          return;
        }

        setCampaigns((prev) =>
          prev.map((campaign) => campaign.id === id ? toCampaign(data) : campaign)
        );

        setNotice('Campaign deposit details updated.');
        alert('Deposit details updated.');
        return;
      }

      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === id
            ? {
                ...campaign,
                depositStatus: patch.deposit_status,
                deposit_status: patch.deposit_status,
                depositAmount: patch.deposit_amount,
                deposit_amount: patch.deposit_amount,
                paymentReference: patch.payment_reference,
                payment_reference: patch.payment_reference,
                adminNotes: patch.admin_notes,
                admin_notes: patch.admin_notes
              }
            : campaign
        )
      );

      setNotice('Campaign deposit details updated locally.');
      alert('Deposit details updated.');
    } catch (err) {
      console.error('Deposit update failed:', err);
      alert('Deposit update failed: ' + (err?.message || err));
      setNotice('Deposit update failed: ' + (err?.message || err));
    }
  };



  const campaignStatus = async (id, status) => {
    try {
      if (!id) {
        alert("Missing campaign ID.");
        return;
      }

      if (cloudMode) {
        const data = await updateCampaignDirect(id, { status });

        if (!data) {
          alert("Campaign update failed: no data returned.");
          return;
        }

        setCampaigns((prev) =>
          prev.map((campaign) => campaign.id === id ? toCampaign(data) : campaign)
        );

        setNotice(`Campaign marked as ${status}.`);
        alert(`Campaign marked as ${status}.`);
        return;
      }

      setCampaigns((prev) =>
        prev.map((campaign) => campaign.id === id ? { ...campaign, status } : campaign)
      );

      setNotice(`Campaign marked as ${status}.`);
      alert(`Campaign marked as ${status}.`);
    } catch (err) {
      console.error("Campaign approval failed:", err);
      alert("Campaign approval failed: " + (err?.message || err));
      setNotice("Campaign approval failed: " + (err?.message || err));
    }
  };

  const submitClip = async (submission) => {
    try {
      const cleanSubmission = {
        ...submission,
        clipper_user_id: user?.id || null,
        status: 'Pending Review',
        submitted_views: Number(submission.submitted_views || submission.submittedViews || 0),
        approved_views: 0,
        estimated_payout: Number(submission.estimated_payout || submission.estimatedPayout || 0),
        approved_payout: 0
      };

      if (!cleanSubmission.post_url && !cleanSubmission.postUrl && !cleanSubmission.link) {
        alert('Please add the posted video link.');
        return false;
      }

      if (!cleanSubmission.campaign_id && !cleanSubmission.campaignId) {
        alert('Missing campaign. Please choose a campaign first.');
        return false;
      }

      if (cloudMode) {
        const payload = toSubmissionDb(cleanSubmission);
        console.log('Saving submission payload:', payload);

        const data = await insertSubmissionDirect(payload);

        if (!data) {
          alert('Submission failed: no data returned.');
          return false;
        }

        setSubmissions((prev) => [toSubmission(data), ...prev]);
        setNotice('Clip submitted to Supabase for review.');
        alert('Clip submitted successfully for review.');
        setRole('admin');
        setPage('adminSubmissions');
        return true;
      }

      setSubmissions((prev) => [cleanSubmission, ...prev]);
      setNotice('Clip submitted locally for review.');
      alert('Clip submitted successfully for review.');
      setRole('admin');
      setPage('adminSubmissions');
      return true;
    } catch (err) {
      console.error('Clip submission failed:', err);
      alert('Clip submission failed: ' + (err?.message || err));
      setNotice('Clip submission failed: ' + (err?.message || err));
      return false;
    }
  };const reviewSubmission = async (id, changes) => {
    try {
      if (!id) {
        alert('Missing submission ID.');
        return;
      }

      const patch = {
        status: changes.status,
        approved_views: Number(changes.approvedViews || changes.approved_views || 0),
        payout: Number(changes.payout || 0),
        notes: changes.notes || ''
      };

      if (cloudMode) {
        const data = await updateSubmissionDirect(id, patch);

        if (!data) {
          alert('Submission update failed: no data returned.');
          return;
        }

        setSubmissions((prev) =>
          prev.map((s) => s.id === id ? toSubmission(data) : s)
        );

        setNotice(`Submission marked ${changes.status}.`);
        alert(`Submission marked as ${changes.status}.`);
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) => s.id === id ? { ...s, ...changes } : s)
      );

      setNotice(`Submission marked ${changes.status}.`);
      alert(`Submission marked as ${changes.status}.`);
    } catch (err) {
      console.error('Submission review failed:', err);
      alert('Submission review failed: ' + (err?.message || err));
      setNotice('Submission review failed: ' + (err?.message || err));
    }
  };  const markPaid = async (submission) => {
    try {
      if (!submission?.id) {
        alert('Missing submission ID.');
        return;
      }

      const paymentReference = `MANUAL-${Date.now()}`;
      const paidAt = new Date().toISOString();

      if (cloudMode) {
        const updatedSubmission = await updateSubmissionDirect(submission.id, {
          status: 'Paid',
          notes: submission.notes || 'Paid manually.'
        });

        if (!updatedSubmission) {
          alert('Could not mark submission as paid.');
          return;
        }

        await insertPayoutDirect({
          submission_id: submission.id,
          clipper: submission.clipper,
          amount: Number(submission.payout || 0),
          status: 'Paid',
          payment_reference: paymentReference,
          paid_at: paidAt,
          clipper_user_id: submission.clipper_user_id || null
        });

        setSubmissions((prev) =>
          prev.map((s) => s.id === submission.id ? toSubmission(updatedSubmission) : s)
        );

        setNotice('Payout marked paid and saved to Supabase.');
        alert('Payout marked as paid.');
        return;
      }

      setSubmissions((prev) =>
        prev.map((s) => s.id === submission.id ? { ...s, status: 'Paid' } : s)
      );

      setNotice('Payout marked paid locally.');
      alert('Payout marked as paid.');
    } catch (err) {
      console.error('Mark paid failed:', err);
      alert('Mark paid failed: ' + (err?.message || err));
      setNotice('Mark paid failed: ' + (err?.message || err));
    }
  };

    const updatePayoutProfile = async (details) => {
    try {
      if (!user?.id) {
        alert('Please login first.');
        return;
      }

      const payload = {
        mpesa_name: details.mpesaName || details.mpesa_name || '',
        mpesa_phone: details.mpesaPhone || details.mpesa_phone || '',
        backup_phone: details.backupPhone || details.backup_phone || '',
        payout_notes: details.payoutNotes || details.payout_notes || '',
        updated_at: new Date().toISOString()
      };

      if (cloudMode) {
        const { data, error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select('*')
          .single();

        if (error) {
          throw error;
        }

        setProfile((prev) => ({
          ...(prev || {}),
          ...(data || {})
        }));

        alert('Payout profile saved.');
        setNotice('Payout profile saved.');
        return;
      }

      setProfile((prev) => ({
        ...(prev || {}),
        ...payload
      }));

      alert('Payout profile saved locally.');
      setNotice('Payout profile saved locally.');
    } catch (err) {
      console.error('Payout profile update failed:', err);
      alert('Payout profile update failed: ' + (err?.message || err));
      setNotice('Payout profile update failed: ' + (err?.message || err));
    }
  };

const content = useMemo(() => {
    const currentRole = roleForUser(user, profile, role);
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
      return <EarningsPage submissions={ownClipperSubmissions} profile={profile} onUpdatePayoutProfile={updatePayoutProfile} />;
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
      return isAdmin ? <AdminCampaigns campaigns={campaigns} onCampaignStatus={campaignStatus} onCampaignFundingUpdate={updateCampaignFunding} /> : home;
    }

    if (page === 'adminSubmissions') {
      return isAdmin ? <AdminSubmissions submissions={submissions} campaigns={campaigns} onReviewSubmission={reviewSubmission} /> : home;
    }

    if (page === 'adminAffiliates') {
      return isAdmin ? <AdminAffiliates /> : home;
    }

    if (page === 'adminPayouts') {
      return isAdmin ? <AdminPayouts submissions={submissions} onMarkPaid={markPaid} /> : home;
    }

    return home;
  }, [page, campaigns, submissions, selectedCampaign, cloudMode, user, profile, role]);

  return (
    <>
      <Header role={roleForUser(user, profile, role)} setRole={setRole} setPage={setPage} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} cloudMode={cloudMode} user={user} profile={profile} onLogout={logout} />
      <div className="app-shell">
        <Sidebar role={roleForUser(user, profile, role)} page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} cloudMode={cloudMode} />
        <main>
          {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
          {cloudMode && <div className="notice subtle"><span>{loading ? 'Syncing Supabase...' : authLoading ? 'Checking login...' : user ? `Logged in as ${profile?.role || role || 'user'}` : 'Supabase mode active. Login on Home for role profiles.'}</span><button onClick={loadCloudData}>Refresh cloud data</button></div>}
          {cloudMode && !user && page !== 'home' ? <AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} referralCode={referralCode} /> : content}
        </main>
        <CampaignModal campaign={selectedCampaign && page !== 'submit' ? selectedCampaign : null} onClose={() => setSelectedCampaign(null)} />
      </div>
    </>
  );
}

export default App;


async function updateCampaignDirect(id, patch) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/rest/v1/campaigns?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Campaign update failed with status ${response.status}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}


async function insertSubmissionDirect(payload) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/rest/v1/submissions?select=*`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Submission insert failed with status ${response.status}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}


async function updateSubmissionDirect(id, patch) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/rest/v1/submissions?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Submission update failed with status ${response.status}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}


async function insertPayoutDirect(payload) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${url}/rest/v1/payouts?select=*`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Payout insert failed with status ${response.status}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}


async function getSupabaseAuthHeaders() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let accessToken = key;

  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || key;
  } catch (err) {
    console.warn("Could not get Supabase session token. Falling back to publishable key.", err);
  }

  return {
    apikey: key,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}


async function uploadCampaignImageFile(file) {
  if (!file) {
    throw new Error("No image file selected.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image is too large. Maximum size is 5MB.");
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || "public";

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-");

  const path = `campaigns/${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from("campaign-assets")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("campaign-assets")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Image uploaded but public URL was not returned.");
  }

  return data.publicUrl;
}


async function fetchAffiliateDataDirect() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const headers = await getSupabaseAuthHeaders();

  const [affiliatesRes, referralsRes] = await Promise.all([
    fetch(`${url}/rest/v1/affiliates?select=*&order=created_at.desc`, { headers }),
    fetch(`${url}/rest/v1/referrals?select=*&order=created_at.desc`, { headers })
  ]);

  const affiliatesText = await affiliatesRes.text();
  const referralsText = await referralsRes.text();

  if (!affiliatesRes.ok) throw new Error(affiliatesText || "Could not load affiliates.");
  if (!referralsRes.ok) throw new Error(referralsText || "Could not load referrals.");

  return {
    affiliates: affiliatesText ? JSON.parse(affiliatesText) : [],
    referrals: referralsText ? JSON.parse(referralsText) : []
  };
}

async function insertAffiliateDirect(payload) {
  const url = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${url}/rest/v1/affiliates?select=*`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || "Affiliate creation failed.");

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}

async function insertReferralDirect(payload) {
  const url = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${url}/rest/v1/referrals?select=*`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || "Referral creation failed.");

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}

async function updateReferralDirect(id, patch) {
  const url = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${url}/rest/v1/referrals?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify(patch)
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || "Referral update failed.");

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}
