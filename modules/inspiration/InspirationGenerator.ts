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
  | 'item'
  | 'name'
  | 'image';

export interface InspirationResult {
  text:        string;
  category:    InspirationCategory;
  tags:        string[];
  /** Present only when category === 'image'. The atlas:// URL for the asset. */
  imageUrl?:   string;
  /** CSS filter string to apply to the image (random, pre-computed). */
  imageFilter?: string;
}

export interface GenerateParams {
  campaignId: string;
  category?:  InspirationCategory;
  count?:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Image filters — applied randomly to asset images
// ─────────────────────────────────────────────────────────────────────────────

export const IMAGE_FILTERS: ReadonlyArray<{ name: string; css: string }> = [
  { name: 'arcane',    css: 'hue-rotate(240deg) saturate(1.8) brightness(0.85)' },
  { name: 'crimson',   css: 'hue-rotate(300deg) saturate(2.0) brightness(0.9)' },
  { name: 'verdant',   css: 'hue-rotate(90deg)  saturate(1.6) brightness(0.88)' },
  { name: 'golden',    css: 'sepia(0.6) saturate(1.8) brightness(1.05)' },
  { name: 'spectral',  css: 'grayscale(0.6) brightness(1.1) contrast(1.15)' },
  { name: 'shadow',    css: 'brightness(0.55) contrast(1.3) saturate(0.7)' },
  { name: 'frost',     css: 'hue-rotate(180deg) saturate(1.4) brightness(1.1)' },
  { name: 'infernal',  css: 'hue-rotate(15deg) saturate(2.2) brightness(0.8) contrast(1.2)' },
  { name: 'ethereal',  css: 'brightness(1.15) saturate(0.5) contrast(0.9)' },
  { name: 'cursed',    css: 'invert(0.15) hue-rotate(200deg) saturate(1.5) brightness(0.8)' },
  { name: 'divine',    css: 'sepia(0.3) brightness(1.2) saturate(1.3) contrast(0.95)' },
  { name: 'voidborn',  css: 'grayscale(0.9) brightness(0.6) contrast(1.4)' },
  { name: 'none',      css: '' },
];

export function pickRandomFilter(): { name: string; css: string } {
  const arr = IMAGE_FILTERS as Array<{ name: string; css: string }>;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  'a deposed chancellor', 'a lighthouse keeper', 'a clockmaker with no customers',
  'a sealed tomb', 'a reformed assassin', 'a village with no children',
  'a shipwrecked noble', 'an anonymous benefactor', 'a wandering executioner',
  'a library that rearranges itself', 'a census that lists people not yet born',
  'a healer who cannot be healed', 'a soldier still fighting a war long over',
  'a door that opens onto different rooms each time', 'an exiled prince in disguise',
  'a mountain that has started to move', 'a festival no one remembers starting',
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
  'has not aged a single day in forty years',
  'is searching for someone who does not want to be found',
  'has been given an impossible choice with no right answer',
  'disappeared once before and came back changed',
  'is collecting something no one understands the purpose of',
  'has hired the party under a false name',
  'was meant to be dead — and knows it',
  'is protecting something that should not exist',
  'speaks of a coming event everyone else dismisses',
  'leaves no footprints',
  'is the only survivor of something they refuse to describe',
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
  'The thing they were sent to destroy is the only thing keeping something worse at bay.',
  'The person giving the orders is the one who created the problem.',
  'It has already happened once before.',
  'The solution requires a sacrifice no one anticipated.',
  'Everyone in the town already knows — and has chosen silence.',
];

function generatePlot(): InspirationResult {
  const subject      = pick(PLOT_SUBJECTS);
  const complication = pick(PLOT_COMPLICATIONS);
  const addTwist     = Math.random() < 0.45;
  const twist        = addTwist ? ` ${pick(PLOT_TWISTS)}` : '';
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
  'siege engineer', 'debt collector', 'forger', 'failed alchemist', 'animal trainer',
  'tooth-puller', 'chandler', 'spy posing as a merchant', 'refugee scholar',
  'disbarred magistrate', 'undertaker', 'tattooist', 'pardoned pirate',
  'blind cartomancer', 'travelling surgeon', 'toll collector', 'arena champion',
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
  'finishes other people\'s sentences — always incorrectly',
  'refuses to sit with their back to a door',
  'keeps a list of everyone they\'ve ever met',
  'laughs at the wrong moments',
  'eats extremely slowly and watches everyone while they do',
  'always knows the exact time without checking',
  'moves through crowds without touching anyone',
  'writes everything down immediately after it is said',
  'pauses for just a moment too long before answering any question',
  'has a scar they will not explain and do not acknowledge',
  'sleeps in short bursts and seems to require very little of it',
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
  'They are dying and have told no one.',
  'They were present the night everything went wrong.',
  'They have been taking orders from someone the party would recognise.',
  'They are not entirely human — or were not always.',
  'They have done this before, in another city, under another name.',
  'They remember the party from a meeting that hasn\'t happened yet.',
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
  'needs to find something before someone else does',
  'is trying to outlive a prophecy made about them',
  'is collecting information they haven\'t decided how to use yet',
  'wants to die doing something that mattered',
  'is trying to return to a place they were banished from',
  'is building toward something no one else can see yet',
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
  'a town built around a giant sealed door', 'an underground river port',
  'a fortress abandoned mid-construction', 'a forest of petrified trees',
  'a canal city where no one uses the roads', 'a cliff village accessible only by rope',
  'a desert oasis with heavily armed guards', 'a tower that leans but never falls',
  'a buried colosseum still in use', 'a village that relocated once and stopped half-way',
  'a tide-locked causeway settlement', 'a mountain pass with a permanent camp',
  'a city built on top of a much older city', 'an observatory no one maintains',
  'a port where the ships never leave full', 'a valley where sound behaves strangely',
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
  'where the shadows point in the wrong direction',
  'that smells of the sea despite being landlocked',
  'where everyone speaks as if they are being overheard',
  'that is always ten degrees colder than the surrounding area',
  'where the locals make a point of never looking up',
  'that feels like it is being watched from somewhere high above',
  'where the children are unusually quiet and unusually observant',
  'that appears different on the way in than it does on the way out',
  'where all the clocks stopped at the same moment',
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
  'The locals are preparing for something they will not name.',
  'There is only one way in — and someone is watching it.',
  'It has a second entrance no one is supposed to know about.',
  'Something beneath it is waking up.',
  'It changes — subtly, slowly — each time the party passes through.',
  'The last person in charge left in a hurry and left everything behind.',
];

function generateLocation(): InspirationResult {
  const type     = pick(LOC_TYPES);
  const atmos    = pick(LOC_ATMOSPHERE);
  const addHook  = Math.random() < 0.5;
  const hook     = addHook ? ` ${pick(LOC_HOOKS)}` : '';
  const typeCapd = type.charAt(0).toUpperCase() + type.slice(1);
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
  'A funeral procession is being followed at a distance by a second, silent group',
  'Someone is loudly and publicly accusing the wrong person of the right crime',
  'A trade ship has arrived carrying only one survivor and no cargo',
  'An old battlefield is being excavated — the workers have stopped and will not say why',
  'A very calm person is trying to give away everything they own',
  'Two groups are racing toward the same location for different reasons',
  'A heavily guarded cart is travelling with no markings and no explanation',
  'The inn is full — every room taken by strangers who arrived on the same night',
  'A performer in the market square is describing real events that haven\'t happened yet',
  'Someone has put a price on a name — and that name belongs to someone the party knows',
  'A gate that was sealed for a generation has been opened from the inside',
  'A local official is behaving as if they have been replaced very recently',
  'The party is recognised by someone who couldn\'t possibly know them',
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
  'The most dangerous person in the scene is the quietest one.',
  'Someone here is waiting for the party specifically.',
  'The right answer requires doing something that looks very wrong.',
  'Two entirely separate crises have converged on the same moment.',
  'Everyone present already knows how this ends — except the party.',
];

function generateEncounter(): InspirationResult {
  const setup           = pick(ENC_SETUPS);
  const addComplication = Math.random() < 0.55;
  const comp            = addComplication ? ` ${pick(ENC_COMPLICATIONS)}` : '';
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
  'a wax seal stamp', 'a folded piece of cloth', 'a pewter inkwell',
  'a wooden bird', 'a length of red cord with thirteen knots',
  'a pair of spectacles with black lenses', 'a stone that is always warm',
  'a playing card that keeps returning', 'a small portrait of a stranger',
  'a copper bell that makes no sound', 'a ring of braided hair',
  'a flask that refills with a different liquid each morning',
  'a map with one location marked and the rest blank',
  'a coat that never gets wet', 'a candle that burns without diminishing',
  'a lock with no keyhole', 'an ear carved from dark wood',
  'a leather journal that erases itself after being read',
  'a pair of dice that always land on the same result',
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
  'that attracts small animals that sit nearby and watch',
  'that makes its bearer\'s dreams unusually coherent and detailed',
  'that breaks and repairs itself on a cycle no one has charted',
  'that shows its true form only to children',
  'that is heavier than it looks by exactly as much as it needs to be',
  'that causes nearby flames to lean toward it',
  'that was clearly made for a hand with six fingers',
  'that is always found pointing the same direction when set down',
  'that no one can describe accurately from memory',
  'that leaves a faint impression in the shape of a key',
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
  'It was used as payment for something that was never delivered.',
  'It was buried with someone — and that grave is now empty.',
  'Two different scholars have written conflicting accounts of what it does.',
  'It has been stolen from the same family three generations running.',
  'It was recovered from somewhere it had no reason to be.',
  'The maker\'s mark belongs to a craftsperson who died before it could have been made.',
];

function generateItem(): InspirationResult {
  const form     = pick(ITEM_FORMS);
  const property = pick(ITEM_PROPERTIES);
  const addHist  = Math.random() < 0.45;
  const history  = addHist ? ` ${pick(ITEM_HISTORIES)}` : '';
  const formCapd = form.charAt(0).toUpperCase() + form.slice(1);
  return {
    text:     `${formCapd} ${property}.${history}`,
    category: 'item',
    tags:     ['item', 'magic'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tables — Fantasy Names
// ─────────────────────────────────────────────────────────────────────────────

const NAME_PREFIXES = [
  'Ael', 'Aer', 'Al', 'Ar', 'Bael', 'Bel', 'Cae', 'Cal', 'Cor', 'Dae', 'Dar',
  'Eld', 'El', 'Faer', 'Fen', 'Gal', 'Hal', 'Iri', 'Is', 'Jar', 'Kael', 'Kel',
  'Lae', 'Lor', 'Mae', 'Mal', 'Mor', 'Nae', 'Nar', 'Or', 'Per', 'Quor', 'Rae',
  'Sar', 'Sel', 'Tal', 'Ther', 'Uri', 'Val', 'Var', 'Vor', 'Wyn', 'Xan', 'Yor',
  'Zar',
];

const NAME_MIDDLES = [
  'a', 'ae', 'ai', 'al', 'an', 'ar', 'e', 'ea', 'el', 'en', 'er', 'i', 'ia',
  'il', 'in', 'ir', 'o', 'oa', 'ol', 'on', 'or', 'u', 'ul', 'un', 'ur', 'y',
];

const NAME_SUFFIXES = [
  'anor', 'aris', 'ath', 'ael', 'bor', 'driel', 'dan', 'dorn', 'dris', 'eth',
  'eros', 'ian', 'ira', 'is', 'ion', 'ius', 'lith', 'lor', 'lyn', 'mir',
  'mond', 'nar', 'nor', 'or', 'orin', 'ra', 'rion', 'ric', 'ros', 'sar',
  'seth', 'thas', 'thir', 'thus', 'tor', 'vyr', 'wyn', 'xis', 'yra', 'zor',
];

const NAME_TITLES = [
  'Ashborne', 'Blackbriar', 'Brightwater', 'Dawncrest', 'Duskwhisper',
  'Emberfall', 'Farsong', 'Frostvein', 'Gloamward', 'Goldthorn', 'Greyhollow',
  'Ironveil', 'Moonvale', 'Nightbloom', 'Ravenmark', 'Rimewatch', 'Runeweaver',
  'Silverfen', 'Stormcaller', 'Thornmere', 'Umberfield', 'Valeborn',
  'Whisperwind', 'Wolfward',
];

function generateName(): InspirationResult {
  const addMiddle = Math.random() < 0.35;
  const givenName = `${pick(NAME_PREFIXES)}${addMiddle ? pick(NAME_MIDDLES) : ''}${pick(NAME_SUFFIXES)}`;
  const useTitle = Math.random() < 0.55;
  return {
    text:     useTitle ? `${givenName} ${pick(NAME_TITLES)}` : givenName,
    category: 'name',
    tags:     ['name', 'fantasy'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Image — placeholder (real images come via IPC from the asset list)
// ─────────────────────────────────────────────────────────────────────────────

function generateImagePlaceholder(): InspirationResult {
  return {
    text:     'No image assets found. Import maps or portraits to see them here.',
    category: 'image',
    tags:     ['image'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator class
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_GENERATORS: Record<Exclude<InspirationCategory, 'image'>, () => InspirationResult> = {
  plot:      generatePlot,
  npc:       generateNpc,
  location:  generateLocation,
  encounter: generateEncounter,
  item:      generateItem,
  name:      generateName,
};

const ALL_TEXT_CATEGORIES: Exclude<InspirationCategory, 'image'>[] =
  ['plot', 'npc', 'location', 'encounter', 'item', 'name'];

export class InspirationGenerator {
  constructor(_opts: { db?: unknown; log?: unknown } = {}) {}

  generate(params: GenerateParams): InspirationResult[] {
    const count    = Math.min(Math.max(params.count ?? 3, 1), 10);
    const category = params.category as InspirationCategory | undefined;

    // Image category is handled externally (IPC resolves the asset URL),
    // but we keep the placeholder path in case someone calls it directly.
    if (category === 'image') {
      return Array.from({ length: count }, () => generateImagePlaceholder());
    }

    if (category && TEXT_GENERATORS[category as Exclude<InspirationCategory, 'image'>]) {
      return Array.from(
        { length: count },
        () => TEXT_GENERATORS[category as Exclude<InspirationCategory, 'image'>](),
      );
    }

    const pool: Exclude<InspirationCategory, 'image'>[] = [];
    for (let i = 0; pool.length < count; i++) {
      pool.push(ALL_TEXT_CATEGORIES[i % ALL_TEXT_CATEGORIES.length]);
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.map(cat => TEXT_GENERATORS[cat]());
  }
}
