export const seedCampaigns = [
  {
    id: 1,
    title: 'MarkTradesFX Gold Trading Clips',
    creator: 'MarkTradesFX',
    category: 'Forex Education',
    type: 'Clipping',
    management: 'SoloHub Managed',
    payPerThousand: 80,
    budget: 20000,
    remaining: 17000,
    minimumViews: 2000,
    maxPayout: 1500,
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    deadline: '2026-06-15',
    beginnerFriendly: true,
    verified: true,
    score: 88,
    status: 'Live',
    description:
      'Create short educational clips from approved MarkTradesFX videos. Focus on gold analysis, market structure, risk management, and trading psychology.',
    rules: [
      'Use only approved MarkTradesFX content.',
      'Add captions to every clip.',
      'Do not promise guaranteed profits.',
      'Use the provided hashtags.',
      'Post must remain public for review and payout.'
    ],
    hashtags: ['#MarkTradesFX', '#ForexKenya', '#GoldTrading', '#XAUUSD', '#TradingEducation'],
    assets: ['Google Drive source folder', 'Logo pack', 'Approved caption examples']
  },
  {
    id: 2,
    title: 'Moh Bakes Food Promo Clips',
    creator: 'Moh Bakes and Treats',
    category: 'Food & Bakery',
    type: 'Clipping',
    management: 'Self Managed',
    payPerThousand: 60,
    budget: 12000,
    remaining: 9400,
    minimumViews: 1500,
    maxPayout: 1000,
    platforms: ['TikTok', 'Instagram Reels'],
    deadline: '2026-06-05',
    beginnerFriendly: true,
    verified: true,
    score: 81,
    status: 'Live',
    description:
      'Use approved bakery videos to create mouth-watering short clips that promote cakes, pastries, and custom orders around Nairobi.',
    rules: [
      'Use provided videos only.',
      'Show the product clearly in the first 3 seconds.',
      'Mention Kasarani or Nairobi where natural.',
      'Do not use another bakery brand name.'
    ],
    hashtags: ['#MohBakes', '#NairobiBakes', '#CakeKenya', '#FoodTokKenya'],
    assets: ['Cake videos', 'Product photos', 'Logo']
  },
  {
    id: 3,
    title: 'Nairobi Podcast Highlight Clips',
    creator: 'Nairobi Voices Podcast',
    category: 'Podcast',
    type: 'Clipping',
    management: 'SoloHub Managed',
    payPerThousand: 100,
    budget: 30000,
    remaining: 24500,
    minimumViews: 3000,
    maxPayout: 2500,
    platforms: ['TikTok', 'Instagram Reels', 'YouTube Shorts'],
    deadline: '2026-06-30',
    beginnerFriendly: false,
    verified: false,
    score: 74,
    status: 'Live',
    description:
      'Clip strong hooks, debates, advice, funny moments, and quotable segments from long podcast episodes.',
    rules: [
      'Do not misrepresent the speaker.',
      'Use subtitles and clean cuts.',
      'Keep the original meaning of the conversation.',
      'Avoid hateful or defamatory framing.'
    ],
    hashtags: ['#NairobiPodcast', '#KenyanCreators', '#AfricanVoices'],
    assets: ['Podcast episode links', 'Podcast logo']
  }
];

export const seedSubmissions = [
  {
    id: 101,
    campaignId: 1,
    campaign: 'MarkTradesFX Gold Trading Clips',
    clipper: 'Brian Clips KE',
    platform: 'TikTok',
    postUrl: 'https://tiktok.com/@sample/video/123',
    caption: 'Gold respected the zone again. #MarkTradesFX',
    submittedViews: 4200,
    approvedViews: 4200,
    payout: 336,
    status: 'Approved',
    notes: 'Good captions and correct hashtags.',
    createdAt: '2026-05-12'
  },
  {
    id: 102,
    campaignId: 2,
    campaign: 'Moh Bakes Food Promo Clips',
    clipper: 'Nairobi Food Clips',
    platform: 'Instagram Reels',
    postUrl: 'https://instagram.com/reel/sample',
    caption: 'Custom cakes in Nairobi. #MohBakes',
    submittedViews: 1800,
    approvedViews: 0,
    payout: 0,
    status: 'Pending Review',
    notes: 'Waiting for review.',
    createdAt: '2026-05-13'
  },
  {
    id: 103,
    campaignId: 1,
    campaign: 'MarkTradesFX Gold Trading Clips',
    clipper: 'TrendMaker254',
    platform: 'YouTube Shorts',
    postUrl: 'https://youtube.com/shorts/sample',
    caption: 'Never risk without a plan. #ForexKenya',
    submittedViews: 900,
    approvedViews: 0,
    payout: 0,
    status: 'Needs Correction',
    notes: 'Views are below the minimum and hashtag is missing.',
    createdAt: '2026-05-13'
  }
];

export const academyLessons = [
  'How SoloHub clipping works',
  'How to pick a strong campaign',
  'How to make a 3-second hook',
  'How to add captions in CapCut',
  'Why clips get rejected',
  'How payouts are calculated'
];
