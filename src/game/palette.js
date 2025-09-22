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

export const furnitureShapeOptions = [
  { id: 'retro-sofa', label: 'Retro Sofa' },
  { id: 'lofi-table', label: 'Lofi Table' },
  { id: 'neon-lamp', label: 'Neon Lamp' },
  { id: 'palm-plant', label: 'Palm Plant' },
  { id: 'block', label: 'Basic Block' }
];

const FURNITURE_HEIGHT_MIN = 12;
const FURNITURE_HEIGHT_MAX = 96;
const DEFAULT_FURNITURE_HEIGHT = 48;

export const furnitureHeightRange = {
  min: FURNITURE_HEIGHT_MIN,
  max: FURNITURE_HEIGHT_MAX,
  default: DEFAULT_FURNITURE_HEIGHT
};

const paletteListeners = new Set();

export const rotationLabels = ['North-East', 'South-East', 'South-West', 'North-West'];

export function onPaletteChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  paletteListeners.add(listener);
  return () => {
    paletteListeners.delete(listener);
  };
}

export function addFurnitureDefinition(definition) {
  const sanitized = sanitizeFurnitureDefinition(definition);
  const existingIndex = palette.furniture.findIndex((item) => item.id === sanitized.id);

  if (existingIndex >= 0) {
    palette.furniture[existingIndex] = sanitized;
    notifyPaletteChange('furniture', 'update', sanitized);
    return sanitized;
  }

  palette.furniture.push(sanitized);
  notifyPaletteChange('furniture', 'add', sanitized);
  return sanitized;
}

export function updateFurnitureDefinition(id, updates) {
  const index = palette.furniture.findIndex((item) => item.id === id);
  if (index < 0) {
    return null;
  }

  const merged = { ...palette.furniture[index], ...updates, id };
  const sanitized = sanitizeFurnitureDefinition(merged);
  palette.furniture[index] = sanitized;
  notifyPaletteChange('furniture', 'update', sanitized);
  return sanitized;
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

function notifyPaletteChange(category, type, definition) {
  paletteListeners.forEach((listener) => {
    listener({ category, type, definition });
  });
}

function sanitizeFurnitureDefinition(source) {
  const id = normalizeId(source?.id);
  if (!id) {
    throw new Error('Furniture definition requires an id.');
  }

  return {
    id,
    name: normalizeName(source?.name, 'Untitled Furniture'),
    color: normalizeColor(source?.color, '#cccccc'),
    shape: normalizeShape(source?.shape, 'block'),
    height: clampHeight(source?.height, DEFAULT_FURNITURE_HEIGHT),
    description: normalizeDescription(source?.description)
  };
}

function normalizeId(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeName(value, fallback) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof fallback === 'string') {
    const trimmedFallback = fallback.trim();
    if (trimmedFallback) {
      return trimmedFallback;
    }
  }

  return 'Untitled Furniture';
}

function normalizeColor(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';

  if (isValidHex(candidate)) {
    return normalizeHex(candidate);
  }

  if (isValidHex(fallback)) {
    return normalizeHex(fallback);
  }

  return '#cccccc';
}

function normalizeShape(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate) {
    return candidate;
  }

  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim();
  }

  return 'block';
}

function normalizeDescription(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function clampHeight(value, fallback) {
  const numeric = Number.isFinite(value) ? value : Number.parseFloat(value);
  const base = Number.isFinite(numeric) ? numeric : Number.isFinite(fallback) ? fallback : DEFAULT_FURNITURE_HEIGHT;
  const rounded = Math.round(base);
  return Math.max(FURNITURE_HEIGHT_MIN, Math.min(FURNITURE_HEIGHT_MAX, rounded));
}

function isValidHex(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHex(value) {
  const hex = value.trim().toLowerCase();
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return hex;
}
