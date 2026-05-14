const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-payment-instructions.jsx", code);

// 1. Add payment details constants after role helper if missing
if (!code.includes("const SOLOHUB_PAYMENT_DETAILS")) {
  code = code.replace(
`const roleForUser = (user, profile, fallbackRole = 'clipper') => {
  if (isOwnerEmail(user?.email)) return 'admin';
  return profile?.role ? cleanRole(profile.role) : cleanRole(fallbackRole);
};`,
`const roleForUser = (user, profile, fallbackRole = 'clipper') => {
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
};`
  );
}

// 2. Add payment instruction box into Create Campaign page before client funding section
if (!code.includes("payment-instructions-box")) {
  code = code.replace(
`          <label>
            Resource folder URL
            <input value={form.resourceUrl} onChange={(e) => update('resourceUrl', e.target.value)} placeholder="Google Drive / Dropbox / source folder" />
          </label>`,
`          <label>
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
          </div>`
  );
}

// 3. Guard campaign approval: cannot approve if deposit is still Pending
if (!code.includes("Deposit must be marked Partial or Paid before approving")) {
  code = code.replace(
`  const campaignStatus = async (id, status) => {
    try {
      if (!id) {`,
`  const campaignStatus = async (id, status) => {
    try {
      if (!id) {`
  );

  code = code.replace(
`      if (!id) {
        alert("Missing campaign ID.");
        return;
      }`,
`      if (!id) {
        alert("Missing campaign ID.");
        return;
      }

      if (status === 'Live') {
        const campaignToApprove = campaigns.find((campaign) => campaign.id === id);
        const depositStatus = campaignToApprove?.depositStatus || campaignToApprove?.deposit_status || 'Pending';

        if (!['Paid', 'Partial'].includes(depositStatus)) {
          alert('Deposit must be marked Partial or Paid before approving this campaign.');
          setNotice('Deposit must be marked Partial or Paid before approving this campaign.');
          return;
        }
      }`
  );
}

// 4. Improve Admin Campaigns helper text if present
code = code.replaceAll(
  "Approve campaigns and track client funding.",
  "Approve campaigns only after client deposit is confirmed."
);

code = code.replaceAll(
  "Use this page to manage creator campaigns, client deposits, and approval status.",
  "Campaigns should stay Pending Approval until deposit status is Partial or Paid."
);

fs.writeFileSync(file, code);
console.log("? Campaign payment instructions and deposit approval guard added.");
