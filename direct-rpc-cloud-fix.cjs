const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-direct-rpc-cloud-fix.jsx", code);

let fixes = 0;

const helper = `
async function solohubDirectRpc(functionName, payload = {}, ms = 12000) {
  const url = import.meta.env.VITE_SUPABASE_URL || supabase?.supabaseUrl;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || supabase?.supabaseKey;

  if (!url || !key) {
    return { data: null, error: new Error('Missing Supabase URL or anon key.') };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    const sessionResult = await supabase.auth.getSession().catch(() => null);
    const accessToken = sessionResult?.data?.session?.access_token || key;

    const response = await fetch(url + '/rest/v1/rpc/' + functionName, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload || {}),
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        text ||
        functionName + ' failed with status ' + response.status;

      return { data: null, error: new Error(message) };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: new Error(
        err?.name === 'AbortError'
          ? functionName + ' timed out after ' + Math.round(ms / 1000) + ' seconds'
          : err?.message || String(err)
      )
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

`;

if (!code.includes("async function solohubDirectRpc")) {
  const insertAt = code.indexOf("async function withSupabaseTimeout");
  if (insertAt === -1) throw new Error("Could not find withSupabaseTimeout insertion point.");
  code = code.slice(0, insertAt) + helper + code.slice(insertAt);
  fixes++;
}

// Announcements public loader
code = code.replaceAll(
  "const request = supabase.rpc('solohub_public_announcements', { p_role: role });",
  "const request = solohubDirectRpc('solohub_public_announcements', { p_role: role }, 12000);"
);

// Admin announcements loader
code = code.replaceAll(
  "const request = supabase.rpc('solohub_admin_announcements');",
  "const request = solohubDirectRpc('solohub_admin_announcements', {}, 12000);"
);

// Announcement unread count loader
code = code.replaceAll(
  "const request = supabase.rpc('solohub_public_announcements', { p_role: currentRoleForAnnouncements });",
  "const request = solohubDirectRpc('solohub_public_announcements', { p_role: currentRoleForAnnouncements }, 12000);"
);

// Exact Admin Users query from your real code
code = code.replace(
  /const request = supabase\s*\n\s*\.from\('profiles'\)\s*\n\s*\.select\('id,email,full_name,role,mpesa_name,mpesa_phone,backup_phone,payout_notes,updated_at'\)\s*\n\s*\.order\('updated_at',\s*\{\s*ascending:\s*false\s*\}\)\s*\n\s*\.limit\(100\);/g,
  () => {
    fixes++;
    return "const request = solohubDirectRpc('solohub_admin_profiles', {}, 12000);";
  }
);

fs.writeFileSync(file, code, "utf8");

console.log("✅ Direct RPC cloud fix applied.");
console.log("Fix count:", fixes);
