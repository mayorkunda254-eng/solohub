const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-clipper-payout-profile.jsx", code);

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

// 1. Preserve payout/payment fields when reading submissions
if (!code.includes("paymentReference: row.payment_reference")) {
  code = code.replace(
    /paidAt:\s*row\.paid_at\s*\|\|\s*row\.paidAt\s*\|\|\s*null,?/,
    `paidAt: row.paid_at || row.paidAt || null,
  paymentReference: row.payment_reference || row.paymentReference || '',
  payment_reference: row.payment_reference || row.paymentReference || '',
  payoutMethod: row.payout_method || row.payoutMethod || 'Manual',
  payout_method: row.payout_method || row.payoutMethod || 'Manual',`
  );

  // fallback if paidAt pattern was not present
  if (!code.includes("paymentReference: row.payment_reference")) {
    code = code.replace(
      /createdAt:\s*row\.created_at \? String\(row\.created_at\)\.slice\(0, 10\) : row\.createdAt \|\| today/,
      `createdAt: row.created_at ? String(row.created_at).slice(0, 10) : row.createdAt || today,
  paymentReference: row.payment_reference || row.paymentReference || '',
  payment_reference: row.payment_reference || row.paymentReference || '',
  paidAt: row.paid_at || row.paidAt || null,
  payoutMethod: row.payout_method || row.payoutMethod || 'Manual',
  payout_method: row.payout_method || row.payoutMethod || 'Manual'`
    );
  }
}

// 2. Update markPaid so paid submissions keep payment reference/date
code = code.replace(
`        const updatedSubmission = await updateSubmissionDirect(submission.id, {
          status: 'Paid',
          notes: submission.notes || 'Paid manually.'
        });`,
`        const updatedSubmission = await updateSubmissionDirect(submission.id, {
          status: 'Paid',
          notes: submission.notes || 'Paid manually.',
          payment_reference: paymentReference,
          paid_at: paidAt,
          payout_method: 'M-Pesa / Manual'
        });`
);

// 3. Add payout profile update function before content useMemo
if (!code.includes("const updatePayoutProfile")) {
  const contentIndex = code.indexOf("const content = useMemo");

  if (contentIndex === -1) {
    throw new Error("Could not find content useMemo to insert updatePayoutProfile.");
  }

  const payoutFunction = `  const updatePayoutProfile = async (details) => {
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

`;

  code = code.slice(0, contentIndex) + payoutFunction + code.slice(contentIndex);
}

// 4. Replace EarningsPage with payout profile + receipts
const earningsBlock = findFunctionBlock("EarningsPage");

const earningsReplacement = `function EarningsPage({ submissions, profile, onUpdatePayoutProfile }) {
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
    ].filter(Boolean).join('\\n');
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
}`;

code = code.slice(0, earningsBlock.start) + earningsReplacement + code.slice(earningsBlock.end);

// 5. Pass profile/update function into EarningsPage routes
code = code.replaceAll(
  `<EarningsPage submissions={ownClipperSubmissions} />`,
  `<EarningsPage submissions={ownClipperSubmissions} profile={profile} onUpdatePayoutProfile={updatePayoutProfile} />`
);

code = code.replaceAll(
  `<EarningsPage submissions={submissions} />`,
  `<EarningsPage submissions={submissions} profile={profile} onUpdatePayoutProfile={updatePayoutProfile} />`
);

fs.writeFileSync(file, code);
console.log("? Clipper payout profile and payout receipts added.");
