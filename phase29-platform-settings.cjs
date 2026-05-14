const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-platform-settings.jsx", code);

// 1. Replace fixed payment details with editable/stored payment details
if (!code.includes("const PLATFORM_PAYMENT_SETTING_KEY")) {
  code = code.replace(
`const SOLOHUB_PAYMENT_DETAILS = {
  businessName: 'SoloHub',
  method: 'M-Pesa Till / Paybill',
  status: 'Coming soon',
  number: 'To be added',
  reference: 'Campaign title or client phone',
  note: 'After payment, enter the M-Pesa confirmation code in the Payment Reference field.'
};`,
`const PLATFORM_PAYMENT_SETTING_KEY = 'payment_details';
const PLATFORM_PAYMENT_STORAGE_KEY = 'solohub_payment_details';

const DEFAULT_SOLOHUB_PAYMENT_DETAILS = {
  businessName: 'SoloHub',
  method: 'M-Pesa Till / Paybill',
  status: 'Coming soon',
  number: 'To be added',
  reference: 'Campaign title or client phone',
  note: 'After payment, enter the M-Pesa confirmation code in the Payment Reference field.'
};

function getStoredPaymentDetails() {
  try {
    const raw = localStorage.getItem(PLATFORM_PAYMENT_STORAGE_KEY);
    return raw ? { ...DEFAULT_SOLOHUB_PAYMENT_DETAILS, ...JSON.parse(raw) } : DEFAULT_SOLOHUB_PAYMENT_DETAILS;
  } catch {
    return DEFAULT_SOLOHUB_PAYMENT_DETAILS;
  }
}

const SOLOHUB_PAYMENT_DETAILS = getStoredPaymentDetails();

function normalizePaymentDetails(details = {}) {
  return {
    businessName: details.businessName || 'SoloHub',
    method: details.method || 'M-Pesa Till / Paybill',
    status: details.status || 'Coming soon',
    number: details.number || 'To be added',
    reference: details.reference || 'Campaign title or client phone',
    note: details.note || 'After payment, enter the M-Pesa confirmation code in the Payment Reference field.'
  };
}

function applyPaymentDetails(details = {}) {
  const clean = normalizePaymentDetails(details);
  Object.assign(SOLOHUB_PAYMENT_DETAILS, clean);

  try {
    localStorage.setItem(PLATFORM_PAYMENT_STORAGE_KEY, JSON.stringify(clean));
  } catch {}

  return clean;
}

async function fetchPlatformPaymentDetails() {
  try {
    if (!supabase) return getStoredPaymentDetails();

    const request = supabase
      .from('platform_settings')
      .select('value')
      .eq('setting_key', PLATFORM_PAYMENT_SETTING_KEY)
      .maybeSingle();

    const { data, error } = typeof withSupabaseTimeout === 'function'
      ? await withSupabaseTimeout(request, 'Load payment settings')
      : await request;

    if (error) throw error;

    if (data?.value) {
      return applyPaymentDetails(data.value);
    }

    return getStoredPaymentDetails();
  } catch (err) {
    console.warn('Payment settings load failed:', err);
    return getStoredPaymentDetails();
  }
}

async function savePlatformPaymentDetails(details = {}) {
  if (!supabase) {
    return applyPaymentDetails(details);
  }

  const clean = normalizePaymentDetails(details);
  const { data: userData } = await supabase.auth.getUser();

  const request = supabase
    .from('platform_settings')
    .upsert({
      setting_key: PLATFORM_PAYMENT_SETTING_KEY,
      value: clean,
      updated_by: userData?.user?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' })
    .select('*')
    .single();

  const { data, error } = typeof withSupabaseTimeout === 'function'
    ? await withSupabaseTimeout(request, 'Save payment settings')
    : await request;

  if (error) throw error;

  applyPaymentDetails(clean);
  return data;
}`
  );
}

// 2. Add Admin Settings menu item
if (!code.includes("['adminSettings', Wallet, 'Settings']")) {
  code = code.replace(
    `['adminPayouts', Coins, 'Payouts']`,
    `['adminPayouts', Coins, 'Payouts'],
    ['adminSettings', Wallet, 'Settings']`
  );
}

// 3. Add state tick to trigger re-render after settings load
if (!code.includes("paymentSettingsTick")) {
  code = code.replace(
    `const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());`,
    `const [referralCode, setReferralCode] = useState(() => captureReferralCodeFromUrl());
  const [paymentSettingsTick, setPaymentSettingsTick] = useState(0);`
  );
}

// 4. Load payment settings on app start
if (!code.includes("fetchPlatformPaymentDetails().then")) {
  code = code.replace(
`    setReferralCode(captureReferralCodeFromUrl());
    loadCloudData();`,
`    setReferralCode(captureReferralCodeFromUrl());
    loadCloudData();

    fetchPlatformPaymentDetails().then((details) => {
      if (details) {
        applyPaymentDetails(details);
        setPaymentSettingsTick((tick) => tick + 1);
      }
    });`
  );
}

// 5. Add AdminPlatformSettings component before AdminAffiliates
if (!code.includes("function AdminPlatformSettings")) {
  code = code.replace(
`function AdminAffiliates`,
`function AdminPlatformSettings() {
  const [form, setForm] = useState(() => normalizePaymentDetails(SOLOHUB_PAYMENT_DETAILS));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadSettings = async () => {
    setMessage('Loading settings...');

    try {
      const details = await fetchPlatformPaymentDetails();
      setForm(normalizePaymentDetails(details));
      setMessage('Settings loaded.');
    } catch (err) {
      setMessage('Settings load failed: ' + (err?.message || err));
      alert('Settings load failed: ' + (err?.message || err));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('Saving payment settings...');

    try {
      await savePlatformPaymentDetails(form);
      setMessage('Payment settings saved.');
      alert('Payment settings saved. Refresh pages that are already open to see the latest details.');
    } catch (err) {
      console.error('Payment settings save failed:', err);
      setMessage('Payment settings save failed: ' + (err?.message || err));
      alert('Payment settings save failed: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <section className="platform-settings-page">
      <div className="section-head">
        <div>
          <Pill tone="purple"><Wallet size={14} /> Platform Settings</Pill>
          <h2>Manage SoloHub payment instructions.</h2>
          <p>Update the payment details shown on campaign deposit instructions, creator summaries, and client invoices.</p>
          {message && <p className="form-note affiliate-message">{message}</p>}
        </div>

        <button type="button" className="affiliate-action-btn secondary" onClick={loadSettings}>
          Reload
        </button>
      </div>

      <div className="platform-settings-grid">
        <div className="platform-settings-card">
          <h3>Payment details</h3>

          <label>
            Business name
            <input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
          </label>

          <label>
            Payment method
            <input value={form.method} onChange={(e) => update('method', e.target.value)} placeholder="M-Pesa Till / Paybill" />
          </label>

          <label>
            Till / Paybill number
            <input value={form.number} onChange={(e) => update('number', e.target.value)} placeholder="To be added" />
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => update('status', e.target.value)}>
              <option>Coming soon</option>
              <option>Active</option>
              <option>Paused</option>
            </select>
          </label>

          <label>
            Account reference
            <input value={form.reference} onChange={(e) => update('reference', e.target.value)} placeholder="Campaign title or client phone" />
          </label>

          <label>
            Payment note
            <textarea value={form.note} onChange={(e) => update('note', e.target.value)} />
          </label>

          <button type="button" className="affiliate-action-btn" onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save payment settings'}
          </button>
        </div>

        <div className="platform-settings-card preview">
          <h3>Client-facing preview</h3>

          <div className="payment-instructions-box settings-preview-box">
            <div>
              <Pill tone="yellow">Campaign Deposit</Pill>
              <h3>Payment instructions</h3>
              <p>These are the details creators and clients will see.</p>
            </div>

            <div className="payment-instruction-grid">
              <div>
                <span>Business name</span>
                <strong>{form.businessName}</strong>
              </div>

              <div>
                <span>Payment method</span>
                <strong>{form.method}</strong>
              </div>

              <div>
                <span>Till / Paybill</span>
                <strong>{form.number}</strong>
                <small>{form.status}</small>
              </div>

              <div>
                <span>Account reference</span>
                <strong>{form.reference}</strong>
              </div>
            </div>

            <p className="form-note">{form.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminAffiliates`
  );
}

// 6. Add admin settings route
if (!code.includes("page === 'adminSettings'")) {
  code = code.replace(
`    if (page === 'adminAffiliates') {`,
`    if (page === 'adminSettings') {
      return isAdmin ? <AdminPlatformSettings /> : home;
    }

    if (page === 'adminAffiliates') {`
  );
}

fs.writeFileSync(file, code);
console.log("? Admin Platform Settings added.");
