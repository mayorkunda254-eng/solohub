const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-public-landing.jsx", code);

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

    if (depth === 0) {
      return { start, end: i + 1 };
    }
  }

  throw new Error(`Could not find end of ${functionName}`);
}

const heroBlock = findFunctionBlock("Hero");

const heroReplacement = `function Hero({ setRole, setPage, cloudMode }) {
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
}`;

code = code.slice(0, heroBlock.start) + heroReplacement + code.slice(heroBlock.end);

// Clean old MVP wording in the stats section
code = code.replaceAll(
  "MVP Progress",
  "SoloHub System"
);

code = code.replaceAll(
  "Campaigns and submissions can now connect to a real database.",
  "Built for campaigns, submissions, payouts, and referrals."
);

code = code.replaceAll(
  "Use local mode to design fast. Use Supabase mode to save real cloud data.",
  "Creators launch campaigns, clippers submit posts, admins verify performance, and affiliates drive growth."
);

fs.writeFileSync(file, code);
console.log("? Public landing page added.");
