// modules/dungeon/src/generator.ts
// Pure dungeon generation logic. No DB access, no side effects.
// All randomness flows through a seeded PRNG so results are reproducible.

import type {
  DungeonTheme, RoomSize, ContentType,
  DungeonRoom, DungeonContent, Dungeon,
  GenerateDungeonInput,
} from './types';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

function makePrng(seed: number) {
  let s = seed >>> 0;
  return function rand(): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function newId(): string {
  return (globalThis.crypto ?? require('node:crypto')).randomUUID() as string;
}

// ── Theme tables ──────────────────────────────────────────────────────────────

interface ThemeDef {
  monsters:   string[];
  traps:      string[];
  loot:       string[];
  atmosphere: string[];
  bossNames:  string[];
}

const THEMES: Record<DungeonTheme, ThemeDef> = {
  undead: {
    monsters:   ['Skeleton Warrior','Zombie Horde','Wight','Shadow','Wraith','Ghoul','Revenant','Banshee',
                 'Boneless Husk (Unity Victim)','Ambersoul-Tethered Revenant','Spectral Unity Priest',
                 'Vampire Thrall','Cursed House Cahill Guardsman','Animated Cahill Mine Foreman',
                 'Lost Soul Fragment','Weeping Wraith of Ambersoul','Undying Militant Cleric'],
    traps:      ['Pressure-plate spike pit','Bone-dust cloud','Cursed glyph','Collapsing floor',
                 'Unity ritual circle (triggers on entry)','Necrotic fog vent from old mine shaft',
                 'Soul-binding sigil (holds target in place)','Bone-splinter scatter trap',
                 'Cursed Unity effigy (fear effect on approach)'],
    loot:       ['Tarnished silver chalice','Bone-hilted dagger','Funeral urn (gems inside)','Cursed ring',"Necromancer's tome",
                 'Unity Militant clerical seal (still active)','Sealed House Cahill employee ledger',
                 'Ambersoul cathedral reliquary fragment','Corroded soul-steel vial (partial charge)',
                 'Veteran guardsman dog-tags — House Cahill insignia'],
    atmosphere: ['The air reeks of decay.','Bones crunch underfoot.','A chill clings to everything.','Shadows move against the light.',
                 'Unity prayer-marks are scratched into every surface — none of them finished.',
                 'The walls are coated in something that was blood long ago and is now just part of the stone.',
                 'A faint hum emanates from deeper in — rhythmic, like a heartbeat that is not quite right.',
                 'Old House Cahill mining carts sit rusted and full. No one has touched them in years.',
                 'The smell of ozone and decay mingles into something uniquely horrible.',
                 'Every door has been barricaded from the inside. Whatever happened, people were trying to keep something out.'],
    bossNames:  ['Undying Necromancer','Ambersoul Cathedral Sexton (reanimated)','The Last Unity Inquisitor',
                 'Cahill Deep-Foreman (soul-bound)','Revenant High Priest of the Broken Seal'],
  },
  goblin: {
    monsters:   ['Goblin Scout','Goblin Warrior','Hobgoblin Sergeant','Bugbear Ambusher','Goblin Shaman','Wolf Rider',
                 'Warclan Thule Raider','Warclan Outrider (mounted)','Thule Giant Conscript',
                 'Deserter Sell-Sword (gone feral)','Half-Orc Warclan Champion','Kobold Camp Follower (Mt. Perona exiled)'],
    traps:      ['Tripwire alarm','Net drop','Deadfall log','Greased slope','Pit with sharpened stakes',
                 'Stolen ATC alarm-bell rigged to tripwire','Crude oil-slick ignition trap',
                 'Collapsed mine-shaft deadfall (House Cahill salvage)','Stolen crossbow auto-fire rig'],
    loot:       ['Crude copper coins','Stolen merchant goods','Gnawed ration packs','Filched jewellery','Scavenged weapons',
                 'Stolen ATC shipping manifest (cargo location marked)','Looted Kewold Siege Ball equipment',
                 'Beeford Keep mead cask (still sealed)','Pilfered Leviton transit papers',
                 'Warclan war-banner (worth coin to the right collector)'],
    atmosphere: ['Crude graffiti covers the walls.','The smell of cooking fires and worse.','Laughter echoes from somewhere ahead.','Scraps of food litter the floor.',
                 'Stolen ATC crates have been repurposed as furniture. Most are still labelled.',
                 'A crude map scratched into the wall shows raid routes to nearby settlements.',
                 'Warclan Thule markings — claiming this territory as a forward staging post.',
                 'The bones of a Leviton courier are still clutching an undelivered satchel.',
                 'Someone has attempted to cook something in an old House Cahill smelting pot. It did not go well.'],
    bossNames:  ['Warchief Gragnuk','Thule Warclan Sub-Commander','Hobgoblin Pit-Boss (ex-Kewold arena)',
                 'Bugbear Enforcer (ATC deserter)','Half-Giant Raider Captain'],
  },
  arcane: {
    monsters:   ['Arcane Construct','Mage Guardian','Spell Wisp','Rune Golem','Apprentice Shade','Mirror Demon','Animated Armour',
                 'Department of War AG-Series Prototype (malfunctioning)','Society Field Agent (construct-bonded)',
                 'Leviton Levitation Engine (animate, hostile)','Burnout Unit (soul-steel degraded)',
                 'Alaruel Psychic Academy Experiment (escaped containment)','House Delaque Arcane Enforcer'],
    traps:      ['Arcane feedback rune','Teleport trap (random room)','Force cage','Mana drain field','Explosive sigil',
                 'Department of War containment field (still active)','Soul-extraction array (partial charge)',
                 'Leviton anti-tampering ward','Society auto-destruct sigil on classified research',
                 'Psychic feedback emitter (confusion on failed save)'],
    loot:       ['Spell scroll','Arcane focus shard','Vial of distilled magic','Cracked crystal orb','Annotated spellbook',
                 'Department of War AG-unit schematics (classified)','Society research notes (partially burned)',
                 'Alaruel Psychic Academy field manual','Cracked Leviton levitation crystal (still functional)',
                 'Soul-steel chargepack (partial)','House Delaque encoded ledger'],
    atmosphere: ['Magical residue coats every surface.','The air hums with latent energy.','Strange lights pulse rhythmically.','Equations drift across the walls in glowing ink.',
                 'Department of War containment warnings are still posted on every door. Some have been torn down.',
                 'A Society experiment log is open on a desk, the last entry mid-sentence.',
                 'Soul-steel conduits run along the walls, most are cracked and leaking faint luminescence.',
                 'The AG-unit charging cradles are empty. Whatever was in them left in a hurry.',
                 'Leviton transport manifests cover the floor — all marked PRIORITY, all overdue.',
                 'The Psychic Academy seal is above the door. Someone has scratched ABANDONED beneath it.'],
    bossNames:  ['The Bound Arcanist','Department of War Lead Researcher (still functional, barely)',
                 'Society Prime Artificer','Rogue AG-02 Prototype','Leviton Chief Engineer (construct-possessed)'],
  },
  cult: {
    monsters:   ['Cult Initiate','Devoted Fanatic','Summoned Fiend','High Cultist','Ritual Construct','Possessed Acolyte',
                 'Unity Militant Cleric (survivor, radicalized)','House Austel Inquisitor (broken by failure)',
                 'Evening Glory Devoted (vampiric pact)','Idol-Touched Civilian (The Lost)',
                 'Duke Bayle Contract-Bound Servant','Moon Rat Intermediary (unusually intelligent)'],
    traps:      ['Blood-letting trigger','False idol (curse)','Summoning circle (random monster)','Pit of offering (acid)',
                 'Unity mass-ritual circle (still active, triggers possession)','Evening Glory consecrated ward',
                 'Idol proximity field (hallucination on entry)','Infernal contract scroll (compulsion trap)',
                 'House Austel martyrdom device (area denial)'],
    loot:       ['Ritual dagger','Cult manifesto','Unholy symbol','Darkstone idol','Blood-sealed letter',
                 'Unity doctrine pamphlet (annotated with heresies in the margins)','Evening Glory high priest vestments',
                 'Duke Bayle infernal contract (someone else signed it — who?)','Idol statuette (warm to the touch)',
                 'House Austel kill-order (still bearing valid seals)','Moon Rat encoded message cylinder'],
    atmosphere: ['Chanting can be heard, faintly.','The walls are stained with old blood.','Strange sigils cover every surface.','The shadows seem to watch.',
                 'Unity prayer-wheels still turn. There is no wind to explain it.',
                 'The hand-and-carved-heart symbol of the Unity is carved into the floor at the centre of every room.',
                 'Evening Glory shrines have been erected over older altars without removing them first.',
                 'A Duke Bayle contract is nailed to the wall. The signatory line is blank but not empty.',
                 'Idol-Touched graffiti covers the walls — faces with too many features, too symmetrically arranged.',
                 'The Moon Rat intermediaries left in a hurry. Their planning documents are still pinned up.'],
    bossNames:  ['The Bound Herald','House Austel Grand Inquisitor (survivor)','Evening Glory High Consort',
                 'Duke Bayle Emissary',"The Idol's Chosen Voice",'Moon Rat Prime Intelligence'],
  },
  nature: {
    monsters:   ['Vine Horror','Twig Blight','Dryad Corrupted','Giant Spider','Cave Bear','Root Golem','Swarm of Insects',
                 'Cochumat Jungle Tendril Horror','Root Father Aspect','Corrupted Immortal Oak Eladrin',
                 'Tenebrous Fen Shambler','Crystal-Rooted Blight (Cochumat)','Bullywug Warband (Island-touched)',
                 'Maddox the Fortunate Kobold Follower (scouting)','Carnivora Spawnling (amphibious)'],
    traps:      ['Thorn snare','Spore cloud','Entangling roots','Pitfall hidden by leaves','Poison dart plant',
                 'Cochumat crystal resonance trap (psychic damage)','Root Father resin snare (hardening)',
                 'Tenebrous Fen bog-trap (sinking, slow suffocation)','Immortal Oak fey-ward (charm effect)',
                 'Carnivora lure-scent emitter (draws wandering monsters)'],
    loot:       ['Rare herbs','Beast pelt','Natural crystal formation','Petrified wood idol','Honey from giant hive',
                 'Stable Cochumat crystal (tree-filtered, safe to use)','Root Father resin sample (alchemical value)',
                 'Immortal Oak heartwood sliver (fey-attuned)','Carnivora scale fragment (armour-grade)',
                 'Bullywug ceremonial mask','Tenebrous Fen preserved specimen (unknown species)'],
    atmosphere: ['Roots have cracked the stone walls.','Bioluminescent fungi light the way.','The sound of dripping water is constant.','Something has been nesting here.',
                 'Cochumat crystal formations protrude from the floor, humming faintly in the dark.',
                 'The Root Father\'s amber resin has seeped through the walls and hardened into bas-relief patterns.',
                 'Tenebrous Fen water has flooded the lower passages. Something moved in it when you entered.',
                 'Immortal Oak saplings grow from the ceiling, roots hanging downward like fingers.',
                 'The jungle has reclaimed this place. The architects would not recognise a single room.',
                 'Something enormous has been sleeping here. The impression in the stone is recent.'],
    bossNames:  ['The Corrupted Ancient','Root Father Aspect (partial manifestation)','Carnivora Spawnling Alpha',
                 'Corrupted Immortal Oak Dryad','Cochumat Crystal Overgrowth Elemental','Tenebrous Fen Warden'],
  },
  aberration: {
    monsters:   ['Far Realm Tendril','Mind Flayer Thrall','Gibbering Mouther','Spectral Echo','Crystal Corruption Host','Void Stalker',
                 'Ambersoul Crystal Corruption Host (advanced)','Society Experiment (lost containment)',
                 'Department of War AG-Unit (full corruption)','Idol-Touched Civilian (terminal stage)',
                 'Cochumat Corrupted Crystal Elemental','Far Realm Boundary Walker',
                 'Leviton Engineer (planar-phase accident)','Fractured Soul Construct (AG failure)'],
    traps:      ['Psychic feedback node','Reality rift (minor)','Gravity inversion plate','Madness glyph',
                 'Ambersoul crystal resonance array (corruption on contact)','Society containment ward (backfire)',
                 'Idol proximity field (identity destabilization)','Department of War psychic extraction rig',
                 'Planar boundary fracture (random teleportation)','AG-unit soul-bleed emitter'],
    loot:       ['AmberSoul fragment','Void-touched weapon','Far Realm lens shard','Aberrant ichor (alchemical)','Crystal corruption sample',
                 'Society field research notes (partially self-edited)','Stable AmberSoul crystal (rare, from Cochumat)',
                 'Department of War soul-extraction report (disturbing reading)','Cracked Far Realm lens (shows things)',
                 'AG-unit chargepack (corrupted)','Idol fragment (warm, wrong weight for its size)'],
    atmosphere: ['Reality feels thin here.','The geometry of the room is subtly wrong.','Whispering with no discernable source.','Looking directly at corners causes unease.',
                 'Ambersoul crystals jut from every surface. They hum in a frequency that sits behind the teeth.',
                 'Society warning notices are everywhere. None of them agree on what the danger actually is.',
                 'The walls show AG-unit claw-marks at a height that should have been impossible.',
                 'The Idol\'s influence is palpable here — familiar faces appear in peripheral vision, then vanish.',
                 'Department of War experimental logs are scattered across the floor. Pages are missing from all of them.',
                 'The floor is warm. Not uncomfortably so. Just wrong.'],
    bossNames:  ['The Fractured Mind','Society Prime Experiment (beyond control)',"The Idol's Emissary",
                 'AG-02 (full corruption mode)','Department of War Chief Researcher (absorbed)','Cochumat Apex Crystal Entity'],
  },
};

// ── Room label tables ─────────────────────────────────────────────────────────

const ROOM_LABELS: Record<string, string[]> = {
  combat:      ['Guard Post','Patrol Chamber','Ambush Point','Barracks','Training Floor','Warroom',
                'Department of War Checkpoint','Warclan Thule Rally Point','ATC Security Station',
                'House Cahill Enforcer Post','Society Field Perimeter Node'],
  treasure:    ['Vault','Storeroom','Trophy Room','Hidden Cache','Reliquary','Chest Room',
                'House Delaque Black Ledger Room','ATC Cargo Manifest Office','House Cahill Ore Reserve',
                'Department of War Classified Archive','Society Research Specimen Storage'],
  trap:        ['Trapped Corridor','Testing Chamber','Punishment Hall','Killzone','The Gauntlet',
                'Department of War Field Trial Room','Society Containment Failsafe Corridor',
                'House Cahill Mine Collapse Zone','Warclan Thule Kill-Corridor','Leviton Anti-Tamper Passage'],
  empty:       ['Empty Hall','Abandoned Chamber','Ruined Room','Forgotten Alcove','Dusty Corridor','Old Gallery',
                'Evacuated ATC Sorting Floor','Collapsed House Cahill Mineshaft Junction',
                'Decommissioned Department of War Briefing Room','Abandoned Society Observation Post',
                'Unity Prayer Hall (cleared)','Ambersoul Cathedral Side Chapel (looted)'],
  boss:        ['Inner Sanctum','Throne Room','The Deep Chamber','Final Hall','Ritual Chamber','Lair',
                'Department of War Black-Site Core','Society Prime Laboratory','House Cahill Deep Vault',
                'Unity Grand Ritual Hall','The Idol\'s Antechamber','Warclan Thule War-Throne'],
  entrance:    ['Entrance Hall','Main Gate','Foyer','Gatehouse',
                'ATC Inspection Point','Department of War Perimeter Post',
                'House Cahill Access Shaft','Abandoned Unity Reception Hall'],
  atmosphere:  ['Grand Hall','Pillared Chamber','Antechamber','Collapsed Room','Flooded Chamber','Altar Room',
                'Ambersoul Cathedral Nave (ruined)','Leviton Logistics Depot (abandoned)',
                'House Delaque Counting Room','Kewold Siege Ball Training Annex','Formene Elf Quarter Archive',
                'Chogrove Smugglers\' Hold','Beeford Keep Mead Cellar (repurposed)'],
  hallway:     ['Connecting Passage','Side Tunnel','Dark Corridor','Narrow Hall','Utility Passage',
                'House Cahill Mine Tunnel','ATC Service Corridor','Department of War Maintenance Shaft',
                'Society Blind Passage','Ambersoul Catacomb Run','Leviton Cable Duct'],
};

function pickFrom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ── Layout generation ─────────────────────────────────────────────────────────
// Builds a connected tree/graph with optional loops for larger dungeons.

interface RawNode {
  id:          string;
  x:           number;
  y:           number;
  depth:       number;
  connections: string[];
  isEntrance:  boolean;
  isBoss:      boolean;
  roomClass:   'entrance' | 'combat' | 'treasure' | 'trap' | 'empty' | 'atmosphere' | 'boss';
}

function generateLayout(
  roomCount: number,
  rand: () => number,
): RawNode[] {
  const nodes: RawNode[] = [];

  // Entrance node at origin
  const entrance: RawNode = {
    id: newId(), x: 0, y: 0, depth: 0,
    connections: [], isEntrance: true, isBoss: false, roomClass: 'entrance',
  };
  nodes.push(entrance);

  // BFS-style expansion
  const frontier: RawNode[] = [entrance];
  const targetRooms = Math.max(3, roomCount);

  while (nodes.length < targetRooms && frontier.length > 0) {
    const parent = frontier[Math.floor(rand() * frontier.length)];
    // Direction offsets: right, down, left, up, diagonals
    const offsets = [
      [2, 0],[0, 2],[-2, 0],[0, -2],
      [2, 2],[-2, 2],[2, -2],[-2, -2],
    ];
    const [dx, dy] = pickFrom(offsets, rand);
    const nx = parent.x + dx;
    const ny = parent.y + dy;

    // Skip if occupied
    if (nodes.some(n => n.x === nx && n.y === ny)) continue;

    const isBoss = nodes.length === targetRooms - 1;
    const child: RawNode = {
      id: newId(), x: nx, y: ny,
      depth: parent.depth + 1,
      connections: [parent.id],
      isEntrance: false, isBoss,
      roomClass: isBoss ? 'boss' : 'empty',
    };
    parent.connections.push(child.id);
    nodes.push(child);
    if (!isBoss) frontier.push(child);
  }

  // Add loops for larger dungeons (connect nearby non-adjacent nodes)
  if (roomCount >= 8) {
    const loopCount = Math.floor(roomCount / 6);
    for (let i = 0; i < loopCount; i++) {
      const a = pickFrom(nodes, rand);
      const b = pickFrom(nodes, rand);
      if (a.id !== b.id && !a.connections.includes(b.id)) {
        const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (dist <= 4) {
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }
  }

  return nodes;
}

// ── Room classification ───────────────────────────────────────────────────────

function classifyRooms(nodes: RawNode[], rand: () => number): void {
  // Ensure at least one treasure room
  const nonSpecial = nodes.filter(n => !n.isEntrance && !n.isBoss);
  let hasTreasure = false;

  for (const node of nonSpecial) {
    const roll = rand();
    if (!hasTreasure && roll < 0.15) {
      node.roomClass = 'treasure';
      hasTreasure = true;
    } else if (roll < 0.35) {
      node.roomClass = 'combat';
    } else if (roll < 0.50) {
      node.roomClass = 'trap';
    } else if (roll < 0.65) {
      node.roomClass = 'atmosphere';
    } else {
      node.roomClass = 'empty';
    }
  }

  // Force treasure if none assigned
  if (!hasTreasure && nonSpecial.length > 0) {
    const candidate = pickFrom(
      nonSpecial.filter(n => n.roomClass === 'empty'),
      rand,
    ) ?? nonSpecial[0];
    candidate.roomClass = 'treasure';
  }
}

// ── Size assignment ───────────────────────────────────────────────────────────

function assignSize(roomClass: string, rand: () => number): RoomSize {
  if (roomClass === 'boss') return rand() < 0.5 ? 'large' : 'medium';
  if (roomClass === 'entrance') return 'medium';
  if (roomClass === 'atmosphere' || roomClass === 'treasure') {
    return rand() < 0.6 ? 'large' : 'medium';
  }
  const r = rand();
  if (r < 0.3) return 'small';
  if (r < 0.7) return 'medium';
  return 'large';
}

// ── Content generation ────────────────────────────────────────────────────────

function generateContent(
  roomId:     string,
  roomClass:  string,
  isBoss:     boolean,
  theme:      ThemeDef,
  rand:       () => number,
): DungeonContent {
  const id = newId();

  if (isBoss) {
    return {
      id, roomId, contentType: 'monster',
      payload: {
        name: pickFrom(theme.bossNames, rand),
        note: 'Boss encounter. Use full tactics and lair actions.',
        isBoss: true,
      },
    };
  }

  if (roomClass === 'empty') {
    return { id, roomId, contentType: 'empty', payload: { note: pickFrom(theme.atmosphere, rand) } };
  }

  if (roomClass === 'treasure') {
    return {
      id, roomId, contentType: 'loot',
      payload: {
        item: pickFrom(theme.loot, rand),
        note: rand() < 0.4 ? 'Guarded by a trap.' : 'Accessible.',
      },
    };
  }

  if (roomClass === 'trap') {
    return {
      id, roomId, contentType: 'trap',
      payload: { trap: pickFrom(theme.traps, rand), dc: 10 + Math.floor(rand() * 8) },
    };
  }

  if (roomClass === 'atmosphere') {
    // Chance of a hidden monster or minor loot
    const r = rand();
    if (r < 0.3) {
      return {
        id, roomId, contentType: 'monster',
        payload: { name: pickFrom(theme.monsters, rand), note: 'Patrol or lurking threat.' },
      };
    }
    return { id, roomId, contentType: 'empty', payload: { note: pickFrom(theme.atmosphere, rand) } };
  }

  // combat
  return {
    id, roomId, contentType: 'monster',
    payload: {
      name: pickFrom(theme.monsters, rand),
      count: 1 + Math.floor(rand() * 4),
      note: rand() < 0.25 ? 'Also contains a minor trap.' : '',
    },
  };
}

// ── Hallway generation ────────────────────────────────────────────────────────

function generateHallways(
  rooms: DungeonRoom[],
  theme: ThemeDef,
  rand: () => number,
): DungeonRoom[] {
  const hallways: DungeonRoom[] = [];
  const seen = new Set<string>();

  for (const room of rooms) {
    for (const connId of room.connections) {
      const key = [room.id, connId].sort().join(':');
      if (seen.has(key)) continue;
      seen.add(key);

      const target = rooms.find(r => r.id === connId);
      if (!target) continue;

      const hwId = newId();
      const hasContent = rand() < 0.3;
      let contents: DungeonContent[] = [];

      if (hasContent) {
        const r = rand();
        const contentType: ContentType = r < 0.5 ? 'trap' : 'monster';
        contents = [{
          id:          newId(),
          roomId:      hwId,
          contentType,
          payload:     contentType === 'trap'
            ? { trap: pickFrom(theme.traps, rand), dc: 8 + Math.floor(rand() * 6) }
            : { name: pickFrom(theme.monsters, rand), count: 1, note: 'Patrol' },
        }];
      }

      hallways.push({
        id:          hwId,
        dungeonId:   room.dungeonId,
        type:        'hallway',
        label:       pickFrom(ROOM_LABELS['hallway'], rand),
        size:        'small',
        x:           (room.x + target.x) / 2,
        y:           (room.y + target.y) / 2,
        connections: [room.id, target.id],
        isBoss:      false,
        isEntrance:  false,
        contents,
      });
    }
  }

  return hallways;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function generateDungeon(
  dungeonId: string,
  input: GenerateDungeonInput,
): Omit<Dungeon, 'createdAt'> {
  const seed = seedFromString(`${dungeonId}-${input.theme}-${input.roomCount}`);
  const rand = makePrng(seed);
  const theme = THEMES[input.theme];

  // 1. Layout
  const rawNodes = generateLayout(input.roomCount, rand);
  classifyRooms(rawNodes, rand);

  // 2. Build rooms
  const rooms: DungeonRoom[] = rawNodes.map(node => {
    const labels = ROOM_LABELS[node.roomClass] ?? ROOM_LABELS['empty'];
    const content = generateContent(
      node.id, node.roomClass, node.isBoss, theme, rand,
    );
    return {
      id:          node.id,
      dungeonId,
      type:        'room',
      label:       pickFrom(labels, rand),
      size:        assignSize(node.roomClass, rand),
      x:           node.x,
      y:           node.y,
      connections: node.connections,
      isBoss:      node.isBoss,
      isEntrance:  node.isEntrance,
      contents:    [content],
    };
  });

  // 3. Hallways
  const hallways = generateHallways(rooms, theme, rand);

  const name = input.name?.trim() || `${input.theme.charAt(0).toUpperCase() + input.theme.slice(1)} Dungeon`;

  return {
    id:        dungeonId,
    name,
    theme:     input.theme,
    roomCount: input.roomCount,
    rooms:     [...rooms, ...hallways],
  };
}

// ── Text summary ──────────────────────────────────────────────────────────────

export function buildSummary(dungeon: Dungeon): string {
  const rooms     = dungeon.rooms.filter(r => r.type === 'room');
  const hallways  = dungeon.rooms.filter(r => r.type === 'hallway');
  const boss      = rooms.find(r => r.isBoss);
  const entrance  = rooms.find(r => r.isEntrance);
  const monsters  = dungeon.rooms.flatMap(r => r.contents).filter(c => c.contentType === 'monster');
  const traps     = dungeon.rooms.flatMap(r => r.contents).filter(c => c.contentType === 'trap');
  const loot      = dungeon.rooms.flatMap(r => r.contents).filter(c => c.contentType === 'loot');

  const lines: string[] = [
    `# ${dungeon.name}`,
    `Theme: ${dungeon.theme}  |  Rooms: ${rooms.length}  |  Hallways: ${hallways.length}`,
    '',
    `## Entrance`,
    entrance ? `  ${entrance.label} (${entrance.size})` : '  Unknown',
    '',
    `## Rooms (${rooms.length})`,
    ...rooms.map(r => {
      const c = r.contents[0];
      const tag = c?.contentType === 'monster'
        ? `⚔ ${(c.payload as { name: string }).name}${r.isBoss ? ' [BOSS]' : ''}`
        : c?.contentType === 'trap'   ? `⚠ Trap: ${(c.payload as { trap: string }).trap}`
        : c?.contentType === 'loot'   ? `★ Loot: ${(c.payload as { item: string }).item}`
        : `○ ${(c?.payload as { note?: string })?.note ?? 'Empty'}`;
      return `  ${r.isEntrance ? '[ENTRANCE] ' : r.isBoss ? '[BOSS] ' : ''}${r.label} (${r.size}) — ${tag}`;
    }),
    '',
    `## Hallways with hazards (${hallways.filter(h => h.contents[0]?.contentType !== 'empty').length})`,
    ...hallways
      .filter(h => h.contents[0]?.contentType !== 'empty' && h.contents.length > 0)
      .map(h => {
        const c = h.contents[0];
        return `  ${h.label} — ${c.contentType === 'trap'
          ? `⚠ ${(c.payload as { trap: string }).trap}`
          : `⚔ ${(c.payload as { name: string }).name}`}`;
      }),
    '',
    `## Totals`,
    `  Encounters: ${monsters.length}  |  Traps: ${traps.length}  |  Loot: ${loot.length}`,
    boss ? `  Boss: ${(boss.contents[0]?.payload as { name?: string })?.name ?? 'Unknown'} in ${boss.label}` : '',
  ];

  return lines.filter(l => l !== '').join('\n');
}
