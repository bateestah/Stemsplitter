export const palette = {
  floor: [
    {
      id: 'sunset-parquet',
      name: 'Sunset Parquet',
      color: '#f6d365',
      border: '#fda085',
      pattern: 'stripes',
      description: 'Warm-toned planks with a soft gradient glow.'
    },
    {
      id: 'lagoon-glass',
      name: 'Lagoon Glass',
      color: '#87f5fb',
      border: '#53c2d1',
      pattern: 'grid',
      description: 'A crystalline aqua tile perfect for spa corners.'
    },
    {
      id: 'bubblegum',
      name: 'Bubblegum Pop',
      color: '#ff9aa2',
      border: '#f3698a',
      pattern: 'checker',
      description: 'Playful pink diamonds reminiscent of dance floors.'
    }
  ],
  furniture: [
    {
      id: 'retro-sofa',
      name: 'Retro Sofa',
      color: '#ff6f91',
      shape: 'retro-sofa',
      height: 52,
      description: 'A plush loveseat ready for lobby lounging.'
    },
    {
      id: 'lofi-table',
      name: 'Lofi Table',
      color: '#c3a38a',
      shape: 'lofi-table',
      height: 34,
      description: 'Low wooden table for coffee cups and gossip mags.'
    },
    {
      id: 'neon-lamp',
      name: 'Neon Lamp',
      color: '#8bf6ff',
      shape: 'neon-lamp',
      height: 72,
      description: 'Glowing column that washes the room in ambient light.'
    },
    {
      id: 'palm-plant',
      name: 'Palm Plant',
      color: '#6bd88f',
      shape: 'palm-plant',
      height: 64,
      description: 'Tropical greenery to give the suite a vacation vibe.'
    }
  ]
};

export const rotationLabels = ['North-East', 'South-East', 'South-West', 'North-West'];

const paletteListeners = new Set();

export const furnitureShapeOptions = [
  { id: 'retro-sofa', label: 'Retro sofa (seat + back)' },
  { id: 'lofi-table', label: 'Low table' },
  { id: 'neon-lamp', label: 'Neon lamp column' },
  { id: 'palm-plant', label: 'Palm plant' },
  { id: 'block', label: 'Simple block' }
];

export function onPaletteChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  paletteListeners.add(listener);
  return () => paletteListeners.delete(listener);
}

function emitPaletteChange(detail) {
  paletteListeners.forEach((listener) => {
    try {
      listener(detail);
    } catch (error) {
      // Swallow listener errors so one bad subscriber does not break updates.
      console.error('Palette listener error', error);
    }
  });
}

function sanitizeHexColor(value, fallback = '#cccccc') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  const sixDigitMatch = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (sixDigitMatch) {
    return `#${sixDigitMatch[1].toLowerCase()}`;
  }

  const threeDigitMatch = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (threeDigitMatch) {
    const expanded = threeDigitMatch[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
    return `#${expanded.toLowerCase()}`;
  }

  return fallback;
}

function clampHeight(value, fallback = 52) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const rounded = Math.round(numeric);
  const min = 12;
  const max = 160;
  return Math.min(max, Math.max(min, rounded));
}

function isValidShape(shape) {
  return furnitureShapeOptions.some((option) => option.id === shape);
}

function normalizeShape(shape, fallback = 'block') {
  if (typeof shape === 'string' && isValidShape(shape)) {
    return shape;
  }

  return fallback;
}

function slugifyName(name) {
  if (typeof name !== 'string') {
    return 'custom-furniture';
  }

  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return base || 'custom-furniture';
}

function ensureUniqueFurnitureId(baseId) {
  const base = baseId || 'custom-furniture';
  let candidate = base;
  let counter = 2;

  const isTaken = (id) => palette.furniture.some((item) => item.id === id);

  while (isTaken(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export function createFurnitureDefinition(definition) {
  const name = typeof definition?.name === 'string' && definition.name.trim().length > 0
    ? definition.name.trim()
    : 'Custom Furniture';

  const desiredId = slugifyName(definition?.id ?? name);
  const id = ensureUniqueFurnitureId(desiredId);

  const normalized = {
    id,
    name,
    description: typeof definition?.description === 'string' ? definition.description.trim() : '',
    color: sanitizeHexColor(definition?.color, '#cccccc'),
    shape: normalizeShape(definition?.shape, 'block'),
    height: clampHeight(definition?.height, 48)
  };

  palette.furniture.push(normalized);
  emitPaletteChange({ type: 'add', category: 'furniture', item: normalized });
  return normalized;
}

export function updateFurnitureDefinition(id, updates) {
  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }

  const index = palette.furniture.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  const current = palette.furniture[index];
  const name =
    typeof updates?.name === 'string' && updates.name.trim().length > 0
      ? updates.name.trim()
      : current.name;

  const normalized = {
    ...current,
    name,
    description:
      typeof updates?.description === 'string'
        ? updates.description.trim()
        : current.description,
    color: sanitizeHexColor(updates?.color, current.color),
    shape: normalizeShape(updates?.shape, current.shape),
    height: clampHeight(updates?.height, current.height)
  };

  palette.furniture[index] = normalized;
  emitPaletteChange({ type: 'update', category: 'furniture', item: normalized });
  return normalized;
}

export function findPaletteItem(category, id) {
  if (!palette[category]) {
    return null;
  }

  return palette[category].find((item) => item.id === id) ?? null;
}

export function getDefaultSelection() {
  return { category: 'floor', itemId: palette.floor[0].id };
}
