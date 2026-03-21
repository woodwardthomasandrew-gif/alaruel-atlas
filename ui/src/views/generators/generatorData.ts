// ui/src/views/generators/generatorData.ts
// All random generation tables — fully offline, no external dependencies.

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
export function roll(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─────────────────────────────────────────────────────────────────
// MAGIC ITEMS
// ─────────────────────────────────────────────────────────────────

const ITEM_TYPES = [
  'Sword','Dagger','Staff','Wand','Ring','Amulet','Cloak','Boots',
  'Gauntlets','Helm','Shield','Tome','Orb','Bow','Axe','Spear',
  'Bracers','Belt','Chalice','Mirror','Lantern','Horn','Quiver','Locket',
];

const ITEM_MATERIALS = [
  'obsidian','moonsilver','dragonbone','shadowglass','ironwood','starforged steel',
  'enchanted ivory','gilded mithril','runed amber','crystallised arcane essence',
  'ancient oak','void-touched iron','living coral','petrified lightning','bloodstone',
];

const ITEM_ADJECTIVES = [
  'Ancient','Cursed','Radiant','Whispering','Eternal','Forgotten','Blazing',
  'Shadowed','Hallowed','Dreadful','Gleaming','Frostbitten','Sundered','Voidborn',
  'Soulbound','Hungering','Celestial','Infernal','Storm-wrought','Tide-kissed',
];

const ITEM_SUFFIXES = [
  'of the Fallen King','of Eternal Night','of the Silver Dawn','of Shattered Realms',
  'of the Undying Flame','of Arcane Mastery','of the Drowned God','of Crimson Ruin',
  'of the Starless Void','of Thundering Peaks','of the Weeping Wood','of Lost Souls',
  'of the Iron Pact','of the Serpent Moon','of Sundered Fate',
];

const ITEM_RARITIES = ['Common','Uncommon','Rare','Very Rare','Legendary','Artifact'];

const ITEM_PROPERTIES = [
  'Glows faintly in the presence of undead.',
  'Hums softly when held by one of noble blood.',
  'Grows cold when danger is near.',
  'Leaves faint scorch marks on surfaces it touches.',
  'Whispers forgotten names at midnight.',
  'Cannot be seen by creatures with darkvision.',
  'Feels heavier each time it draws blood.',
  'Reflects the face of its previous owner.',
  'Vibrates violently in the presence of demons.',
  'Drains the warmth from any room it occupies.',
  'Causes flowers to wither and bloom in its wake.',
  'Projects a faint shadow shaped like a dragon.',
  'Tastes of copper when danger approaches.',
  'Smells of pine and ash.',
  'Makes no sound when it strikes.',
  'The metal shifts colour with the bearer\'s mood.',
  'Attracts small animals and birds.',
  'Causes nightmares when placed beneath a pillow.',
  'Grows warm in the presence of magic.',
  'Casts no reflection in mirrors.',
];

const ITEM_LORE = [
  'Forged during the Age of Broken Stars by a smith who sold his shadow for the craft.',
  'Said to have been wielded by the last Paladin of the Ember Order before the Great Purge.',
  'Recovered from the ruins of Vel\'Sharath, entombed alongside a nameless king.',
  'Commissioned by a lich who never returned to claim it.',
  'Blessed by three different gods — none of whom agreed to the terms.',
  'Found drifting in a sealed chest at the centre of a dead sea.',
  'Crafted from the remnants of a fallen celestial being.',
  'Won in a wager with a devil who immediately regretted the bet.',
  'The creation of twin artificers who later became each other\'s greatest enemies.',
  'Believed to carry the fragmented soul of its original creator.',
  'Once belonged to a thief who stole it from a dragon\'s hoard three times over.',
  'Rumoured to grow more powerful the longer it goes unused.',
  'Carried across seven kingdoms by a dying messenger who never revealed the recipient.',
  'Inscribed with a name no scholar has been able to translate.',
  'Every owner has eventually disappeared — the item always reappears elsewhere.',
];

const ITEM_ABILITIES = [
  'Once per day, the wielder may reroll any single die and must keep the new result.',
  'The bearer gains advantage on saves against fear while holding this item.',
  'On a critical hit, deals an additional 2d6 necrotic damage.',
  'The item can absorb one spell of 3rd level or lower per long rest.',
  'Grants the ability to speak with plants for 10 minutes per day.',
  'The wielder cannot be surprised while attuned.',
  'When bloodied, the item doubles its damage bonus until end of combat.',
  'Once per week, the item transports the bearer 30 feet in any direction as a reaction.',
  'Grants advantage on Persuasion checks when presented openly.',
  'The bearer gains resistance to cold damage.',
  'Allows the caster to communicate telepathically within 60 feet.',
  'Sheds bright light in a 10-foot radius; can be suppressed as a bonus action.',
  'Once per long rest, cast Detect Magic without expending a spell slot.',
  'Heals 1d4 hit points at the start of each of the bearer\'s turns in sunlight.',
  'Grants proficiency with one skill of the DM\'s choice upon attunement.',
];

const ITEM_CURSES = [
  'The bearer cannot willingly part with this item once attuned.',
  'Each dawn, the bearer loses one memory of a person they love.',
  'Draws the attention of a powerful entity who seeks its return.',
  'The bearer\'s hair turns bone-white within a week of attunement.',
  'Causes vivid, violent dreams that prevent restful sleep.',
  'The bearer becomes mute during every new moon.',
  'Every mirror the bearer looks into cracks.',
  'The bearer ages one year for every month they carry the item.',
  'Slowly replaces the bearer\'s shadow with one that does not mimic their movements.',
  'The item occasionally acts of its own accord at inopportune moments.',
];

export interface MagicItem {
  name: string;
  type: string;
  rarity: string;
  material: string;
  ability: string;
  property: string;
  lore: string;
  cursed: boolean;
  curse?: string;
}

export function generateMagicItem(options: {
  rarity?: string;
  type?: string;
  cursed?: boolean | 'random';
}): MagicItem {
  const type     = options.type     || pick(ITEM_TYPES);
  const rarity   = options.rarity   || pick(ITEM_RARITIES);
  const adj      = pick(ITEM_ADJECTIVES);
  const suffix   = Math.random() > 0.4 ? ` ${pick(ITEM_SUFFIXES)}` : '';
  const material = pick(ITEM_MATERIALS);
  const isCursed = options.cursed === 'random'
    ? Math.random() < 0.25
    : options.cursed ?? Math.random() < 0.25;

  return {
    name:     `${adj} ${type}${suffix}`,
    type,
    rarity,
    material,
    ability:  pick(ITEM_ABILITIES),
    property: pick(ITEM_PROPERTIES),
    lore:     pick(ITEM_LORE),
    cursed:   isCursed,
    curse:    isCursed ? pick(ITEM_CURSES) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────
// MONSTERS
// ─────────────────────────────────────────────────────────────────

const MONSTER_PREFIXES = [
  'Ancient','Corrupted','Hollow','Bloodfang','Ironhide','Void','Plagued',
  'Shadow','Bonecrown','Dread','Ashglass','Thornback','Feral','Crystalline','Wraithborn',
];

const MONSTER_TYPES = [
  'Drake','Golem','Wraith','Troll','Basilisk','Harpy','Sphinx','Manticore',
  'Wight','Shambler','Revenant','Lamia','Gorgon','Chimera','Behemoth',
  'Abomination','Lurker','Stalker','Fiend','Sentinel','Hydra','Colossus',
];

const MONSTER_TAGS = [
  'Undead','Beast','Aberration','Construct','Elemental','Fey','Fiend',
  'Giant','Humanoid','Monstrosity','Plant','Dragon','Celestial',
];

const MONSTER_ENVIRONMENTS = [
  'deep caves','ancient ruins','fetid swamps','frozen tundra','dense forests',
  'volcanic wastelands','sunken temples','storm-wracked coasts','blighted farmlands',
  'shadowed catacombs','planar rifts','cursed graveyards','enchanted wildernesses',
];

const MONSTER_SIZES = ['Tiny','Small','Medium','Large','Huge','Gargantuan'];

const MONSTER_ALIGNMENTS = [
  'Chaotic Evil','Neutral Evil','Lawful Evil',
  'Chaotic Neutral','True Neutral','Lawful Neutral',
  'Chaotic Good','Neutral Good','Lawful Good','Unaligned',
];

const MONSTER_CRS = ['1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10','12','14','16','18','20','22','24','30'];

const MONSTER_TRAITS = [
  'Regenerates 10 hit points at the start of each turn unless exposed to fire.',
  'Immune to poison and the poisoned condition.',
  'Can climb sheer surfaces without an ability check.',
  'Emits a blinding flash of light when reduced below half hit points.',
  'Resistant to nonmagical bludgeoning, piercing, and slashing damage.',
  'Can breathe both air and water.',
  'Tremorsense to 60 feet — detects movement through the ground.',
  'All attacks made against it while invisible have disadvantage.',
  'Upon death, explodes in a 15-foot burst of necrotic energy.',
  'Can communicate telepathically with any creature within 120 feet.',
  'Creatures that begin their turn within 10 feet must succeed a Constitution save or be poisoned.',
  'Pack Tactics — advantage on attack rolls when an ally is adjacent to the target.',
  'Cannot be charmed or frightened.',
  'Magic Resistance — advantage on saves against spells and magical effects.',
  'Swallow — on a critical hit, the target is swallowed and begins suffocating.',
];

const MONSTER_ATTACKS = [
  'Claw — reaches out with razor appendages, dealing slashing damage in a wide arc.',
  'Bite — snaps with powerful jaws, dealing piercing damage and grappling the target.',
  'Necrotic Breath — exhales a cone of soul-draining energy, dealing necrotic damage.',
  'Tail Sweep — sweeps its tail in a 10-foot radius, knocking creatures prone.',
  'Spectral Bolt — hurls a bolt of concentrated shadow energy, ignoring armour.',
  'Constrict — wraps around a target to crush them, dealing bludgeoning damage each turn.',
  'Spore Cloud — releases a 20-foot radius cloud of hallucinogenic spores.',
  'Stomp — crashes a massive limb down, dealing bludgeoning damage in a 5-foot radius.',
  'Life Drain — touch attack that drains life force, reducing maximum HP.',
  'Petrifying Gaze — targets that meet its eyes must save or begin to turn to stone.',
  'Howl — terrifying scream forces all creatures within 60 feet to make a Wisdom save.',
  'Corrupting Touch — melee attack that inflicts a random disease on a failed Con save.',
];

const MONSTER_LORE = [
  'Born from the nightmares of a dying god, this creature exists at the boundary of thought and flesh.',
  'Once a protector spirit, it was twisted by centuries of isolation and broken prayers.',
  'Scholars believe this creature is not a natural species but a magical experiment gone catastrophically wrong.',
  'Ancient texts describe it only as "The Thing That Waits" — no author who named it survived to explain further.',
  'Tribes in the region regard it as a divine punishment and leave offerings to dissuade its wrath.',
  'This creature is believed to be the last of its kind, hunted to near extinction by a vanished order of knights.',
  'It is said that those who stare into its eyes do not die — they simply stop being.',
  'Traders speak of entire caravans disappearing in territory this beast is known to inhabit.',
  'No two sightings have ever described it exactly the same way.',
  'The creature is drawn to grief — it can sense fresh mourning from miles away.',
];

export interface Monster {
  name: string;
  size: string;
  tag: string;
  cr: string;
  alignment: string;
  environment: string;
  hp: number;
  ac: number;
  traits: string[];
  attack: string;
  lore: string;
}

export function generateMonster(options: {
  cr?: string;
  size?: string;
  tag?: string;
}): Monster {
  const prefix = Math.random() > 0.35 ? `${pick(MONSTER_PREFIXES)} ` : '';
  const type   = pick(MONSTER_TYPES);
  const cr     = options.cr   || pick(MONSTER_CRS);
  const size   = options.size || pick(MONSTER_SIZES);
  const tag    = options.tag  || pick(MONSTER_TAGS);

  const crNum = parseFloat(cr.includes('/') ? cr.split('/')[0] : cr);
  const baseHp = Math.max(10, crNum * 15 + roll(10, 40));
  const baseAc = Math.min(22, Math.max(10, 10 + Math.floor(crNum / 3) + roll(0, 3)));

  return {
    name:        `${prefix}${type}`,
    size,
    tag,
    cr,
    alignment:   pick(MONSTER_ALIGNMENTS),
    environment: pick(MONSTER_ENVIRONMENTS),
    hp:          Math.round(baseHp),
    ac:          baseAc,
    traits:      pickN(MONSTER_TRAITS, roll(1, 3)),
    attack:      pick(MONSTER_ATTACKS),
    lore:        pick(MONSTER_LORE),
  };
}

// ─────────────────────────────────────────────────────────────────
// NPCs
// ─────────────────────────────────────────────────────────────────

const NPC_FIRST_NAMES_MALE = [
  'Aldric','Bastian','Caelan','Dorian','Emrys','Faolan','Gavric','Hadwin',
  'Idris','Jasper','Kern','Leoric','Maddox','Niall','Oswin','Percival',
  'Quillan','Rowan','Saren','Theron','Ulric','Vance','Wren','Xander','Yoren','Zephyr',
];
const NPC_FIRST_NAMES_FEMALE = [
  'Aelindra','Brenna','Caelith','Devara','Elspeth','Fiora','Gwyneth','Halla',
  'Isadora','Jessamine','Kira','Lirien','Mirella','Nessa','Orla','Petra',
  'Quill','Rosamund','Sable','Thalia','Urien','Vesper','Willa','Xara','Ysara','Zelara',
];
const NPC_LAST_NAMES = [
  'Ashveil','Blackthorn','Crestfall','Dunmore','Emberstone','Fairweather',
  'Greymantle','Holloway','Ironweld','Jadewood','Kessler','Langstrom',
  'Mordecai','Nighthollow','Orvyn','Pryce','Quellar','Ravenscar',
  'Silvertongue','Thorne','Underwick','Voss','Whitlock','Yarrow','Zoldar',
];

const NPC_RACES = [
  'Human','Elf','Half-Elf','Dwarf','Halfling','Gnome','Tiefling',
  'Dragonborn','Half-Orc','Aasimar','Tabaxi','Kenku','Firbolg','Goliath',
];

const NPC_OCCUPATIONS = [
  'Blacksmith','Tavern Keeper','Merchant','Herbalist','Sellsword','Thief',
  'Scribe','Healer','Priest','Guard','Scholar','Sailor','Farmer','Alchemist',
  'Bard','Hunter','Courtier','Spy','Gravedigger','Moneylender','Cartographer',
  'Arcanist','Knight','Harbourmaster','Innkeeper','Torturer','Fence','Pilgrim',
];

const NPC_PERSONALITIES = [
  'Gruff but secretly generous — will never admit to an act of kindness.',
  'Cheerful to a fault, masking profound grief they refuse to address.',
  'Deeply suspicious of strangers but fiercely loyal once trust is earned.',
  'Endlessly curious, asks questions before thinking about whether they should.',
  'Calculating and precise, treats every interaction as a negotiation.',
  'Recklessly brave, mistaking courage for wisdom.',
  'Quietly observant — says little, remembers everything.',
  'Overly formal and rigid, uncomfortable with anything outside routine.',
  'Charming and duplicitous — the smile never quite reaches the eyes.',
  'Melancholic philosopher, prone to long silences and sudden insights.',
  'Blustering blowhard hiding a paralysing fear of failure.',
  'Genuinely kind, but so naive about the world that it borders on dangerous.',
  'Obsessively religious — interprets every event through doctrine.',
  'Pragmatic to the point of cruelty — sees sentimentality as weakness.',
  'Haunted by a past action they have never confessed to anyone.',
];

const NPC_SECRETS = [
  'Owes a life debt to a criminal organisation and quietly funnels them information.',
  'Is the illegitimate child of a powerful noble who pays to keep them silent.',
  'Once committed a crime they have never been caught for — and would do it again.',
  'Is dying, and has only a few months left — no one knows.',
  'Worships a banned deity in secret.',
  'Has been replaced by a doppelganger. The original is alive, imprisoned.',
  'Knows the location of something extraordinarily valuable and is terrified of it.',
  'Has been feeding false information to multiple factions simultaneously.',
  'Is a deserter from a war that most people believe was won justly.',
  'Secretly supports the opposing side of the current political conflict.',
  'Murdered someone years ago and has built their entire life on top of the lie.',
  'Is being blackmailed and has been for years.',
  'Possesses a forbidden magical ability they have never revealed to anyone.',
  'Is searching for a person they wronged and have never found.',
  'Has been cursed and conceals the effects through great effort and discomfort.',
];

const NPC_QUIRKS = [
  'Refuses to make direct eye contact — always looks slightly to the side.',
  'Taps their fingers on any surface when thinking.',
  'Compulsively straightens objects that are crooked.',
  'Uses archaic words that no one quite understands.',
  'Always carries a specific object and grows visibly anxious if it goes missing.',
  'Laughs at inappropriate moments, then immediately corrects themselves.',
  'Never uses the word "death" — replaces it with various euphemisms.',
  'Smells unexpectedly pleasant — like rain, pine, or fresh bread.',
  'Frequently misquotes famous sayings and doesn\'t realise it.',
  'Talks to themselves under their breath when thinking.',
  'Always has a small amount of food on their person.',
  'Bows or curtsies to absolutely everyone regardless of station.',
  'Has a pronounced accent from a region far from where they claim to be from.',
  'Refers to themselves in the third person when under stress.',
  'Fiddles with a ring on their finger — one they deny having any attachment to.',
];

const NPC_GOALS = [
  'Recover something stolen from them years ago.',
  'Provide a better life for a family member who depends on them.',
  'Earn enough to leave this city and never return.',
  'Uncover the truth behind a death that was ruled an accident.',
  'Earn the respect of someone who has always looked down on them.',
  'Complete a pilgrimage they have been putting off for a decade.',
  'Pay off a debt before the consequences of not doing so arrive.',
  'Find a cure for an affliction affecting someone they love.',
  'Destroy something they helped create.',
  'Prove their worth to an organisation that rejected them.',
  'Survive long enough to see justice served.',
  'Find somewhere they can finally stop running.',
];

export interface NPC {
  name: string;
  gender: string;
  race: string;
  age: number;
  occupation: string;
  personality: string;
  secret: string;
  quirk: string;
  goal: string;
}

export function generateNPC(options: {
  race?: string;
  gender?: string;
  occupation?: string;
}): NPC {
  const gender     = options.gender     || pick(['Male','Female','Non-binary']);
  const race       = options.race       || pick(NPC_RACES);
  const occupation = options.occupation || pick(NPC_OCCUPATIONS);

  const firstName = gender === 'Female'
    ? pick(NPC_FIRST_NAMES_FEMALE)
    : pick(NPC_FIRST_NAMES_MALE);
  const lastName = Math.random() > 0.3 ? ` ${pick(NPC_LAST_NAMES)}` : '';

  return {
    name:        `${firstName}${lastName}`,
    gender,
    race,
    age:         roll(18, 75),
    occupation,
    personality: pick(NPC_PERSONALITIES),
    secret:      pick(NPC_SECRETS),
    quirk:       pick(NPC_QUIRKS),
    goal:        pick(NPC_GOALS),
  };
}

// ─────────────────────────────────────────────────────────────────
// SETTLEMENTS
// ─────────────────────────────────────────────────────────────────

const SETTLEMENT_PREFIXES = [
  'Ash','Black','Crow','Dark','Ember','Frost','Grey','Hollow','Iron',
  'Mire','Old','Raven','Salt','Shadow','Silver','Stone','Storm','Thorn',
  'White','Wraith','Amber','Bone','Dusk','Gilded','Mossy',
];

const SETTLEMENT_SUFFIXES = [
  'haven','bridge','ford','gate','hold','keep','mere','moor','port',
  'reach','rest','stead','vale','wall','watch','well','wick','wood',
  'crossing','falls','hollow','ridge','tor','bay','fields',
];

const SETTLEMENT_TYPES = ['Hamlet','Village','Town','City','Fortress City','Trade Port','Ruins','Outpost','Monastery'];

const SETTLEMENT_POPULATIONS: Record<string, string> = {
  'Hamlet':        '20–80',
  'Village':       '80–500',
  'Town':          '500–5,000',
  'City':          '5,000–25,000',
  'Fortress City': '10,000–50,000',
  'Trade Port':    '3,000–20,000',
  'Ruins':         '0 (abandoned)',
  'Outpost':       '10–100',
  'Monastery':     '20–200',
};

const SETTLEMENT_GOVERNMENTS = [
  'Hereditary Lord','Elected Council','Theocracy','Thieves\' Guild (shadow rule)',
  'Military Junta','Merchant Consortium','Ancient Bloodline','Arcane Order',
  'No formal government','Foreign Occupation','Tribal Chieftain','Democratic Assembly',
];

const SETTLEMENT_BIOMES = [
  'rolling farmland','dense old-growth forest','rocky coastal cliffs','windswept moorland',
  'arid desert fringe','alpine mountain pass','lush river delta','volcanic highland',
  'misty marshland','sun-scorched savannah','frozen northern tundra','underground cavern network',
];

const SETTLEMENT_NOTABLE_LOCATIONS = [
  'A crumbling watchtower that predates the settlement by centuries.',
  'An unusually large and well-funded library, source of local pride.',
  'A black market that operates behind a legitimate dyer\'s guild.',
  'A temple to a forgotten deity that the locals still maintain out of habit.',
  'A crossroads inn of dubious reputation known across three provinces.',
  'An overgrown arena used for festivals — and occasional, illegal, bloodsport.',
  'A guild hall controlled by a secretive artificers\' brotherhood.',
  'An underground network of cisterns rumoured to contain something ancient.',
  'A graveyard with one tomb that locals refuse to approach after dark.',
  'A lighthouse whose keeper has not been seen in weeks.',
  'A massive forge that has burned continuously for two hundred years.',
  'A harbour master\'s office with maps of coastlines that don\'t exist.',
];

const SETTLEMENT_PROBLEMS = [
  'A series of disappearances that the authorities insist are unrelated.',
  'Tensions between two factions that are days from open violence.',
  'A monster has taken up residence in the surrounding wilderness, cutting off supply routes.',
  'A plague is spreading through the lower district with no cure in sight.',
  'The water supply has been contaminated, and no one agrees on why.',
  'A charismatic figure is stirring the common folk toward dangerous ideas.',
  'Taxes have been raised to an unsustainable level — people are leaving.',
  'Something is poisoning livestock and farmland in a widening circle.',
  'A corrupt official controls access to the one resource everyone needs.',
  'Refugees are flooding in from a nearby disaster the settlement cannot absorb.',
  'Ancient wards beneath the settlement have begun to fail.',
  'A feud between two prominent families has paralysed local politics.',
];

const SETTLEMENT_ATMOSPHERES = [
  'There is a festive air — a seasonal celebration draws visitors from far and wide.',
  'A palpable tension hangs in the air, as though everyone is waiting for something to go wrong.',
  'The settlement feels eerily quiet for its size. Windows are shuttered early.',
  'Bustling commerce masks deeper divisions; smiles are traded, not meant.',
  'A proud, self-sufficient community — outsiders are tolerated, rarely welcomed.',
  'The place feels forgotten by the wider world, and most residents prefer it that way.',
  'Recent prosperity has brought rapid growth — and the chaos that comes with it.',
  'The settlement clings to old traditions. Change is viewed with open suspicion.',
  'Sailors, merchants, and travellers give everything here a transient, temporary feeling.',
  'Hardship has forged a grim solidarity. These people have endured much, together.',
];

const SETTLEMENT_RUMOURS = [
  'The lord hasn\'t been seen in public for three weeks and the guards won\'t explain why.',
  'A fortune in coin was found buried beneath a merchant\'s cellar. The merchant is now missing.',
  'Two different people claim to have seen a ghost in the market square at noon.',
  'A traveling scholar offered outrageous sums for something the locals won\'t name.',
  'The river has been running slightly the wrong colour for a fortnight.',
  'Someone has been posting anonymous notices accusing the constable of murder.',
  'A child spoke a name in their sleep — a name inscribed on a tomb in the old graveyard.',
  'Ships have stopped making port. The last captain ashore refused to say why.',
  'The temple bells ring at hours when no one is inside.',
  'A map was found in the ruins outside town that shows buildings that don\'t exist yet.',
];

export interface Settlement {
  name: string;
  type: string;
  population: string;
  government: string;
  biome: string;
  notableLocation: string;
  problem: string;
  atmosphere: string;
  rumour: string;
}

export function generateSettlement(options: {
  type?: string;
}): Settlement {
  const type = options.type || pick(SETTLEMENT_TYPES);
  const prefix = pick(SETTLEMENT_PREFIXES);
  const suffix = pick(SETTLEMENT_SUFFIXES);

  return {
    name:            `${prefix}${suffix}`,
    type,
    population:      SETTLEMENT_POPULATIONS[type] ?? 'Unknown',
    government:      pick(SETTLEMENT_GOVERNMENTS),
    biome:           pick(SETTLEMENT_BIOMES),
    notableLocation: pick(SETTLEMENT_NOTABLE_LOCATIONS),
    problem:         pick(SETTLEMENT_PROBLEMS),
    atmosphere:      pick(SETTLEMENT_ATMOSPHERES),
    rumour:          pick(SETTLEMENT_RUMOURS),
  };
}
