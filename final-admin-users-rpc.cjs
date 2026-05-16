const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

fs.writeFileSync("src/App.before-final-admin-users-rpc.jsx", code);

let fixes = 0;

code = code.replace(
  /const request = supabase\s*\n\s*\.from\('profiles'\)\s*\n\s*\.select\('\*'\)\s*\n\s*\.order\('created_at',\s*\{\s*ascending:\s*false\s*\}\);/g,
  () => {
    fixes++;
    return "const request = supabase.rpc('solohub_admin_profiles');";
  }
);

code = code.replaceAll("'Load users', 20000", "'Load users', 15000");
code = code.replaceAll("'Load users', 30000", "'Load users', 15000");

fs.writeFileSync(file, code, "utf8");

console.log("Admin users RPC replacements:", fixes);

if (fixes === 0) {
  console.log("No exact profiles loader block found. Run:");
  console.log("Select-String -Path .\\src\\App.jsx -Pattern \"Load users|from('profiles')|solohub_admin_profiles\" -Context 5,5");
}
