const fs = require("fs");

const file = "src/App.jsx";
let code = fs.readFileSync(file, "utf8");

// Add creator_user_id to campaign payload
code = code.replace(
  `assets: Array.isArray(campaign.assets) ? campaign.assets : []`,
  `assets: Array.isArray(campaign.assets) ? campaign.assets : [],
  creator_user_id: campaign.creator_user_id || null`
);

// Ensure created campaigns include current user id
code = code.replace(
  `const cleanCampaign = {
      ...campaign,`,
  `const cleanCampaign = {
      ...campaign,
      creator_user_id: user?.id || null,`
);

// Add clipper_user_id to submissions if mapper exists
code = code.replace(
  `campaign_id: submission.campaign_id || submission.campaignId,`,
  `campaign_id: submission.campaign_id || submission.campaignId,
  clipper_user_id: submission.clipper_user_id || null,`
);

// Add user id when creating a submission
code = code.replace(
  `const cleanSubmission = {
      ...submission,`,
  `const cleanSubmission = {
      ...submission,
      clipper_user_id: user?.id || null,`
);

// Safer header separator
code = code.replaceAll(' • ', ' - ');

fs.writeFileSync(file, code);
console.log("? Phase 6 ownership patch applied.");
