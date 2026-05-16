const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-affiliate-create-local-fallback.jsx", code);

// Add a fallback before Supabase create throws or times out.
code = code.replace(
  "if (!supabase) throw new Error('Supabase is not configured.');",
  `if (!supabase) {
        const localAffiliate = {
          id: 'local-affiliate-' + Date.now(),
          name: affiliateForm.name.trim(),
          code: affiliateForm.code.trim().toUpperCase(),
          email: affiliateForm.email.trim(),
          phone: affiliateForm.phone.trim(),
          type: affiliateForm.type,
          creator_commission_percent: Number(affiliateForm.creatorCommissionPercent || 0),
          clipper_commission_amount: Number(affiliateForm.clipperCommissionAmount || 0),
          notes: affiliateForm.notes,
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const nextAffiliates = [localAffiliate, ...affiliates];
        setAffiliates(nextAffiliates);
        saveLocalAffiliateData(nextAffiliates, referrals);
        setReferralForm((prev) => ({ ...prev, affiliateId: localAffiliate.id }));
        setMessage('Affiliate created locally. Cloud affiliate sync can be repaired later.');
        alert('Affiliate created locally.');
        return;
      }`
);

// Add fallback inside create affiliate catch.
code = code.replace(
  "setMessage('Affiliate create failed: ' + (err?.message || err));\n      alert('Affiliate create failed: ' + (err?.message || err));",
  `const localAffiliate = {
        id: 'local-affiliate-' + Date.now(),
        name: affiliateForm.name.trim(),
        code: affiliateForm.code.trim().toUpperCase(),
        email: affiliateForm.email.trim(),
        phone: affiliateForm.phone.trim(),
        type: affiliateForm.type,
        creator_commission_percent: Number(affiliateForm.creatorCommissionPercent || 0),
        clipper_commission_amount: Number(affiliateForm.clipperCommissionAmount || 0),
        notes: affiliateForm.notes,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const nextAffiliates = [localAffiliate, ...affiliates];
      setAffiliates(nextAffiliates);
      saveLocalAffiliateData(nextAffiliates, referrals);
      setReferralForm((prev) => ({ ...prev, affiliateId: localAffiliate.id }));
      setMessage('Affiliate created locally because cloud sync is unavailable.');
      alert('Affiliate created locally.');`
);

fs.writeFileSync(file, code);

console.log("✅ Affiliate creation now has local fallback.");
