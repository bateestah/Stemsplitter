import { paletteIndex } from '../state/palettes.js';
import { isoToScreen, tilePolygon, screenToIso, pointInDiamond } from '../utils/geometry.js';

export class IsometricRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.tileWidth = 86;
    this.tileHeight = 44;
    this.wallHeight = 70;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.viewWidth = canvas.clientWidth || 800;
    this.viewHeight = canvas.clientHeight || 600;
    this.camera = { x: 0, y: 0 };
    this.hoverCell = null;
    this.needsDraw = false;
    this.currentOrigin = { x: 0, y: 0 };

    this.state.subscribe(() => this.scheduleDraw());
    this.resize(this.viewWidth, this.viewHeight);
  }

  getOrigin() {
    return {
      x: this.viewWidth / 2 + this.camera.x,
      y: 120 + this.camera.y,
    };
  }

  resize(width, height) {
    this.viewWidth = width;
    this.viewHeight = height;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(Math.floor(width * this.pixelRatio), 1);
    this.canvas.height = Math.max(Math.floor(height * this.pixelRatio), 1);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.scheduleDraw();
  }

  scheduleDraw() {
    if (this.needsDraw) return;
    this.needsDraw = true;
    requestAnimationFrame(() => {
      this.needsDraw = false;
      this.draw();
    });
  }

  setHoverCell(cell) {
    const changed =
      (this.hoverCell?.x ?? null) !== (cell?.x ?? null) ||
      (this.hoverCell?.y ?? null) !== (cell?.y ?? null);
    this.hoverCell = cell;
    if (changed) {
      this.scheduleDraw();
    }
  }

  clearHover() {
    this.hoverCell = null;
    this.scheduleDraw();
  }

  panBy(dx, dy) {
    this.camera.x += dx;
    this.camera.y += dy;
    this.scheduleDraw();
  }

  setCameraPosition(x, y) {
    this.camera.x = x;
    this.camera.y = y;
    this.scheduleDraw();
  }

  screenToCell(screenX, screenY) {
    const origin = this.getOrigin();
    this.currentOrigin = origin;
    const isoPoint = screenToIso(
      screenX,
      screenY,
      this.tileWidth,
      this.tileHeight,
      origin
    );
    const tileX = Math.floor(isoPoint.x);
    const tileY = Math.floor(isoPoint.y);
    if (!this.state.inBounds(tileX, tileY)) {
      return null;
    }
    const polygon = tilePolygon(
      tileX,
      tileY,
      this.tileWidth,
      this.tileHeight,
      origin
    );
    const point = { x: screenX, y: screenY };
    if (!pointInDiamond(point, polygon)) {
      return null;
    }
    return { x: tileX, y: tileY };
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.pixelRatio, this.pixelRatio);
    ctx.imageSmoothingEnabled = false;

    const origin = this.getOrigin();
    this.currentOrigin = origin;

    for (let y = 0; y < this.state.height; y += 1) {
      for (let x = 0; x < this.state.width; x += 1) {
        this.drawFloor(ctx, x, y, origin);
      }
    }

    for (let y = 0; y < this.state.height; y += 1) {
      for (let x = 0; x < this.state.width; x += 1) {
        this.drawWalls(ctx, x, y, origin);
      }
    }

    for (let y = 0; y < this.state.height; y += 1) {
      for (let x = 0; x < this.state.width; x += 1) {
        this.drawFurniture(ctx, x, y, origin);
      }
    }

    if (this.hoverCell) {
      this.drawHover(ctx, this.hoverCell.x, this.hoverCell.y, origin);
    }

    ctx.restore();
  }

  drawFloor(ctx, x, y, origin) {
    const tile = this.state.getTile(x, y);
    const polygon = tilePolygon(x, y, this.tileWidth, this.tileHeight, origin);
    ctx.beginPath();
    polygon.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();

    if (tile?.floor && paletteIndex.floor[tile.floor]) {
      const floor = paletteIndex.floor[tile.floor];
      ctx.fillStyle = floor.swatch;
      ctx.strokeStyle = floor.border ?? '#1a1f2b';
    } else {
      ctx.fillStyle = 'rgba(13, 18, 28, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    }
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }

  drawWalls(ctx, x, y, origin) {
    const tile = this.state.getTile(x, y);
    if (!tile) return;
    const base = isoToScreen(x, y, this.tileWidth, this.tileHeight, origin);
    const right = {
      x: base.x + this.tileWidth / 2,
      y: base.y + this.tileHeight / 2,
    };
    const left = {
      x: base.x - this.tileWidth / 2,
      y: base.y + this.tileHeight / 2,
    };
    const top = base;
    const topNorth = { x: top.x, y: top.y - this.wallHeight };
    const rightNorth = { x: right.x, y: right.y - this.wallHeight };
    const leftNorth = { x: left.x, y: left.y - this.wallHeight };

    if (tile.wallNorth && paletteIndex.wall[tile.wallNorth]) {
      const wall = paletteIndex.wall[tile.wallNorth];
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(right.x, right.y);
      ctx.lineTo(rightNorth.x, rightNorth.y);
      ctx.lineTo(topNorth.x, topNorth.y);
      ctx.closePath();
      ctx.fillStyle = wall.swatch;
      ctx.strokeStyle = wall.shadow;
      ctx.fill();
      ctx.stroke();
    }

    if (tile.wallWest && paletteIndex.wall[tile.wallWest]) {
      const wall = paletteIndex.wall[tile.wallWest];
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(leftNorth.x, leftNorth.y);
      ctx.lineTo(topNorth.x, topNorth.y);
      ctx.closePath();
      ctx.fillStyle = wall.shadow;
      ctx.strokeStyle = darken(wall.shadow, 0.2);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawFurniture(ctx, x, y, origin) {
    const tile = this.state.getTile(x, y);
    if (!tile?.furniture) return;
    const style = paletteIndex.furniture[tile.furniture];
    if (!style) return;

    const polygon = tilePolygon(x, y, this.tileWidth, this.tileHeight, origin);
    const inset = 14;
    const base = [
      { x: polygon[0].x, y: polygon[0].y + inset / 2 },
      { x: polygon[1].x - inset / 2, y: polygon[1].y },
      { x: polygon[2].x, y: polygon[2].y - inset },
      { x: polygon[3].x + inset / 2, y: polygon[3].y },
    ];

    const height = style.height ?? 24;
    const top = base.map((point) => ({ x: point.x, y: point.y - height }));

    ctx.beginPath();
    ctx.moveTo(base[0].x, base[0].y);
    for (let i = 1; i < base.length; i += 1) {
      ctx.lineTo(base[i].x, base[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = style.shadow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(base[1].x, base[1].y);
    ctx.lineTo(base[2].x, base[2].y);
    ctx.lineTo(top[2].x, top[2].y);
    ctx.lineTo(top[1].x, top[1].y);
    ctx.closePath();
    ctx.fillStyle = style.shadow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(base[0].x, base[0].y);
    ctx.lineTo(base[1].x, base[1].y);
    ctx.lineTo(top[1].x, top[1].y);
    ctx.lineTo(top[0].x, top[0].y);
    ctx.closePath();
    ctx.fillStyle = darken(style.shadow, 0.2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let i = 1; i < top.length; i += 1) {
      ctx.lineTo(top[i].x, top[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = style.swatch;
    ctx.strokeStyle = darken(style.swatch, 0.35);
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }

  drawHover(ctx, x, y, origin) {
    const polygon = tilePolygon(x, y, this.tileWidth, this.tileHeight, origin);
    ctx.beginPath();
    polygon.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }
}

function darken(hex, intensity = 0.2) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const factor = 1 - intensity;
  const nr = Math.max(Math.min(Math.round(r * factor), 255), 0);
  const ng = Math.max(Math.min(Math.round(g * factor), 255), 0);
  const nb = Math.max(Math.min(Math.round(b * factor), 255), 0);
  return `#${nr.toString(16).padStart(2, '0')}${ng
    .toString(16)
    .padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}
