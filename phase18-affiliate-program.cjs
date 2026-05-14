const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliates.jsx", code);

// 1. Add admin menu item
if (!code.includes("adminAffiliates")) {
  code = code.replace(
    `['adminPayouts', Coins, 'Payouts']`,
    `['adminAffiliates', Coins, 'Affiliates'],
    ['adminPayouts', Coins, 'Payouts']`
  );
}

// 2. Add authenticated REST helper if missing
if (!code.includes("async function getSupabaseAuthHeaders")) {
  code += `

async function getSupabaseAuthHeaders() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let accessToken = key;

  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || key;
  } catch (err) {
    console.warn("Could not get Supabase session token.", err);
  }

  return {
    apikey: key,
    Authorization: \`Bearer \${accessToken}\`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}
`;
}

// 3. Add affiliate REST helpers
if (!code.includes("async function fetchAffiliateDataDirect")) {
  code += `

async function fetchAffiliateDataDirect() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const headers = await getSupabaseAuthHeaders();

  const [affiliatesRes, referralsRes] = await Promise.all([
    fetch(\`\${url}/rest/v1/affiliates?select=*&order=created_at.desc\`, { headers }),
    fetch(\`\${url}/rest/v1/referrals?select=*&order=created_at.desc\`, { headers })
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

  const response = await fetch(\`\${url}/rest/v1/affiliates?select=*\`, {
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

  const response = await fetch(\`\${url}/rest/v1/referrals?select=*\`, {
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

  const response = await fetch(\`\${url}/rest/v1/referrals?id=eq.\${encodeURIComponent(id)}&select=*\`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders(),
    body: JSON.stringify(patch)
  });

  const text = await response.text();
  if (!response.ok) throw new Error(text || "Referral update failed.");

  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows[0] : rows;
}
`;
}

// 4. Add AdminAffiliates component before AdminPayouts
if (!code.includes("function AdminAffiliates")) {
  code = code.replace(
`function AdminPayouts`,
`function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);

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

    try {
      const data = await fetchAffiliateDataDirect();
      setAffiliates(data.affiliates || []);
      setReferrals(data.referrals || []);
    } catch (err) {
      console.error('Affiliate load failed:', err);
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
    if (!affiliateForm.name.trim()) {
      alert('Add affiliate name.');
      return;
    }

    if (!affiliateForm.code.trim()) {
      alert('Add affiliate code.');
      return;
    }

    try {
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
        created_by: userData?.user?.id || null
      };

      const created = await insertAffiliateDirect(payload);
      setAffiliates((prev) => [created, ...prev]);

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

      alert('Affiliate created.');
    } catch (err) {
      console.error('Affiliate create failed:', err);
      alert('Affiliate create failed: ' + (err?.message || err));
    }
  };

  const selectedAffiliate = affiliates.find((item) => item.id === referralForm.affiliateId);

  const calculateCommission = () => {
    if (!selectedAffiliate) return Number(referralForm.commissionAmount || 0);

    if (referralForm.referralType === 'creator') {
      return Math.round((Number(referralForm.campaignBudget || 0) * Number(selectedAffiliate.creator_commission_percent || 0)) / 100);
    }

    return Number(selectedAffiliate.clipper_commission_amount || 0);
  };

  const createReferral = async () => {
    if (!referralForm.affiliateId) {
      alert('Choose affiliate.');
      return;
    }

    if (!referralForm.referredName.trim()) {
      alert('Add referred person or brand name.');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const commission = Number(referralForm.commissionAmount || calculateCommission() || 0);

      const payload = {
        affiliate_id: referralForm.affiliateId,
        referral_type: referralForm.referralType,
        referred_name: referralForm.referredName.trim(),
        referred_email: referralForm.referredEmail.trim(),
        referred_phone: referralForm.referredPhone.trim(),
        campaign_budget: Number(referralForm.campaignBudget || 0),
        commission_amount: commission,
        status: 'Pending',
        notes: referralForm.notes,
        created_by: userData?.user?.id || null
      };

      const created = await insertReferralDirect(payload);
      setReferrals((prev) => [created, ...prev]);

      setReferralForm({
        affiliateId: '',
        referralType: 'creator',
        referredName: '',
        referredEmail: '',
        referredPhone: '',
        campaignBudget: 0,
        commissionAmount: 0,
        notes: ''
      });

      alert('Referral recorded.');
    } catch (err) {
      console.error('Referral create failed:', err);
      alert('Referral create failed: ' + (err?.message || err));
    }
  };

  const updateReferralStatus = async (referral, status) => {
    try {
      const patch = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'Qualified') {
        patch.qualified_at = new Date().toISOString();
      }

      if (status === 'Paid') {
        patch.paid_at = new Date().toISOString();
      }

      const updated = await updateReferralDirect(referral.id, patch);

      setReferrals((prev) =>
        prev.map((item) => item.id === referral.id ? updated : item)
      );

      alert('Referral marked as ' + status + '.');
    } catch (err) {
      console.error('Referral update failed:', err);
      alert('Referral update failed: ' + (err?.message || err));
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
        </div>

        <Button type="button" onClick={loadAffiliateData}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
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

          <Button type="button" onClick={createAffiliate}>Create affiliate</Button>
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

          <Button type="button" onClick={createReferral}>Record referral</Button>
        </div>
      </div>

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
                    <Button type="button" onClick={() => updateReferralStatus(referral, 'Qualified')}>Qualify</Button>
                    <Button type="button" onClick={() => updateReferralStatus(referral, 'Paid')}>Mark paid</Button>
                    <Button type="button" variant="ghost" onClick={() => updateReferralStatus(referral, 'Rejected')}>Reject</Button>
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

function AdminPayouts`
  );
}

// 5. Add route
if (!code.includes("page === 'adminAffiliates'")) {
  code = code.replace(
    `if (page === 'adminPayouts') {`,
    `if (page === 'adminAffiliates') {
      return isAdmin ? <AdminAffiliates /> : home;
    }

    if (page === 'adminPayouts') {`
  );

  // fallback for older compact routing
  code = code.replace(
    `if (page === 'adminPayouts') return`,
    `if (page === 'adminAffiliates') return isAdmin ? <AdminAffiliates /> : home;
    if (page === 'adminPayouts') return`
  );
}

fs.writeFileSync(file, code);
console.log("? Affiliate program MVP added.");
