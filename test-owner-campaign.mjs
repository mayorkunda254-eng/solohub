import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envText = fs.readFileSync(".env", "utf8");
const env = {};

for (const line of envText.split(/\r?\n/)) {
  if (!line.includes("=") || line.trim().startsWith("#")) continue;
  const index = line.indexOf("=");
  env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const payload = {
  title: "Ownership Test Campaign",
  creator: "Mark Admin",
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
  description: "Testing campaign ownership from PowerShell.",
  rules: ["Use approved content only"],
  hashtags: ["#SoloHub", "#Test"],
  assets: ["Source link/assets to be added"],
  creator_user_id: "78fb0fe2-2551-481f-9fcd-64d05cd3821c"
};

console.log("Testing campaign insert with creator_user_id...");

const { data, error } = await supabase
  .from("campaigns")
  .insert(payload)
  .select("*")
  .single();

if (error) {
  console.error("? Insert failed:");
  console.error(error);
  process.exit(1);
}

console.log("? Insert worked");
console.log(data.id, data.title, data.creator_user_id);
