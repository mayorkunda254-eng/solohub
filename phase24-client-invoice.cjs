const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-client-invoice.jsx", code);

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

const block = findFunctionBlock("AdminCampaigns");
let fn = code.slice(block.start, block.end);

if (!fn.includes("const buildClientPaymentSummary")) {
  fn = fn.replace(
`  const saveDeposit = async (campaign) => {
    const draft = getDraft(campaign);

    await onCampaignFundingUpdate(campaign.id, {
      depositStatus: draft.depositStatus,
      depositAmount: draft.depositAmount,
      paymentReference: draft.paymentReference,
      adminNotes: draft.adminNotes
    });
  };`,
`  const saveDeposit = async (campaign) => {
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
    ].filter(Boolean).join('\\n');
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
  };`
  );
}

if (!fn.includes("Copy summary")) {
  fn = fn.replace(
`                    <Button type="button" onClick={() => saveDeposit(c)}>
                      Save deposit
                    </Button>

                    <Button type="button" onClick={() => onCampaignStatus(c.id, 'Live')}>`,
`                    <Button type="button" onClick={() => saveDeposit(c)}>
                      Save deposit
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => copyPaymentSummary(c)}>
                      Copy summary
                    </Button>

                    <Button type="button" variant="ghost" onClick={() => printClientInvoice(c)}>
                      Print invoice
                    </Button>

                    <Button type="button" onClick={() => onCampaignStatus(c.id, 'Live')}>`
  );
}

code = code.slice(0, block.start) + fn + code.slice(block.end);

fs.writeFileSync(file, code);
console.log("? Client invoice and payment summary tools added.");
