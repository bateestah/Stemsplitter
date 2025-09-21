const DEFAULT_FLOOR = {
  color: '#2f3d62',
  stroke: 'rgba(10, 14, 28, 0.6)',
};

const DEFAULT_ITEM = {
  color: '#ffb347',
  height: 28,
};

function adjustColor(hex, amount) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return hex;
  }
  const normalized = hex.slice(1);
  if (normalized.length !== 6) {
    return hex;
  }
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const clamp = (value) => Math.max(0, Math.min(255, value));
  const nextR = clamp(r + amount);
  const nextG = clamp(g + amount);
  const nextB = clamp(b + amount);
  return `#${((nextR << 16) | (nextG << 8) | nextB).toString(16).padStart(6, '0')}`;
}

export class IsometricRenderer {
  constructor(
    canvas,
    room,
    {
      tileWidth = 64,
      tileHeight = 32,
      floorDefinitions = {},
      itemDefinitions = {},
    } = {}
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.room = room;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.floorDefinitions = floorDefinitions;
    this.itemDefinitions = itemDefinitions;

    this.hoverTile = null;
    this.showGrid = true;
    this.originX = canvas.width / 2;
    this.originY = tileHeight;

    this.resize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height);
  }

  setFloorDefinitions(definitions) {
    this.floorDefinitions = definitions;
  }

  setItemDefinitions(definitions) {
    this.itemDefinitions = definitions;
  }

  setGridVisible(visible) {
    this.showGrid = Boolean(visible);
    this.render();
  }

  setHoverTile(tile) {
    this.hoverTile = tile;
  }

  resize(width, height) {
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));

    this.canvas.width = safeWidth * ratio;
    this.canvas.height = safeHeight * ratio;
    this.canvas.style.width = `${safeWidth}px`;
    this.canvas.style.height = `${safeHeight}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(ratio, ratio);
    this.pixelRatio = ratio;

    this.updateOrigin();
    this.render();
  }

  updateOrigin() {
    const ratio = this.pixelRatio || 1;
    const canvasWidth = this.canvas.width / ratio;
    const canvasHeight = this.canvas.height / ratio;
    const isoHeight = (this.room.width + this.room.height) * (this.tileHeight / 2);
    this.originX = canvasWidth / 2;
    const verticalPadding = Math.max(this.tileHeight, (canvasHeight - isoHeight) / 2);
    this.originY = verticalPadding + this.tileHeight;
  }

  tileToScreen(x, y) {
    const screenX = (x - y) * (this.tileWidth / 2) + this.originX;
    const screenY = (x + y) * (this.tileHeight / 2) + this.originY;
    return { x: screenX, y: screenY };
  }

  screenToTile(screenX, screenY) {
    const dx = screenX - this.originX;
    const dy = screenY - this.originY;
    const isoX = dx / (this.tileWidth / 2);
    const isoY = dy / (this.tileHeight / 2);
    const gridX = (isoY + isoX) / 2;
    const gridY = (isoY - isoX) / 2;
    return { x: gridX, y: gridY };
  }

  pickTile(screenX, screenY) {
    const fractional = this.screenToTile(screenX, screenY);
    const baseX = Math.floor(fractional.x);
    const baseY = Math.floor(fractional.y);
    const candidates = [
      { x: Math.round(fractional.x), y: Math.round(fractional.y) },
      { x: baseX, y: baseY },
      { x: baseX + 1, y: baseY },
      { x: baseX, y: baseY + 1 },
      { x: baseX + 1, y: baseY + 1 },
      { x: baseX - 1, y: baseY },
      { x: baseX, y: baseY - 1 },
      { x: baseX - 1, y: baseY + 1 },
      { x: baseX + 1, y: baseY - 1 },
    ];

    const seen = new Set();
    for (const candidate of candidates) {
      const key = `${candidate.x},${candidate.y}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      if (!this.room.inBounds(candidate.x, candidate.y)) {
        continue;
      }
      if (this.isPointInsideTile(screenX, screenY, candidate.x, candidate.y)) {
        return candidate;
      }
    }
    return null;
  }

  isPointInsideTile(screenX, screenY, tileX, tileY) {
    const center = this.tileToScreen(tileX, tileY);
    const dx = Math.abs(screenX - center.x) / (this.tileWidth / 2);
    const dy = Math.abs(screenY - center.y) / (this.tileHeight / 2);
    return dx + dy <= 1;
  }

  render() {
    const ratio = this.pixelRatio || 1;
    const width = this.canvas.width / ratio;
    const height = this.canvas.height / ratio;
    this.ctx.clearRect(0, 0, width, height);

    this.drawFloor();
    if (this.showGrid) {
      this.drawGrid();
    }
    this.drawItems();
    this.drawHover();
  }

  drawFloor() {
    for (let y = 0; y < this.room.height; y += 1) {
      for (let x = 0; x < this.room.width; x += 1) {
        const type = this.room.getFloor(x, y);
        const definition = this.floorDefinitions[type] ?? DEFAULT_FLOOR;
        const position = this.tileToScreen(x, y);
        this.drawDiamond(position.x, position.y, {
          fill: definition.color,
          stroke: definition.stroke ?? 'rgba(0, 0, 0, 0.35)',
        });
      }
    }
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 0; y < this.room.height; y += 1) {
      for (let x = 0; x < this.room.width; x += 1) {
        const position = this.tileToScreen(x, y);
        this.drawDiamond(position.x, position.y, { strokeOnly: true });
      }
    }
    this.ctx.restore();
  }

  drawItems() {
    for (const item of this.room.items) {
      const definition = this.itemDefinitions[item.type] ?? DEFAULT_ITEM;
      const position = this.tileToScreen(item.x, item.y);
      this.drawPrism(position.x, position.y, definition);
    }
  }

  drawHover() {
    if (!this.hoverTile || !this.room.inBounds(this.hoverTile.x, this.hoverTile.y)) {
      return;
    }
    const position = this.tileToScreen(this.hoverTile.x, this.hoverTile.y);
    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.drawDiamond(position.x, position.y, {
      fill: 'rgba(255, 236, 179, 0.6)',
      stroke: 'rgba(255, 236, 179, 0.9)',
    });
    this.ctx.restore();
  }

  drawDiamond(x, y, { fill, stroke, strokeOnly = false } = {}) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - this.tileHeight / 2);
    ctx.lineTo(x + this.tileWidth / 2, y);
    ctx.lineTo(x, y + this.tileHeight / 2);
    ctx.lineTo(x - this.tileWidth / 2, y);
    ctx.closePath();

    if (fill && !strokeOnly) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke || strokeOnly) {
      ctx.strokeStyle = stroke ?? ctx.strokeStyle;
      ctx.stroke();
    }
  }

  drawPrism(x, y, definition) {
    const ctx = this.ctx;
    const height = definition.height ?? DEFAULT_ITEM.height;
    const baseColor = definition.color ?? DEFAULT_ITEM.color;
    const sideColor = adjustColor(baseColor, -35);
    const topColor = adjustColor(baseColor, 20);

    const topY = y - this.tileHeight / 2 - height;
    const bottomY = y - this.tileHeight / 2;

    ctx.save();
    ctx.globalAlpha = 0.25;
    this.drawDiamond(x, bottomY + this.tileHeight * 0.35, {
      fill: 'rgba(0, 0, 0, 0.55)',
    });
    ctx.restore();

    // top face
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x + this.tileWidth / 2, topY + this.tileHeight / 2);
    ctx.lineTo(x, topY + this.tileHeight);
    ctx.lineTo(x - this.tileWidth / 2, topY + this.tileHeight / 2);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();

    // right face
    ctx.beginPath();
    ctx.moveTo(x + this.tileWidth / 2, topY + this.tileHeight / 2);
    ctx.lineTo(x + this.tileWidth / 2, bottomY + this.tileHeight / 2);
    ctx.lineTo(x, bottomY + this.tileHeight);
    ctx.lineTo(x, topY + this.tileHeight);
    ctx.closePath();
    ctx.fillStyle = sideColor;
    ctx.fill();

    // left face
    ctx.beginPath();
    ctx.moveTo(x - this.tileWidth / 2, topY + this.tileHeight / 2);
    ctx.lineTo(x - this.tileWidth / 2, bottomY + this.tileHeight / 2);
    ctx.lineTo(x, bottomY + this.tileHeight);
    ctx.lineTo(x, topY + this.tileHeight);
    ctx.closePath();
    ctx.fillStyle = adjustColor(baseColor, -50);
    ctx.fill();

    // base outline
    ctx.beginPath();
    ctx.moveTo(x, bottomY);
    ctx.lineTo(x + this.tileWidth / 2, bottomY + this.tileHeight / 2);
    ctx.lineTo(x, bottomY + this.tileHeight);
    ctx.lineTo(x - this.tileWidth / 2, bottomY + this.tileHeight / 2);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.stroke();
  }
}
