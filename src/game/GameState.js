import { palette, findPaletteItem, getDefaultSelection } from './palette.js';
import { Avatar } from './Avatar.js';

export class GameState {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.floorTiles = Array.from({ length: width * height }, () => palette.floor[0].id);
    this.furnitureTiles = new Array(width * height).fill(null);

    const defaultSelection = getDefaultSelection();
    this.selectedCategory = defaultSelection.category;
    this.selectedItemId = defaultSelection.itemId;
    this.selectedRotation = 0;
    this.hoveredTile = null;

    this.listeners = new Set();

    const startX = Math.floor(this.width / 2);
    const startY = Math.floor(this.height / 2);
    this.avatar = new Avatar(startX, startY);
  }

  index(x, y) {
    return y * this.width + x;
  }

  isInside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyChange() {
    this.listeners.forEach((listener) => listener(this));
  }

  setSelection(category, itemId) {
    if (!palette[category]) {
      return;
    }

    const exists = palette[category].some((item) => item.id === itemId);
    if (!exists) {
      return;
    }

    this.selectedCategory = category;
    this.selectedItemId = itemId;
    this.notifyChange();
  }

  rotateSelection(step = 1) {
    if (this.selectedCategory !== 'furniture') {
      return;
    }

    this.selectedRotation = (this.selectedRotation + step + 4) % 4;
    this.notifyChange();
  }

  rotateFurnitureAt(x, y, step = 1) {
    if (!this.isInside(x, y)) {
      return false;
    }

    const idx = this.index(x, y);
    const entry = this.furnitureTiles[idx];
    if (!entry) {
      return false;
    }

    const currentRotation = entry.rotation ?? 0;
    const nextRotation = (currentRotation + step + 4) % 4;
    this.furnitureTiles[idx] = { ...entry, rotation: nextRotation };
    this.notifyChange();
    return true;
  }

  rotateHoveredFurniture(step = 1) {
    if (!this.hoveredTile) {
      return false;
    }

    const { x, y } = this.hoveredTile;
    return this.rotateFurnitureAt(x, y, step);
  }

  setHovered(tile) {
    const prev = this.hoveredTile;
    if (
      (prev === null && tile === null) ||
      (prev && tile && prev.x === tile.x && prev.y === tile.y)
    ) {
      return;
    }

    this.hoveredTile = tile;
    this.notifyChange();
  }

  getSelectionDefinition() {
    return findPaletteItem(this.selectedCategory, this.selectedItemId);
  }

  getFloorAt(x, y) {
    if (!this.isInside(x, y)) {
      return null;
    }

    return this.floorTiles[this.index(x, y)];
  }

  getFurnitureAt(x, y) {
    if (!this.isInside(x, y)) {
      return null;
    }

    return this.furnitureTiles[this.index(x, y)];
  }

  setFloorAt(x, y, floorId) {
    if (!this.isInside(x, y)) {
      return;
    }

    const floorDefinition = findPaletteItem('floor', floorId);
    if (!floorDefinition) {
      return;
    }

    this.floorTiles[this.index(x, y)] = floorDefinition.id;
    this.notifyChange();
  }

  placeFurnitureAt(x, y, furnitureId, rotation = this.selectedRotation) {
    if (!this.isInside(x, y)) {
      return false;
    }

    const furnitureDefinition = findPaletteItem('furniture', furnitureId);
    if (!furnitureDefinition) {
      return false;
    }

    this.furnitureTiles[this.index(x, y)] = { id: furnitureDefinition.id, rotation };
    this.notifyChange();
    return true;
  }

  removeFurnitureAt(x, y) {
    if (!this.isInside(x, y)) {
      return false;
    }

    const idx = this.index(x, y);
    if (!this.furnitureTiles[idx]) {
      return false;
    }

    this.furnitureTiles[idx] = null;
    this.notifyChange();
    return true;
  }

  placeSelection(x, y) {
    if (!this.isInside(x, y)) {
      return false;
    }

    if (this.selectedCategory === 'floor') {
      this.setFloorAt(x, y, this.selectedItemId);
      return true;
    }

    if (this.selectedCategory === 'furniture') {
      return this.placeFurnitureAt(x, y, this.selectedItemId);
    }

    return false;
  }

  sampleFloor(x, y) {
    if (!this.isInside(x, y)) {
      return;
    }

    const floorId = this.getFloorAt(x, y);
    if (!floorId) {
      return;
    }

    this.selectedCategory = 'floor';
    this.selectedItemId = floorId;
    this.notifyChange();
  }

  moveAvatarTo(x, y) {
    if (!this.avatar || !this.isInside(x, y)) {
      return false;
    }

    const changed = this.avatar.setTarget(x, y);
    if (changed) {
      this.notifyChange();
    }

    return changed;
  }
}
