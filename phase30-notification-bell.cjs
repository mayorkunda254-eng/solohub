const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-notification-bell.jsx", code);

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

// 1. Add activity count helper after roleForUser
if (!code.includes("function getActivityCountForRole")) {
  code = code.replace(
`const roleForUser = (user, profile, fallbackRole = 'clipper') => {
  if (isOwnerEmail(user?.email)) return 'admin';
  return profile?.role ? cleanRole(profile.role) : cleanRole(fallbackRole);
};`,
`const roleForUser = (user, profile, fallbackRole = 'clipper') => {
  if (isOwnerEmail(user?.email)) return 'admin';
  return profile?.role ? cleanRole(profile.role) : cleanRole(fallbackRole);
};

function getActivityCountForRole(role, campaigns = [], submissions = []) {
  const clean = cleanRole(role);

  const pendingCampaigns = campaigns.filter((campaign) =>
    campaign.status === 'Pending Approval'
  ).length;

  const depositIssues = campaigns.filter((campaign) => {
    const status = campaign.status || '';
    const depositStatus = campaign.depositStatus || campaign.deposit_status || 'Pending';
    return status !== 'Rejected' && status !== 'Live' && !['Paid', 'Partial'].includes(depositStatus);
  }).length;

  const pendingSubmissions = submissions.filter((submission) =>
    submission.status === 'Pending Review'
  ).length;

  const fraudFlags = submissions.filter((submission) => {
    const fraud = submission.fraudStatus || submission.fraud_status || 'Clear';
    return fraud !== 'Clear';
  }).length;

  const approvedUnpaid = submissions.filter((submission) =>
    submission.status === 'Approved'
  ).length;

  if (clean === 'admin') {
    return pendingCampaigns + pendingSubmissions + fraudFlags + approvedUnpaid;
  }

  if (clean === 'creator') {
    return depositIssues + pendingSubmissions + fraudFlags;
  }

  return pendingSubmissions + approvedUnpaid;
}`
  );
}

// 2. Patch Header
const headerBlock = findFunctionBlock("Header");
let header = code.slice(headerBlock.start, headerBlock.end);

if (!header.includes("activityCount")) {
  header = header.replace(
    `function Header({ role, setRole, setPage, sidebarOpen, setSidebarOpen, cloudMode, user, profile, onLogout })`,
    `function Header({ role, setRole, setPage, sidebarOpen, setSidebarOpen, cloudMode, user, profile, onLogout, activityCount = 0 })`
  );
}

if (!header.includes("const goActivity")) {
  header = header.replace(
`  return (
    <header className="topbar">`,
`  const goActivity = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setPage('activity');

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  return (
    <header className="topbar">`
  );
}

if (!header.includes("activity-bell")) {
  header = header.replace(
`            <Button type="button" variant="ghost" className="small" onClick={goDashboard}>`,
`            <Button type="button" variant="ghost" className="small activity-bell" onClick={goActivity}>
              <ShieldCheck size={15} /> Activity
              {activityCount > 0 && <span className="activity-badge">{activityCount > 99 ? '99+' : activityCount}</span>}
            </Button>

            <Button type="button" variant="ghost" className="small" onClick={goDashboard}>`
  );

  // fallback if the Dashboard button has no type="button"
  header = header.replace(
`            <Button variant="ghost" className="small" onClick={goDashboard}>`,
`            <Button type="button" variant="ghost" className="small activity-bell" onClick={goActivity}>
              <ShieldCheck size={15} /> Activity
              {activityCount > 0 && <span className="activity-badge">{activityCount > 99 ? '99+' : activityCount}</span>}
            </Button>

            <Button variant="ghost" className="small" onClick={goDashboard}>`
  );
}

code = code.slice(0, headerBlock.start) + header + code.slice(headerBlock.end);

// 3. Pass activity count into Header
if (!code.includes("activityCount={getActivityCountForRole")) {
  code = code.replace(
    /(<Header[\s\S]*?onLogout=\{logout\})(\s*\/>)/,
    `$1 activityCount={getActivityCountForRole(roleForUser(user, profile, role), campaigns, submissions)}$2`
  );
}

fs.writeFileSync(file, code);
console.log("? Notification bell and action counts added.");
