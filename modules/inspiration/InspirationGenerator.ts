// modules/inspiration/InspirationGenerator.ts
// Pure offline random-table inspiration generator.
// No DB reads, no network calls — all tables are baked in below.
// Called by modules/inspiration/index.ts via IPC.

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type InspirationCategory =
  | 'plot'
  | 'npc'
  | 'location'
  | 'encounter'
  | 'item';

export interface InspirationResult {
  text:     string;
  category: InspirationCategory;
  tags:     string[];
}

export interface GenerateParams {
  campaignId: string;             // kept for API consistency; not used by tables
  category?:  InspirationCategory;
  count?:     number;             // default 3, max 10
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables — Plot Hooks
// ─────────────────────────────────────────────────────────────────────────────

const PLOT_SUBJECTS = [
  'a disgraced knight', 'a reclusive herbalist', 'a merchant guild',
  'a forgotten god', 'a child with no shadow', 'a wandering bard',
  'a river that runs backwards', 'a locked tower', 'twin heirs',
  'a plague doctor', 'a blind oracle', 'a stolen crown',
  'a rebellious apprentice', 'a dying forest', 'a sunken city',
  'an enchanted mirror', 'a missing cartographer', 'a cursed bloodline',
];

const PLOT_COMPLICATIONS = [
  'has been falsely accused of murder',
  'holds a secret that could topple the realm',
  'is being hunted by an unseen force',
  'made a bargain they now desperately regret',
  'was last seen heading into forbidden territory',
  'sends cryptic messages no one can decode',
  'is slowly being replaced by something else',
  'needs something only the party can retrieve',
  'is being blackmailed into betrayal',
  'knows who really controls the city',
  'has started a chain of events no one can stop',
  'offers a reward that seems far too generous',
  'is the only one who remembers what happened',
  'will die unless a ritual is completed by moonrise',
  'claims to have been sent from the future',
];

const PLOT_TWISTS = [
  'But the real enemy is someone the party already trusts.',
  'The reward was never real.',
  'Someone else reached the destination first.',
  'The truth is worse than the lie.',
  'There is no going back once they know.',
  'The villain believes they are the hero.',
  'The innocent party is guilty of something else entirely.',
  'Time is running out — it always was.',
  'The map leads somewhere unexpected.',
  'Two factions both claim to be the rightful side.',
];

function generatePlot(): InspirationResult {
  const subject     = pick(PLOT_SUBJECTS);
  const complication = pick(PLOT_COMPLICATIONS);
  const addTwist    = Math.random() < 0.45;
  const twist       = addTwist ? ` ${pick(PLOT_TWISTS)}` : '';
  return {
    text:     `${subject.charAt(0).toUpperCase() + subject.slice(1)} ${complication}.${twist}`,
    category: 'plot',
    tags:     ['plot-hook'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables — NPC Traits
// ─────────────────────────────────────────────────────────────────────────────

const NPC_ROLES = [
  'innkeeper', 'blacksmith', 'hedge wizard', 'tax collector', 'grave robber',
  'disgraced noble', 'ship captain', 'herbalist', 'beggar-king', 'cartographer',
  'bounty hunter', 'court jester', 'travelling monk', 'fence', 'militia captain',
  'orphan turned thief', 'retired soldier', 'doomsday prophet', 'midwife',
  'rat catcher', 'glassblower', 'poisoner', 'sellsword', 'librarian',
];

const NPC_QUIRKS = [
  'never makes eye contact',
  'hums constantly under their breath',
  'collects teeth from people they\'ve wronged',
  'speaks only in questions',
  'always carries a caged bird',
  'has memorised the price of everything in the city',
  'loses their accent when angry',
  'leaves a coin behind everywhere they go',
  'refuses to say any name aloud',
  'flinches at sudden kindness',
  'wears gloves they never remove',
  'counts everything compulsively',
  'tells a different origin story every time they\'re asked',
  'smells faintly of smoke despite no obvious source',
  'addresses everyone as if they\'re slightly hard of hearing',
];

const NPC_SECRETS = [
  'They are not who they claim to be.',
  'They owe a debt to someone very dangerous.',
  'They witnessed something they were never meant to see.',
  'They have been slowly poisoning someone for months.',
  'They are the last surviving heir of a fallen house.',
  'They have a twin no one knows about.',
  'They sold someone they loved to survive.',
  'They are being watched.',
  'They know exactly where the body is buried.',
  'They have already decided to betray the party.',
];

const NPC_MOTIVATIONS = [
  'wants to disappear completely',
  'is trying to protect someone at all costs',
  'craves recognition they feel they\'ve been denied',
  'is running out of time to make things right',
  'needs enough coin to buy someone\'s freedom',
  'is hunting the thing that destroyed their home',
  'wants to prove a long-dead mentor wrong',
  'is desperately trying to appear ordinary',
  'seeks absolution for a past they can\'t outrun',
  'is looking for an excuse to stop fighting',
];

function generateNpc(): InspirationResult {
  const role       = pick(NPC_ROLES);
  const quirk      = pick(NPC_QUIRKS);
  const motivation = pick(NPC_MOTIVATIONS);
  const addSecret  = Math.random() < 0.5;
  const secret     = addSecret ? ` ${pick(NPC_SECRETS)}` : '';
  return {
    text:     `A ${role} who ${quirk} and ${motivation}.${secret}`,
    category: 'npc',
    tags:     ['npc', 'character'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables — Locations
// ─────────────────────────────────────────────────────────────────────────────

const LOC_TYPES = [
  'a sunken village', 'a crossroads shrine', 'an abandoned mill',
  'a watchtower built into a cliff face', 'a market that only opens at night',
  'a library carved into a salt mine', 'a bridge town', 'a prison island',
  'a fog-bound valley', 'a tavern built inside a shipwreck',
  'a walled monastery', 'a city beneath a glacier', 'a crater settlement',
  'an alchemist\'s quarter', 'a ghost-road waystation', 'a drowned archive',
  'a floating garden city', 'a quarry that goes too deep',
];

const LOC_ATMOSPHERE = [
  'where the locals refuse to speak after dark',
  'perpetually shrouded in mist that smells of iron',
  'where every surface is covered in old warning carvings',
  'that appears on no map anyone will admit to owning',
  'where the wildlife behaves with unnerving intelligence',
  'that is noticeably warmer than it should be',
  'where time seems to pass at a different rate',
  'that the birds avoid entirely',
  'whose inhabitants all share the same haunted expression',
  'that is slowly sinking into the ground',
  'lit by a light source no one has identified',
  'where mirrors always show a slightly different reflection',
  'that everyone in the region has heard of but no one visits twice',
];

const LOC_HOOKS = [
  'Something was sealed here long ago and the seal is weakening.',
  'Two rival groups both claim ownership — violently.',
  'A recent arrival has changed everything.',
  'Something important was hidden here and someone else is already looking for it.',
  'The place was abandoned overnight, mid-meal.',
  'A ritual is performed here regularly that outsiders are not meant to witness.',
  'The previous visitors never came back.',
  'It is exactly as described in a prophecy the party has heard.',
];

function generateLocation(): InspirationResult {
  const type      = pick(LOC_TYPES);
  const atmos     = pick(LOC_ATMOSPHERE);
  const addHook   = Math.random() < 0.5;
  const hook      = addHook ? ` ${pick(LOC_HOOKS)}` : '';
  const typeCapd  = type.charAt(0).toUpperCase() + type.slice(1);
  return {
    text:     `${typeCapd} ${atmos}.${hook}`,
    category: 'location',
    tags:     ['location', 'setting'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables — Encounters
// ─────────────────────────────────────────────────────────────────────────────

const ENC_SETUPS = [
  'A group of soldiers is escorting a prisoner who claims to be innocent',
  'A merchant caravan has stopped — all the animals refuse to move further',
  'Someone is auctioning off an item that clearly belongs to a dead god',
  'A delegation from two warring factions arrives at the same time',
  'A figure is standing perfectly still in the middle of the road',
  'A child is being very calmly followed by something large',
  'Three people are all telling completely different versions of the same event',
  'A fire is burning that produces no heat and no smoke',
  'A crowd has gathered around something no one will describe aloud',
  'A body has been found arranged too deliberately to be accidental',
  'Someone is paying double rate for guards with no questions asked',
  'A local festival has taken a very wrong turn',
  'A structure that wasn\'t here yesterday now dominates the skyline',
  'Two old enemies are sitting in silence at the same table',
  'A messenger arrives with a letter addressed to the party — dated three years from now',
];

const ENC_COMPLICATIONS = [
  'Nothing is what it first appears.',
  'Someone in the scene is lying about everything.',
  'There is a hard deadline the party doesn\'t yet know about.',
  'The obvious solution makes everything worse.',
  'A third party with their own agenda is watching.',
  'The party\'s reputation precedes them here — for better or worse.',
  'Someone will be seriously harmed if the party does nothing.',
  'The situation has already been tampered with.',
  'Choosing a side costs them the other.',
  'The enemy of the enemy is not a friend.',
];

function generateEncounter(): InspirationResult {
  const setup         = pick(ENC_SETUPS);
  const addComplication = Math.random() < 0.55;
  const comp          = addComplication ? ` ${pick(ENC_COMPLICATIONS)}` : '';
  return {
    text:     `${setup}.${comp}`,
    category: 'encounter',
    tags:     ['encounter', 'scene'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables — Magic Items
// ─────────────────────────────────────────────────────────────────────────────

const ITEM_FORMS = [
  'a hand mirror', 'a brass compass', 'a finger bone on a chain',
  'a worn coin with no mint mark', 'a glass eye', 'a music box',
  'an iron key that opens no known lock', 'a sealed letter',
  'a pair of boots', 'a cracked hourglass', 'a ring of black iron',
  'a clay mask', 'a child\'s doll', 'a broken sword hilt',
  'a vial of oil that never runs out', 'a silver needle',
  'a book with no text', 'a small lantern', 'a carved tooth',
  'a gauntlet missing its pair',
];

const ITEM_PROPERTIES = [
  'that always points toward the nearest graveyard',
  'that grows warm in the presence of lies',
  'that shows the reflection of whoever last held it, not the current bearer',
  'that whispers a single name when held — always a different name',
  'that causes animals to avoid its carrier',
  'that is always slightly wet, regardless of conditions',
  'that casts no shadow',
  'whose markings change to match the language of whoever reads them',
  'that makes its bearer invisible in mirrors only',
  'that preserves any organic material placed inside it perfectly',
  'that hums when carried east',
  'that gets lighter the closer it is to danger',
  'that is mentioned by name in a prophecy fragment the party has seen',
  'that once belonged to someone the party has heard of',
  'that cannot be willingly given away — only lost or stolen',
  'that remembers everywhere it has been',
  'that changes temperature based on the emotional state of its holder',
  'that seems to slightly dread being used',
];

const ITEM_HISTORIES = [
  'It was found in the possession of someone who had no memory of acquiring it.',
  'Three people have claimed ownership of it in the past year — none are alive.',
  'It appears in a painting dated four hundred years ago.',
  'It was reported destroyed in a famous battle.',
  'A reward has been quietly posted for its return — no name on the posting.',
  'The last person to sell it sold it twice.',
  'Its origin is listed in a restricted archive.',
  'It was part of a set; the others are unaccounted for.',
];

function generateItem(): InspirationResult {
  const form      = pick(ITEM_FORMS);
  const property  = pick(ITEM_PROPERTIES);
  const addHist   = Math.random() < 0.45;
  const history   = addHist ? ` ${pick(ITEM_HISTORIES)}` : '';
  const formCapd  = form.charAt(0).toUpperCase() + form.slice(1);
  return {
    text:     `${formCapd} ${property}.${history}`,
    category: 'item',
    tags:     ['item', 'magic'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator class
// ─────────────────────────────────────────────────────────────────────────────

const GENERATORS: Record<InspirationCategory, () => InspirationResult> = {
  plot:      generatePlot,
  npc:       generateNpc,
  location:  generateLocation,
  encounter: generateEncounter,
  item:      generateItem,
};

const ALL_CATEGORIES: InspirationCategory[] = ['plot', 'npc', 'location', 'encounter', 'item'];

export class InspirationGenerator {
  // db and log kept in signature so the IPC handler can pass them without
  // needing to know they're unused — makes future DB integration a no-op change.
  constructor(_opts: { db?: unknown; log?: unknown } = {}) {}

  generate(params: GenerateParams): InspirationResult[] {
    const count    = Math.min(Math.max(params.count ?? 3, 1), 10);
    const category = params.category as InspirationCategory | undefined;

    if (category && GENERATORS[category]) {
      // Specific category requested — generate `count` from that category
      return Array.from({ length: count }, () => GENERATORS[category]());
    }

    // No category specified — distribute evenly across all categories,
    // randomly shuffled so the order feels organic
    const pool: InspirationCategory[] = [];
    for (let i = 0; pool.length < count; i++) {
      pool.push(ALL_CATEGORIES[i % ALL_CATEGORIES.length]);
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.map(cat => GENERATORS[cat]());
  }
}
