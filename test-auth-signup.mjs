import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env", "utf8");
const env = {};

for (const line of envText.split(/\r?\n/)) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const index = line.indexOf("=");
  env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

const testEmail = `solohubtest${Date.now()}@gmail.com`;
const testPassword = "Test123456";

console.log("Testing Supabase signup...");
console.log("Email:", testEmail);

const { data, error } = await supabase.auth.signUp({
  email: testEmail,
  password: testPassword,
  options: {
    data: {
      full_name: "SoloHub Test User",
      role: "clipper"
    }
  }
});

if (error) {
  console.error("? Signup failed:");
  console.error(error);
  process.exit(1);
}

console.log("? Signup request worked.");
console.log("User ID:", data.user?.id);
console.log("Session exists:", Boolean(data.session));
console.log("If session is false, Supabase email confirmation is enabled.");
