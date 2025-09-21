export const floorPalette = [
  {
    id: 'floor-wood',
    label: 'Warm Wood',
    swatch: '#c89056',
    border: '#9e6b38',
  },
  {
    id: 'floor-slate',
    label: 'Slate Stone',
    swatch: '#6b7a8f',
    border: '#4c5764',
  },
  {
    id: 'floor-emerald',
    label: 'Emerald Carpet',
    swatch: '#2c9f78',
    border: '#1d7053',
  },
  {
    id: 'floor-sunset',
    label: 'Sunset Tile',
    swatch: '#d36f5f',
    border: '#a64d40',
  },
];

export const wallPalette = [
  {
    id: 'wall-north',
    label: 'North Wall',
    orientation: 'north',
    swatch: '#f3d9c1',
    shadow: '#d7b598',
  },
  {
    id: 'wall-west',
    label: 'West Wall',
    orientation: 'west',
    swatch: '#dce2f7',
    shadow: '#aeb6d4',
  },
];

export const furniturePalette = [
  {
    id: 'furni-sofa',
    label: 'Retro Sofa',
    swatch: '#f07d6b',
    shadow: '#b35749',
    height: 26,
  },
  {
    id: 'furni-table',
    label: 'Low Table',
    swatch: '#c8a061',
    shadow: '#9a7846',
    height: 16,
  },
  {
    id: 'furni-plant',
    label: 'Potted Plant',
    swatch: '#6fbf75',
    shadow: '#3f7d46',
    height: 42,
  },
];

export const utilityTools = [
  {
    id: 'tool-erase',
    label: 'Eraser',
    icon: '🧹',
  },
  {
    id: 'tool-picker',
    label: 'Eyedropper',
    icon: '🎯',
  },
];

export const paletteIndex = {
  floor: Object.fromEntries(floorPalette.map((entry) => [entry.id, entry])),
  wall: Object.fromEntries(wallPalette.map((entry) => [entry.id, entry])),
  furniture: Object.fromEntries(
    furniturePalette.map((entry) => [entry.id, entry])
  ),
};

export function getPaletteEntry(category, id) {
  return paletteIndex[category]?.[id] ?? null;
}
