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
  // — original entries —
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
  // — new entries —
  'a gravedigger who buries only strangers', 'a troupe of actors who know too much',
  'a child who draws places they have never been', 'a messenger who never delivers bad news',
  'a retired inquisitor with failing memory', 'an alchemist who can only transmute living things',
  'a weaver whose tapestries show future events', 'a ferrywoman who charges in secrets',
  'a monastery that accepts anyone — no questions asked', 'a tax roll with a name no one recognises',
  'a cathedral whose bells ring without wind', 'a knight sworn to a house no longer in the histories',
  'a sellsword who cannot be paid enough to leave', 'a physician who insists the patient is not sick',
  'a widow whose husband was seen alive three towns over', 'a coin that always turns up heads',
  'a tower that was built in a single night', 'a treaty signed by someone long dead',
  'a locked room inside a building that has no locked rooms', 'a debt collector with no record of the debt',
  'a harbour master who logs ships that never arrive', 'a retired spy who cannot remember which side they worked for',
  'a child who speaks only in the voices of the dead', 'a road that is always busy but leads nowhere known',
  'a family crest that appears in ruins centuries older than the family', 'an inheritance with no heir and no will',
  'a quarry that produces stones already carved', 'a scholar who has burned their own life\'s work',
  'a pack of wolves that does not eat what it kills', 'a gate that opens at midnight with no one near it',
];

const PLOT_COMPLICATIONS = [
  // — original entries —
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
  // — new entries —
  'arrives with forged papers that are almost perfect',
  'is wanted in three jurisdictions under different names',
  'has been seen in two places at once — reliably',
  'is the only person who can open what needs to be opened',
  'keeps returning to a place despite swearing they never will',
  'has outlived every witness to what they did',
  'is being used as bait by someone who has not told them',
  'possesses an object that does not react to them the way it should',
  'carries a letter of introduction from someone who died last winter',
  'speaks a language that has no living speakers',
  'has recently changed religions — twice',
  'is the subject of a prophecy they have never been told about',
  'is paying too much attention to exits',
  'has a price on their head that someone keeps cancelling',
  'was released from prison yesterday and has been busy ever since',
  'is being followed by someone who is also being followed',
  'refuses to sleep in any building with more than one door',
  'keeps a list of names that gets shorter over time',
  'is the only person in the region who does not fear what everyone else fears',
  'was reported dead by someone who had every reason to know',
];

const PLOT_TWISTS = [
  // — original entries —
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
  // — new entries —
  'The victim chose this.',
  'The party has been here before — they just don\'t remember it.',
  'There is a third party no one has accounted for.',
  'What they were told is true — but so is the opposite.',
  'The threat is already inside.',
  'The one person who could end this refuses to.',
  'The right answer died with the last person who knew it.',
  'Completing the task makes someone else\'s much worse.',
  'The danger was never the thing they were warned about.',
  'Someone in the party knows more than they have said.',
  'The person they were sent to stop already stopped themselves.',
  'It was a test — and the party has already failed it.',
  'What they\'ve been protecting is what everyone else has been hunting.',
  'The information was accurate. The interpretation was wrong.',
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
  // — original entries —
  'innkeeper', 'blacksmith', 'hedge wizard', 'tax collector', 'grave robber',
  'disgraced noble', 'ship captain', 'herbalist', 'beggar-king', 'cartographer',
  'bounty hunter', 'court jester', 'travelling monk', 'fence', 'militia captain',
  'orphan turned thief', 'retired soldier', 'doomsday prophet', 'midwife',
  'rat catcher', 'glassblower', 'poisoner', 'sellsword', 'librarian',
  'siege engineer', 'debt collector', 'forger', 'failed alchemist', 'animal trainer',
  'tooth-puller', 'chandler', 'spy posing as a merchant', 'refugee scholar',
  'disbarred magistrate', 'undertaker', 'tattooist', 'pardoned pirate',
  'blind cartomancer', 'travelling surgeon', 'toll collector', 'arena champion',
  // — new entries —
  'excommunicated priest', 'disowned heir', 'reformed cultist', 'exiled magistrate',
  'hedge knight with no lord', 'beggar with a noble accent', 'dockworker who counts ships',
  'keeper of a wayshrine', 'pardoned war criminal', 'circus strongman between engagements',
  'self-appointed town historian', 'unlicensed moneylender', 'river pilot',
  'court poisoner in retirement', 'interpreter for the dead', 'locksmith who forgets combinations',
  'ex-inquisitor turned penitent', 'taxidermist', 'bone-setter', 'runecarver',
  'portrait painter who flatters nobody', 'professional mourner', 'census taker',
  'bridge warden', 'failed prophet', 'keeper of forbidden books', 'salt merchant',
  'mapmaker of places that don\'t exist yet', 'wandering duelist', 'orphanage warden',
  'ship\'s surgeon between postings', 'pardoned heretic', 'city gatekeeper',
];

const NPC_QUIRKS = [
  // — original entries —
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
  // — new entries —
  'greets everyone as if they\'ve met before',
  'apologises for things they had nothing to do with',
  'checks every door twice before passing through',
  'never uses someone\'s name after learning it',
  'always positions themselves near a window',
  'offers food to everyone they speak with',
  'refers to themselves in the third person when nervous',
  'has an opinion on every blade they notice',
  'corrects accents without realising they\'re doing it',
  'gives directions exclusively in landmarks that no longer exist',
  'mistrusts anyone who doesn\'t have calloused hands',
  'names everything they own',
  'refuses to describe anyone as dead — only "no longer present"',
  'keeps their hands visible at all times',
  'has memorised the layout of every building they\'ve ever been in',
  'repeats the last word someone said before responding',
  'flinches at the sound of bells',
  'is always the first to notice when someone new enters a room',
  'never sits — only crouches or stands',
  'asks the price of everything, including things that aren\'t for sale',
  'can\'t resist straightening things that are crooked',
  'bows to everyone slightly, regardless of rank',
  'always completes a sentence even when interrupted',
  'starts stories from the end and works backwards',
];

const NPC_SECRETS = [
  // — original entries —
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
  // — new entries —
  'They faked their own death seven years ago.',
  'They are the one who sent the anonymous warning.',
  'They are in love with someone they are supposed to be hunting.',
  'They have already reported this conversation to someone.',
  'They have been living under a stolen identity for a decade.',
  'They know the party\'s real purpose here — even if the party doesn\'t.',
  'They are the reason the last group that came through never returned.',
  'They have been paid to make the party fail.',
  'They are protecting someone at the direct cost of their own life.',
  'They have evidence that could destroy a powerful person and don\'t know what to do with it.',
  'They have been following the party since before they arrived.',
  'They were once in the party\'s exact position — and made the wrong choice.',
  'They are not afraid of the threat. They are the threat.',
  'They have already tried to stop what is coming. It didn\'t work.',
  'They recognise one of the party\'s names from a list they wish they hadn\'t read.',
];

const NPC_MOTIVATIONS = [
  // — original entries —
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
  // — new entries —
  'is trying to repay a debt no one alive remembers',
  'wants to be forgotten — completely, permanently',
  'is protecting a secret that would undo everything they have built',
  'has decided this is the last thing they will do before stopping',
  'is trying to reach someone before someone else does',
  'needs a specific object returned to a specific place before the next full moon',
  'is slowly trying to undo a decision they made years ago',
  'wants the truth — not justice, not safety, only the truth',
  'is trying to finish what someone else started and never told them about',
  'has been given one chance to make this right and intends to use it',
  'wants to live long enough to see one specific person fail',
  'is trying to find out how much the party actually knows',
  'needs witnesses — trustworthy ones, for reasons they won\'t explain yet',
  'is holding something together through sheer will and will not say what',
  'is stalling — quietly, carefully, for reasons that are not obvious',
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
  // — original entries —
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
  // — new entries —
  'a waystation carved into a glacier', 'a market built on a collapsed aqueduct',
  'a town that exists only during one season', 'a monastery that doubles as a prison',
  'a road that is also a river for half the year', 'a city whose founding myth is obviously false',
  'a settlement built entirely around a single well', 'a canyon fortress with no visible entrance',
  'a village of exiles from three different nations', 'a trading post at the edge of a dead zone',
  'a lighthouse in a desert', 'a court of law that sits in permanent session',
  'a graveyard town where the living are outnumbered', 'an underground bathhouse complex',
  'a bridge wide enough to live on', 'a forest village connected entirely by rope walks',
  'a ruin that was rebuilt without clearing the original rubble', 'a port town with no ocean access',
  'a military camp that became a city and forgot to stop', 'a city divided by a wall no one remembers building',
  'a valley sealed off by a landslide three generations ago', 'a crater lake with an island that wasn\'t there last year',
  'a mining camp built over what the miners refuse to describe', 'a wayshrine that attracts the wrong kind of pilgrim',
  'a city whose name means something different in every language', 'a keep used simultaneously by two rival lords',
  'a village where every building faces away from the centre', 'a cave network with permanent residents and their own laws',
  'a disputed border town claimed by three nations', 'a mesa settlement with no path to the top anyone will show you',
];

const LOC_ATMOSPHERE = [
  // — original entries —
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
  // — new entries —
  'where the same dog appears at every corner',
  'that smells of candle wax and old rain',
  'where the locals finish each other\'s sentences without noticing',
  'that has noticeably fewer people than its buildings suggest it should',
  'where the food tastes slightly wrong, in ways that are hard to name',
  'that seems to have been recently cleaned of something',
  'where the locals greet everyone as if they\'ve been expected',
  'where laughter stops the moment a stranger enters earshot',
  'that appears smaller from the inside than from the outside',
  'where there are no old people and no one remarks on this',
  'where every fire is kept burning, even in the heat',
  'that hums — very faintly — in the early hours before dawn',
  'where every conversation stops and restarts with a new subject when certain topics arise',
  'that seems to have only one road in, regardless of which direction you approach from',
  'where the water tastes of something not quite copper and not quite salt',
  'where the locals give directions in past tense',
  'that has been rebuilt so many times the original is unreachable beneath the layers',
  'where the newest buildings are the most deteriorated',
  'that is on every traveller\'s route but never remembered in detail',
  'where doors are never fully closed, even at night',
];

const LOC_HOOKS = [
  // — original entries —
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
  // — new entries —
  'The locals pay a tax to no authority anyone can identify.',
  'Something has been recently removed — and the space it left behind is conspicuous.',
  'Three different factions believe they have a prior claim.',
  'There are more people arriving than leaving, and no one is keeping count.',
  'The founding records have been destroyed — recently.',
  'A road that used to lead here no longer does.',
  'Something that should take hours to reach is now much closer than it should be.',
  'The place has a name that no one uses aloud.',
  'It was condemned. Clearly someone decided that didn\'t apply to them.',
  'Something is being built here at night that no one discusses in the day.',
  'The party has been expected — the locals just won\'t say by whom.',
  'An old agreement is about to expire, and nobody has prepared for what comes next.',
  'There is an absence at the centre of the place — a building, a person, a function — that nobody acknowledges.',
  'The place is neutral ground and that neutrality is being tested.',
  'Something happened here exactly one year ago, and it is about to happen again.',
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
  // — original entries —
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
  // — new entries —
  'A town crier is announcing an event that everyone around them seems to already know happened',
  'A cart loaded with personal belongings is moving away from the city at speed',
  'Someone is distributing food to a crowd that is not hungry and will not say why they are taking it',
  'A building is being emptied very quietly in the middle of the night',
  'Two armed groups are standing at an impasse and have been for several hours',
  'A stranger is asking for directions to a place that doesn\'t exist — but their map clearly shows it',
  'A wounded person is being refused treatment by every healer in town for reasons no one will state',
  'A contract is being posted that seems extremely generous for what it asks',
  'A very old person is demanding to speak to a person who has been dead for twenty years',
  'A crowd is dispersing quickly and all of them are looking at the ground',
  'An election is happening. The result has already been decided — not by anyone who will admit it',
  'A bridge has collapsed. It was inspected yesterday and certified sound',
  'A child is holding something that a great many people are pretending not to notice',
  'Two people are clearly conducting a negotiation in a language they have invented on the spot',
  'A religious procession is moving through town and the locals are boarding up their windows',
  'Someone has released every animal in the market and is watching the chaos from a rooftop',
  'A courier has collapsed in the street — they are not injured, they simply refuse to go any further',
  'The party overhears one side of a conversation that sounds like the other side is already dead',
  'Someone is paying for drinks all night, for everyone, and will only say that it\'s a special occasion',
  'A person the party was told is dangerous is sitting in the sun feeding pigeons',
  'A crowd is gathered around someone reading a proclamation. The reader keeps stopping and starting again',
  'A road that was passable this morning is now blocked — not by debris, but by a line of people standing still',
];

const ENC_COMPLICATIONS = [
  // — original entries —
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
  // — new entries —
  'The party has been here before — the evidence is faint but unmistakeable.',
  'The window to act is closing faster than it appears.',
  'Every option available benefits someone who shouldn\'t benefit.',
  'Someone in the scene knows who the party is and is pretending they don\'t.',
  'The situation is being misrepresented by someone who believes they are helping.',
  'What looks like conflict is actually a performance — but for whose benefit?',
  'One of the parties involved is already dead. Nobody here has noticed.',
  'The real problem is underneath the visible one.',
  'Someone has already made a choice here that cannot be unmade — they just haven\'t revealed it yet.',
  'The law is clear. It is also clearly wrong.',
  'What the party has been told and what is actually happening share only the location.',
  'There is one person who could solve this instantly, and they are choosing not to.',
  'Getting involved at all constitutes taking a side.',
  'The party is the third group to encounter this today. The first two are nowhere to be found.',
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
  // — original entries —
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
  // — new entries —
  'a lodestone that points toward regret', 'a quill that writes in a second ink no one else can see',
  'a monocle with no frame', 'a small iron cage containing nothing visible',
  'a set of scales balanced on a single hair', 'a folded letter that rewrites itself',
  'a thimble that fits no finger naturally', 'a rope that coils itself',
  'a pair of shears that cuts what isn\'t there', 'a compass rose on loose vellum',
  'a dried flower that has not lost its colour', 'a hollow tooth stoppered with wax',
  'a short candle that has never been lit', 'a pair of iron cufflinks shaped like doors',
  'a wooden hand with articulated fingers', 'a lens ground from black glass',
  'a pouch that always feels full but is always empty', 'a small anvil that fits in a palm',
  'a ring that leaves no mark on the skin', 'a wristband of woven silver wire',
  'a coin-sized mirror with no reflection', 'a length of chain with no clasp',
  'a signet ring bearing a seal no house claims', 'a folded cloth map that is always damp',
  'a small locket containing only ash', 'a button from an unfamiliar uniform',
  'a flat stone with a single carved eye', 'a glass bottle containing a single dried seed',
  'a ribbon that ties itself', 'a small hourglass in which the sand flows upward',
];

const ITEM_PROPERTIES = [
  // — original entries —
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
  // — new entries —
  'that ages everything it touches by exactly one day',
  'that cannot be seen by anyone who is being dishonest',
  'that rattles when carried over running water',
  'that is slightly too cold to be comfortable in the hand',
  'that records the last sound heard in any room it is placed in',
  'that will not function within sight of a temple',
  'that causes the bearer to be overlooked in crowds',
  'that leaves a residue on the fingers that smells of rain',
  'that shows a faint image on its surface at dusk — different each time',
  'that cannot be placed on a table without sliding to face north',
  'that the bearer forgets they are carrying, repeatedly and without explanation',
  'that grows heavier as the bearer moves further from where they were born',
  'that makes plants lean toward it when left nearby overnight',
  'that vibrates faintly when within fifty feet of a door that has been sealed by magic',
  'that causes its bearer\'s shadow to lag slightly behind',
  'that cannot be locked away — it is always where the bearer would naturally reach for it',
  'that is warm in darkness and cold in light',
  'that shows a partial map of its current surroundings etched in condensation',
  'that gives its bearer the persistent sense of being followed — which occasionally proves correct',
  'that will not let itself be used to harm a child',
  'whose surface shows faint writing that is never the same twice and never quite readable',
  'that smells of something personal to whoever holds it',
];

const ITEM_HISTORIES = [
  // — original entries —
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
  // — new entries —
  'A child brought it to a temple and the priests refused to touch it.',
  'The last three owners all gave it away voluntarily within a week of receiving it.',
  'It is listed as evidence in a trial that was sealed by order of a court no longer in existence.',
  'A famous mage wrote one sentence about it and then stopped, mid-thought.',
  'It keeps appearing in estate inventories under different names.',
  'Every person who has drawn it in illustration got one small detail wrong — always the same detail.',
  'It was confiscated once and returned to circulation by someone without the authority to do so.',
  'Its last recorded owner requested it be destroyed. The request was ignored.',
  'A merchant paid a fortune for it, then quietly gave it to a stranger a week later.',
  'It was found inside a sealed room that had not been opened in living memory.',
  'There are records of it in three collections simultaneously, from the same year.',
  'The church will not say what it is, only that it should be returned to them.',
  'It changed hands seventeen times in a single decade — always through misfortune.',
  'An expedition was mounted to find it. The expedition returned without it and refused to say where they had been.',
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
  // — original entries —
  'Ael', 'Aer', 'Al', 'Ar', 'Bael', 'Bel', 'Cae', 'Cal', 'Cor', 'Dae', 'Dar',
  'Eld', 'El', 'Faer', 'Fen', 'Gal', 'Hal', 'Iri', 'Is', 'Jar', 'Kael', 'Kel',
  'Lae', 'Lor', 'Mae', 'Mal', 'Mor', 'Nae', 'Nar', 'Or', 'Per', 'Quor', 'Rae',
  'Sar', 'Sel', 'Tal', 'Ther', 'Uri', 'Val', 'Var', 'Vor', 'Wyn', 'Xan', 'Yor',
  'Zar',
  // — new entries —
  'Aes', 'Ath', 'Bran', 'Bryn', 'Cael', 'Cas', 'Cern', 'Dor', 'Dren', 'Dris',
  'Eir', 'Eld', 'Emer', 'Esh', 'Fael', 'Fin', 'Gaer', 'Geth', 'Gor', 'Gwyn',
  'Har', 'Hel', 'Ien', 'Il', 'Ith', 'Kal', 'Keth', 'Lan', 'Lars', 'Lei',
  'Lin', 'Lyr', 'Maer', 'Mar', 'Mer', 'Myr', 'Naer', 'Ner', 'Nir', 'Nov',
  'Oer', 'Oel', 'Olm', 'Omr', 'Par', 'Pel', 'Pyr', 'Ran', 'Reth', 'Ril',
  'Ryn', 'Ser', 'Sil', 'Sol', 'Syr', 'Tal', 'Tar', 'Tel', 'Thal', 'Tor',
  'Ul', 'Uran', 'Urr', 'Vael', 'Vel', 'Ven', 'Vir', 'Vol', 'Wael', 'Wren',
  'Xael', 'Xir', 'Yael', 'Yel', 'Yen', 'Zer', 'Zil', 'Zyr',
];

const NAME_MIDDLES = [
  // — original entries —
  'a', 'ae', 'ai', 'al', 'an', 'ar', 'e', 'ea', 'el', 'en', 'er', 'i', 'ia',
  'il', 'in', 'ir', 'o', 'oa', 'ol', 'on', 'or', 'u', 'ul', 'un', 'ur', 'y',
  // — new entries —
  'ael', 'aen', 'aer', 'ais', 'aith', 'aly', 'ami', 'ana', 'ani', 'anu',
  'ara', 'are', 'ari', 'aro', 'aru', 'ath', 'avi', 'awi', 'axi', 'aya',
  'eil', 'ein', 'eir', 'eis', 'ela', 'ele', 'eli', 'elo', 'emi', 'eni',
  'era', 'ere', 'eri', 'esh', 'eth', 'evi', 'ile', 'ili', 'ima', 'imi',
  'ini', 'ira', 'ire', 'ith', 'ivi', 'iya', 'oli', 'omi', 'oni', 'ora',
  'ori', 'oth', 'ovi', 'owi', 'oxa', 'oya', 'ula', 'ule', 'uli', 'umi',
  'uni', 'ura', 'uri', 'uth', 'uvi', 'uwa', 'yel', 'yen', 'yla', 'yli',
];

const NAME_SUFFIXES = [
  // — original entries —
  'anor', 'aris', 'ath', 'ael', 'bor', 'driel', 'dan', 'dorn', 'dris', 'eth',
  'eros', 'ian', 'ira', 'is', 'ion', 'ius', 'lith', 'lor', 'lyn', 'mir',
  'mond', 'nar', 'nor', 'or', 'orin', 'ra', 'rion', 'ric', 'ros', 'sar',
  'seth', 'thas', 'thir', 'thus', 'tor', 'vyr', 'wyn', 'xis', 'yra', 'zor',
  // — new entries —
  'ael', 'aen', 'aer', 'aes', 'aith', 'alas', 'alen', 'alis', 'alor', 'alys',
  'amas', 'amen', 'amis', 'amor', 'amus', 'andor', 'anel', 'anis', 'anor', 'anus',
  'aram', 'aran', 'aras', 'arel', 'aren', 'ares', 'aret', 'arik', 'aris', 'aros',
  'aryn', 'asal', 'asan', 'asar', 'asis', 'ason', 'asor', 'asus', 'avar', 'avas',
  'aven', 'aver', 'avin', 'avir', 'avis', 'avon', 'avor', 'avur', 'bael', 'baen',
  'bren', 'brin', 'bron', 'brul', 'brun', 'bryn', 'burn', 'byr', 'byrd', 'byrn',
  'cael', 'caen', 'caer', 'caes', 'call', 'camn', 'carl', 'carn', 'caron', 'carr',
  'dael', 'daen', 'daer', 'dain', 'dair', 'dais', 'dalen', 'dalis', 'daln', 'dans',
  'darel', 'daren', 'dares', 'daret', 'darik', 'daris', 'daros', 'daryn', 'davel', 'daven',
  'deln', 'delos', 'dels', 'delt', 'delyn', 'demer', 'demir', 'demis', 'demor', 'demus',
  'don', 'donar', 'donel', 'dones', 'donis', 'donor', 'donus', 'doral', 'dorel', 'doren',
  'fael', 'faen', 'faer', 'fail', 'fair', 'fais', 'falen', 'falis', 'faln', 'fans',
  'gael', 'gaen', 'gaer', 'gain', 'gair', 'gais', 'galen', 'galis', 'galn', 'gans',
  'helm', 'heln', 'helos', 'hels', 'helt', 'helyn', 'hemer', 'hemir', 'hemis', 'hemor',
  'ilan', 'ilar', 'ilas', 'ilen', 'iler', 'iles', 'ilin', 'ilir', 'ilis', 'ilon',
  'jael', 'jaen', 'jaer', 'jain', 'jair', 'jais', 'jalen', 'jalis', 'jaln', 'jans',
  'kael', 'kaen', 'kaer', 'kain', 'kair', 'kais', 'kalen', 'kalis', 'kaln', 'kans',
  'lael', 'laen', 'laer', 'lain', 'lair', 'lais', 'lalen', 'lalis', 'laln', 'lans',
  'mael', 'maen', 'maer', 'main', 'mair', 'mais', 'malen', 'malis', 'maln', 'mans',
  'nael', 'naen', 'naer', 'nain', 'nair', 'nais', 'nalen', 'nalis', 'naln', 'nans',
  'orel', 'oren', 'ores', 'orin', 'oris', 'oron', 'oror', 'orus', 'oryn', 'osal',
  'pael', 'paen', 'paer', 'pain', 'pair', 'pais', 'palen', 'palis', 'paln', 'pans',
  'rael', 'raen', 'raer', 'rain', 'rair', 'rais', 'ralen', 'ralis', 'raln', 'rans',
  'sael', 'saen', 'saer', 'sain', 'sair', 'sais', 'salen', 'salis', 'saln', 'sans',
  'tael', 'taen', 'taer', 'tain', 'tair', 'tais', 'talen', 'talis', 'taln', 'tans',
  'thael', 'thaen', 'thaer', 'thain', 'thair', 'thais', 'thalen', 'thalis', 'thaln', 'thans',
  'urel', 'uren', 'ures', 'urin', 'uris', 'uron', 'uror', 'urus', 'uryn', 'usal',
  'vael', 'vaen', 'vaer', 'vain', 'vair', 'vais', 'valen', 'valis', 'valn', 'vans',
  'wael', 'waen', 'waer', 'wain', 'wair', 'wais', 'walen', 'walis', 'waln', 'wans',
  'xael', 'xaen', 'xaer', 'xain', 'xair', 'xais', 'xalen', 'xalis', 'xaln', 'xans',
  'yael', 'yaen', 'yaer', 'yain', 'yair', 'yais', 'yalen', 'yalis', 'yaln', 'yans',
  'zael', 'zaen', 'zaer', 'zain', 'zair', 'zais', 'zalen', 'zalis', 'zaln', 'zans',
];

const NAME_TITLES = [
  // — original entries —
  'Ashborne', 'Blackbriar', 'Brightwater', 'Dawncrest', 'Duskwhisper',
  'Emberfall', 'Farsong', 'Frostvein', 'Gloamward', 'Goldthorn', 'Greyhollow',
  'Ironveil', 'Moonvale', 'Nightbloom', 'Ravenmark', 'Rimewatch', 'Runeweaver',
  'Silverfen', 'Stormcaller', 'Thornmere', 'Umberfield', 'Valeborn',
  'Whisperwind', 'Wolfward',
  // — new entries —
  'Ambershard', 'Ashveil', 'Barrowmere', 'Blackfen', 'Bleakwater', 'Bloodthorn',
  'Bonehallow', 'Brinemark', 'Cairnwatch', 'Coldmantle', 'Coppergate', 'Crestfall',
  'Cinderpath', 'Darkhollow', 'Deepvale', 'Dewmere', 'Dreadhollow', 'Driftstone',
  'Drownwatch', 'Duskfen', 'Dustmantle', 'Edgeborn', 'Embervale', 'Eventide',
  'Fallowmere', 'Farreach', 'Fenmark', 'Flintborn', 'Fogveil', 'Foxhollow',
  'Galewatch', 'Gauntmere', 'Ghostfen', 'Gilded', 'Gloomward', 'Graymere',
  'Grimwater', 'Hallowfen', 'Harrowmark', 'Hawthorn', 'Highvale', 'Hollowborn',
  'Ironfen', 'Ironmere', 'Ironmark', 'Jademark', 'Keepborn', 'Lakeward',
  'Lightborn', 'Lochveil', 'Longfall', 'Lowmere', 'Marshborn', 'Mistfall',
  'Mistgate', 'Misthollow', 'Mistmark', 'Mistmere', 'Mistveil', 'Moonborn',
  'Moonfell', 'Moongate', 'Moonhollow', 'Moonmark', 'Moorborn', 'Mossward',
  'Nightfen', 'Nightgate', 'Nighthollow', 'Nightmark', 'Nightmere', 'Nightveil',
  'Oakborn', 'Oldmere', 'Oldwatch', 'Palefen', 'Palemark', 'Pinemark',
  'Rainveil', 'Ravenmere', 'Ravenwatch', 'Redfell', 'Ridgeborn', 'Riftveil',
  'Rivermark', 'Riverwatch', 'Rockborn', 'Rootmark', 'Runemark', 'Saltfen',
  'Saltmere', 'Saltward', 'Seaborn', 'Seagate', 'Sealmark', 'Shadowfen',
  'Shadowmark', 'Shadowmere', 'Shaleborn', 'Shireborn', 'Silentmark', 'Silentmere',
  'Silentwatch', 'Silverthorn', 'Skyveil', 'Slateborn', 'Snowmark', 'Softwatch',
  'Starborn', 'Starfen', 'Stargate', 'Starmark', 'Starmere', 'Starveil',
  'Stoneborn', 'Stonegate', 'Stonemark', 'Stonemere', 'Stoneveil', 'Stonewatch',
  'Stormborne', 'Stormfen', 'Stormgate', 'Stormmark', 'Stormmere', 'Stormveil',
  'Swiftfen', 'Swiftmark', 'Swiftmere', 'Swiftwatch', 'Tallmark', 'Tallmere',
  'Thistleborn', 'Thorngate', 'Thornmark', 'Thornmere', 'Thornveil', 'Thornwatch',
  'Tidemark', 'Tidemere', 'Tidewatch', 'Timberborn', 'Tindermark', 'Trueborn',
  'Truemark', 'Truemere', 'Truewatch', 'Twilitmark', 'Umbraven', 'Underwarden',
  'Veilborn', 'Veilmark', 'Veilvale', 'Voidmark', 'Voidmere', 'Voidwatch',
  'Warden', 'Wardenmark', 'Waterborn', 'Watergate', 'Watermark', 'Watermere',
  'Wavemark', 'Wavemere', 'Wavewatch', 'Wildborn', 'Wildmark', 'Wildmere',
  'Windborn', 'Windgate', 'Windmark', 'Windmere', 'Windveil', 'Windwatch',
  'Winterborn', 'Winterfall', 'Wintermark', 'Wintermere', 'Woodmark', 'Woodmere',
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