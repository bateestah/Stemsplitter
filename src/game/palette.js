const basePalette = {
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

export const furnitureShapes = [
  {
    id: 'retro-sofa',
    label: 'Retro sofa',
    description: 'Rounded loveseat with back cushions and a cozy seat.'
  },
  {
    id: 'lofi-table',
    label: 'Lofi table',
    description: 'Low wooden coffee table with a gentle taper.'
  },
  {
    id: 'neon-lamp',
    label: 'Neon lamp',
    description: 'Tall glowing column that casts ambient light.'
  },
  {
    id: 'palm-plant',
    label: 'Palm plant',
    description: 'Leafy palm with a slender base and big fronds.'
  },
  {
    id: 'block',
    label: 'Simple block',
    description: 'Generic block with an orientation indicator on top.'
  }
];

export const palette = {
  floor: basePalette.floor.map((item) => ({ ...item })),
  furniture: basePalette.furniture.map((item) => ({ ...item }))
};

const paletteListeners = new Set();

export const rotationLabels = ['North-East', 'South-East', 'South-West', 'North-West'];

export function findPaletteItem(category, id) {
  if (!palette[category]) {
    return null;
  }

  return palette[category].find((item) => item.id === id) ?? null;
}

export function getDefaultSelection() {
  return { category: 'floor', itemId: palette.floor[0].id };
}

export function onPaletteChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  paletteListeners.add(listener);
  return () => {
    paletteListeners.delete(listener);
  };
}

export function getPaletteSnapshot() {
  return {
    floor: palette.floor.map((item) => ({ ...item })),
    furniture: palette.furniture.map((item) => ({ ...item }))
  };
}

export function addFurnitureDefinition(definition) {
  const sanitized = sanitizeFurnitureDefinition(definition, { allowExistingId: false });
  const proposedId = definition?.id ?? definition?.name;
  const baseId = createSlug(proposedId);
  const uniqueId = ensureUniqueFurnitureId(baseId);
  const entry = { ...sanitized, id: uniqueId };
  palette.furniture.push(entry);
  notifyPaletteListeners();
  return entry;
}

export function updateFurnitureDefinition(id, updates) {
  if (!id) {
    return null;
  }

  const index = palette.furniture.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  const sanitized = sanitizeFurnitureDefinition({ ...palette.furniture[index], ...updates, id }, {
    allowExistingId: true
  });

  palette.furniture[index] = sanitized;
  notifyPaletteListeners();
  return sanitized;
}

function sanitizeFurnitureDefinition(definition, { allowExistingId }) {
  const fallbackColor = '#cccccc';
  const defaultHeight = 48;
  const safeDefinition = typeof definition === 'object' && definition !== null ? definition : {};

  const name = typeof safeDefinition.name === 'string' ? safeDefinition.name.trim() : '';
  const description = typeof safeDefinition.description === 'string' ? safeDefinition.description.trim() : '';
  const colorInput = typeof safeDefinition.color === 'string' ? safeDefinition.color.trim() : '';
  const color = /^#([0-9a-f]{6})$/i.test(colorInput) ? `#${colorInput.slice(1).toLowerCase()}` : fallbackColor;
  const heightValue = Number.parseFloat(safeDefinition.height);
  const height = Number.isFinite(heightValue)
    ? Math.max(8, Math.min(160, Math.round(heightValue)))
    : defaultHeight;
  const shapeInput = typeof safeDefinition.shape === 'string' ? safeDefinition.shape.trim() : '';
  const allowedShapes = new Set(furnitureShapes.map((shape) => shape.id));
  const shape = allowedShapes.has(shapeInput) ? shapeInput : 'block';

  const entry = {
    name: name || 'Untitled furniture',
    description,
    color,
    height,
    shape
  };

  if (allowExistingId && typeof safeDefinition.id === 'string' && safeDefinition.id.trim()) {
    entry.id = safeDefinition.id.trim();
  }

  return entry;
}

function createSlug(source) {
  const fallback = 'custom-piece';
  if (!source || typeof source !== 'string') {
    return fallback;
  }

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, 48);
}

function ensureUniqueFurnitureId(baseId) {
  const fallback = 'custom-piece';
  const sanitizedBase = baseId && typeof baseId === 'string' ? baseId : fallback;
  const existingIds = new Set(palette.furniture.map((item) => item.id));

  if (!existingIds.has(sanitizedBase)) {
    return sanitizedBase;
  }

  let suffix = 2;
  while (existingIds.has(`${sanitizedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${sanitizedBase}-${suffix}`;
}

function notifyPaletteListeners() {
  const snapshot = getPaletteSnapshot();
  paletteListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('Palette listener error', error);
    }
  });
}
