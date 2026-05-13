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
  assets: row.assets || []
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
  assets: campaign.assets || []
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

function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`btn ${variant} ${className}`} {...props}>{children}</button>;
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
  const displayRole = profile?.role ? cleanRole(profile.role) : cleanRole(role);

  const changeRole = (nextRole) => {
    const currentProfileRole = profile?.role ? cleanRole(profile.role) : null;

    if (cloudMode && user && currentProfileRole && currentProfileRole !== 'admin' && nextRole !== currentProfileRole) {
      alert(`This account is registered as ${currentProfileRole}. Admin accounts can switch views for testing.`);
      return;
    }

    setRole(nextRole);
    setPage(defaultPageForRole(nextRole));
  };

  return (
    <header className="topbar">
      <button className="icon-btn mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={22} /></button>
      <button className="brand" onClick={() => setPage('home')}>
        <div className="logo">S</div>
        <div>
          <strong>SoloHub</strong>
          <span>{cloudMode ? (user ? `${displayRole} - ${user.email}` : 'Supabase connected') : 'Local demo mode'}</span>
        </div>
      </button>

      <div className="topbar-right">
        <nav className="role-switcher">
          {['clipper', 'creator', 'admin'].map((item) => (
            <button key={item} className={role === item ? 'active' : ''} onClick={() => changeRole(item)}>{item}</button>
          ))}
        </nav>
        {user && <Button variant="ghost" className="small" onClick={onLogout}><LogOut size={15} /> Logout</Button>}
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
    ['adminCampaigns', Megaphone, 'Campaigns'],
    ['adminSubmissions', ShieldCheck, 'Submissions'],
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

function AuthBox({ user, profile, onAuthUser, onLogout, onRoleChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountRole, setAccountRole] = useState(profile?.role || 'clipper');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.role) setAccountRole(profile.role);
  }, [profile?.role]);

  const signIn = async () => {
    setMessage('');
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (data?.user) await onAuthUser(data.user, accountRole, fullName);
    setMessage('Logged in successfully.');
  };

  const signUp = async () => {
    setMessage('');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: accountRole } }
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    if (data?.user) await onAuthUser(data.user, accountRole, fullName);
    setMessage(data?.session ? 'Account created and logged in.' : 'Account created. If Supabase asks for email confirmation, confirm your email or disable email confirmation for local testing.');
  };

  if (!isSupabaseConfigured) {
    return (
      <section className="panel auth-panel">
        <div>
          <Pill tone="yellow"><UserRound size={14} /> Backend not connected</Pill>
          <h2>Supabase login will appear after you add your .env keys.</h2>
          <p>For now, the app still works using local browser storage.</p>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="panel auth-panel">
        <div>
          <Pill tone="green"><UserRound size={14} /> Logged in</Pill>
          <h2>{profile?.full_name || user.email}</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {profile?.role || 'Not set'}</p>
          <p className="form-note">For development only, you can change your profile role below. Before launch, admin role changes should be locked.</p>
        </div>
        <div className="auth-form role-admin-form">
          <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
            <option value="clipper">Clipper</option>
            <option value="creator">Creator</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={() => onRoleChange(accountRole)}>Update role</Button>
          <Button variant="ghost" onClick={onLogout}><LogOut size={16} /> Logout</Button>
        </div>
        {message && <p className="form-note">{message}</p>}
      </section>
    );
  }

  return (
    <section className="panel auth-panel">
      <div>
        <Pill tone="green"><UserRound size={14} /> Phase 5 Auth</Pill>
        <h2>Create or login to a SoloHub account.</h2>
        <p>Choose the account type so SoloHub can send you to the correct dashboard.</p>
      </div>
      <div className="auth-form auth-form-wide">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name or brand name" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
          <option value="clipper">Join as Clipper</option>
          <option value="creator">Join as Creator</option>
          <option value="admin">Admin test account</option>
        </select>
        <Button onClick={signUp} disabled={busy || !email || !password}>{busy ? 'Please wait...' : 'Sign up'}</Button>
        <Button variant="ghost" onClick={signIn} disabled={busy || !email || !password}>Login</Button>
      </div>
      {message && <p className="form-note">{message}</p>}
    </section>
  );
}

function Hero({ setRole, setPage, cloudMode }) {
  return (
    <section className="hero-grid">
      <div className="hero-card big">
        <Pill tone="purple"><Sparkles size={14} /> Phase 3 backend-ready MVP</Pill>
        <h1>SoloHub now supports Supabase data saving.</h1>
        <p>Create campaigns, submit clips, approve submissions, and save them to Supabase when connected. Without Supabase keys, it still runs locally.</p>
        <div className="hero-actions">
          <Button onClick={() => { setRole('clipper'); setPage('discover'); }}>Start as Clipper</Button>
          <Button variant="ghost" onClick={() => { setRole('creator'); setPage('createCampaign'); }}>Create Campaign</Button>
        </div>
      </div>

      <div className="hero-card money-card">
        <div className="gradient-box">
          <span>Storage mode</span>
          <strong>{cloudMode ? 'Cloud' : 'Local'}</strong>
          <small>{cloudMode ? 'Supabase database' : 'Browser localStorage'}</small>
        </div>
        <div className="mini-card"><span>Next backend step</span><strong>Profiles</strong><small>Role permissions</small></div>
        <div className="mini-card"><span>Payment mode</span><strong>Manual</strong><small>M-Pesa tracking later</small></div>
      </div>
    </section>
  );
}

function HomePage({ setRole, setPage, campaigns, submissions, cloudMode, user, profile, onAuthUser, onLogout, onRoleChange }) {
  const liveCampaigns = campaigns.filter((c) => c.status === 'Live').length;
  const pendingSubmissions = submissions.filter((s) => s.status === 'Pending Review').length;
  return (
    <>
      <Hero setRole={setRole} setPage={setPage} cloudMode={cloudMode} />
      <AuthBox user={user} profile={profile} onAuthUser={onAuthUser} onLogout={onLogout} onRoleChange={onRoleChange} />
      <section className="panel">
        <div className="section-head">
          <div>
            <Pill tone="purple"><LayoutDashboard size={14} /> MVP Progress</Pill>
            <h2>Campaigns and submissions can now connect to a real database.</h2>
            <p>Use local mode to design fast. Use Supabase mode to save real cloud data.</p>
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
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <Pill tone="purple"><Search size={14} /> Discover Campaigns</Pill>
          <h2>Find campaigns and submit clips.</h2>
          <p>Sort and filters come next. For now, live campaigns are shown first.</p>
        </div>
      </div>
      <div className="campaign-grid">
        {live.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onOpen={setSelectedCampaign}
            onSubmit={(c) => { setSelectedCampaign(c); setPage('submit'); }}
          />
        ))}
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
    clipper: 'Demo Clipper',
    platform: 'TikTok',
    postUrl: '',
    caption: '',
    submittedViews: 0
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    if (!campaign) return;
    onSubmitClip({ ...form, campaignId: campaign.id, campaign: campaign.title, status: 'Pending Review', approvedViews: 0, payout: 0, notes: 'Waiting for review.', createdAt: today });
    setForm({ clipper: 'Demo Clipper', platform: 'TikTok', postUrl: '', caption: '', submittedViews: 0 });
  };

  if (!campaign) return <section className="panel"><h2>No live campaigns yet.</h2></section>;

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <Pill tone="purple"><Upload size={14} /> Submit Clip</Pill>
          <h2>{campaign.title}</h2>
          <p>Paste the public post link after uploading your clip to TikTok, Reels, Shorts, or X.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>Clipper name<input value={form.clipper} onChange={(e) => update('clipper', e.target.value)} required /></label>
        <label>Platform<select value={form.platform} onChange={(e) => update('platform', e.target.value)}>{campaign.platforms.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="full">Post link<input value={form.postUrl} onChange={(e) => update('postUrl', e.target.value)} placeholder="https://..." required /></label>
        <label className="full">Caption used<textarea value={form.caption} onChange={(e) => update('caption', e.target.value)} /></label>
        <label>Current views<input type="number" value={form.submittedViews} onChange={(e) => update('submittedViews', e.target.value)} /></label>
        <div className="checklist full">
          <strong>Before submitting:</strong>
          <span>✅ I used approved content/assets</span>
          <span>✅ My post is public</span>
          <span>✅ I followed the campaign rules</span>
          <span>✅ I did not copy another clipper</span>
        </div>
        <Button className="full">Submit for review</Button>
      </form>
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

function EarningsPage({ submissions }) {
  const approved = submissions.filter((s) => ['Approved', 'Eligible for Payout', 'Paid'].includes(s.status));
  const total = approved.reduce((sum, s) => sum + Number(s.payout || 0), 0);
  const paid = submissions.filter((s) => s.status === 'Paid').reduce((sum, s) => sum + Number(s.payout || 0), 0);
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><Wallet size={14} /> Earnings</Pill><h2>Track manual payouts.</h2></div></div>
      <div className="stats-grid">
        <StatCard icon={Coins} label="Approved earnings" value={money(total)} helper="Ready or already paid" />
        <StatCard icon={CheckCircle2} label="Paid" value={money(paid)} helper="Marked paid by admin" />
        <StatCard icon={Wallet} label="Pending" value={money(total - paid)} helper="Manual M-Pesa later" />
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
  const [step, setStep] = useState(1);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [form, setForm] = useState({
    title: '',
    creator: 'Demo Creator',
    category: 'Education',
    type: 'Clipping',
    management: 'SoloHub Managed',
    payPerThousand: 80,
    budget: 10000,
    minimumViews: 1000,
    maxPayout: 1500,
    platforms: 'TikTok, Instagram Reels, YouTube Shorts',
    deadline: '2026-06-30',
    description: '',
    rules: 'Use approved content only.\nPost must remain public.\nFollow campaign hashtags.',
    hashtags: '#SoloHub, #KenyaCreators'
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const payoutPool = Math.max(Number(form.budget || 0) * 0.85, 0);
  const platformFee = Math.max(Number(form.budget || 0) * 0.15, 0);
  const estimatedViews = Number(form.payPerThousand || 0) > 0 ? Math.floor((payoutPool / Number(form.payPerThousand || 1)) * 1000) : 0;

  const steps = [
    { id: 1, title: 'Basics', helper: 'Campaign identity' },
    { id: 2, title: 'Budget', helper: 'Payout rules' },
    { id: 3, title: 'Rules', helper: 'Platforms & instructions' },
    { id: 4, title: 'Review', helper: 'Confirm and submit' }
  ];

  const canGoNext = () => {
    if (step === 1) return form.title.trim() && form.creator.trim() && form.category.trim();
    if (step === 2) return Number(form.budget) > 0 && Number(form.payPerThousand) > 0;
    if (step === 3) return form.platforms.trim() && form.description.trim();
    return true;
  };

  const next = () => {
    if (!canGoNext()) return;
    setStep((current) => Math.min(current + 1, 4));
  };

  const back = () => setStep((current) => Math.max(current - 1, 1));

  const submit = async (e) => {
    e.preventDefault();
    if (step !== 4) return;
    if (!form.title.trim() || !form.description.trim()) return;

    setSubmittingCampaign(true);

    const success = await onCreateCampaign({
      ...form,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now(),
      remaining: Math.max(Number(form.budget || 0) * 0.85, 0),
      beginnerFriendly: true,
      verified: false,
      score: 70,
      status: 'Pending Approval',
      platforms: form.platforms.split(',').map((x) => x.trim()).filter(Boolean),
      rules: form.rules.split('\n').map((x) => x.trim()).filter(Boolean),
      hashtags: form.hashtags.split(',').map((x) => x.trim()).filter(Boolean),
      assets: ['Source link/assets to be added']
    });

    setSubmittingCampaign(false);
    if (!success) return;
  };

  return (
    <section className="panel campaign-wizard-panel">
      <div className="wizard-hero">
        <div>
          <Pill tone="purple"><Plus size={14} /> Create Campaign</Pill>
          <h2>Create a campaign for admin approval.</h2>
          <p>Build the campaign step by step so creators and clippers get clear instructions.</p>
        </div>
        <div className="wizard-summary-card">
          <span>Estimated clipper pool</span>
          <strong>{money(payoutPool)}</strong>
          <small>Platform fee: {money(platformFee)}</small>
        </div>
      </div>

      <div className="wizard-steps">
        {steps.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`wizard-step ${step === item.id ? 'active' : ''} ${step > item.id ? 'done' : ''}`}
            onClick={() => setStep(item.id)}
          >
            <span>{step > item.id ? '✓' : item.id}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.helper}</small>
            </div>
          </button>
        ))}
      </div>

      <form className="wizard-form" onSubmit={submit}>
        {step === 1 && (
          <div className="wizard-card">
            <div className="wizard-card-head">
              <h3>Campaign basics</h3>
              <p>Name the campaign clearly so clippers understand the opportunity quickly.</p>
            </div>
            <div className="form-grid clean-grid">
              <label className="wide">Campaign title<input placeholder="MarkTradesFX Gold Clips" value={form.title} onChange={(e) => update('title', e.target.value)} required /></label>
              <label>Creator / brand<input value={form.creator} onChange={(e) => update('creator', e.target.value)} required /></label>
              <label>Category<input value={form.category} onChange={(e) => update('category', e.target.value)} /></label>
              <label>Campaign type<select value={form.type} onChange={(e) => update('type', e.target.value)}><option>Clipping</option><option>UGC</option></select></label>
              <label>Management<select value={form.management} onChange={(e) => update('management', e.target.value)}><option>SoloHub Managed</option><option>Self Managed</option></select></label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-card">
            <div className="wizard-card-head">
              <h3>Budget and payout</h3>
              <p>Set how much the creator funds and how clippers will be rewarded.</p>
            </div>
            <div className="finance-strip">
              <div><span>Total budget</span><strong>{money(form.budget)}</strong></div>
              <div><span>SoloHub fee</span><strong>{money(platformFee)}</strong></div>
              <div><span>Clipper pool</span><strong>{money(payoutPool)}</strong></div>
              <div><span>Estimated views</span><strong>{estimatedViews.toLocaleString()}</strong></div>
            </div>
            <div className="form-grid clean-grid">
              <label>Pay per 1,000 views<input type="number" value={form.payPerThousand} onChange={(e) => update('payPerThousand', e.target.value)} /></label>
              <label>Total budget<input type="number" value={form.budget} onChange={(e) => update('budget', e.target.value)} /></label>
              <label>Minimum views<input type="number" value={form.minimumViews} onChange={(e) => update('minimumViews', e.target.value)} /></label>
              <label>Max payout per clip<input type="number" value={form.maxPayout} onChange={(e) => update('maxPayout', e.target.value)} /></label>
              <label>Deadline<input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} /></label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-card">
            <div className="wizard-card-head">
              <h3>Platforms, description, and rules</h3>
              <p>Tell clippers exactly what to post, where to post, and what to avoid.</p>
            </div>
            <div className="form-grid clean-grid">
              <label className="full">Platforms<input value={form.platforms} onChange={(e) => update('platforms', e.target.value)} /></label>
              <label className="full">Description<textarea placeholder="Create short educational clips from approved videos..." value={form.description} onChange={(e) => update('description', e.target.value)} required /></label>
              <label className="full">Rules<textarea value={form.rules} onChange={(e) => update('rules', e.target.value)} /></label>
              <label className="full">Hashtags<input value={form.hashtags} onChange={(e) => update('hashtags', e.target.value)} /></label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="wizard-card review-card">
            <div className="wizard-card-head">
              <h3>Review campaign</h3>
              <p>Confirm the campaign before sending it to admin approval.</p>
            </div>
            <div className="review-grid">
              <div><span>Campaign</span><strong>{form.title || 'Untitled campaign'}</strong></div>
              <div><span>Creator</span><strong>{form.creator}</strong></div>
              <div><span>Category</span><strong>{form.category}</strong></div>
              <div><span>Management</span><strong>{form.management}</strong></div>
              <div><span>Budget</span><strong>{money(form.budget)}</strong></div>
              <div><span>Pay / 1,000 views</span><strong>{money(form.payPerThousand)}</strong></div>
              <div><span>Minimum views</span><strong>{Number(form.minimumViews || 0).toLocaleString()}</strong></div>
              <div><span>Max payout</span><strong>{money(form.maxPayout)}</strong></div>
              <div className="full"><span>Platforms</span><strong>{form.platforms}</strong></div>
              <div className="full"><span>Description</span><p>{form.description || 'No description added yet.'}</p></div>
            </div>
          </div>
        )}

        <div className="wizard-actions">
          {step > 1 ? <Button type="button" variant="ghost" onClick={back}>Back</Button> : <span />}
          {step < 4 ? (
            <Button type="button" onClick={next} disabled={!canGoNext()}>Continue</Button>
          ) : (
            <Button type="submit" disabled={submittingCampaign || !form.title.trim() || !form.description.trim()}><CheckCircle2 size={18} /> {submittingCampaign ? 'Submitting...' : 'Submit campaign for approval'}</Button>
          )}
        </div>
      </form>
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

function AdminCampaigns({ campaigns, onCampaignStatus }) {
  return (
    <section className="panel">
      <div className="section-head"><div><Pill tone="purple"><Megaphone size={14} /> Campaign Approval</Pill><h2>Approve campaigns before clippers see them.</h2></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Campaign</th><th>Creator</th><th>Budget</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>{c.creator}</td>
                <td>{money(c.budget)}</td>
                <td><Pill tone={c.status === 'Live' ? 'green' : c.status === 'Rejected' ? 'red' : 'yellow'}>{c.status}</Pill></td>
                <td className="row-actions">
                  <Button onClick={() => onCampaignStatus(c.id, 'Live')}><CheckCircle2 size={16} /> Approve</Button>
                  <Button variant="ghost" onClick={() => onCampaignStatus(c.id, 'Rejected')}><XCircle size={16} /> Reject</Button>
                </td>
              </tr>
            ))}
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


  const loadProfile = async (currentUser, preferredRole = 'clipper', fullName = '') => {
    if (!cloudMode || !currentUser) return null;

    const fallbackRole = cleanRole(
      preferredRole ||
      currentUser.user_metadata?.role ||
      profile?.role ||
      role ||
      'clipper'
    );

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

    if (existing) {
      const fixedProfile = {
        ...existing,
        role: cleanRole(existing.role || fallbackRole)
      };

      setProfile(fixedProfile);
      setRole(fixedProfile.role);
      setPage(defaultPageForRole(fixedProfile.role));
      return fixedProfile;
    }

    const profilePayload = {
      id: currentUser.id,
      email: currentUser.email,
      full_name: fullName || currentUser.user_metadata?.full_name || currentUser.email,
      role: fallbackRole,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Profile upsert failed:', error);
      setNotice(`Profile upsert failed: ${error.message}`);
      return null;
    }

    const fixedProfile = { ...data, role: cleanRole(data.role) };
    setProfile(fixedProfile);
    setRole(fixedProfile.role);
    setPage(defaultPageForRole(fixedProfile.role));
    return fixedProfile;
  };



  const handleAuthUser = async (currentUser, preferredRole, fullName) => {
    setUser(currentUser);
    return await loadProfile(currentUser, preferredRole, fullName);
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
    if (cloudMode) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole('clipper');
    setPage('home');
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
  };

const reviewSubmission = async (id, changes) => {
    if (cloudMode) {
      const { error } = await supabase.from('submissions').update({
        status: changes.status,
        approved_views: changes.approvedViews,
        payout: changes.payout,
        notes: changes.notes
      }).eq('id', id);
      if (error) return setNotice(error.message);
    }
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, ...changes } : s));
    setNotice(`Submission marked ${changes.status}.`);
  };

  const markPaid = async (submission) => {
    if (cloudMode) {
      const update = await supabase.from('submissions').update({ status: 'Paid' }).eq('id', submission.id);
      if (update.error) return setNotice(update.error.message);
      await supabase.from('payouts').insert({
        submission_id: submission.id,
        clipper: submission.clipper,
        amount: submission.payout,
        status: 'Paid',
        payment_reference: `MANUAL-${Date.now()}`,
        paid_at: new Date().toISOString()
      });
    }
    setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, status: 'Paid' } : s));
    setNotice('Payout marked paid.');
  };

  const content = useMemo(() => {
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
  }, [page, campaigns, submissions, selectedCampaign, cloudMode, user, profile]);

  return (
    <>
      <Header role={role} setRole={setRole} setPage={setPage} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} cloudMode={cloudMode} user={user} profile={profile} onLogout={logout} />
      <div className="app-shell">
        <Sidebar role={role} page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} cloudMode={cloudMode} />
        <main>
          {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
          {cloudMode && <div className="notice subtle"><span>{loading ? 'Syncing Supabase...' : authLoading ? 'Checking login...' : user ? `Logged in as ${profile?.role || role || 'user'}` : 'Supabase mode active. Login on Home for role profiles.'}</span><button onClick={loadCloudData}>Refresh cloud data</button></div>}
          {cloudMode && !user && page !== 'home' ? <AuthBox user={user} profile={profile} onAuthUser={handleAuthUser} onLogout={logout} onRoleChange={updateProfileRole} /> : content}
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
