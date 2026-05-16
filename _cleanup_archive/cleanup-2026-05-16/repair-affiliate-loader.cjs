const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-loader-repair.jsx", code);

function replaceConstFunctionBlock(source, functionName, replacement) {
  const startText = `const ${functionName} = async () => {`;
  const start = source.indexOf(startText);

  if (start === -1) {
    throw new Error(`Could not find ${functionName}`);
  }

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

const newLoader = `const loadAffiliateData = async () => {
    setLoading(true);
    setMessage('Loading affiliate data...');

    try {
      if (!supabase) throw new Error('Supabase is not configured.');

      const affiliateQuery = supabase
        .from('affiliates')
        .select('id,name,code,email,phone,type,creator_commission_percent,clipper_commission_amount,notes,status,created_by,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const referralQuery = supabase
        .from('referrals')
        .select('id,affiliate_id,affiliate_code,referral_type,referred_name,referred_email,referred_phone,campaign_id,campaign_budget,commission_amount,commission_status,notes,created_at,updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const [affiliateResult, referralResult] = await Promise.allSettled([
        withSupabaseTimeout(affiliateQuery, 'Load affiliates', 45000),
        withSupabaseTimeout(referralQuery, 'Load referrals', 45000)
      ]);

      const affiliateValue = affiliateResult.status === 'fulfilled' ? affiliateResult.value : null;
      const referralValue = referralResult.status === 'fulfilled' ? referralResult.value : null;

      if (affiliateResult.status === 'rejected') {
        console.warn('Affiliate table load warning:', affiliateResult.reason);
      }

      if (referralResult.status === 'rejected') {
        console.warn('Referral table load warning:', referralResult.reason);
      }

      if (affiliateValue?.error) {
        console.warn('Affiliate table error:', affiliateValue.error);
      }

      if (referralValue?.error) {
        console.warn('Referral table error:', referralValue.error);
      }

      const nextAffiliates = affiliateValue?.data || [];
      const nextReferrals = referralValue?.data || [];

      setAffiliates(Array.isArray(nextAffiliates) ? nextAffiliates : []);
      setReferrals(Array.isArray(nextReferrals) ? nextReferrals : []);

      const affiliateFailed = affiliateResult.status === 'rejected' || affiliateValue?.error;
      const referralFailed = referralResult.status === 'rejected' || referralValue?.error;

      if (affiliateFailed && referralFailed) {
        setMessage('Affiliate tables are not responding yet. Check Supabase RLS/table setup, then refresh.');
      } else if (affiliateFailed) {
        setMessage('Referrals loaded, but affiliates table needs checking.');
      } else if (referralFailed) {
        setMessage('Affiliates loaded, but referrals table needs checking.');
      } else {
        setMessage('Affiliate data loaded.');
      }
    } catch (err) {
      console.error('Affiliate data load failed:', err);
      setMessage('Affiliate data could not load. Check Supabase tables and policies, then refresh.');
    } finally {
      setLoading(false);
    }
  };`;

code = replaceConstFunctionBlock(code, "loadAffiliateData", newLoader);

// Remove old affiliate alert fallback completely if still present
code = code.replaceAll(
  "alert('Affiliate data is still syncing: ' + (err?.message || err));",
  ""
);

fs.writeFileSync(file, code);

console.log("✅ Affiliate loader repaired.");
