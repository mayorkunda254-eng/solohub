import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env", "utf8");

const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const index = line.indexOf("=");
  env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
}

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("? Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const payload = {
  title: "PowerShell Test Campaign",
  creator: "SoloHub Test",
  category: "Testing",
  type: "Clipping",
  management: "SoloHub Managed",
  pay_per_thousand: 80,
  budget: 20000,
  remaining: 17000,
  minimum_views: 1000,
  max_payout: 1500,
  platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
  deadline: "2026-06-30",
  beginner_friendly: true,
  verified: false,
  score: 70,
  status: "Pending Approval",
  description: "This campaign was inserted directly from PowerShell to test Supabase saving.",
  rules: ["Use approved content only", "Post must remain public"],
  hashtags: ["#SoloHub", "#Test"],
  assets: ["Source link/assets to be added"]
};

console.log("Testing Supabase campaign insert...");

const { data, error } = await supabase
  .from("campaigns")
  .insert(payload)
  .select("*")
  .single();

if (error) {
  console.error("? Supabase insert failed:");
  console.error(error);
  process.exit(1);
}

console.log("? Supabase insert successful");
console.log("Campaign ID:", data.id);
console.log("Title:", data.title);
console.log("Status:", data.status);
