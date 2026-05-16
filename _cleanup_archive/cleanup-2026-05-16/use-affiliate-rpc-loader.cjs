const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-rpc-loader.jsx", code);

const oldBlock = `if (!supabase) throw new Error('Supabase is not configured.');

      const { data: affiliatesData, error: affiliatesError } = await withSupabaseTimeout(
        supabase
          .from('affiliates')
          .select('*')
          .order('created_at', { ascending: false }),
        'Load affiliates', 45000
      );

      if (affiliatesError) throw affiliatesError;

      const { data: referralsData, error: referralsError } = await withSupabaseTimeout(
        supabase
          .from('referrals')
          .select('*')
          .order('created_at', { ascending: false }),
        'Load referrals', 45000
      );

      if (referralsError) throw referralsError;

      setAffiliates(affiliatesData || []);
      setReferrals(referralsData || []);
      setMessage('Affiliate data loaded.');`;

const newBlock = `if (!supabase) throw new Error('Supabase is not configured.');

      const { data, error } = await withSupabaseTimeout(
        supabase.rpc('solohub_affiliate_dashboard'),
        'Load affiliate dashboard',
        45000
      );

      if (error) throw error;

      setAffiliates(Array.isArray(data?.affiliates) ? data.affiliates : []);
      setReferrals(Array.isArray(data?.referrals) ? data.referrals : []);
      setMessage('Affiliate data loaded.');`;

if (!code.includes(oldBlock)) {
  throw new Error("Could not find the exact old affiliate loader block. No changes made.");
}

code = code.replace(oldBlock, newBlock);

fs.writeFileSync(file, code);

console.log("✅ Affiliate loader now uses Supabase RPC.");
