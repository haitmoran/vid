export type PortraitStyle = "crop" | "bob" | "waves" | "curls" | "fade" | "wrap";

export type StarProfile = {
  slug: string;
  name: string;
  firstName: string;
  initials: string;
  role: string;
  location: string;
  tagline: string;
  shortBio: string;
  bio: string;
  specialties: string[];
  featuredCredits: Array<{
    title: string;
    role: string;
    year: number;
  }>;
  portrait: {
    background: string;
    halo: string;
    skin: string;
    hair: string;
    clothing: string;
    style: PortraitStyle;
  };
};

/**
 * Prototype talent profiles. These are intentionally fictional and can be
 * replaced with real people later without changing the card or route APIs.
 */
export const starProfiles: readonly StarProfile[] = [
  {
    slug: "nova-vale",
    name: "Nova Vale",
    firstName: "Nova",
    initials: "NV",
    role: "Director & visual storyteller",
    location: "Lisbon, Portugal",
    tagline: "Small gestures, enormous worlds.",
    shortBio: "A director known for warm, character-led animation and playful visual rhythm.",
    bio: "Nova builds expressive animated worlds around quiet human moments. Her work blends tactile art direction, precise comedy, and performances that remain readable without dialogue.",
    specialties: ["Direction", "Animation", "Visual comedy"],
    featuredCredits: [
      { title: "A Pocket of Weather", role: "Director", year: 2025 },
      { title: "The Blue Hour", role: "Story artist", year: 2023 },
      { title: "Paper Planets", role: "Animation director", year: 2021 },
    ],
    portrait: {
      background: "#f5a57d",
      halo: "#ffd9bd",
      skin: "#8f4f35",
      hair: "#281b22",
      clothing: "#6338c7",
      style: "waves",
    },
  },
  {
    slug: "milo-keene",
    name: "Milo Keene",
    firstName: "Milo",
    initials: "MK",
    role: "Character animator",
    location: "Bristol, United Kingdom",
    tagline: "Performance lives between the poses.",
    shortBio: "A character animator focused on physical comedy, creatures, and expressive acting.",
    bio: "Milo turns graphic silhouettes into memorable performances. He is especially interested in non-verbal storytelling, creature locomotion, and the split-second timing behind a convincing reaction.",
    specialties: ["Character animation", "Creature work", "Comedy"],
    featuredCredits: [
      { title: "Little Giants", role: "Lead animator", year: 2025 },
      { title: "Borrowed Feathers", role: "Character animator", year: 2024 },
      { title: "Out of Frame", role: "Animation supervisor", year: 2022 },
    ],
    portrait: {
      background: "#6cbac7",
      halo: "#bdeaf0",
      skin: "#f0b68f",
      hair: "#523528",
      clothing: "#173d55",
      style: "crop",
    },
  },
  {
    slug: "aria-sol",
    name: "Aria Sol",
    firstName: "Aria",
    initials: "AS",
    role: "Production designer",
    location: "Barcelona, Spain",
    tagline: "Every world begins with a color.",
    shortBio: "A production designer shaping luminous fantasy worlds through color and texture.",
    bio: "Aria develops visual languages for stories that move between the intimate and the fantastic. Her palettes are designed around emotion first, then extended into lighting, materials, and environmental detail.",
    specialties: ["Production design", "Color scripting", "World building"],
    featuredCredits: [
      { title: "Sunken Constellations", role: "Production designer", year: 2025 },
      { title: "Mosslight", role: "Art director", year: 2023 },
      { title: "The Glass Forest", role: "Color artist", year: 2021 },
    ],
    portrait: {
      background: "#e67b9c",
      halo: "#ffd0dc",
      skin: "#c77956",
      hair: "#3b1f24",
      clothing: "#174b46",
      style: "bob",
    },
  },
  {
    slug: "elio-park",
    name: "Elio Park",
    firstName: "Elio",
    initials: "EP",
    role: "Composer & sound artist",
    location: "Seoul, South Korea",
    tagline: "Listen for the story beneath the image.",
    shortBio: "A composer mixing acoustic detail, field recordings, and restrained electronics.",
    bio: "Elio creates scores that leave room for the picture to breathe. His practice combines close-miked instruments, found sound, and electronic textures that feel organic rather than ornamental.",
    specialties: ["Original score", "Sound design", "Field recording"],
    featuredCredits: [
      { title: "After the Rainline", role: "Composer", year: 2025 },
      { title: "Signal Garden", role: "Composer & sound designer", year: 2024 },
      { title: "Soft Machines", role: "Sound artist", year: 2022 },
    ],
    portrait: {
      background: "#758bd4",
      halo: "#cbd4ff",
      skin: "#e7aa7e",
      hair: "#171923",
      clothing: "#792f50",
      style: "fade",
    },
  },
  {
    slug: "zuri-adebayo",
    name: "Zuri Adebayo",
    firstName: "Zuri",
    initials: "ZA",
    role: "Performer & movement artist",
    location: "Lagos, Nigeria",
    tagline: "Movement is dialogue.",
    shortBio: "A movement performer bringing clarity and emotional weight to animated characters.",
    bio: "Zuri works across performance capture, reference acting, and movement direction. Her approach gives animators a strong physical foundation while preserving the exaggeration that makes stylized characters sing.",
    specialties: ["Performance", "Movement direction", "Reference acting"],
    featuredCredits: [
      { title: "The Long Step", role: "Movement director", year: 2025 },
      { title: "Goldbird", role: "Lead performer", year: 2023 },
      { title: "North of Home", role: "Performance reference", year: 2022 },
    ],
    portrait: {
      background: "#dd9851",
      halo: "#ffe0a8",
      skin: "#603824",
      hair: "#1b1515",
      clothing: "#075f63",
      style: "wrap",
    },
  },
  {
    slug: "theo-reyes",
    name: "Theo Reyes",
    firstName: "Theo",
    initials: "TR",
    role: "Cinematographer",
    location: "Mexico City, Mexico",
    tagline: "Light should reveal a point of view.",
    shortBio: "A cinematographer pairing bold composition with soft, naturalistic light.",
    bio: "Theo treats virtual cinematography with the same physical discipline as a live set. His images favor deliberate camera placement, shaped contrast, and motivated movement over spectacle for its own sake.",
    specialties: ["Cinematography", "Lighting", "Virtual camera"],
    featuredCredits: [
      { title: "Static Bloom", role: "Cinematographer", year: 2025 },
      { title: "Under Neon Water", role: "Lighting director", year: 2024 },
      { title: "A Place for Shadows", role: "Director of photography", year: 2021 },
    ],
    portrait: {
      background: "#6caa72",
      halo: "#cce7bf",
      skin: "#b76542",
      hair: "#2b211d",
      clothing: "#272b59",
      style: "curls",
    },
  },
  {
    slug: "mina-hart",
    name: "Mina Hart",
    firstName: "Mina",
    initials: "MH",
    role: "Editor",
    location: "Toronto, Canada",
    tagline: "The cut is where attention becomes emotion.",
    shortBio: "An editor with a precise eye for momentum, silence, and visual reveals.",
    bio: "Mina shapes stories around what viewers notice and when they notice it. Her edits move comfortably from rapid comedy to long, patient passages without losing a scene's emotional through-line.",
    specialties: ["Picture editing", "Story structure", "Comedy timing"],
    featuredCredits: [
      { title: "Last Train to Orbit", role: "Editor", year: 2025 },
      { title: "Almost Awake", role: "Editor", year: 2023 },
      { title: "Twenty Small Doors", role: "Additional editor", year: 2022 },
    ],
    portrait: {
      background: "#c08ed8",
      halo: "#ead1f4",
      skin: "#efc19e",
      hair: "#6e4031",
      clothing: "#235a83",
      style: "bob",
    },
  },
  {
    slug: "imani-frost",
    name: "Imani Frost",
    firstName: "Imani",
    initials: "IF",
    role: "VFX supervisor",
    location: "New York, United States",
    tagline: "Make the impossible feel photographed.",
    shortBio: "A VFX supervisor grounding ambitious effects in believable detail and light.",
    bio: "Imani leads effects teams from early look development through final composite. She specializes in translating stylized concepts into images that still feel coherent, tactile, and emotionally connected to the story.",
    specialties: ["Visual effects", "Compositing", "Look development"],
    featuredCredits: [
      { title: "Orbitfall", role: "VFX supervisor", year: 2025 },
      { title: "The Electric Sea", role: "Compositing supervisor", year: 2024 },
      { title: "Faultline", role: "Lead VFX artist", year: 2022 },
    ],
    portrait: {
      background: "#4aa5a0",
      halo: "#b7e7df",
      skin: "#75442d",
      hair: "#171718",
      clothing: "#9a3d42",
      style: "curls",
    },
  },
];

const profilesBySlug = new Map(starProfiles.map((profile) => [profile.slug, profile]));

// One pair for each of the 15 source films. Repeated catalogue editions use
// the pair belonging to their source film.
const sourceVideoStarPairs = [
  ["nova-vale", "milo-keene"],
  ["imani-frost", "theo-reyes"],
  ["aria-sol", "zuri-adebayo"],
  ["theo-reyes", "imani-frost"],
  ["aria-sol", "elio-park"],
  ["nova-vale", "aria-sol"],
  ["milo-keene", "mina-hart"],
  ["zuri-adebayo", "mina-hart"],
  ["elio-park", "imani-frost"],
  ["milo-keene", "theo-reyes"],
  ["imani-frost", "elio-park"],
  ["zuri-adebayo", "nova-vale"],
  ["milo-keene", "zuri-adebayo"],
  ["mina-hart", "aria-sol"],
  ["theo-reyes", "elio-park"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

function stableNumber(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getStarBySlug(slug: string): StarProfile | undefined {
  return profilesBySlug.get(slug);
}

// Both lookups run once per card render and once per star per filter pass, so
// the parsing and profile resolution are cached per video id.
const slugsByVideoId = new Map<string, readonly [string, string]>();
const starsByVideoId = new Map<string, readonly [StarProfile, StarProfile]>();

export function getStarSlugsForVideo(videoId: string): readonly [string, string] {
  const cached = slugsByVideoId.get(videoId);
  if (cached) return cached;

  const numberedId = /^video-(\d+)$/.exec(videoId);
  const sourceIndex = numberedId
    ? (Math.max(1, Number(numberedId[1])) - 1) % sourceVideoStarPairs.length
    : stableNumber(videoId) % sourceVideoStarPairs.length;

  const pair = sourceVideoStarPairs[sourceIndex];
  slugsByVideoId.set(videoId, pair);
  return pair;
}

export function getStarsForVideo(videoId: string): readonly [StarProfile, StarProfile] {
  const cached = starsByVideoId.get(videoId);
  if (cached) return cached;

  const [firstSlug, secondSlug] = getStarSlugsForVideo(videoId);
  const first = profilesBySlug.get(firstSlug);
  const second = profilesBySlug.get(secondSlug);

  if (!first || !second || first.slug === second.slug) {
    throw new Error(`Invalid star assignment for video "${videoId}".`);
  }

  const pair: readonly [StarProfile, StarProfile] = [first, second];
  starsByVideoId.set(videoId, pair);
  return pair;
}
