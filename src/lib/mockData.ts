// Mock data used by the seed script and (when USE_MOCK_DATA=true) by API
// routes if no live credentials are configured. This keeps the dashboard
// useful in a fresh clone without any third-party setup.

const now = Date.now();
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

const SUPERCAR_THUMBS = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
  "https://images.unsplash.com/photo-1592198084033-aade902d1aae",
  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b",
  "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8",
  "https://images.unsplash.com/photo-1567808291548-fc3ee04dbcf0",
  "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b",
  "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f",
];

const thumb = (i: number) =>
  `${SUPERCAR_THUMBS[i % SUPERCAR_THUMBS.length]}?auto=format&fit=crop&w=900&q=70`;

export const mockDiscoveredContent = [
  {
    platform: "instagram",
    originalAuthor: "@supercars_oftheworld",
    authorUrl: "https://instagram.com/supercars_oftheworld",
    url: "https://instagram.com/p/CmockA1/",
    mediaUrl: thumb(0),
    thumbnailUrl: thumb(0),
    mediaType: "image",
    caption:
      "Ferrari SF90 Stradale in Rosso Corsa parked at sunset on the Côte d'Azur. Hybrid V8, 986hp, the future of Maranello.",
    carMake: "Ferrari",
    carModel: "SF90",
    likes: 124_500,
    comments: 1_820,
    views: null,
    shares: null,
    saves: 9_800,
    aiScore: 92.4,
    aiReason:
      "High-engagement Ferrari SF90 post from a credible source. Strong colour pop, golden-hour lighting, and Ferrari content historically performs in the 95th percentile for this account.",
    predictedReach: 480_000,
    rightsStatus: "unknown",
    status: "new",
    discoveredAt: days(0),
  },
  {
    platform: "instagram",
    originalAuthor: "@thedrive",
    authorUrl: "https://instagram.com/thedrive",
    url: "https://instagram.com/p/CmockA2/",
    mediaUrl: thumb(1),
    thumbnailUrl: thumb(1),
    mediaType: "video",
    caption: "Lamborghini Revuelto launch — first V12 plug-in hybrid from Sant'Agata. 1015hp.",
    carMake: "Lamborghini",
    carModel: "REVUELTO",
    likes: 89_200,
    comments: 2_140,
    views: 1_240_000,
    shares: 4_300,
    saves: 12_100,
    aiScore: 88.1,
    aiReason: "Reveal video of new flagship — novelty score is high; Lamborghini Revuelto trending across automotive media.",
    predictedReach: 720_000,
    rightsStatus: "requested",
    status: "shortlisted",
    discoveredAt: days(1),
  },
  {
    platform: "youtube",
    originalAuthor: "Top Gear",
    authorUrl: "https://youtube.com/@TopGear",
    url: "https://youtube.com/shorts/mockYT1",
    mediaUrl: thumb(2),
    thumbnailUrl: thumb(2),
    mediaType: "short",
    caption: "McLaren 750S vs Ferrari 296 GTB — drag race",
    carMake: "McLaren",
    carModel: "750S",
    likes: 52_300,
    comments: 980,
    views: 2_100_000,
    aiScore: 81.7,
    aiReason: "Drag race format consistently performs well as a Reel repost. High view-to-like ratio implies broad reach.",
    predictedReach: 380_000,
    rightsStatus: "unknown",
    status: "new",
    discoveredAt: days(1),
  },
  {
    platform: "tiktok",
    originalAuthor: "@porschefiles",
    authorUrl: "https://tiktok.com/@porschefiles",
    url: "https://tiktok.com/@porschefiles/video/mockTT1",
    mediaUrl: thumb(3),
    thumbnailUrl: thumb(3),
    mediaType: "video",
    caption: "Porsche 992 GT3 RS — Weissach pack flyby at the Nürburgring.",
    carMake: "Porsche",
    carModel: "911",
    likes: 211_000,
    comments: 3_400,
    views: 3_800_000,
    shares: 18_400,
    aiScore: 94.8,
    aiReason:
      "Porsche GT3 RS content is in your top quartile historically. Sound-driven flyby clips outperform static shots 3.4×.",
    predictedReach: 1_100_000,
    rightsStatus: "granted",
    status: "approved",
    discoveredAt: days(2),
    approvedAt: days(0),
  },
  {
    platform: "twitter",
    originalAuthor: "@bugattiofficial",
    authorUrl: "https://x.com/bugattiofficial",
    url: "https://x.com/bugattiofficial/status/mockTW1",
    mediaUrl: thumb(4),
    thumbnailUrl: thumb(4),
    mediaType: "image",
    caption: "Bugatti Tourbillon — 1800hp, V16 hybrid, naturally aspirated.",
    carMake: "Bugatti",
    carModel: "TOURBILLON",
    likes: 78_000,
    comments: 1_100,
    saves: 14_200,
    aiScore: 90.3,
    aiReason: "Official manufacturer source = clean rights story. Tourbillon launch coverage is novel; engagement curve still rising.",
    predictedReach: 540_000,
    rightsStatus: "granted",
    status: "shortlisted",
    discoveredAt: days(3),
    shortlistedAt: days(2),
  },
  {
    platform: "rss",
    originalAuthor: "Carscoops",
    authorUrl: "https://carscoops.com",
    url: "https://carscoops.com/2026/05/pagani-utopia-roadster",
    mediaUrl: thumb(5),
    thumbnailUrl: thumb(5),
    mediaType: "image",
    caption: "Pagani Utopia Roadster confirmed — V12 manual, 99 units.",
    carMake: "Pagani",
    carModel: "UTOPIA",
    likes: null,
    comments: null,
    aiScore: 76.0,
    aiReason: "Editorial scoop; needs original photography sourced or attribution-cleared visuals before posting.",
    predictedReach: 210_000,
    rightsStatus: "unknown",
    status: "new",
    discoveredAt: days(4),
  },
  {
    platform: "manual",
    originalAuthor: "@rolls.roycecars",
    authorUrl: "https://instagram.com/rolls.roycecars",
    url: "https://instagram.com/p/manualImport1/",
    mediaUrl: thumb(6),
    thumbnailUrl: thumb(6),
    mediaType: "image",
    caption: "Rolls-Royce Spectre at midnight — silent EV grand tourer.",
    carMake: "Rolls-Royce",
    carModel: "SPECTRE",
    likes: 41_000,
    comments: 620,
    aiScore: 71.5,
    aiReason: "Strong brand fit but luxury EV content underperforms vs ICE supercars in your historical data.",
    predictedReach: 180_000,
    rightsStatus: "requested",
    status: "permission_requested",
    discoveredAt: days(5),
  },
  {
    platform: "auction",
    originalAuthor: "RM Sotheby's",
    authorUrl: "https://rmsothebys.com",
    url: "https://rmsothebys.com/lot/mockLot1",
    mediaUrl: thumb(7),
    thumbnailUrl: thumb(7),
    mediaType: "image",
    caption: "1995 Ferrari F50 — Monterey 2026, estimate $5.5–6.5M.",
    carMake: "Ferrari",
    carModel: "F50",
    aiScore: 84.2,
    aiReason: "Auction context drives saves and comments; classic Ferrari content historically converts to high reach.",
    predictedReach: 420_000,
    rightsStatus: "unknown",
    status: "new",
    discoveredAt: days(6),
  },
] satisfies Array<{
  platform: string;
  originalAuthor: string;
  authorUrl: string;
  url: string;
  mediaUrl: string;
  thumbnailUrl: string;
  mediaType: string;
  caption: string;
  carMake: string;
  carModel: string;
  likes?: number | null;
  comments?: number | null;
  views?: number | null;
  shares?: number | null;
  saves?: number | null;
  aiScore: number;
  aiReason: string;
  predictedReach: number;
  rightsStatus: string;
  status: string;
  discoveredAt: Date;
  shortlistedAt?: Date;
  approvedAt?: Date;
}>;

// ---------------------------------------------------------------------------
// Historical IG posts (our own account) — synthetic but coherent for analytics.
// ---------------------------------------------------------------------------
type MockPost = {
  id: string;
  caption: string;
  mediaType: string;
  permalink: string;
  mediaUrl: string;
  thumbnailUrl: string;
  timestamp: Date;
  carMake: string;
  carModel: string;
  theme: string;
  captionStyle: string;
  hashtags: string[];
  postedHour: number;
  postedDow: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  reach: number;
  impressions: number;
  videoViews: number | null;
  engagementRate: number;
};

const themes = ["launch", "spotted", "auction", "spec-detail", "comparison", "lifestyle"];
const captionStyles = ["luxury", "question", "short", "story"];

const makePost = (i: number): MockPost => {
  const makes: Array<{ make: string; model: string; baseLikes: number }> = [
    { make: "Ferrari", model: "SF90", baseLikes: 18_000 },
    { make: "Ferrari", model: "296", baseLikes: 14_000 },
    { make: "Lamborghini", model: "REVUELTO", baseLikes: 17_500 },
    { make: "Lamborghini", model: "HURACAN", baseLikes: 12_000 },
    { make: "Porsche", model: "911", baseLikes: 21_000 },
    { make: "Porsche", model: "GT3", baseLikes: 23_000 },
    { make: "McLaren", model: "750S", baseLikes: 9_500 },
    { make: "Bugatti", model: "CHIRON", baseLikes: 26_000 },
    { make: "Pagani", model: "HUAYRA", baseLikes: 19_000 },
    { make: "Mercedes", model: "AMG GT", baseLikes: 8_000 },
    { make: "Rolls-Royce", model: "PHANTOM", baseLikes: 7_000 },
  ];
  const m = makes[i % makes.length];
  const theme = themes[i % themes.length];
  const style = captionStyles[i % captionStyles.length];
  const hour = [9, 12, 17, 19, 21, 22][i % 6];
  const dow = i % 7;

  // Bias for evening posts and Porsche / Bugatti to give analytics real signal.
  const hourBoost = hour >= 17 ? 1.3 : 1.0;
  const brandBoost = m.make === "Porsche" || m.make === "Bugatti" ? 1.4 : 1.0;
  const styleBoost = style === "luxury" ? 1.2 : style === "question" ? 1.1 : 1.0;

  const likes = Math.round(m.baseLikes * hourBoost * brandBoost * styleBoost * (0.7 + Math.random() * 0.6));
  const comments = Math.round(likes * 0.02);
  const saves = Math.round(likes * 0.08);
  const shares = Math.round(likes * 0.03);
  const reach = Math.round(likes * 8.2);
  const impressions = Math.round(reach * 1.4);
  const videoViews = i % 3 === 0 ? Math.round(reach * 1.8) : null;
  const engagementRate = ((likes + comments + saves + shares) / reach) * 100;

  return {
    id: `mock_post_${i}`,
    caption: `${m.make} ${m.model} — ${theme} shot. Tap save for spec.`,
    mediaType: i % 3 === 0 ? "VIDEO" : "IMAGE",
    permalink: `https://instagram.com/p/mockself_${i}/`,
    mediaUrl: thumb(i),
    thumbnailUrl: thumb(i),
    timestamp: days(i * 3 + 1),
    carMake: m.make,
    carModel: m.model,
    theme,
    captionStyle: style,
    hashtags: [`#${m.make.toLowerCase().replace(/[^a-z]/g, "")}`, `#${m.model.toLowerCase().replace(/[^a-z0-9]/g, "")}`, "#supercar", "#luxury"],
    postedHour: hour,
    postedDow: dow,
    likes,
    comments,
    saves,
    shares,
    reach,
    impressions,
    videoViews,
    engagementRate,
  };
};

export const mockInstagramPosts: MockPost[] = Array.from({ length: 60 }, (_, i) => makePost(i));

export const mockFavouriteAccounts = [
  {
    platform: "instagram",
    handle: "supercars_oftheworld",
    displayName: "Supercars of the World",
    url: "https://instagram.com/supercars_oftheworld",
    profilePicUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=200&q=70",
    bio: "Curated supercar content from across the globe.",
    followersCount: 3_200_000,
    followsCount: 412,
    mediaCount: 18_400,
    tags: ["aggregator", "hypercar-launches", "italian-supercars"],
    notes: "Largest aggregator. Posts 6–8×/day.",
    postsPerWeek: 49.0,
    avgLikes: 38_400,
    avgComments: 410,
    engagementVelocity: 0.0121,
    active: true,
    discoveredFrom: "manual",
  },
  {
    platform: "instagram",
    handle: "carlifestyle",
    displayName: "CarLifestyle",
    url: "https://instagram.com/carlifestyle",
    profilePicUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=200&q=70",
    bio: "The standard for premium car curation. Launches, lifestyle, the world's rarest.",
    followersCount: 12_500_000,
    followsCount: 220,
    mediaCount: 22_100,
    tags: ["premium", "hypercar-launches", "lifestyle"],
    notes: "Premium curation. Heavy on launches.",
    postsPerWeek: 24.0,
    avgLikes: 142_500,
    avgComments: 980,
    engagementVelocity: 0.0115,
    active: true,
    discoveredFrom: "manual",
  },
  {
    platform: "instagram",
    handle: "italian_supercars",
    displayName: "Italian Supercars",
    url: "https://instagram.com/italian_supercars",
    profilePicUrl: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=200&q=70",
    bio: "Ferrari, Lamborghini, Pagani. Italian engineering at its finest.",
    followersCount: 1_800_000,
    followsCount: 180,
    mediaCount: 9_600,
    tags: ["italian-supercars", "ferrari", "lamborghini"],
    notes: "Ferrari / Lambo focus.",
    postsPerWeek: 21.0,
    avgLikes: 24_900,
    avgComments: 312,
    engagementVelocity: 0.0140,
    active: true,
    discoveredFrom: "manual",
  },
  {
    platform: "instagram",
    handle: "rolls.roycecars",
    displayName: "Rolls-Royce Cars",
    url: "https://instagram.com/rolls.roycecars",
    profilePicUrl: "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?auto=format&fit=crop&w=200&q=70",
    bio: "The world's finest luxury motor cars.",
    followersCount: 4_100_000,
    followsCount: 95,
    mediaCount: 5_800,
    tags: ["luxury", "rolls-royce", "brand-official"],
    notes: "Brand-official feed. Rights story is clean.",
    postsPerWeek: 9.0,
    avgLikes: 81_200,
    avgComments: 620,
    engagementVelocity: 0.0199,
    active: true,
    discoveredFrom: "manual",
  },
];
