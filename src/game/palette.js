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
      height: 52,
      description: 'A plush loveseat ready for lobby lounging.'
    },
    {
      id: 'lofi-table',
      name: 'Lofi Table',
      color: '#c3a38a',
      height: 34,
      description: 'Low wooden table for coffee cups and gossip mags.'
    },
    {
      id: 'neon-lamp',
      name: 'Neon Lamp',
      color: '#8bf6ff',
      height: 72,
      description: 'Glowing column that washes the room in ambient light.'
    },
    {
      id: 'palm-plant',
      name: 'Palm Plant',
      color: '#6bd88f',
      height: 64,
      description: 'Tropical greenery to give the suite a vacation vibe.'
    }
  ]
};

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
