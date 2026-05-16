const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-cloud-health-debug.jsx", code);

if (code.includes("window.solohubCloudHealth")) {
  console.log("✅ Cloud health tester already exists.");
  process.exit(0);
}

const marker = "async function withSupabaseTimeout";
const insertAt = code.indexOf(marker);

if (insertAt === -1) {
  throw new Error("Could not find insertion point before withSupabaseTimeout.");
}

const helper = `

async function solohubCloudHealth() {
  const results = [];

  const withTimeout = (promise, label, ms = 12000) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(label + " timed out after " + Math.round(ms / 1000) + " seconds")), ms)
      )
    ]);

  const add = (name, ok, detail = "", count = "") => {
    results.push({ name, ok, detail: String(detail || ""), count });
  };

  const test = async (name, fn) => {
    try {
      const result = await withTimeout(fn(), name, 12000);

      if (result?.error) {
        throw result.error;
      }

      const data = result?.data ?? result;

      if (data?.ok === false) {
        throw new Error(data?.message || "RPC returned ok=false");
      }

      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      add(name, true, "OK", count);
    } catch (err) {
      add(name, false, err?.message || JSON.stringify(err) || err, "");
    }
  };

  if (!supabase) {
    add("supabase client", false, "Supabase client is not configured.");
    console.table(results);
    return results;
  }

  await test("auth session", async () => {
    const res = await supabase.auth.getSession();
    if (res.error) throw res.error;

    const user = res.data?.session?.user;
    if (!user?.email) throw new Error("No logged-in user session email found.");

    return { data: { id: user.id, email: user.email }, error: null };
  });

  await test("profiles read", () =>
    supabase.from("profiles").select("id,email,role").limit(5)
  );

  await test("campaigns read", () =>
    supabase.from("campaigns").select("*").limit(5)
  );

  await test("submissions read", () =>
    supabase.from("submissions").select("*").limit(5)
  );

  await test("announcements read", () =>
    supabase.from("announcements").select("*").limit(5)
  );

  await test("campaign_requests read", () =>
    supabase.from("campaign_requests").select("*").limit(5)
  );

  await test("platform_settings read", () =>
    supabase.from("platform_settings").select("*").limit(5)
  );

  await test("affiliate dashboard rpc", () =>
    supabase.rpc("solohub_affiliate_dashboard")
  );

  await test("affiliates read", () =>
    supabase.from("affiliates").select("*").limit(5)
  );

  await test("referrals read", () =>
    supabase.from("referrals").select("*").limit(5)
  );

  console.table(results);
  window.__solohubLastCloudHealth = results;

  return results;
}

if (typeof window !== "undefined") {
  window.solohubCloudHealth = solohubCloudHealth;
}

`;

code = code.slice(0, insertAt) + helper + code.slice(insertAt);

fs.writeFileSync(file, code, "utf8");

console.log("✅ Added window.solohubCloudHealth diagnostic.");
