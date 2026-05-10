export type MovementType = 'fly' | 'swim' | 'climb' | 'burrow';

export const MOVEMENT_TYPES: MovementType[] = ['fly', 'swim', 'climb', 'burrow'];

export interface MovementSpeedSpec {
  speed: number;
  hover?: boolean;
}

export type MovementSpeeds = Record<string, MovementSpeedSpec>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function movementTypeLabel(type: string): string {
  return type
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeMovementSpeeds(raw: unknown): MovementSpeeds {
  if (!raw) return {};

  const result: MovementSpeeds = {};

  const addEntry = (typeRaw: string, value: unknown) => {
    const type = typeRaw.trim().toLowerCase();
    if (!type) return;

    let speed: number | null = null;
    let hover = false;

    if (typeof value === 'number') {
      speed = value;
    } else if (isPlainObject(value)) {
      const parsedSpeed = Number(value.speed);
      if (!Number.isNaN(parsedSpeed)) speed = parsedSpeed;
      hover = Boolean(value.hover);
    }

    if (speed === null || Number.isNaN(speed) || speed < 0) return;
    result[type] = type === 'fly' ? { speed, ...(hover ? { hover: true } : {}) } : { speed };
  };

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!isPlainObject(entry)) continue;
      const type = typeof entry.type === 'string' ? entry.type : '';
      addEntry(type, entry);
    }
    return result;
  }

  if (isPlainObject(raw)) {
    for (const [type, value] of Object.entries(raw)) {
      addEntry(type, value);
    }
  }

  return result;
}

export function serializeMovementSpeeds(raw: unknown): string {
  const normalized = normalizeMovementSpeeds(raw);
  return JSON.stringify(normalized);
}

export function formatMovementSpeedLine(baseSpeed: number, raw: unknown): string {
  const other = normalizeMovementSpeeds(raw);
  const parts = [`${baseSpeed} ft.`];
  const seen = new Set<string>();

  for (const type of MOVEMENT_TYPES) {
    const entry = other[type];
    if (!entry) continue;
    seen.add(type);
    parts.push(formatMovementPart(type, entry));
  }

  for (const [type, entry] of Object.entries(other)) {
    if (seen.has(type)) continue;
    parts.push(formatMovementPart(type, entry));
  }

  return parts.join(', ');
}

function formatMovementPart(type: string, entry: MovementSpeedSpec): string {
  const label = movementTypeLabel(type).toLowerCase();
  const suffix = type.toLowerCase() === 'fly' && entry.hover ? ' (hover)' : '';
  return `${label} ${entry.speed} ft.${suffix}`;
}
