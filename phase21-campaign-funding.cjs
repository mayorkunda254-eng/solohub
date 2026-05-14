const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-campaign-funding.jsx", code);

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

// 1. Add client/funding fields to campaign reader
if (!code.includes("clientName: row.client_name")) {
  code = code.replace(
    /content_requirements:\s*row\.content_requirements\s*\|\|\s*row\.contentRequirements\s*\|\|\s*''/,
    `content_requirements: row.content_requirements || row.contentRequirements || '',
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
  admin_notes: row.admin_notes || row.adminNotes || ''`
  );
}

// 2. Add client/funding fields to campaign DB writer
if (!code.includes("client_name: campaign.client_name")) {
  code = code.replace(
    /content_requirements:\s*campaign\.content_requirements\s*\|\|\s*campaign\.contentRequirements\s*\|\|\s*''/,
    `content_requirements: campaign.content_requirements || campaign.contentRequirements || '',
  client_name: campaign.client_name || campaign.clientName || '',
  client_email: campaign.client_email || campaign.clientEmail || '',
  client_phone: campaign.client_phone || campaign.clientPhone || '',
  deposit_status: campaign.deposit_status || campaign.depositStatus || 'Pending',
  deposit_amount: Number(campaign.deposit_amount || campaign.depositAmount || 0),
  payment_reference: campaign.payment_reference || campaign.paymentReference || '',
  admin_notes: campaign.admin_notes || campaign.adminNotes || ''`
  );
}

// 3. Add fields into CreateCampaignPage state
if (!code.includes("clientName: ''")) {
  code = code.replace(
    `contentRequirements: ''`,
    `contentRequirements: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    depositStatus: 'Pending',
    depositAmount: 0,
    paymentReference: '',
    adminNotes: ''`
  );
}

// 4. Add fields into campaign submit payload
if (!code.includes("clientName: form.clientName")) {
  code = code.replace(
    `content_requirements: form.contentRequirements,`,
    `content_requirements: form.contentRequirements,
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
        admin_notes: form.adminNotes,`
  );
}

// 5. Add UI fields after Resource folder URL
if (!code.includes("Client / brand name")) {
  code = code.replace(
`          <label>
            Resource folder URL
            <input value={form.resourceUrl} onChange={(e) => update('resourceUrl', e.target.value)} placeholder="Google Drive / Dropbox / source folder" />
          </label>`,
`          <label>
            Resource folder URL
            <input value={form.resourceUrl} onChange={(e) => update('resourceUrl', e.target.value)} placeholder="Google Drive / Dropbox / source folder" />
          </label>

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
          </div>`
  );
}

// 6. Replace AdminCampaigns with funding-aware version
const adminCampaignsBlock = findFunctionBlock("AdminCampaigns");

const adminCampaignsReplacement = `function AdminCampaigns({ campaigns, onCampaignStatus }) {
  const depositTone = (status) => {
    if (status === 'Paid') return 'green';
    if (status === 'Partial') return 'yellow';
    if (status === 'Refunded') return 'red';
    return 'yellow';
  };

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <Pill tone="purple"><Megaphone size={14} /> Campaign Approval</Pill>
          <h2>Approve campaigns and track client funding.</h2>
          <p>Use this page to manage creator campaigns, client deposits, and approval status.</p>
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
              <th>Deposit</th>
              <th>Payment Ref</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {campaigns.map((c) => (
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
                  <Pill tone={depositTone(c.depositStatus || c.deposit_status)}>
                    {c.depositStatus || c.deposit_status || 'Pending'}
                  </Pill>
                  <div className="table-subtext">{money(c.depositAmount || c.deposit_amount || 0)}</div>
                </td>

                <td>{c.paymentReference || c.payment_reference || '-'}</td>

                <td>
                  <Pill tone={c.status === 'Live' ? 'green' : c.status === 'Rejected' ? 'red' : 'yellow'}>
                    {c.status}
                  </Pill>
                </td>

                <td className="row-actions">
                  <Button type="button" onClick={() => onCampaignStatus(c.id, 'Live')}><CheckCircle2 size={16} /> Approve</Button>
                  <Button type="button" variant="ghost" onClick={() => onCampaignStatus(c.id, 'Rejected')}><XCircle size={16} /> Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}`;

code = code.slice(0, adminCampaignsBlock.start) + adminCampaignsReplacement + code.slice(adminCampaignsBlock.end);

fs.writeFileSync(file, code);
console.log("? Campaign client funding tracker added.");
