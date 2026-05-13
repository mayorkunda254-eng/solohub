const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

if (!code.includes("async function getSupabaseAuthHeaders")) {
  code += `

async function getSupabaseAuthHeaders() {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let accessToken = key;

  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || key;
  } catch (err) {
    console.warn("Could not get Supabase session token. Falling back to publishable key.", err);
  }

  return {
    apikey: key,
    Authorization: \`Bearer \${accessToken}\`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}
`;
}

// Replace repeated REST headers in helper functions
code = code.replaceAll(
`headers: {
      apikey: key,
      Authorization: \`Bearer \${key}\`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },`,
`headers: await getSupabaseAuthHeaders(),`
);

code = code.replaceAll(
`headers: {
      apikey: key,
      Authorization: \`Bearer \${key}\`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },`,
`headers: await getSupabaseAuthHeaders(),`
);

fs.writeFileSync(file, code);
console.log("? REST helpers now use logged-in Supabase access token.");
