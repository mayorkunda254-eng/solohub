const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-local-fallback.jsx", code);

function replaceConstFunctionBlock(source, functionName, replacement) {
  const startText = `const ${functionName} = async () => {`;
  const start = source.indexOf(startText);

  if (start === -1) throw new Error(`Could not find ${functionName}`);

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      let end = i + 1;
      if (source[end] === ";") end++;
      return source.slice(0, start) + replacement + source.slice(end);
    }
  }

  throw new Error(`Could not find end of ${functionName}`);
}

const helper = `
function getLocalAffiliateData() {
  try {
    const affiliates = JSON.parse(localStorage.getItem('solohub_affiliates_fallback_v1') || '[]');
    const referrals = JSON.parse(localStorage.getItem('solohub_referrals_fallback_v1') || '[]');

    return {
      affiliates: Array.isArray(affiliates) ? affiliates : [],
      referrals: Array.isArray(referrals) ? referrals : []
    };
  } catch {
    return { affiliates: [], referrals: [] };
  }
}

function saveLocalAffiliateData(affiliates = [], referrals = []) {
  localStorage.setItem('solohub_affiliates_fallback_v1', JSON.stringify(affiliates));
  localStorage.setItem('solohub_referrals_fallback_v1', JSON.stringify(referrals));
}

`;

if (!code.includes("function getLocalAffiliateData")) {
  const insertAt = code.indexOf("function AdminAffiliates");
  code = code.slice(0, insertAt) + helper + code.slice(insertAt);
}

const newLoader = `const loadAffiliateData = async () => {
    setLoading(true);
    setMessage('Loading affiliate data...');

    try {
      const localData = getLocalAffiliateData();

      setAffiliates(localData.affiliates);
      setReferrals(localData.referrals);

      if (localData.affiliates.length || localData.referrals.length) {
        setMessage('Affiliate fallback data loaded. Supabase affiliate backend can be repaired later.');
      } else {
        setMessage('Affiliate page ready. Add an affiliate to start tracking locally.');
      }

      if (supabase) {
        supabase.rpc('solohub_affiliate_dashboard')
          .then(({ data, error }) => {
            if (error) {
              console.warn('Affiliate cloud sync skipped:', error);
              return;
            }

            const cloudAffiliates = Array.isArray(data?.affiliates) ? data.affiliates : [];
            const cloudReferrals = Array.isArray(data?.referrals) ? data.referrals : [];

            setAffiliates(cloudAffiliates);
            setReferrals(cloudReferrals);
            saveLocalAffiliateData(cloudAffiliates, cloudReferrals);
            setMessage('Affiliate data loaded.');
          })
          .catch((err) => {
            console.warn('Affiliate cloud sync skipped:', err);
          });
      }
    } catch (err) {
      console.error('Affiliate fallback load failed:', err);
      setMessage('Affiliate page ready. Cloud sync is unavailable, but the app can continue.');
      setAffiliates([]);
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  };`;

code = replaceConstFunctionBlock(code, "loadAffiliateData", newLoader);

fs.writeFileSync(file, code);

console.log("✅ Affiliate page now opens with safe local fallback.");
