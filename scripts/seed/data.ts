// Pure data. No side effects, no DB calls, no framework imports.

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface SkillSeed {
  _id: string;
  name: string;
  category: string;
}

export interface UserSeed {
  clerkId: string;
  displayName: string;
  bio: string;
  timezone: string;
  teaches: { skillId: string; level: SkillLevel }[];
  learns: { skillId: string; level: SkillLevel }[];
}

// ---- SKILL CATALOG ----
// Expand to ~150 before demo day. 30 is enough for dev + tests.
export const SKILL_CATALOG: SkillSeed[] = [
  { _id: "react", name: "React", category: "Frontend" },
  { _id: "typescript", name: "TypeScript", category: "Frontend" },
  { _id: "nextjs", name: "Next.js", category: "Frontend" },
  { _id: "css", name: "CSS", category: "Frontend" },
  { _id: "tailwind", name: "Tailwind CSS", category: "Frontend" },
  { _id: "vue", name: "Vue", category: "Frontend" },
  { _id: "node", name: "Node.js", category: "Backend" },
  { _id: "go", name: "Go", category: "Backend" },
  { _id: "python", name: "Python", category: "Backend" },
  { _id: "postgres", name: "PostgreSQL", category: "Backend" },
  { _id: "mongodb", name: "MongoDB", category: "Backend" },
  { _id: "graphql", name: "GraphQL", category: "Backend" },
  { _id: "figma", name: "Figma", category: "Design" },
  { _id: "ux-writing", name: "UX Writing", category: "Design" },
  { _id: "branding", name: "Branding", category: "Design" },
  { _id: "illustration", name: "Illustration", category: "Design" },
  { _id: "spanish", name: "Spanish", category: "Language" },
  { _id: "french", name: "French", category: "Language" },
  { _id: "german", name: "German", category: "Language" },
  { _id: "japanese", name: "Japanese", category: "Language" },
  { _id: "guitar", name: "Guitar", category: "Music" },
  { _id: "piano", name: "Piano", category: "Music" },
  { _id: "music-theory", name: "Music Theory", category: "Music" },
  { _id: "copywriting", name: "Copywriting", category: "Marketing" },
  { _id: "seo", name: "SEO", category: "Marketing" },
  { _id: "sales", name: "Sales", category: "Business" },
  { _id: "public-speaking", name: "Public Speaking", category: "Business" },
  { _id: "photography", name: "Photography", category: "Creative" },
  { _id: "video-editing", name: "Video Editing", category: "Creative" },
  { _id: "chess", name: "Chess", category: "Other" },
];

// ---- TEST USERS ----
// Deterministic. The integration test asserts against these exact records.
// clerkId prefix "test_" so cleanup never touches dev or real users.
export const TEST_USERS: UserSeed[] = [
  {
    clerkId: "test_you",
    displayName: "Demo You",
    bio: "Integration-test fixture: me",
    timezone: "UTC",
    teaches: [
      { skillId: "react", level: "advanced" },
      { skillId: "nextjs", level: "advanced" },
    ],
    learns: [{ skillId: "spanish", level: "beginner" }],
  },
  {
    clerkId: "test_ana",
    displayName: "Ana",
    bio: "Integration-test fixture: mutual match with me",
    timezone: "UTC",
    teaches: [{ skillId: "spanish", level: "advanced" }],
    learns: [{ skillId: "react", level: "beginner" }],
  },
  {
    clerkId: "test_luis",
    displayName: "Luis",
    bio: "Integration-test fixture: teaches Spanish but wants TypeScript (NOT a match)",
    timezone: "UTC",
    teaches: [
      { skillId: "spanish", level: "intermediate" },
      { skillId: "guitar", level: "advanced" },
    ],
    learns: [{ skillId: "typescript", level: "beginner" }],
  },
];

// ---- DEV RANDOM USERS ----
// 50 users with random teach/learn pairs, so search and matching look alive in dev.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced"];
const SKILL_IDS = SKILL_CATALOG.map((s) => s._id);

export const DEV_USERS: UserSeed[] = Array.from({ length: 50 }, (_, i) => ({
  clerkId: `dev_seed_${i + 1}`,
  displayName: `Dev User ${i + 1}`,
  bio: `Seeded dev user #${i + 1}`,
  timezone: "UTC",
  teaches: shuffle(SKILL_IDS)
    .slice(0, 2)
    .map((id) => ({ skillId: id, level: pick(LEVELS) })),
  learns: shuffle(SKILL_IDS)
    .slice(0, 2)
    .map((id) => ({ skillId: id, level: pick(LEVELS) })),
}));

// ---- DEMO USERS ----
// Hand-authored demo narrative. Scheduled for Day 9 per D-013. Empty for now.
export const DEMO_USERS: UserSeed[] = [];