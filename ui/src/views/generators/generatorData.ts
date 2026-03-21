// ui/src/views/generators/generatorData.ts
// All random generation tables — fully offline, no external dependencies.
// Flavoured for the world of Alaruel and its surrounding regions.

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
  'Siege Club','Chargepack','Sidearm','Firearm','Sending Stone','Soul Vial',
  // Realm of Alaruel additions
  'Leviton Transit Crystal','AG-Unit Core Fragment','Unity Inquisitor Seal','House Delaque Cipher Key',
  'Warclan Thule Trophy Weapon','Cochumat Crystal Focus','Ambersoul Cathedral Relic','ATC Cargo Brand',
  'Department of War Field Kit','Moon Rat Cogitator Device','Cahill Deep-Mine Lantern','Beeford Mead Flask (enchanted)',
  // Generic fantasy additions
  'Mace','Flail','Rapier','Scimitar','Halberd','Trident','Sling','Crossbow',
  'Buckler','Greatsword','Glaive','Whip','Shortbow','Handaxe','Quarterstaff',
  'Brooch','Crown','Sceptre','Talisman','Rune Stone','Scroll Case',
  'Compass','Hourglass','Candle','Vial','Pouch','Rope','Coin Pouch',
  'Pauldron','Gorget','Sabatons','Mantle','Tabard','Circlet','Flask',
];

const ITEM_MATERIALS = [
  'obsidian','moonsilver','dragonbone','shadowglass','ironwood','starforged steel',
  'enchanted ivory','gilded mithril','runed AmberSoul crystal','crystallised Far Realm essence',
  'ancient oak from the Cochumat jungle','void-touched iron','living coral','petrified lightning',
  'soul-steel','House Cahill mined deepstone','salt-fused volcanic rock from the Saltfire Flats',
  'resin-hardened rootwood','Unity-consecrated bone','Conglomerate-forged arcane alloy',
  // Realm of Alaruel additions
  'House Cahill mined black granite','Leviton levitation crystal lattice','Immortal Oak heartwood',
  'Cochumat jungle ironwood (crystal-laced)','Formene elven-cast silver','Warclan Thule giant-bone',
  'Chogrove salvage-iron','Tenebrous Fen bog-iron (corroded but dense)',
  'Moon Rat precision-machined brass','White Reaper Barony vampire-tempered steel',
  // Generic fantasy additions
  'cold iron','witch-silver','basilisk hide','phoenix feather-bound oak','sea-glass',
  'thunderstruck copper','runite','wyvern scale','black pearl','angel bone',
  'cursed amber','meteor fragment','elder wood','deepstone','serpent fang',
  'orichalcum','runed granite','carved whale ivory','sun-tempered bronze','grave-iron',
  'foxfire crystal','storm-touched silver','fell oak','giant\'s tooth','sphinx horn',
];

const ITEM_ADJECTIVES = [
  'Ancient','Cursed','Radiant','Whispering','Eternal','Forgotten','Blazing',
  'Shadowed','Hallowed','Dreadful','Gleaming','Frostbitten','Sundered','Voidborn',
  'Soulbound','Hungering','Celestial','Infernal','Storm-wrought','Tide-kissed',
  'Unity-marked','Far-touched','Corrupted','Purified','Conglomerate-issued',
  'ATC-branded','Soul-Steel','AmberSoul','Brine-kissed','Root-blessed',
  // Realm of Alaruel additions
  'Leviton-issued','Cahill-forged','Society-marked','Warclan-tempered','Formene-crafted',
  'Idol-touched','Carnivora-scaled','Thule-war-scarred','Delaque-traced','Selene-aligned',
  // Generic fantasy additions
  'Rusted','Undying','Eldritch','Forsaken','Gilded','Obsidian','Ivory',
  'Spectral','Desolate','Thunderous','Arcane','Savage','Iron','Verdant',
  'Ashen','Bloodied','Hollow','Timeworn','Shrouded','Burning','Frozen',
  'Vengeful','Wandering','Laughing','Silent','Broken','Serene','Terrible',
  'Wailing','Gleaming','Mournful','Blessed','Wretched','Indomitable','Pale',
];

const ITEM_SUFFIXES = [
  'of the Fallen Unity','of Eternal Night','of the Silver Dawn','of Shattered Realms',
  'of the Undying Flame','of Arcane Mastery','of the Drowned God','of Crimson Ruin',
  'of the Starless Void','of Thundering Peaks','of the Weeping Wood','of Lost Souls',
  'of the Iron Pact','of the Serpent Moon','of Sundered Fate',
  'of the House Cahill Mines','of Evening Glory','of the Shattered Spire',
  'of the Ambersoul Network','of King Thule\'s Wrath','of the Broken Seal',
  'of the Root Father','of the Far Realm','of the Vigilant','of the Seraph\'s Wake',
  'of the Saltfire Tyrant','of the ATC Charter','of the Department of War',
];

const ITEM_RARITIES = ['Common','Uncommon','Rare','Very Rare','Legendary','Artifact'];

const ITEM_PROPERTIES = [
  'Glows faintly AmberSoul gold in the presence of Far Realm corruption.',
  'Hums softly when held by one attuned to soul-steel.',
  'Grows cold when undead are within sixty feet.',
  'Leaves faint scorch marks of salt wherever it rests.',
  'Whispers in Deep Speech at midnight — the words are never the same twice.',
  'Cannot be seen by creatures with a connection to the Far Realm.',
  'Feels heavier each time it is used to draw blood.',
  'Reflects the face of whoever last died holding it.',
  'Vibrates violently in the presence of active Unity sigils.',
  'Drains the warmth from any room it occupies, as if something watches from within.',
  'Causes flowers from the Cochumat jungle to wither and bloom in its wake.',
  'Projects a faint shadow shaped like the Ambersoul spire.',
  'Tastes of copper and ozone when a Far Realm rift is near.',
  'Smells of pine, ash, and old blood — the scent of the Warclans.',
  'Makes no sound when it strikes, as though the world holds its breath.',
  'The metal shifts colour with the bearer\'s proximity to crystal corruption.',
  'Attracts ravens and carrion birds when left unattended.',
  'Causes vivid dreams of the Island of Merciless Horror when placed nearby during sleep.',
  'Grows warm in the presence of active AmberSoul deposits.',
  'Casts no reflection in mirrors — and neither does whoever carries it.',
];

const ITEM_LORE = [
  'Forged during the Age of the Unity\'s rise by a smith who traded his soul for the craft. The Unity claimed the blade; a thief claimed it from them.',
  'Said to have been wielded by a Paladin of the 9 Vigils who held a mountain pass alone against three of Brom Thule\'s giants. The pass still bears the name.',
  'Recovered from the ruins of Ambersoul, entombed beneath the grand cathedral spire alongside a nameless priest who chose not to flee.',
  'Commissioned by the Alaruel Trading Company for a senior factor who never returned from the Island of Merciless Horror.',
  'Blessed by three competing deities — Evening Glory, a god of war, and something from the Far Realm. None of them agreed to the terms.',
  'Found drifting in a sealed ATC crate at the centre of Lake Aldale after the crash. The manifest listed it as mining equipment.',
  'Crafted from the remnants of a Seraph\'s armour, melted down and reforged by a smith who claimed to hear its old owner still speaking through the metal.',
  'Won in a wager with a devil whose name was later found carved inside the grip in letters too small to read without a lens.',
  'The creation of twin artificers employed by the Conglomerate who later disappeared from their workshop without explanation.',
  'Believed to carry the fragmented soul of a Department of War experiment gone wrong. The soul does not know it is dead.',
  'Once belonged to a Chogrove pirate who stole it from an ATC vault three times — the third time it was waiting for them.',
  'Rumoured to grow more powerful the longer it goes unused. The Conglomerate has been holding it in a vault for forty years.',
  'Carried across seven kingdoms by a dying Unity courier who never revealed the intended recipient. The message it carried was burned.',
  'Inscribed with a name no Alaruel scholar has been able to translate — though the Psychic Academy believes it is a Far Realm designation.',
  'Every owner has eventually disappeared. The item always resurfaces in Chogrove, offered cheaply by a merchant who claims to have no idea where it came from.',
];

const ITEM_ABILITIES = [
  'Once per day, the wielder may reroll any single die and must keep the new result.',
  'The bearer gains advantage on saves against Far Realm corruption effects while holding this item.',
  'On a critical hit, deals an additional 2d6 necrotic damage as soul-steel resonates through the wound.',
  'The item can absorb one spell of 3rd level or lower per long rest, storing it within its AmberSoul core.',
  'Grants the ability to sense AmberSoul deposits and Far Realm rifts within 60 feet.',
  'The wielder cannot be surprised while attuned, as the item whispers warnings in Deep Speech.',
  'When the bearer drops below half hit points, the item doubles its damage bonus until end of combat.',
  'Once per week, the item transports the bearer 30 feet in any direction as a reaction, leaving a brief afterimage of AmberSoul light.',
  'Grants advantage on Persuasion checks when negotiating with ATC factors, Conglomerate agents, or members of The Society.',
  'The bearer gains resistance to the damage type most recently dealt to them by a Far Realm creature.',
  'Allows the bearer to communicate telepathically with any soul-steel construct within 60 feet.',
  'Sheds dim AmberSoul light in a 10-foot radius; can be suppressed as a bonus action.',
  'Once per long rest, cast Detect Magic without expending a spell slot — Far Realm energy registers as a distinct and deeply uncomfortable hue.',
  'Heals 1d4 hit points at the start of each of the bearer\'s turns when within 30 feet of an active AmberSoul deposit.',
  'Grants proficiency with navigator\'s tools and advantage on checks to pilot or repair an ATC airship.',
];

const ITEM_CURSES = [
  'The bearer cannot willingly part with this item once attuned — and begins to hear it speak in their own voice.',
  'Each dawn, the bearer loses one memory of a person they trust. The memory is not gone — something else has it now.',
  'Draws the attention of a Department of War retrieval agent who believes the item is classified property.',
  'The bearer\'s eyes shift to a faint AmberSoul gold within a week of attunement. Locals in Alaruel know what that means.',
  'Causes vivid dreams of the Far Realm that prevent restful sleep — specifically, of something vast looking back.',
  'The bearer becomes mute during every new moon. Notes left during these periods are written in a language they do not know.',
  'Every mirror the bearer looks into shows the reflection of Ambersoul as it was the night of the Unity\'s ritual.',
  'The bearer ages one year for every month they carry the item. The ATC records suggest it has had many owners.',
  'Slowly replaces the bearer\'s shadow with one that moves toward the nearest Far Realm rift rather than following them.',
  'The item occasionally attempts to complete Unity rituals of its own accord at deeply inopportune moments.',
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
  'AmberSoul','Root-touched','Far-warped','Unity-raised','Brine-scaled',
  'Salt-crusted','Soul-steel','Storm-giant','Warclan','Hive-marked',
  // Realm of Alaruel additions
  'Cahill-deep','Idol-touched','Leviton-fused','Delaque-contracted','Thule-bred',
  'Formene-exiled','Selene-marked','Chogrove-salvaged','Carnivora-blooded','Cochumat-crystal',
  // Generic fantasy additions
  'Rotting','Gibbering','Iron','Grave','Ember','Frost','Blighted','Withered',
  'Monstrous','Accursed','Fell','Ruinous','Forsaken','Nightborn','Spectral',
  'Elder','Hungering','Bleeding','Titan','Scarred','Blind','Wretched','Rabid',
  'Undying','Twin-headed','Gilded','Pale','Stormcrown','Dread','Howling',
];

const MONSTER_TYPES = [
  'Drake','Golem','Wraith','Troll','Basilisk','Harpy','Sphinx','Manticore',
  'Wight','Shambler','Revenant','Lamia','Gorgon','Chimera','Behemoth',
  'Abomination','Lurker','Stalker','Fiend','Sentinel','Hydra','Colossus',
  'Burnout','Vampire Thrall','Boneless Husk','Bee-Rex','Raptoroid','Cliff-Strider',
  'Root-Lost Predator','Echo Fragment','Hive Drone','Saltfire Drake','Twig Blight',
  'Animated Seraph Armour','Giant Snapping Turtle','Swarm of Slaughter-Fish',
  // Realm of Alaruel additions
  'AG-Series Prototype (Department of War)','Moon Rat Prime Intelligence','Idol-Touched Thrall',
  'Leviton Levitation Engine (animate)','House Delaque Arcane Enforcer','Warclan Thule Berserker',
  'Cahill Deep-Miner (transformed)','Carnivora Coastal Spawnling','Cochumat Crystal Elemental',
  'Formene Exile Blade-Singer','Chogrove Pirate Construct','Tenebrous Fen Warden',
  'Duke Bayle Contract-Bound Servant','Immortal Oak Eladrin (hostile)','Maddox Kobold Champion',
  // Generic fantasy additions
  'Ogre','Gnoll','Kobold','Hobgoblin','Bugbear','Werewolf','Banshee','Lich',
  'Vampire','Ghoul','Skeleton Knight','Zombie Horde','Flesh Golem','Iron Golem',
  'Cyclops','Medusa','Minotaur','Centaur','Sea Serpent','Roc','Owlbear',
  'Displacer Beast','Phase Spider','Will-o-Wisp','Shadow Demon','Hellhound',
  'Stone Giant','Fire Giant','Frost Giant','Ettin','Troll Shaman',
  'Yuan-Ti Abomination','Lizardfolk Shaman','Wereboar','Weretiger','Ghast',
  'Death Knight','Mummy Lord','Night Hag','Green Hag','Sea Hag',
];

const MONSTER_TAGS = [
  'Undead','Beast','Aberration','Construct','Elemental','Fey','Fiend',
  'Giant','Humanoid','Monstrosity','Plant','Dragon','Celestial',
];

const MONSTER_ENVIRONMENTS = [
  'the ruins of Ambersoul, where the cobblestones are still sticky with old blood',
  'the depths of the House Cahill mines beneath the city',
  'the Cochumat jungle, where the Root Father\'s influence warps all life',
  'the Saltfire Flats, where craters of scalding brine dot the landscape',
  'the waters of Lake Aldale, far below where any ship has reason to go',
  'the abandoned Department of War blacksite beneath Alaruel\'s prison',
  'the storm-wracked coasts near Chogrove where ships go missing',
  'the blighted farmlands surrounding the ruins of Boughromir',
  'the sunken catacombs beneath the Castle of the Seraph',
  'the Far Realm-touched corridors of the Alaruel Psychic Academy',
  'the resin-coated caves of the Island of Merciless Horror',
  'the old arena district of Kewold, sealed since the last siege ball riot',
  'the frozen northern marches where the Warclans of Thule still roam',
  'the fetid harbour underbelly of Chogrove',
  'the amber-veined caverns deep beneath the Island of Merciless Horror',
];

const MONSTER_SIZES = ['Tiny','Small','Medium','Large','Huge','Gargantuan'];

const MONSTER_ALIGNMENTS = [
  'Chaotic Evil','Neutral Evil','Lawful Evil',
  'Chaotic Neutral','True Neutral','Lawful Neutral',
  'Chaotic Good','Neutral Good','Lawful Good','Unaligned',
];

const MONSTER_CRS = ['1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10','12','14','16','18','20','22','24','30'];

const MONSTER_TRAITS = [
  'Regenerates 10 hit points at the start of each turn unless exposed to radiant damage or fire.',
  'Immune to poison and the poisoned condition — its body has long since stopped caring.',
  'Can climb sheer surfaces without an ability check, leaving trails of AmberSoul residue.',
  'Emits a blinding pulse of Far Realm energy when reduced below half hit points.',
  'Resistant to nonmagical bludgeoning, piercing, and slashing damage.',
  'Can breathe both air and water — it has spent time in the depths of Lake Aldale.',
  'Tremorsense to 60 feet, honed in the cave systems of the Island of Merciless Horror.',
  'Invisible to creatures with darkvision — it has adapted to the psychic blind spots of its hunters.',
  'Upon death, explodes in a 15-foot burst of AmberSoul crystal shards.',
  'Can communicate telepathically with any Far Realm-touched creature within 120 feet.',
  'Creatures that begin their turn within 10 feet must succeed a Constitution save or gain one level of crystal corruption.',
  'Pack Tactics — advantage on attack rolls when a hive-mate is adjacent to the target.',
  'Cannot be charmed or frightened — the Unity\'s ritual burned those responses out of it.',
  'Magic Resistance — advantage on saves against spells and magical effects, a gift from prolonged Far Realm exposure.',
  'Swallow — on a critical hit against a Medium or smaller creature, the target is swallowed and begins suffocating.',
  'Soul Sense — can detect creatures with bound or fragmented souls within 60 feet, including soul-steel constructs.',
  'Hive Signal — if killed within 120 feet of another creature of its type, that creature immediately acts on the next initiative count.',
];

const MONSTER_ATTACKS = [
  'Resin Spit — launches a glob of hardening amber resin at range, restraining the target on a failed Strength save.',
  'Claw — reaches out with razor crystalline appendages dealing slashing damage and leaving traces of Far Realm residue.',
  'Soul Drain — a touch attack that siphons life force, reducing the target\'s maximum hit points until they finish a long rest.',
  'Tail Sweep — knocks all creatures in a 10-foot arc prone with a single brutal motion.',
  'AmberSoul Burst — a ranged explosion of raw crystal energy that deals radiant damage and may corrupt on a failed save.',
  'Constrict — wraps around a target dealing bludgeoning damage each turn and preventing spellcasting.',
  'Pheromone Cloud — releases a 20-foot radius cloud of hive chemicals that charm or disorient non-hive creatures.',
  'Stomp — crashes a massive limb down dealing bludgeoning damage in a 5-foot radius and cracking the ground into difficult terrain.',
  'Life Drain — draws soul energy into the creature\'s core, healing it for half the damage dealt.',
  'Petrifying Gaze — targets that meet its eyes must save or begin calcifying, their skin slowly turning to AmberSoul crystal.',
  'Warclan Howl — terrifying roar forces all within 60 feet to make a Wisdom save or become frightened for one minute.',
  'Corrupting Touch — on a failed Constitution save inflicts a random minor crystal corruption.',
  'Bloodhoney Injection — on a bite attack, injects refined blood honey, healing the monster and beginning dependency in the target.',
  'Unity Sigil Pulse — releases a wave of necrotic energy shaped like the hand-and-carved-heart symbol, dealing necrotic damage to all non-undead in 15 feet.',
];

const MONSTER_LORE = [
  'Born from the Unity\'s final ritual in Ambersoul — not a creation but a consequence, walking flesh given form by the weight of ten thousand deaths.',
  'Once a citizen of a town the Warclans of Thule burned three seasons ago. What came back wore the same face but nothing else.',
  'The ATC catalogued it in a field report that was subsequently classified. The researcher who wrote it has since retired, early, to somewhere no one can find them.',
  'Ancient texts from the Alaruel Psychic Academy describe it only as "the shape the Far Realm wears when it gets curious about bones."',
  'The tribes of the Island of Merciless Horror regard it as neither predator nor prey but as weather — something that simply happens to you.',
  'The Department of War attempted to harness one for their soul-steel program. The attempt is the reason the second sub-basement of the blacksite is sealed.',
  'It is said that those who stare into its AmberSoul eyes do not die — they simply stop being themselves.',
  'Chogrove sailors speak of entire vessels going quiet within miles of where these creatures hunt. The harbourmaster has stopped logging the disappearances.',
  'No two sightings in the Cochumat jungle have ever described it the same way. The Root Father, when asked, changes the subject.',
  'The creature is drawn to grief and to soul-steel constructs — something in the resonance of a bound soul calls to it across great distances.',
  'Lady Camellia of Aered was observed feeding one of these in the grounds of her estate three weeks before the curfew began. The witness did not survive to testify.',
  'King Brom Thule keeps three of them chained beneath his hall in Dabronin. His oracle Aruam Glubus says they are there "for when negotiations fail."',
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
  'Nathren','Roland','Brom','Erris','Gwalthen','Taras','Jorek','Nethor',
  'Alexei','Oskoris','Craig','Tavren','Derric','Cairn','Gurn','Marek',
  // Generic fantasy additions
  'Aldous','Brennan','Corvin','Daven','Eadan','Ferris','Gareth','Harlan',
  'Ivann','Joren','Kelvin','Lorcan','Matteus','Nikos','Oryn','Peregrine',
  'Quincy','Renly','Sorren','Tobias','Ulfric','Varric','Willem','Yorick',
  'Aedan','Bertram','Cassius','Donal','Edric','Fletcher','Godwin','Henrik',
];
const NPC_FIRST_NAMES_FEMALE = [
  'Aelindra','Brenna','Caelith','Devara','Elspeth','Fiora','Gwyneth','Halla',
  'Isadora','Jessamine','Kira','Lirien','Mirella','Nessa','Orla','Petra',
  'Quill','Rosamund','Sable','Thalia','Urien','Vesper','Willa','Xara','Ysara','Zelara',
  'Camellia','Arabella','Elira','Cara','Sylvie','Lira','Sila','Veyla','Fiona','Mina',
  'Taiya','Lyra','Elana','Vasha','Myra','Cirella',
  // Generic fantasy additions
  'Adara','Blythe','Corin','Delia','Eowyn','Fallon','Greer','Heida',
  'Ilara','Juniper','Kessa','Leonie','Maren','Niamh','Odette','Priya',
  'Quinn','Rowena','Seraphine','Tamsin','Ursula','Viveka','Wynn','Yseult',
  'Alara','Beatrix','Corinna','Dagny','Eirene','Freya','Greta','Hilde',
];
const NPC_LAST_NAMES = [
  'Ashveil','Blackthorn','Crestfall','Dunmore','Emberstone','Fairweather',
  'Greymantle','Holloway','Ironweld','Jadewood','Kessler','Langstrom',
  'Mordecai','Nighthollow','Orvyn','Pryce','Quellar','Ravenscar',
  'Silvertongue','Thorne','Underwick','Voss','Whitlock','Yarrow','Zoldar',
  'Delaque','Stonewake','Hayward','Blackby','Datchley','Thale','Leony',
  'Flatroot','Moonwhisper','Frostleaf','Arafir',
  // Generic fantasy additions
  'Aldgate','Bramblewood','Coldwater','Duskmantle','Evensong','Foxrun',
  'Goodbarrel','Harrowfield','Ironsides','Kettlebrook','Lorne','Marwick',
  'Netherby','Overhill','Pendrake','Quicksilver','Redmoor','Stonebridge',
  'Tanglewood','Underhill','Vanhollow','Westergard','Wormwood','Yellowfen',
  'Brightwater','Coppergate','Dawnfield','Edgewood','Flintlock','Greenhollow',
];

const NPC_RACES = [
  'Human','Elf','Half-Elf','Dwarf','Halfling','Gnome','Tiefling',
  'Dragonborn','Half-Orc','Aasimar','Tabaxi','Kenku','Firbolg','Goliath',
  'Warforged','Kobold',
];

const NPC_OCCUPATIONS = [
  'Blacksmith','Tavern Keeper','Merchant','Herbalist','Sellsword','Thief',
  'Scribe','Healer','Priest','Guard','Scholar','Sailor','Farmer','Alchemist',
  'Bard','Hunter','Courtier','Spy','Gravedigger','Moneylender','Cartographer',
  'Arcanist','Knight','Harbourmaster','Innkeeper','Fence','Pilgrim',
  'ATC Factor','ATC Marine','Conglomerate Agent','Department of War Officer',
  'Psychic Academy Student','Airship Pilot','Airship Engineer','Siege Ball Player',
  'Unity Survivor','Warclan Deserter','Burnout Handler','Soul-Steel Artificer',
  'Vampire Thrall Hunter','Chogrove Pirate','ATC Quartermaster','Society Informant',
  'Naturalist','Harbourmaster\'s Deputy','Dockworker','Undead Disposal Contractor',
];

const NPC_PERSONALITIES = [
  'Gruff but secretly generous — will never admit to an act of kindness, especially not to an ATC official.',
  'Cheerful to a fault, masking profound grief they refuse to address. Lost someone in Ambersoul.',
  'Deeply suspicious of strangers — has seen what the Unity did to people who trusted freely.',
  'Endlessly curious about Far Realm corruption, asks dangerous questions before thinking about whether they should.',
  'Calculating and precise; treats every interaction as a negotiation, probably because they work for the Conglomerate.',
  'Recklessly brave, or perhaps just tired of being afraid. Has survived things that should have killed them.',
  'Quietly observant — says little, remembers everything, and sells information to whoever pays best.',
  'Overly formal and rigid, uncomfortable with anything outside ATC procedure or approved protocol.',
  'Charming and duplicitous — the smile never quite reaches the eyes, and the eyes never stop calculating.',
  'Melancholic philosopher, prone to long silences and sudden bleak insights about the state of Alaruel.',
  'Blustering blowhard hiding a paralysing fear of Far Realm exposure — has seen what it does to people.',
  'Genuinely kind, but so naive about the Society\'s reach that it borders on dangerous.',
  'Obsessively devout — to which god varies, but Evening Glory worshippers always have that particular intensity.',
  'Pragmatic to the point of cruelty. Survived the Unity purge of Ambersoul by making decisions others would not.',
  'Haunted by something they witnessed during the Unity\'s crusade. Won\'t discuss it. Cannot stop thinking about it.',
  'Performatively patriotic about Alaruel, using it to mask something they are deeply ashamed of.',
  'Sailor\'s pragmatism — superstitious, practical, and deeply respectful of things that are bigger than they are.',
  'The relentless optimism of someone who has rebuilt their life at least twice and is entirely prepared to do it again.',
];

const NPC_SECRETS = [
  'Was a minor Unity functionary before the crusade. Changed their name and moved to a different city.',
  'Is on the payroll of both the ATC and the Conglomerate simultaneously and is terrified of either finding out.',
  'Witnessed the Ambersoul massacre and has been having visions of the Boneyard ever since.',
  'Is a vampire thrall of Lady Camellia and Nathren\'s coven, maintaining the appearance of a normal citizen.',
  'Has a fragment of AmberSoul crystal lodged somewhere in their body and is beginning to experience minor corruptions.',
  'Owes a life debt to a Chogrove pirate captain and quietly funnels them ATC shipping schedules.',
  'Is the illegitimate child of a Department of War officer and is being quietly paid to stay quiet about it.',
  'Was present when a Unity artifact reactivated in the city. Told no one. Has not slept properly since.',
  'Is a Society informant, has been for years, and genuinely does not know who they ultimately report to.',
  'Murdered a Unity priest during the crusade — in self-defence, mostly — and has built their entire current life on that secret.',
  'Is dying of a Far Realm-adjacent illness contracted near a crystal deposit. Has perhaps six months.',
  'Knows the location of an uncatalogued ATC vault beneath the city and is working up the courage to do something about it.',
  'Has been replaced once before by a Conglomerate doppelganger. The original is alive, somewhere.',
  'Deserted from the Alaruel Department of War during a soul-steel experiment and has been running ever since.',
  'Is being blackmailed by a Society operative and has been for three years. The secret is no longer even worth keeping.',
];

const NPC_QUIRKS = [
  'Refuses to make direct eye contact — a habit developed after one too many encounters with the Unity\'s mind-readers.',
  'Taps their fingers on any surface in a rhythm that those who know Deep Speech would find uncomfortable.',
  'Compulsively checks that their AmberSoul ward-charm is still around their neck.',
  'Uses old Unity liturgical phrases as idle expressions, seemingly unaware of what they are saying.',
  'Always carries a sealed sending stone they claim is broken but occasionally whispers to anyway.',
  'Laughs at moments of genuine danger, then immediately corrects themselves with visible effort.',
  'Never uses the word "death" — replaces it with "the Unity\'s recruitment" when they think no one will catch it.',
  'Smells faintly of AmberSoul resin — a smell most people in Alaruel have learned to associate with something being wrong.',
  'Frequently misquotes ATC charter articles and does not realise it.',
  'Talks to themselves under their breath in a language that is not quite any language anyone recognises.',
  'Always has dried meat from somewhere unusual on their person. Says it is just jerky. Will not say what animal.',
  'Bows very slightly to soul-steel constructs, then immediately pretends they did not.',
  'Has a strong accent from a region they have told three different stories about being from.',
  'Refers to the Conglomerate in the third person even when they are clearly working for them.',
  'Fiddles with a signet ring bearing a symbol they describe as decorative, though it matches a Unity offshoot no one has confirmed was disbanded.',
];

const NPC_GOALS = [
  'Recover evidence they hid in Ambersoul before the Unity\'s ritual, if anything survived.',
  'Find their sibling, who joined an ATC expedition to the Island of Merciless Horror six months ago.',
  'Earn enough coin to buy passage out of Alaruel before the Department of War finishes its audit.',
  'Uncover who in the Society gave the Unity the information that allowed the crusade to proceed undetected.',
  'Earn the respect of a Conglomerate director who has looked down on them since a failed joint venture.',
  'Complete a circuit of all the settlements on the North Road before they are too old to make the journey.',
  'Pay off a debt to the ATC before their factor calls in the contract and takes the boat.',
  'Find a cure for a Far Realm corruption that is slowly changing someone they love.',
  'Destroy the last functioning Unity ritual site before someone with worse intentions finds it first.',
  'Prove their worth to the Alaruel Psychic Academy, which has rejected their application three times.',
  'Survive long enough to testify about what they saw in Ambersoul to someone with the authority to act on it.',
  'Find somewhere far from Alaruel\'s politics — Kewold, Aered, or somewhere that is simply not on any ATC map.',
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
  'Coal','Copse','Fleet','Heather','Pale','Rust','Slate','Tar','Wick',
  // Generic fantasy additions
  'Bright','Clover','Dew','Elder','Fair','Golden','Hammer','Ivy',
  'Jade','Kettle','Linden','Marsh','North','Oak','Pine','Quarry',
  'Red','Sage','Thistle','Upper','Vale','Weld','Yew','Barrow',
  'Cinder','Drift','Flint','Gorse','Hazel','Lichen','Mud','Nether',
];

const SETTLEMENT_SUFFIXES = [
  'haven','bridge','ford','gate','hold','keep','mere','moor','port',
  'reach','rest','stead','vale','wall','watch','well','wick','wood',
  'crossing','falls','hollow','ridge','tor','bay','fields',
  // Generic fantasy additions
  'ham','bury','minster','croft','ton','shaw','thorpe','heath',
  'fen','dale','glen','knoll','marsh','cliff','point','landing',
  'end','side','lea','run','brook','combe','mill','bank',
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
  'ATC-chartered factor council with theoretical local oversight',
  'Hereditary noble lord, nominally loyal to Alaruel\'s crown',
  'Elected merchant council, quietly backed by Conglomerate investment',
  'Military governor appointed by the Department of War',
  'Theocracy — formerly Unity-aligned, now anxiously distancing itself',
  'Evening Glory temple hierarchy, operating with unusual civic reach',
  'Thieves\' guild (shadow rule) with a respectable mayor out front',
  'No formal government since the Unity\'s passage through three years ago',
  'Tribal elder council, resisting ATC incorporation with diminishing success',
  'A Conglomerate board of directors who do not technically live there',
  'Democratic assembly — a genuine rarity that the Society watches with interest',
  'Harbourmaster\'s authority — what began as port law has expanded to fill the vacuum',
];

const SETTLEMENT_BIOMES = [
  'rolling farmland along the North Road, between Aldale and Aered',
  'the rocky coastline near Chogrove, where the cliffs give smugglers excellent cover',
  'the edge of the Cochumat jungle, where the undergrowth is reclaiming the streets',
  'the high alpine pass near Mt Perona, snowbound half the year',
  'a river delta emptying into the Lake Aldale basin',
  'the windswept moorland south of the Warclan territories',
  'a volcanic plateau at the fringes of the Saltfire Flats',
  'dense old-growth forest where AmberSoul deposits cause the trees to glow faintly at night',
  'misty marshland that the ATC has been trying to drain and develop for forty years',
  'the frozen northern marches, in territory the Warclans consider theirs by right of conquest',
  'a sheltered bay with a natural harbour the ATC has been quietly militarising',
  'the blighted farmland in the Unity\'s old sphere of influence, still not fully recovering',
];

const SETTLEMENT_NOTABLE_LOCATIONS = [
  'A crumbling watchtower bearing Unity iconography that no one has gotten around to defacing yet.',
  'An ATC factor house that controls access to the regional shipping ledger — and therefore to most commerce.',
  'A black market operating behind a licensed alchemist\'s supply shop, specialising in AmberSoul fragments.',
  'A temple to Evening Glory with a surprisingly well-funded crypt renovation underway.',
  'A crossroads inn with a sealed back room that regulars know not to ask about.',
  'An overgrown Siege Ball arena, last used before the Unity\'s crusade disrupted the season.',
  'A Conglomerate research annex staffed by people who are very polite and very vague about their work.',
  'An underground cistern network that predates the settlement by several centuries and is not entirely empty.',
  'A graveyard with one mausoleum that the locals maintain scrupulously and approach only during daylight.',
  'A harbourmaster\'s office with maps on the wall that include the Island of Merciless Horror, marked "DO NOT ROUTE".',
  'A forge that has burned continuously since before the Unity\'s rise — the smith refuses to discuss why it cannot be extinguished.',
  'A Psychic Academy satellite office, technically just a reading room, that everyone in town treats with profound wariness.',
];

const SETTLEMENT_PROBLEMS = [
  'ATC factors are enforcing a new tariff that has made basic goods unaffordable for most residents.',
  'A string of disappearances that started three weeks ago, patterned in a way that suggests vampire thrall activity.',
  'A Far Realm rift has opened in the lower district. The Conglomerate has offered to manage it. The locals are not reassured.',
  'Unity survivors have been arriving in increasing numbers, fleeing something pursuing them from the south.',
  'The water supply carries a faint AmberSoul contamination causing minor hallucinations in the elderly.',
  'A Warclan raiding party has been spotted two days out. The garrison has eight soldiers and a strongly worded letter from the Department of War.',
  'A Conglomerate-backed buyout of the local harbour is proceeding whether the residents agree or not.',
  'An outbreak of crystal corruption is spreading through the dockworkers after contact with an unshielded AmberSoul shipment.',
  'The local ATC factor has stopped filing reports to the regional office. Nobody has gone to check why.',
  'A Society informant has been exposed and is now a corpse, and the person who exposed them is still in town.',
  'Two prominent families — one pro-ATC, one pro-Conglomerate — have paralysed every civic decision for six months.',
  'Something has been killing livestock in a widening circle from an old Unity ritual site outside of town.',
  // Generic fantasy additions
  'A drought has been ongoing for two seasons; the wells are low and the mood is lower.',
  'An unusually harsh winter has wiped out a significant portion of the stored food supply.',
  'A bandit company has taken up residence in the hills and is taxing the roads more efficiently than the lord does.',
  'The local garrison has not been paid in four months and is becoming creative about supplementing their income.',
  'A plague of some description is moving through the livestock. The healers disagree about whether it affects people.',
  'Two travelling merchants had a dispute that escalated, and now one of them is dead and the other claims self-defence.',
  'The river has changed course by fifty yards, which has entirely disrupted the mill, two bridges, and someone\'s marriage.',
  'A charismatic outsider has arrived and is preaching something that a growing number of people find very compelling.',
  'An old and beloved leader has died and the succession is contested in ways that are becoming increasingly physical.',
  'Taxes have been raised to fund a war in a region most residents cannot locate on a map.',
  'The local temple has declared a tithing increase that the congregation regards as extortionate.',
  'Something large is living in the forest outside town. It has not attacked anyone yet. The "yet" is doing significant work.',
  // Realm of Alaruel additions
  'A Leviton transit crystal hub has gone offline, cutting the settlement off from the trade network. House Leviton has sent a repair team. The team arrived, looked at something, and has not sent word since.',
  'Moon Rats have been seen in unusually high numbers during the last three full moons. The local cat population has taken a notably more cautious approach to life.',
  'A Department of War classified shipment passed through and one of the crates is unaccounted for. The DoW investigators who arrived to look for it are being very careful about what questions they ask.',
  'The Warclan Thule tribute demand has increased for the third consecutive month. The local garrison does not have the personnel to contest it.',
  'House Delaque has called in a significant debt held by the largest local employer. The employer is scrambling. So is everyone who works for them.',
  'An ATC route auditor arrived three weeks ago, began asking pointed questions about cargo manifests from the last two years, and then stopped being seen in public.',
  'The Cochumat crystal corruption is appearing in the local water supply in trace amounts. The effects are mild and inconsistent, which may be worse than if they were severe and obvious.',
  'Warclan Thule scouts have been spotted conducting what look like survey operations rather than raiding operations. The difference is alarming.',
  'House Cahill has submitted a mineral rights claim on land beneath the settlement. The claim is legally sound. The implications are not.',
];

const SETTLEMENT_ATMOSPHERES = [
  'A forced festivity hangs over everything — a Unity survivor festival no one quite wanted but no one wanted to cancel.',
  'A palpable tension, as if the town is collectively waiting for an ATC auditor to find something.',
  'The settlement feels quieter than its population suggests. Windows are shuttered before dark without explanation.',
  'Bustling trade that masks genuine fear — every merchant smiles, and every smile is slightly too wide.',
  'A proud, self-sufficient community that resents ATC involvement and makes very little effort to hide it.',
  'The place feels forgotten by Alaruel\'s politics, and most residents have decided that is probably for the best.',
  'Recent Conglomerate investment has brought rapid growth — and the resentment that comes with being improved at.',
  'The settlement clings to old Unity-era traditions out of habit, not devotion — though the distinction is blurring.',
  'Sailors, ATC factors, and travellers give everything a transient feel. Nobody is really from here.',
  'The hardship of the post-Unity period has forged a grim solidarity. These people remember exactly who helped.',
];

const SETTLEMENT_RUMOURS = [
  'The local ATC factor has not been seen in public for a week. The clerks say they are reviewing accounts. The clerks look frightened.',
  'Unity ritual markings were found beneath the floorboards of the new Conglomerate annex during construction. Work stopped. The markings were plastered over.',
  'Two people independently reported hearing Siege Ball crowds from the abandoned arena at midnight. The arena has been sealed for three years.',
  'A scholar offered an outrageous sum for any information about a warforged with a crown embedded in its chassis.',
  'The river upstream has been running with a faint AmberSoul tinge for a fortnight. Nobody upstream will respond to letters.',
  'Someone has been posting anonymous notices accusing the harbourmaster of selling ship schedules to Chogrove pirates.',
  'A child in the lower district spoke the name "Aereth Leony" in their sleep — a name the child has no way of knowing.',
  'The last three ships to make port arrived with their captains claiming they saw something miles long moving beneath the surface.',
  'The temple bells ring at the third hour, when no priest is inside and no mechanism could account for it.',
  'A Unity-era map was found in a sealed chest in the ruins outside town. It shows the settlement\'s streets as they will look in twenty years.',
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
