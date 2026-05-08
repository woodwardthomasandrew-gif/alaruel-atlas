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
  // Varkeshi & regional additions
  'Meridian Order Star Chart','Varkeshi Navigation Sextant','Admiralty Cipher Compass','Larimar Water Crystal',
  'Varklamon Landshark Fang Blade','Beljuril Crystal Shard','Sarseth Scale Fragment','Meteoric Iron Ingot (Moonshatter Bay)',
  'Yeenoghu Warchief Relic','Daeros-Blessed Ward Stone',
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
  // Varkeshi & regional additions
  'Varkeshi celestially-aligned silver (polished to read star-angles)','Larimar Beljuril water-crystal (singing faintly)',
  'meteoric iron from Moonshatter Bay (unrefined but unnaturally pure)','Sarseth scale-iron (rust-red and supernaturally dense)',
  'Varklamon Deepmaw hide (still faintly warm)','Daeros-touched granite from the Yorian Mountains',
  'Cael\'Thir mountain-channelled elven silver','Larimar komodo-bone (mineral-fed, pearlescent)',
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
  // Varkeshi & regional additions
  'Meridian-blessed','Admiralty-sealed','Star-charted','Sarseth-forged','Beljuril-laced',
  'Moonshatter-tempered','Daeros-warded','Gnoll-taken','Cael\'Thir-woven','Varkeshi-certified',
  'Larimar-cut','Yeenoghu-cursed','Wastes-preserved','Chogoran-scarred',
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
  // Varkeshi & regional additions
  'of the Meridian Order','of the Admiralty\'s Will','of Moonshatter Bay','of the Ferrous King\'s Slumber',
  'of the Pillar of the Gods','of the Crystal Dragon\'s Tomb','of Yeenoghu\'s Maw',
  'of the Wastes of Eternity','of the Chogoran Steppe','of the Varkeshi High Houses',
  'of the Gathering of Reeds','of the Larimar Walls','of the Yorian Mountains',
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
  // Varkeshi & regional additions
  'Any compass within ten feet points toward this item rather than true north — a disorienting property near Moonshatter Bay, where compasses already misbehave.',
  'Hums a low resonant tone that Varkeshi Meridian Order scholars recognise as a stellar alignment signal.',
  'The Beljuril crystal inlaid in its surface sings faintly when water is nearby — a sound like a living creature.',
  'Carries a faint scent of rust and heat, the signature of Sarseth\'s Island even thousands of miles distant.',
  'Landsharks of the Varklamon swamps will not approach the bearer — whether from fear or recognition, handlers cannot agree.',
  'Daeros\'s mark is faintly visible on its surface in direct sunlight; sandworms will not pursue one who carries it openly.',
  'Gnoll-touched items from Yeenoghu\'s Maw occasionally make a sound like distant hyena laughter when left alone.',
  'Those preserved by the Wastes of Eternity carried something like this. The cold of that place never quite leaves the metal.',
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
  // Varkeshi & regional additions
  'A Meridian Order navigation instrument repurposed into a weapon — the Varkeshi celestial scholars who made it would be appalled, which is part of why its current owner enjoys it.',
  'Cut from a fragment of meteoric iron salvaged from Moonshatter Bay. The locals who pulled it from the crater warned the buyer that compasses act strangely around it. They were not wrong.',
  'Carved from a scale of Sarseth, the sleeping Ferrous King, found washed onto the shores of the iron island. The scale predates the Shattering. The carving does not.',
  'A Larimar water crystal shaped by the city\'s royal artisans and officially listed as lost in transit. The royal vaults show a discrepancy of one item. The crystal dragon\'s soul in the vault is said to hum when the item is discussed.',
  'Recovered from the ruins of a failed crusade against Yeenoghu\'s Maw — one of the few items the 430 PS crusaders brought that survived the Abyss.',
  'A Daeros-blessed ward stone worked into a weapon hilt by a Larimar artisan. The city\'s walls were built by the same god. Whether the blessing transfers is a matter of ongoing theological argument.',
  'Gifted to a Varkeshi High House navigator by the Admiralty upon completion of their hundredth charted route. The navigator never came home from the hundred and first.',
  'Fashioned in Cael\'Thir, the isolationist elven homeland, and traded outward through channels that the High Elves officially deny exist. The mountain-channelled magic in its making has no equivalent on the mainland.',
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
  // Varkeshi & regional additions
  'While holding this item, the bearer always knows true north — except within the Moonshatter Bay region, where compasses point to the bay\'s center and this item does too.',
  'Grants advantage on all celestial navigation checks; Varkeshi Meridian Order members will recognise the item\'s resonance and treat the bearer with cautious respect.',
  'The bearer can speak to Larimar\'s giant komodo lizards as if under the effects of Speak with Animals, though the lizards\' conversation is largely about minerals.',
  'Once per long rest, the bearer may call upon Daeros\'s ward as a reaction, interposing a barrier of stone that grants +5 AC against one attack.',
  'Sandworms within 120 feet must succeed on a Wisdom saving throw (DC 14) or avoid the bearer entirely — a property that Larimar merchants pay handsomely for.',
  'The bearer can sense the direction and approximate distance of the nearest salt water; this ability functions even underground or in the Wastes of Eternity.',
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
  // Varkeshi & regional additions
  'The bearer compulsively narrates their position in celestial terms — the Meridian Order considers this a gift; everyone else finds it exhausting.',
  'The bearer cannot enter salt water voluntarily. Varklamon landshark handlers say this is the smell of something the swamp has already claimed.',
  'The item was taken from Yeenoghu\'s Maw and something followed it out. The bearer hears gnoll laughter at the edge of sleep.',
  'Meteoric iron from Moonshatter Bay carries a piece of Sarseth\'s unintended violence. The bearer dreams of falling iron and a world going dark for a century.',
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
  // Varkeshi & regional additions
  'Meridian-cursed','Moonshatter-born','Chogoran','Maw-touched','Beljuril-corrupted',
  'Sarseth-iron','Wastes-preserved','Sandworm-kin','Deepmaw','Gravefin',
  'Mudrunner','Larimar-cut','Cael\'Thir-exiled','Gnoll-chosen',
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
  // Varkeshi & regional additions
  'Chogoran Steppe Gnoll Chosen of Yeenoghu','Varklamon Deepmaw (war-trained)','Varklamon Gravefin (feral)',
  'Varklamon Mudrunner (pursuit pack)','Larimar Sandworm (juvenile)','Larimar Sandworm (elder, wall-tested)',
  'Sarseth Iron Drake (dormant scale)','Beljuril Crystal Dragon Fragment','Cael\'Thir Mountain Spirit (hostile)',
  'Moonshatter Bay Meteoric Golem','Wastes of Eternity Preserved Revenant','Yeenoghu Maw-Spawn',
  'Varkeshi Admiralty Construct (decommissioned)','Marrow Fields Exile Wraith',
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
  // Varkeshi & regional additions
  'the Chogoran Steppe, where the vast wasteland surrounding Yeenoghu\'s Maw grows more dangerous with every season',
  'the deep ravines near Yeenoghu\'s Maw, which connect to the 422nd layer of the Abyss',
  'the Moonshatter Bay crater fields, where the impact of Sarseth\'s conjured meteor warped the land — and the things living in it',
  'the Marrow Fields, the seemingly endless inhospitable ice sheet where the children of the banished eke out survival',
  'the colossal rust-and-scale island of Sarseth, where the sleeping Ferrous King\'s body shapes the landscape around him',
  'the Wastes of Eternity, where the cold preserves those who die from exposure for eternity — along with everything else',
  'the deep desert outside Larimar\'s walls, where sandworms claim the unprotected and the giant komodo lizards are the least of one\'s concerns',
  'the Varkeshi Isles coastal waters, where the Admiralty\'s reach ends and something older begins',
  'the tangled waterways of Varklamon, where the swamp does not distinguish between predator and prey',
  'the high passes of Cael\'Thir, where the isolationist High Elves channel mountain magic through ancient architecture',
  'the subterranean tunnels beneath Larimar, where the dormant Beljuril crystal dragon slowly stirs',
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
  // Varkeshi & regional additions
  'Sandworm Tremorsense — can detect movement on the surface above through vibration to 120 feet; Daeros\'s walls in Larimar are specifically designed to defeat this sense.',
  'Gnoll Pack Frenzy — when three or more gnolls are present and at least one has dropped below half hit points, all gnolls in 60 feet deal an extra 1d6 damage on their attacks.',
  'Yeenoghu\'s Mark — this creature was chosen by a Warchief for the ritual that opened the Maw; it carries Yeenoghu\'s blessing and deals an extra die of damage against creatures of Good alignment.',
  'Maw-Touched Corruption — any creature that takes damage from this monster must succeed a Constitution save or suffer one level of Abyssal corruption, with effects increasing on subsequent failures.',
  'Preserved by the Wastes — this creature died in the Wastes of Eternity and was preserved perfectly; it suffers no decay effects and cannot be poisoned by mundane means.',
  'Sarseth\'s Iron — the creature\'s body incorporates meteoric iron from the Moonshatter Bay impact; its natural weapons are treated as magic and as adamantine for the purpose of breaking objects.',
  'Beljuril Resonance — when within 60 feet of a Larimar water crystal or Beljuril deposit, this creature gains advantage on all saving throws as the crystal energy feeds it.',
  'Landshark Senses — this creature shares the Varklamon landshark\'s ability to detect heartbeats through earth and shallow water to 30 feet, rendering hiding nearly impossible in terrain where it is native.',
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
  // Varkeshi & regional additions
  'Sandworm Lunge — the sandworm erupts from below, making a grapple attack; on a success the target is dragged into the burrow and begins suffocating. Daeros-blessed ground resists this emergence.',
  'Gnoll Cackle and Charge — the gnoll laughs as a bonus action, granting all gnolls within 30 feet advantage on their next attack roll before charging for a multi-hit strike.',
  'Deepmaw Bite — the Varklamon Deepmaw clamps down with jaws built for cracking giant crustaceans; on a hit, the target is grappled and must use their action to attempt escape.',
  'Gravefin Territorial Rush — the Gravefin charges in a straight line up to 30 feet, knocking prone all creatures in its path who fail a Strength saving throw.',
  'Beljuril Crystal Breath — the crystal dragon or its fragments exhale a cone of singing water-crystal shards dealing piercing and radiant damage; creatures attuned to water magic take half damage.',
  'Maw Rift Pull — the Yeenoghu creature tears briefly at reality, creating a pulling force that drags all creatures within 20 feet 10 feet closer to it on a failed Strength save.',
  'Preserved Strike — the Wastes-preserved creature strikes with the perfect form of whatever it was in life; this attack cannot be reduced by features that trigger on a "hit" — it is always precisely aimed.',
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
  // Varkeshi & regional additions
  'Before the Shattering — before Sarseth conjured the meteor that ended Vyreth\'s rampage and plunged the world into a century of darkness — creatures like this roamed the Chogoran Steppe freely. Some say they never truly left.',
  'The Warchief who opened Yeenoghu\'s Maw was sacrificed to complete the ritual 422 PS. What rose from the Maw in the months after was not all gnolls. The Elven crusade mounted against it failed entirely; the crusaders are still there, fighting in the Abyss.',
  'Sandworms were once held at bay by Sarseth\'s active protection of Larimar. When he entered his Slumber, the city needed walls. Daeros provided them, a hundred feet tall and equally as deep. The worms still test those walls, methodically, every year.',
  'The Varklamon clans handle Gravefins the way the Nuer handle cattle — as a measure of status, a cultural anchor, and a weapon of last resort. A clan that can manage a Gravefin is a clan that will not be easily threatened.',
  'The Beljuril crystal dragon beneath Larimar is not dead — the word the scholars use is "dormant." The crystal in the royal vault contains its soul. The dead dragon\'s cult in the city is trying to reunite the two. The dragon, when consulted through the crystal, says nothing that anyone has dared to repeat aloud.',
  'In the Wastes of Eternity, those who die of exposure are not buried — they are preserved perfectly by the cold and the strange aetheric stillness of that place. Not all of them stay still.',
  'The Varkeshi Meridian Order documented this creature\'s movements for eleven years before concluding that it navigates by stars. The implications — that it is as intelligent as any celestial scholar — were excluded from the published report.',
  'A Conglomerate annex in the old magocracy\'s territory disturbed something when they broke ground. The annex has since been incorporated into the creature\'s territory. The Conglomerate is assessing whether it is more cost-effective to exterminate or to route around.',
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

type NameGender = 'Male' | 'Female';

interface NameCultureTable {
  culture: string;
  style: string;
  male: string[];
  female: string[];
  family: string[];
}

const NAME_DATA_BY_SPECIES: Record<string, NameCultureTable[]> = {
  Human: [
    {
      culture: 'Aldale Lowlands',
      style: 'Pragmatic northern trader families common along the North Road.',
      male: ['Aldric','Bram','Corven','Derric','Edrin','Haldon','Merek','Tavin','Rorik','Jossan'],
      female: ['Aelith','Brenna','Catrin','Delia','Elira','Fiora','Mina','Roslin','Tamsin','Vera'],
      family: ['Aldgate','Bramblewood','Coldwater','Dawnfield','Hayward','Leony','Stonewake','Whitlock','Yarrow','Frostleaf'],
    },
    {
      culture: 'Chogrove Coast',
      style: 'Harbor slang and pirate-era contractions from the western coast.',
      male: ['Bren','Cass','Datch','Fenn','Jarek','Kell','Redd','Silas','Vossen','Wyke'],
      female: ['Ara','Brine','Cira','Edda','Kira','Lysa','Mara','Nessa','Sable','Veyla'],
      family: ['Blackby','Crowbarrow','Datchley','Flatroot','Harrowfield','Keelward','Netherby','Ravenscar','Saltmere','Thale'],
    },
    {
      culture: 'Kewold Courtly',
      style: 'Formal names still used by old houses and city bureaucrats.',
      male: ['Caelan','Dorian','Emrys','Leoric','Nathren','Oswin','Percival','Roland','Theron','Ulric'],
      female: ['Arabella','Camellia','Elspeth','Gwyneth','Isadora','Jessamine','Lirien','Rosamund','Sylvie','Zelara'],
      family: ['Crestfall','Dunmore','Evensong','Fairweather','Greymantle','Langstrom','Mordecai','Pryce','Silvertongue','Underwick'],
    },
    {
      culture: 'Varkeshi Isles',
      style: 'Precise, formal names favoured by noble houses and the Admiralty; often carry a celestial connotation.',
      male: ['Aldren','Caelus','Dorin','Estren','Halvic','Meren','Oskar','Riven','Stellan','Tycho'],
      female: ['Astra','Celindra','Elara','Iselle','Lynnara','Meridia','Selene','Stellara','Vesna','Zephyra'],
      family: ['Aldenmere','Brightspire','Celesmere','Highmast','Ironwatch','Meridon','Northhaven','Starcrest','Stormguard','Tidehollow'],
    },
    {
      culture: 'Varklamon Clans',
      style: 'Earthy, direct names tied to clan identity and the swamp; often reference local terrain or animals.',
      male: ['Brek','Dronn','Garl','Hurst','Kael','Marsh','Reeve','Silt','Sven','Wick'],
      female: ['Darra','Fenn','Gill','Hessa','Mira','Mudda','Reen','Tala','Vessa','Wyn'],
      family: ['Bogrest','Coldreach','Deepmaw','Driftmarsh','Gallowbend','Gravefin','Mirefang','Reedwatch','Silthollow','Wadefoot'],
    },
    {
      culture: 'Larimar',
      style: 'Colourful, often gemstone-referencing names used by the merchant and trade classes of the desert city.',
      male: ['Amren','Beljur','Corin','Daelith','Emir','Jasper','Kalen','Orin','Saben','Torin'],
      female: ['Alma','Berylla','Chrysa','Druza','Lazira','Opala','Sabra','Sapphira','Topaza','Zara'],
      family: ['Al-Saba','Crystalvein','Daerosi','Deepcutter','Gemcrest','Komodoback','Lightwell','Stonehaven','Wallguard','Yorian'],
    },
  ],
  Elf: [
    {
      culture: 'Formene Highborn',
      style: 'Long-vowel forms favored by old Formene lineages.',
      male: ['Arafir','Belion','Caelith','Elaran','Faelor','Ithorien','Lethar','Nyvaris','Saren','Theriel'],
      female: ['Aelindra','Caelithra','Elowen','Ilyra','Lirael','Nerisse','Sylara','Thalia','Vashara','Ysara'],
      family: ['Arafir','Moonwhisper','Nightbloom','Silverleaf','Starbough','Thornveil','Valewind','Virelune','Whispergrove','Winterbranch'],
    },
    {
      culture: 'Immortal Oak Exile',
      style: 'Shorter battlefield forms taken by exiles and mercenary circles.',
      male: ['Corin','Daven','Erris','Joren','Lorcan','Nethor','Quillan','Sorren','Taras','Vance'],
      female: ['Adara','Corinna','Elana','Greer','Ilara','Lyra','Myra','Quinn','Rowena','Talia'],
      family: ['Ashveil','Briarwake','Duskmantle','Holloway','Ironweld','Nighthollow','Quellar','Stormbark','Thorne','Vanhollow'],
    },
    {
      culture: 'Cael\'Thir High Elf',
      style: 'Isolationist High Elven naming tradition from the island homeland; rarely heard outside Cael\'Thir itself, which is part of the point.',
      male: ['Aelthar','Caelindor','Elindris','Faelorin','Iorvyn','Lirandel','Mythariel','Sorvanthar','Thalindor','Vaeloris'],
      female: ['Caelithra','Elindra','Faeliryn','Iorvindra','Liraneth','Mythariel','Sylindra','Thaliryn','Vaelindra','Ysindra'],
      family: ['Dawnspire','Highpeak','Ironcannel','Moonpeak','Peakward','Silvercannel','Starcannel','Stonereach','Stormpeak','Windcannel'],
    },
  ],
  Dwarf: [
    {
      culture: 'Cahill Deep-Miner',
      style: 'Stonehouse naming with heavy consonants and lineage pride.',
      male: ['Brom','Durgan','Gurn','Harbek','Krag','Murn','Orsik','Rurik','Tordek','Varric'],
      female: ['Arga','Diesa','Gunnloda','Helja','Ilde','Kathra','Riswynn','Sannl','Torbera','Vistra'],
      family: ['Anvilborn','Blackvein','Deepbarrel','Forgeheart','Granitehand','Ironshield','Mithforge','Rockseam','Stonewake','Underpick'],
    },
  ],
  Halfling: [
    {
      culture: 'Aldale Riverfolk',
      style: 'Warm household names, usually paired with practical surnames.',
      male: ['Alton','Bingo','Corrin','Eldon','Finn','Milo','Perrin','Rollo','Tobin','Wellby'],
      female: ['Andry','Callie','Cora','Jillian','Kithri','Lavinia','Marigold','Nedda','Seraphina','Verna'],
      family: ['Brushgather','Goodbarrel','Kettlebrook','Mudford','Puddlewick','Reedway','Shortmead','Underhill','Willowbank','Wormwood'],
    },
  ],
  Gnome: [
    {
      culture: 'Moon Rat Tinker',
      style: 'Quick clipped names used by engineers and salvage crews.',
      male: ['Alston','Boddynock','Dimble','Fonkin','Jebeddo','Nackle','Pock','Ribbit','Wrenn','Zook'],
      female: ['Bimpnottin','Caramip','Ellyjoy','Loopmottin','Nissa','Nyx','Pella','Roywyn','Tana','Zanna'],
      family: ['Cogspinner','Coppercoil','Fizzwrench','Geargrin','Rattlecap','Sprocket','Tinroot','Togglewick','Weldspark','Wizzle'],
    },
  ],
  Tiefling: [
    {
      culture: 'Ambersoul Diaspora',
      style: 'Chosen names and inherited house names from displaced survivors.',
      male: ['Amon','Cassian','Kairon','Levin','Malrec','Nox','Raith','Sevren','Varek','Zev'],
      female: ['Akta','Bryseis','Kallista','Lerissa','Makaria','Nemeia','Orianna','Rieta','Vesper','Zara'],
      family: ['Ashmark','Cindershard','Delaque','Emberstone','Hollowsign','Mirebrand','Nightscar','Pactward','Riftwell','Sablecross'],
    },
  ],
  Dragonborn: [
    {
      culture: 'Warclan Thule',
      style: 'Clan-honor names with hard stops and martial prefixes.',
      male: ['Arjhan','Balasar','Bharash','Donaar','Ghesh','Heskan','Kriv','Medrash','Nadarr','Rhogar'],
      female: ['Akra','Biri','Daar','Farideh','Harann','Jheri','Kava','Mishann','Nala','Uadjit'],
      family: ['Bloodscale','Coldmaw','Dreadhorn','Emberclaw','Frostjaw','Ironthroat','Redtalon','Stormfang','Thulekhan','Warbrand'],
    },
  ],
  'Half-Orc': [
    {
      culture: 'Frontier Warbands',
      style: 'Brief first names and earned surnames from raid companies.',
      male: ['Brug','Dorn','Gell','Henk','Karg','Mog','Ront','Shump','Thokk','Ugar'],
      female: ['Baggi','Emen','Engong','Kansif','Myev','Neega','Ovak','Ownka','Shautha','Sutha'],
      family: ['Ashscar','Bonefist','Crowbreaker','Grimtooth','Ironhide','Ravager','Stonejaw','Thornmaul','Warborn','Wolfgrin'],
    },
  ],
  Aasimar: [
    {
      culture: 'Evening Glory Devout',
      style: 'Temple names preserved through liturgy and oath records.',
      male: ['Aurin','Cassiel','Elyon','Ithiel','Jophiel','Laziel','Maeron','Raphen','Sariel','Uriel'],
      female: ['Arielle','Cassia','Elora','Irielle','Liora','Mariel','Nadira','Seraphine','Taliah','Zophia'],
      family: ['Brightwater','Dawnward','Evensong','Lightwell','Mercyfall','Starcrest','Sunmantle','Valebright','Wardglow','Whitpath'],
    },
  ],
  Tabaxi: [
    {
      culture: 'Carnivora Tideclans',
      style: 'Poetic two-word lineages condensed into trade shorthand.',
      male: ['Barks-at-Storm','Hunts-Low-Tide','Leaps-Over-Masts','Rests-in-Reeds','Tracks-Deep-Wake'],
      female: ['Dances-with-Spray','Listens-to-Gulls','Shines-in-Moonfoam','Sings-at-Dawn','Walks-the-Rigging'],
      family: ['of Coral Step','of Low Tide','of Salt Wind','of Sea Mist','of Sharp Current'],
    },
    {
      culture: 'Larimar Tabaxi',
      style: 'Desert-adapted naming tradition; Larimar is considered the Tabaxi homeland, with names often referencing minerals, lizards, or the great walls.',
      male: ['Basks-in-Sandglass','Climbs-the-Wall','Drinks-Deep-Crystal','Rides-Komodo-Back','Watches-the-Worm'],
      female: ['Carries-Clear-Water','Cuts-Fine-Crystal','Finds-the-Vein','Reads-the-Wall','Runs-on-Red-Sand'],
      family: ['of Daeros\'s Gift','of Deep Crystal','of Komodo\'s Back','of Red Sand','of the Great Wall'],
    },
  ],
  Kenku: [
    {
      culture: 'Dock Echo Flocks',
      style: 'Borrowed sounds, often transcribed as short marker names.',
      male: ['Click','Rattle','Scrape','Skirl','Tap'],
      female: ['Chime','Cricket','Hush','Peal','Whistle'],
      family: ['Black Feathers','Broken Bell','Crow Banner','Gray Wing','Rope Perch'],
    },
  ],
  Firbolg: [
    {
      culture: 'Cochumat Root-Kin',
      style: 'Old grove names tied to season and place.',
      male: ['Aeron','Bramble','Fenric','Ivor','Kerrin','Mossan','Rhuv','Tarn','Weylin','Yorren'],
      female: ['Asha','Briala','Eirys','Fenna','Ilyse','Merris','Nuala','Rhosyn','Sylra','Tavia'],
      family: ['Amberroot','Briarhand','Greenmantle','Mosswhisper','Oakveil','Reedwalker','Rootbound','Thornbloom','Valefern','Wildbark'],
    },
  ],
  Goliath: [
    {
      culture: 'Thule Highland Clans',
      style: 'Short given names plus earned deed surnames.',
      male: ['Aukan','Eglath','Gauthak','Korth','Lo-Kag','Manneo','Maveith','Rangrim','Thornn','Vaunea'],
      female: ['Ariok','Gae-Al','Kava','Nalla','Orilo','Pethani','Thalai','Uthal','Vauna','Yesha'],
      family: ['Bearkiller','Cloudpiercer','Frostrunner','Highstone','Mammothheart','Ridgewalker','Skysunder','Stormcaller','Tundraborn','Wolfrunner'],
    },
    {
      culture: 'Marrow Fields Exile',
      style: 'Stark, functional names used by those banished to the ice sheet; often a single word or sound.',
      male: ['Cold','Flint','Grim','Hard','Numb','Pale','Scar','Still','Stone','Wait'],
      female: ['Ash','Bare','Chill','Frost','Husk','Ice','Last','Salt','Stark','Void'],
      family: ['of the Banished','of the Ice','of the Last Camp','of the Long Night','of the Marrow'],
    },
  ],
  Warforged: [
    {
      culture: 'Department of War Forge-Line',
      style: 'Serial-designator naming with optional self-chosen call signs.',
      male: ['AG-3 Corven','AG-7 Roland','Bastion-12','DoW Unit Kestrel','Forgeguard M-4'],
      female: ['AG-2 Elira','AG-9 Veyla','Aegis-5','DoW Unit Lumen','Wardframe N-1'],
      family: ['of Atlas Division','of Blacksite Nine','of Cahill Annex','of Foundry Delta','of North Bastion'],
    },
  ],
  Kobold: [
    {
      culture: 'Maddox Warren',
      style: 'Fast monosyllabic names common in tunnel crews.',
      male: ['Bix','Drik','Krik','Mek','Nip','Rik','Skab','Tik','Vek','Zrik'],
      female: ['Izz','Kez','Lix','Nix','Pik','Rizz','Sik','Tiz','Vix','Zez'],
      family: ['Cindertail','Deepscratch','Dustsnout','Ironclaw','Quicktongue','Redscale','Sootpaw','Sparktooth','Tunnelstep','Underflame'],
    },
  ],
};

export const NAME_SPECIES_OPTIONS = Object.keys(NAME_DATA_BY_SPECIES);

export function getNameCultureOptions(species?: string): string[] {
  if (!species) {
    const seen = new Set<string>();
    for (const speciesName of NAME_SPECIES_OPTIONS) {
      const cultures = NAME_DATA_BY_SPECIES[speciesName] ?? [];
      for (const entry of cultures) seen.add(entry.culture);
    }
    return [...seen];
  }
  return (NAME_DATA_BY_SPECIES[species] ?? []).map(entry => entry.culture);
}

export interface GeneratedName {
  name: string;
  gender: NameGender;
  species: string;
  culture: string;
  style: string;
}

export function generateName(options: {
  species?: string;
  culture?: string;
  gender?: NameGender | 'Any';
}): GeneratedName {
  const species = options.species && NAME_DATA_BY_SPECIES[options.species]
    ? options.species
    : pick(NAME_SPECIES_OPTIONS);
  const culturePool = NAME_DATA_BY_SPECIES[species] ?? [];
  const selectedCulture = options.culture
    ? culturePool.find(entry => entry.culture === options.culture)
    : undefined;
  const cultureTable = selectedCulture ?? pick(culturePool);
  const gender: NameGender = options.gender && options.gender !== 'Any'
    ? options.gender
    : pick<NameGender>(['Male','Female']);
  const firstNamePool = gender === 'Female' ? cultureTable.female : cultureTable.male;
  const firstName = pick(firstNamePool);
  const includeFamily = cultureTable.family.length > 0 && Math.random() > 0.2;
  const familyName = includeFamily ? ` ${pick(cultureTable.family)}` : '';

  return {
    name: `${firstName}${familyName}`,
    gender,
    species,
    culture: cultureTable.culture,
    style: cultureTable.style,
  };
}

const NPC_FIRST_NAMES_MALE = [
  'Aldric','Bastian','Caelan','Dorian','Emrys','Faolan','Gavric','Hadwin',
  'Idris','Jasper','Kern','Leoric','Maddox','Niall','Oswin','Percival',
  'Quillan','Rowan','Saren','Theron','Ulric','Vance','Wren','Xander','Yoren','Zephyr',
  'Nathren','Roland','Brom','Erris','Gwalthen','Taras','Jorek','Nethor',
  'Alexei','Oskoris','Craig','Tavren','Derric','Cairn','Gurn','Marek',
  // Varkeshi & regional additions
  'Aldren','Caelus','Estren','Halvic','Meren','Stellan','Tycho','Brek','Dronn','Garl',
  'Amren','Beljur','Daelith','Emir','Kalen','Orin','Saben','Torin',
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
  // Varkeshi & regional additions
  'Astra','Celindra','Iselle','Lynnara','Meridia','Selene','Stellara','Vesna','Zephyra',
  'Darra','Fenn','Hessa','Mira','Reen','Tala','Vessa','Wyn',
  'Alma','Berylla','Chrysa','Druza','Lazira','Opala','Sabra','Sapphira','Topaza',
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
  // Varkeshi & regional additions
  'Aldenmere','Brightspire','Celesmere','Highmast','Meridon','Starcrest','Stormguard',
  'Bogrest','Deepmaw','Driftmarsh','Gallowbend','Mirefang','Reedwatch',
  'Al-Saba','Crystalvein','Daerosi','Deepcutter','Gemcrest','Yorian',
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
  // Varkeshi & regional additions
  'Varkeshi Meridian Order Navigator','Varkeshi Admiralty Officer','High House Factor',
  'Celestial Chart Scribe','Varklamon Clan Elder','Varklamon Landshark Handler',
  'Gathering of Reeds Speaker','Swamp Herbalist (Varklamon)','Larimar Crystal Merchant',
  'Larimar Crystal Cutter','Larimar Royal Guard','Daeros Temple Priest',
  'Sandworm Watcher','Komodo Lizard Handler','Gnoll Warden (Chogoran Steppe)',
  'Conglomerate Company Town Manager','Conglomerate Acquisitions Agent',
  'Crystal Dragon Cult Member (Larimar)','Moonshatter Bay Salvager',
  'Cael\'Thir Exile (reluctant)','Marrow Fields Survivor',
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
  // Varkeshi & regional additions
  'The measured formality of a Varkeshi Admiralty officer who views emotional displays as structural failures.',
  'Varkeshi celestial conviction — genuinely believes the stars are a form of communication and that failing to read them is a moral failing.',
  'Varklamon clan pragmatism: respects only demonstrated competence, has no patience for abstract authority, and is very good at noticing when a landshark is about to do something.',
  'Larimar merchant warmth — genuinely gregarious, excellent at reading people, and slightly condescending about anyone who doesn\'t understand crystal grading.',
  'The guarded pride of someone who grew up in Larimar\'s walls and has very strong feelings about what it means to live under the protection of a god\'s gift.',
  'The blunt efficiency of a Conglomerate company town manager who has long since stopped pretending the company\'s interests and the people\'s interests align.',
  'Chogoran Steppe survivor quiet — speaks carefully, watches exits, and is constitutionally incapable of relaxing indoors since the gnoll raids began increasing.',
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
  // Varkeshi & regional additions
  'Is a member of the Larimar crystal dragon cult and has been quietly redirecting Beljuril shipments toward the ritual to raise the dead dragon under the city.',
  'Knows that the Conglomerate was built on the ruins of a magocracy whose leader is still alive — a chronomancer who has been very patient for a very long time.',
  'Is a Varkeshi High House member operating in civilian disguise; the Admiralty sent them to assess whether this city is worth incorporating into their trade network. It might be.',
  'Was present during Sarseth\'s last recorded interaction with the world before his Slumber and cannot explain why they are still alive several centuries later.',
  'Knows that Larimar is built on a dead crystal dragon and has been consulting the dragon\'s soul — which is not entirely cooperative — about the cult\'s plans.',
  'Has seen the inside of the Conglomerate\'s company town operation and knows that the workers\' contracts, properly read, amount to indefinite indentured servitude. Has not yet decided what to do about this.',
  'Was part of the 430 PS elven crusade against Yeenoghu\'s Maw in a past life — or so they dream, in disturbing detail. The crusade failed. The crusaders are still in the Abyss. They\'re not sure which they are.',
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
  // Varkeshi & regional additions
  'Compulsively orients themselves by the stars — even indoors, even during the day, checking through windows and calculating.',
  'Uses nautical or celestial metaphors for everything, a Varkeshi Admiralty habit that reads as pretension outside the Isles.',
  'Cannot enter shallow water without scanning it first — a Varklamon reflex for landshark territorial markers.',
  'Grades everything they eat, wear, or use on a mineral-purity scale, the way a Larimar crystal merchant grades Beljuril.',
  'Has a strong reflexive distrust of anything the Conglomerate touches — will check produce for company branding before buying it.',
  'Consistently underestimates distances on maps unless the map uses celestial reference points; grew up in Varklamon where roads are waterways.',
  'Glances involuntarily at the ground in open desert or grassland — an unconscious sandworm-watch reflex that takes years to unlearn.',
  'Refers to Alaruel\'s soul weaponry program in hushed tones and changes the subject with obvious deliberateness when pressed.',
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
  // Varkeshi & regional additions
  'Complete the hundred-route navigation certification of the Varkeshi Meridian Order, which will confer full Admiralty standing — and stop the High Houses from dismissing everything they say.',
  'Find a way to break the Conglomerate\'s grip on their home town\'s water supply before the workers\' contracts expire and become permanent.',
  'Reach the Larimar crystal dragon\'s soul in the royal vault before the cult does, and either destroy it or warn the royal family about what the cult intends.',
  'Prove to the Varklamon Gathering of Reeds that the Conglomerate\'s encroachment on swamp territory is not a trade opportunity but an extinction threat.',
  'Chart the Moonshatter Bay meteor craters accurately enough that the Varkeshi Admiralty will accept the map — and stop charging the bay as "unnavigable" on official charts.',
  'Find out what Sarseth\'s Slumber actually means — whether it is rest, death, or something else — before the world needs him awake again.',
  'Get their family out of the Conglomerate\'s company town before the next contract renewal makes leaving legally impossible.',
  'Reach Cael\'Thir. Not for any particular reason anyone has been willing to explain. Just: get there, before something they will not name makes it impossible.',
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
  // Varkeshi & regional additions
  'Varkeshi High House-appointed governor, nominally answerable to the Admiralty in Varkesh',
  'Varklamon Clan Circle of elders, operating by collective decision during normal times and by the Gathering of Reeds during crises',
  'Larimar-style mineral monarchy: the ruler holds legitimacy through custodianship of the crystal wealth and consultation of the city\'s divine or draconic relics',
  'Daeros temple council — the god\'s gift of the walls confers ongoing religious authority over settlement governance',
  'Conglomerate company board — every civic function is technically a division of the company; there is no meaningful distinction between employment and citizenship',
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
  // Varkeshi & regional additions
  'a Varkeshi island outcrop — precise, fortified, with a harbour designed for control rather than welcome',
  'the tangled Varklamon waterways, where the settlement is built on stilts and platforms over brackish swamp',
  'the deep desert outside Larimar\'s great walls, where the sandworms are a fact of life and water is a form of wealth',
  'the Chogoran Steppe, where the vast open grassland is interrupted by the distant wrongness of Yeenoghu\'s Maw on the horizon',
  'the rim of the Moonshatter Bay crater fields, where the ground is still faintly magnetic and meteoric iron surfaces after heavy rains',
  'the Yorian Mountain foothills, where the crystal-rich geology makes the local water run faintly luminescent at night',
  'the Marrow Fields fringe, where the ice sheet begins and the last reliable trees are a two-day walk behind you',
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
  // Varkeshi & regional additions
  'A Meridian Order celestial observation post — a small, impeccably maintained tower staffed by one navigator who has opinions about everyone.',
  'A landshark breeding pen at the settlement\'s edge, with a handler who takes the cultural significance of their animals entirely seriously and the animals\' danger not seriously enough.',
  'A Larimar water crystal trading post where the crystals are kept in locked cases and the prices are posted in both gold and Conglomerate Credits — and the exchange rate is neither fair nor negotiable.',
  'A sandworm monitoring station: a simple stone structure with a vibration reader embedded in the floor, checked three times daily, and evacuated when it reads above a certain threshold.',
  'An old Conglomerate company store that has absorbed every independent business in the settlement over the past decade, one acquisition at a time.',
  'A public notice board showing Conglomerate contracts available to locals — dense with fine print and written to assume bad faith on the contractor\'s part.',
  'A Daeros shrine outside the walls — small, modest, and attended more carefully than the settlement\'s main temple, because the walls are a daily reminder that the god\'s gifts are real.',
  'A crater of meteoric iron from Moonshatter Bay, partially mined, with tools and materials left mid-work. The workers stopped coming three weeks ago and nobody has gone to check.',
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
  // Varkeshi & regional additions
  'The Varkeshi Admiralty has declared this stretch of coastline a "controlled navigation corridor" — which means local fishing boats now need Meridian Order certification to operate, effective immediately.',
  'Gnoll raiding parties from the Chogoran Steppe have been ranging further than their usual territory. The Maw is producing more of them than usual. The crusade that was meant to stop this is still failing in the Abyss.',
  'The Larimar water crystal supply that the local alchemist depends on has dried up. Larimar has made the crystals illegal to export — something about the dragon under the city needing them. The alchemist is not handling this well.',
  'Sandworm activity near the settlement has increased significantly. The Daeros shrine keeper says the blessing needs renewal. The shrine keeper has also been saying this needs a significant donation to accomplish.',
  'The Conglomerate has opened a company store on the main street. It undersells every existing merchant by thirty percent. The existing merchants have three months of savings between them.',
  'A Varklamon clan has declared traditional water rights over the river that the settlement uses for trade. The clan has Deepmaws. The settlement does not.',
  'The Varkeshi High House that controls the nearest port has quietly doubled docking fees. The official explanation involves "celestial navigation infrastructure maintenance." Nobody believes this.',
  'Meteoric iron from the Moonshatter Bay fields is showing up in the black market at prices that suggest someone has found a major new deposit. The Varkeshi Admiralty and the Conglomerate are both asking questions.',
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
  // Varkeshi & regional additions
  'The careful formality of a Varkeshi-influenced port: everyone is polite, measured, and quietly assessing whether you are worth knowing.',
  'The watchful pragmatism of a Varklamon settlement: strangers are tolerated, studied, and not trusted until they\'ve demonstrated something useful.',
  'Larimar\'s particular energy — colourful, trade-obsessed, and undercut by the quiet awareness that the walls are a gift from a god and the thing under the city is not entirely dead.',
  'The specific tension of a settlement in Conglomerate territory that remembers being independent; every transaction has the quality of something being slowly taken.',
  'Chogoran Steppe edge-of-the-frontier grim: people here have the Maw on the horizon and the gnoll raids in living memory. They are not afraid. They are past afraid.',
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
  // Varkeshi & regional additions
  'A Varkeshi Meridian Order navigator passed through last month, spent three days studying the sky, said nothing to anyone, and left before dawn on the fourth day. The locals cannot tell if this is normal for them or not.',
  'The gnolls to the east have stopped raiding. They\'ve been stopping for a month. Experienced people on the Steppe say that\'s when you should start worrying.',
  'Someone has been buying Larimar water crystals in bulk, through intermediaries, paying twice the black market rate. Larimar has made export illegal. The buyer knows this and doesn\'t care.',
  'The Conglomerate\'s acquisitions agent has been seen meeting with the settlement\'s largest landowner three times in two weeks. The landowner\'s employees are updating their contracts.',
  'A salvager from Moonshatter Bay arrived saying they\'d found something under the meteoric iron deposits — not a crater, not iron, something that was already there when the meteor hit.',
  'The dead in the Wastes of Eternity don\'t just stay preserved. Word from a Marrow Fields survivor is that something has been moving them. Rearranging them. Into patterns.',
  'Sarseth\'s Island has been smoking. Not like a forge — more like something very large breathing slowly under the rust and scale. It\'s always done this a little. It hasn\'t always done it this much.',
  'Larimar has stopped selling water crystals. Not slowed — stopped. The Conglomerate\'s math on this is apparently changing fast, and whatever conclusion they\'ve reached, they\'re moving forces east.',
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
