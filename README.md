# SoloHub MVP Starter - Phase 2

This version adds separate app sections, local browser persistence, campaign creation, clip submission, admin approval, and manual payout tracking.

## Run in VS Code

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Open:

```text
http://localhost:5173
```

## What is included

- Home page
- Role switcher: Clipper / Creator / Admin
- Sidebar navigation
- Discover Campaigns
- Campaign details modal
- Submit Clip page
- My Submissions page
- Earnings page
- SoloHub Academy placeholder
- Creator dashboard
- Create Campaign form
- Creator campaign list
- Admin campaign approval
- Admin submission review
- Admin payout tracking
- Browser localStorage saving

## Important

This is still a frontend MVP. Data is stored only in your browser, not in a real database yet.

Next step after this: connect Supabase for authentication, database tables, and real saved campaigns/submissions.
