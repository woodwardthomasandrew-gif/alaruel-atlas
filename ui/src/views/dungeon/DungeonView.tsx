// ui/src/views/dungeon/DungeonView.tsx
// Three-panel dungeon generator view. Uses atlas.db directly (same pattern as
// other renderer views). Generation logic lives in the backend module; the
// renderer calls atlas.db.run / query to persist and retrieve dungeons.

import { useState, useEffect, useCallback } from 'react';
import { Icon }              from '../../components/ui/Icon';
import { atlas }             from '../../bridge/atlas';
import { useCampaignStore }  from '../../store/campaign.store';
import styles                from './DungeonView.module.css';

// ── Types mirrored from the module (renderer-local) ───────────────────────────

type DungeonTheme  = 'undead' | 'goblin' | 'arcane' | 'cult' | 'nature' | 'aberration';
type RoomType      = 'room' | 'hallway';
type RoomSize      = 'small' | 'medium' | 'large';
type ContentType   = 'monster' | 'trap' | 'loot' | 'empty';

interface DungeonContent {
  id:          string;
  roomId:      string;
  contentType: ContentType;
  payload:     Record<string, unknown>;
}

interface DungeonRoom {
  id:          string;
  dungeonId:   string;
  type:        RoomType;
  label:       string;
  size:        RoomSize;
  x:           number;
  y:           number;
  connections: string[];
  isBoss:      boolean;
  isEntrance:  boolean;
  contents:    DungeonContent[];
}

interface Dungeon {
  id:        string;
  name:      string;
  theme:     DungeonTheme;
  roomCount: number;
  createdAt: string;
  rooms:     DungeonRoom[];
}

// ── Row types for DB reads ────────────────────────────────────────────────────

type RawDungeon = Record<string, unknown>;
type RawRoom    = Record<string, unknown>;
type RawContent = Record<string, unknown>;

// ── Seeded PRNG (must match generator.ts exactly) ────────────────────────────

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

function pickFrom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ── Theme tables (mirrored from generator.ts) ─────────────────────────────────

interface ThemeDef {
  monsters: string[]; traps: string[]; loot: string[];
  atmosphere: string[]; bossName: string;
}

const THEMES: Record<DungeonTheme, ThemeDef> = {
  undead: {
    monsters:   ['Skeleton Warrior','Zombie Horde','Wight','Shadow','Wraith','Ghoul','Revenant','Banshee'],
    traps:      ['Pressure-plate spike pit','Bone-dust cloud','Cursed glyph','Collapsing floor'],
    loot:       ["Tarnished silver chalice","Bone-hilted dagger","Funeral urn (gems inside)","Cursed ring","Necromancer's tome"],
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

const ROOM_LABELS: Record<string, string[]> = {
  combat:     ['Guard Post','Patrol Chamber','Ambush Point','Barracks','Training Floor','Warroom'],
  treasure:   ['Vault','Storeroom','Trophy Room','Hidden Cache','Reliquary','Chest Room'],
  trap:       ['Trapped Corridor','Testing Chamber','Punishment Hall','Killzone','The Gauntlet'],
  empty:      ['Empty Hall','Abandoned Chamber','Ruined Room','Forgotten Alcove','Dusty Corridor','Old Gallery'],
  boss:       ['Inner Sanctum','Throne Room','The Deep Chamber','Final Hall','Ritual Chamber','Lair'],
  entrance:   ['Entrance Hall','Main Gate','Foyer','Gatehouse'],
  atmosphere: ['Grand Hall','Pillared Chamber','Antechamber','Collapsed Room','Flooded Chamber','Altar Room'],
  hallway:    ['Connecting Passage','Side Tunnel','Dark Corridor','Narrow Hall','Utility Passage'],
};

// ── Front-end generation (mirrors backend logic) ──────────────────────────────

function newId(): string { return crypto.randomUUID(); }

function assignSize(roomClass: string, rand: () => number): RoomSize {
  if (roomClass === 'boss') return rand() < 0.5 ? 'large' : 'medium';
  if (roomClass === 'entrance') return 'medium';
  if (roomClass === 'atmosphere' || roomClass === 'treasure') return rand() < 0.6 ? 'large' : 'medium';
  const r = rand();
  if (r < 0.3) return 'small';
  if (r < 0.7) return 'medium';
  return 'large';
}

interface RawNode {
  id: string; x: number; y: number; depth: number;
  connections: string[];
  isEntrance: boolean; isBoss: boolean;
  roomClass: 'entrance'|'combat'|'treasure'|'trap'|'empty'|'atmosphere'|'boss';
}

function generateLayout(roomCount: number, rand: () => number): RawNode[] {
  const nodes: RawNode[] = [];
  const entrance: RawNode = { id: newId(), x: 0, y: 0, depth: 0, connections: [], isEntrance: true, isBoss: false, roomClass: 'entrance' };
  nodes.push(entrance);
  const frontier: RawNode[] = [entrance];
  const target = Math.max(3, roomCount);
  const offsets = [[2,0],[0,2],[-2,0],[0,-2],[2,2],[-2,2],[2,-2],[-2,-2]] as [number,number][];

  while (nodes.length < target && frontier.length > 0) {
    const parent = frontier[Math.floor(rand() * frontier.length)];
    const [dx, dy] = pickFrom(offsets, rand);
    const nx = parent.x + dx, ny = parent.y + dy;
    if (nodes.some(n => n.x === nx && n.y === ny)) continue;
    const isBoss = nodes.length === target - 1;
    const child: RawNode = { id: newId(), x: nx, y: ny, depth: parent.depth + 1,
      connections: [parent.id], isEntrance: false, isBoss, roomClass: isBoss ? 'boss' : 'empty' };
    parent.connections.push(child.id);
    nodes.push(child);
    if (!isBoss) frontier.push(child);
  }

  if (roomCount >= 8) {
    const loopCount = Math.floor(roomCount / 6);
    for (let i = 0; i < loopCount; i++) {
      const a = pickFrom(nodes, rand), b = pickFrom(nodes, rand);
      if (a.id !== b.id && !a.connections.includes(b.id)) {
        const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (dist <= 4) { a.connections.push(b.id); b.connections.push(a.id); }
      }
    }
  }
  return nodes;
}

function classifyRooms(nodes: RawNode[], rand: () => number): void {
  const nonSpecial = nodes.filter(n => !n.isEntrance && !n.isBoss);
  let hasTreasure = false;
  for (const node of nonSpecial) {
    const roll = rand();
    if (!hasTreasure && roll < 0.15)       { node.roomClass = 'treasure'; hasTreasure = true; }
    else if (roll < 0.35)                  { node.roomClass = 'combat'; }
    else if (roll < 0.50)                  { node.roomClass = 'trap'; }
    else if (roll < 0.65)                  { node.roomClass = 'atmosphere'; }
    else                                   { node.roomClass = 'empty'; }
  }
  if (!hasTreasure && nonSpecial.length > 0) {
    const candidate = pickFrom(nonSpecial.filter(n => n.roomClass === 'empty'), rand) ?? nonSpecial[0];
    candidate.roomClass = 'treasure';
  }
}

function makeContent(roomId: string, roomClass: string, isBoss: boolean, theme: ThemeDef, rand: () => number): DungeonContent {
  const id = newId();
  if (isBoss) return { id, roomId, contentType: 'monster', payload: { name: theme.bossName, note: 'Boss encounter. Use full tactics and lair actions.', isBoss: true } };
  if (roomClass === 'empty')     return { id, roomId, contentType: 'empty',   payload: { note: pickFrom(theme.atmosphere, rand) } };
  if (roomClass === 'treasure')  return { id, roomId, contentType: 'loot',    payload: { item: pickFrom(theme.loot, rand), note: rand() < 0.4 ? 'Guarded by a trap.' : 'Accessible.' } };
  if (roomClass === 'trap')      return { id, roomId, contentType: 'trap',    payload: { trap: pickFrom(theme.traps, rand), dc: 10 + Math.floor(rand() * 8) } };
  if (roomClass === 'atmosphere') {
    if (rand() < 0.3) return { id, roomId, contentType: 'monster', payload: { name: pickFrom(theme.monsters, rand), note: 'Patrol or lurking threat.' } };
    return { id, roomId, contentType: 'empty', payload: { note: pickFrom(theme.atmosphere, rand) } };
  }
  return { id, roomId, contentType: 'monster', payload: { name: pickFrom(theme.monsters, rand), count: 1 + Math.floor(rand() * 4), note: rand() < 0.25 ? 'Also contains a minor trap.' : '' } };
}

function clientGenerateDungeon(dungeonId: string, input: { name?: string; roomCount: number; theme: DungeonTheme }): Dungeon {
  const seed = seedFromString(`${dungeonId}-${input.theme}-${input.roomCount}`);
  const rand = makePrng(seed);
  const theme = THEMES[input.theme];

  const rawNodes = generateLayout(input.roomCount, rand);
  classifyRooms(rawNodes, rand);

  const rooms: DungeonRoom[] = rawNodes.map(node => {
    const labels = ROOM_LABELS[node.roomClass] ?? ROOM_LABELS['empty'];
    return {
      id: node.id, dungeonId, type: 'room',
      label: pickFrom(labels, rand), size: assignSize(node.roomClass, rand),
      x: node.x, y: node.y, connections: node.connections,
      isBoss: node.isBoss, isEntrance: node.isEntrance,
      contents: [makeContent(node.id, node.roomClass, node.isBoss, theme, rand)],
    };
  });

  // Hallways
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
      const contents: DungeonContent[] = hasContent ? [{
        id: newId(), roomId: hwId,
        contentType: rand() < 0.5 ? 'trap' : 'monster',
        payload: rand() < 0.5
          ? { trap: pickFrom(theme.traps, rand), dc: 8 + Math.floor(rand() * 6) }
          : { name: pickFrom(theme.monsters, rand), count: 1, note: 'Patrol' },
      }] : [];
      hallways.push({
        id: hwId, dungeonId, type: 'hallway',
        label: pickFrom(ROOM_LABELS['hallway'], rand), size: 'small',
        x: (room.x + target.x) / 2, y: (room.y + target.y) / 2,
        connections: [room.id, target.id],
        isBoss: false, isEntrance: false, contents,
      });
    }
  }

  const name = input.name?.trim() || `${input.theme.charAt(0).toUpperCase() + input.theme.slice(1)} Dungeon`;
  return { id: dungeonId, name, theme: input.theme, roomCount: input.roomCount, createdAt: new Date().toISOString(), rooms: [...rooms, ...hallways] };
}

function buildSummary(dungeon: Dungeon): string {
  const rooms    = dungeon.rooms.filter(r => r.type === 'room');
  const hallways = dungeon.rooms.filter(r => r.type === 'hallway');
  const boss     = rooms.find(r => r.isBoss);
  const entrance = rooms.find(r => r.isEntrance);
  const monsters = dungeon.rooms.flatMap(r => r.contents).filter(c => c.contentType === 'monster');
  const traps    = dungeon.rooms.flatMap(r => r.contents).filter(c => c.contentType === 'trap');
  const loot     = dungeon.rooms.flatMap(r => r.contents).filter(c => c.contentType === 'loot');

  return [
    `# ${dungeon.name}`,
    `Theme: ${dungeon.theme}  |  Rooms: ${rooms.length}  |  Hallways: ${hallways.length}`,
    '',
    `## Entrance`,
    entrance ? `  ${entrance.label} (${entrance.size})` : '  Unknown',
    '',
    `## Rooms`,
    ...rooms.map(r => {
      const c = r.contents[0];
      const tag = c?.contentType === 'monster' ? `⚔ ${(c.payload as { name: string }).name}${r.isBoss ? ' [BOSS]' : ''}`
                : c?.contentType === 'trap'    ? `⚠ Trap: ${(c.payload as { trap: string }).trap}`
                : c?.contentType === 'loot'    ? `★ Loot: ${(c.payload as { item: string }).item}`
                : `○ ${(c?.payload as { note?: string })?.note ?? 'Empty'}`;
      return `  ${r.isEntrance ? '[ENTRANCE] ' : r.isBoss ? '[BOSS] ' : ''}${r.label} (${r.size}) — ${tag}`;
    }),
    '',
    `## Hallway hazards`,
    ...hallways.filter(h => h.contents[0]?.contentType !== 'empty' && h.contents.length > 0).map(h => {
      const c = h.contents[0];
      return `  ${h.label} — ${c.contentType === 'trap' ? `⚠ ${(c.payload as { trap: string }).trap}` : `⚔ ${(c.payload as { name: string }).name}`}`;
    }),
    '',
    `## Totals`,
    `  Encounters: ${monsters.length}  |  Traps: ${traps.length}  |  Loot: ${loot.length}`,
    boss ? `  Boss: ${(boss.contents[0]?.payload as { name?: string })?.name ?? 'Unknown'} in ${boss.label}` : '',
  ].filter(l => l !== '').join('\n');
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const ROOM_COLOURS: Record<string, string> = {
  entrance:   'var(--gold-400)',
  boss:       'var(--crimson-400)',
  combat:     '#e05050',
  treasure:   '#c49040',
  trap:       '#c8900a',
  atmosphere: '#6b8cba',
  empty:      'var(--ink-500)',
  hallway:    'var(--ink-700)',
};

function roomColour(room: DungeonRoom): string {
  if (room.type === 'hallway') return ROOM_COLOURS['hallway'];
  if (room.isEntrance) return ROOM_COLOURS['entrance'];
  if (room.isBoss)     return ROOM_COLOURS['boss'];
  const c = room.contents[0];
  if (c?.contentType === 'monster') return ROOM_COLOURS['combat'];
  if (c?.contentType === 'trap')    return ROOM_COLOURS['trap'];
  if (c?.contentType === 'loot')    return ROOM_COLOURS['treasure'];
  return ROOM_COLOURS['empty'];
}

function contentClassName(type: ContentType): string {
  const map: Record<ContentType, string> = {
    monster: styles.typeMonster, trap: styles.typeTrap,
    loot: styles.typeLoot, empty: styles.typeEmpty,
  };
  return map[type];
}
function contentLabelClass(type: ContentType): string {
  const map: Record<ContentType, string> = {
    monster: styles.contentLabelMonster, trap: styles.contentLabelTrap,
    loot: styles.contentLabelLoot, empty: styles.contentLabelEmpty,
  };
  return map[type];
}
function contentIcon(type: ContentType): string {
  return { monster: '⚔', trap: '⚠', loot: '★', empty: '○' }[type];
}

const THEMES_LIST: DungeonTheme[] = ['undead','goblin','arcane','cult','nature','aberration'];
const LEGEND_ITEMS = [
  { colour: ROOM_COLOURS['entrance'],   label: 'Entrance'  },
  { colour: ROOM_COLOURS['boss'],       label: 'Boss'      },
  { colour: ROOM_COLOURS['combat'],     label: 'Combat'    },
  { colour: ROOM_COLOURS['treasure'],   label: 'Treasure'  },
  { colour: ROOM_COLOURS['trap'],       label: 'Trap'      },
  { colour: ROOM_COLOURS['atmosphere'], label: 'Flavour'   },
  { colour: ROOM_COLOURS['empty'],      label: 'Empty'     },
  { colour: ROOM_COLOURS['hallway'],    label: 'Hallway'   },
];

// ── SVG Graph ─────────────────────────────────────────────────────────────────

const NODE_R   = 18;
const HW_R     = 9;
const SVG_PAD  = 60;

function DungeonGraph({ dungeon, selected, onSelect }: {
  dungeon: Dungeon;
  selected: DungeonRoom | null;
  onSelect: (r: DungeonRoom) => void;
}) {
  const rooms    = dungeon.rooms.filter(r => r.type === 'room');
  const hallways = dungeon.rooms.filter(r => r.type === 'hallway');
  const allNodes = dungeon.rooms;

  // Coordinate mapping: grid coords → SVG pixels
  const xs = allNodes.map(r => r.x);
  const ys = allNodes.map(r => r.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const SCALE = 48;

  const px = (x: number) => (x - minX) * SCALE + SVG_PAD;
  const py = (y: number) => (y - minY) * SCALE + SVG_PAD;

  const svgW = (maxX - minX) * SCALE + SVG_PAD * 2;
  const svgH = (maxY - minY) * SCALE + SVG_PAD * 2;

  // Draw edges (room-to-room only, skip hallway connections to avoid duplication)
  const edges: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  const seenEdges = new Set<string>();
  for (const room of rooms) {
    for (const connId of room.connections) {
      const target = allNodes.find(r => r.id === connId);
      if (!target) continue;
      const key = [room.id, connId].sort().join(':');
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({ x1: px(room.x), y1: py(room.y), x2: px(target.x), y2: py(target.y), key });
    }
  }

  return (
    <svg
      width={svgW} height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', minWidth: svgW, minHeight: svgH }}
    >
      {/* Grid dots */}
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1" fill="rgba(255,255,255,0.04)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Edges */}
      {edges.map(e => (
        <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke="var(--ink-700)" strokeWidth={1.5} strokeDasharray="4 3" />
      ))}

      {/* Hallway nodes */}
      {hallways.map(hw => {
        const col = hw.contents[0]?.contentType === 'trap'    ? '#c8900a'
                  : hw.contents[0]?.contentType === 'monster' ? '#e05050'
                  : 'var(--ink-600)';
        const isSelected = selected?.id === hw.id;
        return (
          <g key={hw.id} onClick={() => onSelect(hw)} style={{ cursor: 'pointer' }}>
            <circle cx={px(hw.x)} cy={py(hw.y)} r={HW_R}
              fill="var(--ink-800)" stroke={col} strokeWidth={isSelected ? 2.5 : 1} />
            {hw.contents[0]?.contentType !== 'empty' && hw.contents.length > 0 && (
              <text x={px(hw.x)} y={py(hw.y) + 4} textAnchor="middle"
                fontSize="9" fill={col} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {hw.contents[0]?.contentType === 'trap' ? '⚠' : '⚔'}
              </text>
            )}
            {isSelected && (
              <circle cx={px(hw.x)} cy={py(hw.y)} r={HW_R + 4}
                fill="none" stroke="var(--gold-400)" strokeWidth={1.5} strokeDasharray="3 2" />
            )}
          </g>
        );
      })}

      {/* Room nodes */}
      {rooms.map(room => {
        const col = roomColour(room);
        const r   = room.size === 'large' ? NODE_R + 5 : room.size === 'small' ? NODE_R - 5 : NODE_R;
        const isSelected = selected?.id === room.id;
        const label = room.label.split(' ').slice(0, 2).join(' ');

        return (
          <g key={room.id} onClick={() => onSelect(room)} style={{ cursor: 'pointer' }}>
            {/* Glow for boss */}
            {room.isBoss && (
              <circle cx={px(room.x)} cy={py(room.y)} r={r + 8}
                fill="rgba(196,64,64,0.15)" />
            )}
            <circle cx={px(room.x)} cy={py(room.y)} r={r}
              fill="var(--ink-900)" stroke={col} strokeWidth={isSelected ? 3 : 1.75} />

            {/* Selection ring */}
            {isSelected && (
              <circle cx={px(room.x)} cy={py(room.y)} r={r + 6}
                fill="none" stroke="var(--gold-400)" strokeWidth={1.5} strokeDasharray="4 2" />
            )}

            {/* Icon */}
            <text x={px(room.x)} y={py(room.y) + 5} textAnchor="middle"
              fontSize={room.size === 'large' ? '14' : '11'}
              fill={col} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {room.isEntrance ? '▶' : room.isBoss ? '☠' : room.contents[0]?.contentType === 'monster' ? '⚔' : room.contents[0]?.contentType === 'trap' ? '⚠' : room.contents[0]?.contentType === 'loot' ? '★' : '·'}
            </text>

            {/* Label */}
            <text x={px(room.x)} y={py(room.y) + r + 13} textAnchor="middle"
              fontSize="8" fill="var(--ink-400)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function DungeonView() {
  const campaign = useCampaignStore(s => s.campaign);

  // Controls
  const [roomCount,  setRoomCount]  = useState(8);
  const [theme,      setTheme]      = useState<DungeonTheme>('undead');
  const [nameInput,  setNameInput]  = useState('');
  const [sizePreset, setSizePreset] = useState<'small'|'medium'|'large'>('medium');

  // State
  const [dungeons,   setDungeons]   = useState<Dungeon[]>([]);
  const [active,     setActive]     = useState<Dungeon | null>(null);
  const [selected,   setSelected]   = useState<DungeonRoom | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Load dungeon list from DB
  const load = useCallback(async () => {
    if (!campaign) return;
    try {
      const rows = await atlas.db.query<RawDungeon>(
        'SELECT * FROM dungeons WHERE campaign_id = ? ORDER BY created_at DESC',
        [campaign.id],
      );
      // Only load headers for the list; full dungeon loaded on demand
      setDungeons(rows.map(r => ({
        id:        r['id'] as string,
        name:      r['name'] as string,
        theme:     r['theme'] as DungeonTheme,
        roomCount: r['room_count'] as number,
        createdAt: r['created_at'] as string,
        rooms:     [],
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  // Load a full dungeon from DB
  async function loadFull(id: string): Promise<Dungeon | null> {
    const [row] = await atlas.db.query<RawDungeon>(
      'SELECT * FROM dungeons WHERE id = ?', [id],
    );
    if (!row) return null;

    const roomRows = await atlas.db.query<RawRoom>(
      'SELECT * FROM dungeon_rooms WHERE dungeon_id = ?', [id],
    );
    const contentRows = await atlas.db.query<RawContent>(
      `SELECT dc.* FROM dungeon_contents dc
       JOIN dungeon_rooms dr ON dc.room_id = dr.id
       WHERE dr.dungeon_id = ?`, [id],
    );

    const contentsByRoom = new Map<string, DungeonContent[]>();
    for (const cr of contentRows) {
      const roomId = cr['room_id'] as string;
      const list = contentsByRoom.get(roomId) ?? [];
      list.push({
        id:          cr['id'] as string,
        roomId,
        contentType: cr['content_type'] as ContentType,
        payload:     JSON.parse(cr['payload'] as string) as Record<string, unknown>,
      });
      contentsByRoom.set(roomId, list);
    }

    const rooms: DungeonRoom[] = (roomRows as RawRoom[]).map(rr => ({
      id:          rr['id'] as string,
      dungeonId:   rr['dungeon_id'] as string,
      type:        rr['type'] as RoomType,
      label:       rr['label'] as string,
      size:        rr['size'] as RoomSize,
      x:           rr['x'] as number,
      y:           rr['y'] as number,
      connections: JSON.parse(rr['connections'] as string) as string[],
      isBoss:      (rr['is_boss'] as number) === 1,
      isEntrance:  (rr['is_entrance'] as number) === 1,
      contents:    contentsByRoom.get(rr['id'] as string) ?? [],
    }));

    return {
      id:        row['id'] as string,
      name:      row['name'] as string,
      theme:     row['theme'] as DungeonTheme,
      roomCount: row['room_count'] as number,
      createdAt: row['created_at'] as string,
      rooms,
    };
  }

  async function handleSelectDungeon(d: Dungeon) {
    setSelected(null);
    setError(null);
    try {
      const full = await loadFull(d.id);
      if (full) { setActive(full); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Generate + persist
  async function handleGenerate() {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    setSelected(null);

    try {
      const dungeonId = crypto.randomUUID();
      const dungeon   = clientGenerateDungeon(dungeonId, { name: nameInput, roomCount, theme });

      // Persist header
      await atlas.db.run(
        'INSERT INTO dungeons (id, campaign_id, name, theme, room_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [dungeon.id, campaign.id, dungeon.name, dungeon.theme, dungeon.roomCount, dungeon.createdAt],
      );

      // Persist rooms in batches
      for (const room of dungeon.rooms) {
        await atlas.db.run(
          `INSERT INTO dungeon_rooms (id, dungeon_id, type, label, size, x, y, connections, is_boss, is_entrance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [room.id, dungeon.id, room.type, room.label, room.size,
           room.x, room.y, JSON.stringify(room.connections),
           room.isBoss ? 1 : 0, room.isEntrance ? 1 : 0],
        );
        for (const content of room.contents) {
          await atlas.db.run(
            'INSERT INTO dungeon_contents (id, room_id, content_type, payload) VALUES (?, ?, ?, ?)',
            [content.id, room.id, content.contentType, JSON.stringify(content.payload)],
          );
        }
      }

      setActive(dungeon);
      setDungeons(prev => [{ ...dungeon, rooms: [] }, ...prev]);
      setNameInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Delete active dungeon
  async function handleDelete() {
    if (!active || !campaign) return;
    if (!window.confirm(`Delete "${active.name}"? This cannot be undone.`)) return;
    try {
      await atlas.db.run('DELETE FROM dungeons WHERE id = ? AND campaign_id = ?', [active.id, campaign.id]);
      setDungeons(prev => prev.filter(d => d.id !== active.id));
      setActive(null);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Room size → approx room count presets
  const sizePresetMap: Record<'small'|'medium'|'large', number> = { small: 5, medium: 10, large: 16 };

  function handleSizePreset(p: 'small'|'medium'|'large') {
    setSizePreset(p);
    setRoomCount(sizePresetMap[p]);
  }

  // ── Detail panel ────────────────────────────────────────────────────────────

  function RoomDetail({ room }: { room: DungeonRoom }) {
    const connectedRooms = active?.rooms.filter(r => room.connections.includes(r.id)) ?? [];
    return (
      <>
        <div className={styles.detailHeader}>
          <div className={styles.detailRoomName}>{room.label}</div>
          <div className={styles.detailMeta}>
            <span className={styles.metaPill}>{room.type}</span>
            <span className={styles.metaPill}>{room.size}</span>
            {room.isEntrance && <span className={styles.metaPill} style={{ color: 'var(--gold-400)', borderColor: 'var(--gold-600)' }}>Entrance</span>}
            {room.isBoss    && <span className={styles.metaPill} style={{ color: 'var(--crimson-400)', borderColor: 'var(--crimson-600)' }}>Boss</span>}
          </div>
        </div>
        <div className={styles.detailBody}>
          {/* Contents */}
          {room.contents.map(c => (
            <div key={c.id} className={`${styles.contentCard} ${contentClassName(c.contentType)}`}>
              <span className={`${styles.contentCardLabel} ${contentLabelClass(c.contentType)}`}>
                {contentIcon(c.contentType)} {c.contentType.toUpperCase()}
              </span>
              {c.contentType === 'monster' && (
                <>
                  <span className={styles.contentCardValue}>
                    {(c.payload as { name: string }).name}
                    {(c.payload as { count?: number }).count ? ` ×${(c.payload as { count: number }).count}` : ''}
                  </span>
                  {(c.payload as { note?: string }).note && (
                    <span className={styles.contentCardNote}>{(c.payload as { note: string }).note}</span>
                  )}
                </>
              )}
              {c.contentType === 'trap' && (
                <>
                  <span className={styles.contentCardValue}>{(c.payload as { trap: string }).trap}</span>
                  <span className={styles.contentCardNote}>DC {(c.payload as { dc: number }).dc}</span>
                </>
              )}
              {c.contentType === 'loot' && (
                <>
                  <span className={styles.contentCardValue}>{(c.payload as { item: string }).item}</span>
                  {(c.payload as { note?: string }).note && (
                    <span className={styles.contentCardNote}>{(c.payload as { note: string }).note}</span>
                  )}
                </>
              )}
              {c.contentType === 'empty' && (
                <span className={styles.contentCardNote}>{(c.payload as { note?: string }).note ?? 'Nothing of note.'}</span>
              )}
            </div>
          ))}

          {/* Connections */}
          {connectedRooms.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailSectionLabel}>Connects to</span>
              <div className={styles.connectionsList}>
                {connectedRooms.map(r => (
                  <button key={r.id} className={styles.connectionItem}
                    onClick={() => setSelected(r)}>
                    {r.label} ({r.size})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Legend</span>
          <div className={styles.legendItems}>
            {LEGEND_ITEMS.map(item => (
              <span key={item.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: item.colour }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Dungeons</h2>
          {dungeons.length > 0 && (
            <span className={styles.count}>{dungeons.length}</span>
          )}
        </div>
        <div className={styles.toolbarRight}>
          {active && (
            <button className={styles.deleteBtn} onClick={handleDelete}>
              <Icon name="trash" size={13} /> Delete
            </button>
          )}
          <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading || !campaign}>
            {loading
              ? <Icon name="loader" size={15} className={styles.spinner} />
              : <Icon name="map" size={15} />}
            {loading ? 'Generating…' : 'Generate Dungeon'}
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} /> {error}
        </div>
      )}

      {/* Body */}
      <div className={styles.body}>

        {/* ── Left: Controls + saved list ─────────────────────────────── */}
        <aside className={styles.controls}>
          <span className={styles.controlTitle}>New Dungeon</span>

          <div>
            <label className={styles.label}>Name (optional)</label>
            <input className={styles.nameInput} placeholder="The Sunken Vault…"
              value={nameInput} onChange={e => setNameInput(e.target.value)} />
          </div>

          <div>
            <label className={styles.label}>Theme</label>
            <select className={styles.select} value={theme}
              onChange={e => setTheme(e.target.value as DungeonTheme)}>
              {THEMES_LIST.map(t => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.label}>Size</label>
            <div className={styles.sizeToggle}>
              {(['small','medium','large'] as const).map(p => (
                <button key={p} className={`${styles.sizeBtn} ${sizePreset === p ? styles.sizeBtnActive : ''}`}
                  onClick={() => handleSizePreset(p)}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.sliderWrap}>
            <label className={styles.label}>Room Count</label>
            <div className={styles.sliderRow}>
              <input type="range" className={styles.slider} min={3} max={30}
                value={roomCount} onChange={e => { setRoomCount(+e.target.value); setSizePreset('medium'); }} />
              <span className={styles.sliderVal}>{roomCount}</span>
            </div>
          </div>

          <hr className={styles.controlDivider} />

          {/* Saved dungeons list */}
          {dungeons.length > 0 && (
            <div className={styles.dungeonList}>
              <span className={styles.dungeonListTitle}>Saved ({dungeons.length})</span>
              {dungeons.map(d => (
                <button key={d.id}
                  className={`${styles.dungeonItem} ${active?.id === d.id ? styles.dungeonItemActive : ''}`}
                  onClick={() => handleSelectDungeon(d)}>
                  <span className={styles.dungeonItemName}>{d.name}</span>
                  <span className={styles.dungeonItemMeta}>
                    {d.theme} · {d.roomCount} rooms
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Centre: Graph canvas ─────────────────────────────────────── */}
        <div className={styles.canvas}>
          {!active ? (
            <div className={styles.canvasEmpty}>
              <Icon name="map" size={48} className={styles.canvasEmptyIcon} />
              <p className={styles.canvasEmptyText}>Configure options and generate a dungeon,<br/>or select one from the list.</p>
            </div>
          ) : (
            <>
              <div className={styles.svgWrap}>
                <DungeonGraph
                  dungeon={active}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>

              {/* Summary toggle */}
              <button className={styles.summaryToggle} onClick={() => setShowSummary(v => !v)}>
                <span className={styles.summaryToggleLabel}>GM Summary</span>
                <Icon name="chevron-right" size={13}
                  style={{ transform: showSummary ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s', color: 'var(--ink-500)' }} />
              </button>

              {showSummary && (
                <div className={styles.summaryExpandedPanel}>
                  <pre className={styles.summaryPre}>{buildSummary(active)}</pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Room detail ───────────────────────────────────────── */}
        <aside className={styles.detail}>
          {!selected ? (
            <div className={styles.detailEmpty}>
              <Icon name="scroll" size={28} />
              <p style={{ fontSize: '.85rem' }}>Click a room to view its details.</p>
            </div>
          ) : (
            <RoomDetail room={selected} />
          )}
        </aside>

      </div>
    </div>
  );
}
