export class Room {
  constructor(width, height, { defaultFloor = 'void' } = {}) {
    this.width = width;
    this.height = height;
    this.defaultFloor = defaultFloor;
    this.floor = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => defaultFloor)
    );
    this.items = [];
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getFloor(x, y) {
    return this.inBounds(x, y) ? this.floor[y][x] : null;
  }

  setFloor(x, y, type) {
    if (!this.inBounds(x, y)) {
      return false;
    }
    this.floor[y][x] = type;
    return true;
  }

  toggleFloor(x, y, type) {
    if (!this.inBounds(x, y)) {
      return false;
    }
    const current = this.floor[y][x];
    this.floor[y][x] = current === type ? this.defaultFloor : type;
    return true;
  }

  itemAt(x, y) {
    return (
      this.items.find((item) => item.x === x && item.y === y) ?? null
    );
  }

  placeItem(x, y, definition) {
    if (!this.inBounds(x, y) || !definition) {
      return null;
    }

    const current = this.itemAt(x, y);
    if (current) {
      current.definition = definition;
      current.type = definition.id;
      return current;
    }

    const placed = {
      id: `${definition.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: definition.id,
      x,
      y,
      definition,
    };
    this.items.push(placed);
    return placed;
  }

  removeItem(x, y) {
    const index = this.items.findIndex((item) => item.x === x && item.y === y);
    if (index >= 0) {
      return this.items.splice(index, 1)[0];
    }
    return null;
  }

  clear() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        this.floor[y][x] = this.defaultFloor;
      }
    }
    this.items = [];
  }

  serialize() {
    return {
      width: this.width,
      height: this.height,
      floor: this.floor.map((row) => [...row]),
      items: this.items.map((item) => ({
        id: item.id,
        type: item.type,
        x: item.x,
        y: item.y,
      })),
    };
  }
}
