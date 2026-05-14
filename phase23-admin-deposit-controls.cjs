const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-admin-deposit-controls.jsx", code);

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

  throw new Error(`Could not find end of function ${functionName}`);
}

function findConstFunction(functionName) {
  const startRegex = new RegExp(`\\s*const\\s+${functionName}\\s*=\\s*async\\s*\\(`);
  const match = startRegex.exec(code);
  if (!match) return null;

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

  const arrowIndex = code.indexOf("=>", closeParen);
  const braceStart = code.indexOf("{", arrowIndex);
  let depth = 0;

  for (let i = braceStart; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;

    if (depth === 0) {
      let end = i + 1;
      while ([";", "\n", "\r", " "].includes(code[end])) end++;
      return { start, end };
    }
  }

  return null;
}

// 1. Add campaign funding update function before campaignStatus
if (!code.includes("const updateCampaignFunding")) {
  const campaignStatusBlock = findConstFunction("campaignStatus");

  if (!campaignStatusBlock) {
    throw new Error("Could not find campaignStatus function.");
  }

  const fundingFunction = `  const updateCampaignFunding = async (id, funding) => {
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

`;

  code = code.slice(0, campaignStatusBlock.start) + fundingFunction + code.slice(campaignStatusBlock.start);
}

// 2. Replace AdminCampaigns with editable funding controls
const adminBlock = findFunctionBlock("AdminCampaigns");

const replacement = `function AdminCampaigns({ campaigns, onCampaignStatus, onCampaignFundingUpdate }) {
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
}`;

code = code.slice(0, adminBlock.start) + replacement + code.slice(adminBlock.end);

// 3. Pass the new function into AdminCampaigns route
code = code.replaceAll(
  `<AdminCampaigns campaigns={campaigns} onCampaignStatus={campaignStatus} />`,
  `<AdminCampaigns campaigns={campaigns} onCampaignStatus={campaignStatus} onCampaignFundingUpdate={updateCampaignFunding} />`
);

fs.writeFileSync(file, code);
console.log("? Admin deposit confirmation controls added.");
