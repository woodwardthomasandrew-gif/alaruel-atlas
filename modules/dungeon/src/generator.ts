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
  bossName:   string;
}

const THEMES: Record<DungeonTheme, ThemeDef> = {
  undead: {
    monsters:   ['Skeleton Warrior','Zombie Horde','Wight','Shadow','Wraith','Ghoul','Revenant','Banshee'],
    traps:      ['Pressure-plate spike pit','Bone-dust cloud','Cursed glyph','Collapsing floor'],
    loot:       ['Tarnished silver chalice','Bone-hilted dagger','Funeral urn (gems inside)','Cursed ring','Necromancer\'s tome'],
    atmosphere: ['The air reeks of decay.','Bones crunch underfoot.','A chill clings to everything.','Shadows move against the light.'],
    bossName:   'Undying Necromancer',
  },
  goblin: {
    monsters:   ['Goblin Scout','Goblin Warrior','Hobgoblin Sergeant','Bugbear Ambusher','Goblin Shaman','Wolf Rider'],
    traps:      ['Tripwire alarm','Net drop','Deadfall log','Greased slope','Pit with sharpened stakes'],
    loot:       ['Crude copper coins','Stolen merchant goods','Gnawed ration packs','Filched jewellery','Scavenged weapons'],
    atmosphere: ['Crude graffiti covers the walls.','The smell of cooking fires and worse.','Laughter echoes from somewhere ahead.','Scraps of food litter the floor.'],
    bossName:   'Warchief Gragnuk',
  },
  arcane: {
    monsters:   ['Arcane Construct','Mage Guardian','Spell Wisp','Rune Golem','Apprentice Shade','Mirror Demon','Animated Armour'],
    traps:      ['Arcane feedback rune','Teleport trap (random room)','Force cage','Mana drain field','Explosive sigil'],
    loot:       ['Spell scroll','Arcane focus shard','Vial of distilled magic','Cracked crystal orb','Annotated spellbook'],
    atmosphere: ['Magical residue coats every surface.','The air hums with latent energy.','Strange lights pulse rhythmically.','Equations drift across the walls in glowing ink.'],
    bossName:   'The Bound Arcanist',
  },
  cult: {
    monsters:   ['Cult Initiate','Devoted Fanatic','Summoned Fiend','High Cultist','Ritual Construct','Possessed Acolyte'],
    traps:      ['Blood-letting trigger','False idol (curse)','Summoning circle (random monster)','Pit of offering (acid)'],
    loot:       ['Ritual dagger','Cult manifesto','Unholy symbol','Darkstone idol','Blood-sealed letter'],
    atmosphere: ['Chanting can be heard, faintly.','The walls are stained with old blood.','Strange sigils cover every surface.','The shadows seem to watch.'],
    bossName:   'The Bound Herald',
  },
  nature: {
    monsters:   ['Vine Horror','Twig Blight','Dryad Corrupted','Giant Spider','Cave Bear','Root Golem','Swarm of Insects'],
    traps:      ['Thorn snare','Spore cloud','Entangling roots','Pitfall hidden by leaves','Poison dart plant'],
    loot:       ['Rare herbs','Beast pelt','Natural crystal formation','Petrified wood idol','Honey from giant hive'],
    atmosphere: ['Roots have cracked the stone walls.','Bioluminescent fungi light the way.','The sound of dripping water is constant.','Something has been nesting here.'],
    bossName:   'The Corrupted Ancient',
  },
  aberration: {
    monsters:   ['Far Realm Tendril','Mind Flayer Thrall','Gibbering Mouther','Spectral Echo','Crystal Corruption Host','Void Stalker'],
    traps:      ['Psychic feedback node','Reality rift (minor)','Gravity inversion plate','Madness glyph'],
    loot:       ['AmberSoul fragment','Void-touched weapon','Far Realm lens shard','Aberrant ichor (alchemical)','Crystal corruption sample'],
    atmosphere: ['Reality feels thin here.','The geometry of the room is subtly wrong.','Whispering with no discernable source.','Looking directly at corners causes unease.'],
    bossName:   'The Fractured Mind',
  },
};

// ── Room label tables ─────────────────────────────────────────────────────────

const ROOM_LABELS: Record<string, string[]> = {
  combat:      ['Guard Post','Patrol Chamber','Ambush Point','Barracks','Training Floor','Warroom'],
  treasure:    ['Vault','Storeroom','Trophy Room','Hidden Cache','Reliquary','Chest Room'],
  trap:        ['Trapped Corridor','Testing Chamber','Punishment Hall','Killzone','The Gauntlet'],
  empty:       ['Empty Hall','Abandoned Chamber','Ruined Room','Forgotten Alcove','Dusty Corridor','Old Gallery'],
  boss:        ['Inner Sanctum','Throne Room','The Deep Chamber','Final Hall','Ritual Chamber','Lair'],
  entrance:    ['Entrance Hall','Main Gate','Foyer','Gatehouse'],
  atmosphere:  ['Grand Hall','Pillared Chamber','Antechamber','Collapsed Room','Flooded Chamber','Altar Room'],
  hallway:     ['Connecting Passage','Side Tunnel','Dark Corridor','Narrow Hall','Utility Passage'],
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
        name: theme.bossName,
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
