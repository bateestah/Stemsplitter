import { floorPalette, furniturePalette, wallPalette } from './palettes.js';

const FLOOR_DEFAULT = floorPalette[0]?.id ?? null;

function createTile() {
  return {
    floor: null,
    wallNorth: null,
    wallWest: null,
    furniture: null,
  };
}

export class RoomState {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => createTile())
    );
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitChange(payload = {}) {
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getTile(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[y][x];
  }

  setFloor(x, y, floorId) {
    if (!this.inBounds(x, y)) return;
    const tile = this.getTile(x, y);
    tile.floor = floorId;
    this.emitChange({ type: 'floor', x, y, id: floorId });
  }

  clearFloor(x, y) {
    if (!this.inBounds(x, y)) return;
    const tile = this.getTile(x, y);
    tile.floor = null;
    this.emitChange({ type: 'floor', x, y, id: null });
  }

  toggleWall(x, y, orientation, wallId) {
    if (!this.inBounds(x, y)) return;
    if (!['north', 'west'].includes(orientation)) return;
    const key = orientation === 'north' ? 'wallNorth' : 'wallWest';
    const tile = this.getTile(x, y);
    tile[key] = tile[key] === wallId ? null : wallId;
    this.emitChange({
      type: 'wall',
      x,
      y,
      id: tile[key],
      orientation,
    });
  }

  setFurniture(x, y, furnitureId) {
    if (!this.inBounds(x, y)) return;
    const tile = this.getTile(x, y);
    tile.furniture = furnitureId;
    this.emitChange({ type: 'furniture', x, y, id: furnitureId });
  }

  clearFurniture(x, y) {
    if (!this.inBounds(x, y)) return;
    const tile = this.getTile(x, y);
    tile.furniture = null;
    this.emitChange({ type: 'furniture', x, y, id: null });
  }

  clearTile(x, y) {
    if (!this.inBounds(x, y)) return;
    const tile = this.getTile(x, y);
    tile.floor = null;
    tile.wallNorth = null;
    tile.wallWest = null;
    tile.furniture = null;
    this.emitChange({ type: 'clear', x, y });
  }

  clearRoom() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const tile = this.tiles[y][x];
        tile.floor = null;
        tile.wallNorth = null;
        tile.wallWest = null;
        tile.furniture = null;
      }
    }
    this.emitChange({ type: 'clear-room' });
  }

  applyStarterLayout() {
    this.clearRoom();
    const padding = 2;
    const floorChoices = floorPalette.map((entry) => entry.id);
    const furnitureChoices = furniturePalette.map((entry) => entry.id);
    const wallNorthId = wallPalette.find((entry) => entry.orientation === 'north')?.id;
    const wallWestId = wallPalette.find((entry) => entry.orientation === 'west')?.id;

    for (let y = padding; y < this.height - padding; y += 1) {
      for (let x = padding; x < this.width - padding; x += 1) {
        const offset = (x + y) % floorChoices.length;
        const floorId = floorChoices[offset] ?? FLOOR_DEFAULT;
        this.setFloor(x, y, floorId);
      }
    }

    // Accent rug in the centre
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    for (let y = centerY - 1; y <= centerY + 1; y += 1) {
      for (let x = centerX - 2; x <= centerX + 2; x += 1) {
        if (this.inBounds(x, y)) {
          this.setFloor(x, y, floorChoices[2] ?? FLOOR_DEFAULT);
        }
      }
    }

    if (wallNorthId) {
      for (let x = padding; x < this.width - padding; x += 1) {
        this.toggleWall(x, padding, 'north', wallNorthId);
      }
    }

    if (wallWestId) {
      for (let y = padding; y < this.height - padding; y += 1) {
        this.toggleWall(padding, y, 'west', wallWestId);
      }
    }

    const sofaX = centerX - 2;
    const sofaY = centerY + 1;
    const tableX = centerX;
    const tableY = centerY;
    const plantX = centerX + 3;
    const plantY = centerY - 1;

    if (furnitureChoices[0]) this.setFurniture(sofaX, sofaY, furnitureChoices[0]);
    if (furnitureChoices[1]) this.setFurniture(tableX, tableY, furnitureChoices[1]);
    if (furnitureChoices[2]) this.setFurniture(plantX, plantY, furnitureChoices[2]);

    this.emitChange({ type: 'starter-layout' });
  }
}
