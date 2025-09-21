import { findPaletteItem } from './palette.js';

export class IsoRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.state = state;
    this.ctx = canvas.getContext('2d');

    this.tileWidth = 64;
    this.tileHeight = 32;
    this.halfTileWidth = this.tileWidth / 2;
    this.halfTileHeight = this.tileHeight / 2;

    this.pixelRatio = window.devicePixelRatio || 1;
    this.displayWidth = canvas.clientWidth || canvas.width;
    this.displayHeight = canvas.clientHeight || canvas.height;

    window.addEventListener('resize', () => this.draw());
    this.draw();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * this.pixelRatio));
    const height = Math.max(1, Math.floor(rect.height * this.pixelRatio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.displayWidth = rect.width;
    this.displayHeight = rect.height;

    const mapPixelWidth = (this.state.width + this.state.height) * this.halfTileWidth;
    const mapPixelHeight = (this.state.width + this.state.height) * this.halfTileHeight;

    this.originX = this.displayWidth / 2;
    const verticalPadding = Math.max(40, (this.displayHeight - mapPixelHeight) / 2);
    this.originY = verticalPadding;
    this.maxX = this.originX + mapPixelWidth / 2;
    this.minX = this.originX - mapPixelWidth / 2;
    this.maxY = this.originY + mapPixelHeight;
  }

  draw() {
    if (!this.ctx) {
      return;
    }

    this.resizeCanvas();

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.pixelRatio, this.pixelRatio);

    this.drawFloor(ctx);
    this.drawHoverFill(ctx);
    this.drawFurniture(ctx);
    this.drawHoverOutline(ctx);
  }

  drawFloor(ctx) {
    for (let y = 0; y < this.state.height; y += 1) {
      for (let x = 0; x < this.state.width; x += 1) {
        const { x: screenX, y: screenY } = this.gridToScreen(x, y);
        const floorId = this.state.getFloorAt(x, y);
        const tileDefinition = findPaletteItem('floor', floorId);
        this.drawFloorTile(ctx, screenX, screenY, tileDefinition);
      }
    }
  }

  drawFloorTile(ctx, sx, sy, definition) {
    const baseColor = definition?.color ?? '#d2d2d2';
    const borderColor = definition?.border ?? '#b5b5b5';

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + this.halfTileWidth, sy + this.halfTileHeight);
    ctx.lineTo(sx, sy + this.tileHeight);
    ctx.lineTo(sx - this.halfTileWidth, sy + this.halfTileHeight);
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    if (definition?.pattern) {
      this.drawFloorPattern(ctx, sx, sy, definition.pattern, definition);
    }
  }

  drawFloorPattern(ctx, sx, sy, pattern, definition) {
    ctx.save();
    this.drawDiamondPath(ctx, sx, sy);
    ctx.clip();

    const accent = this.shadeColor(definition?.border ?? definition?.color ?? '#ffffff', -0.25);

    if (pattern === 'checker') {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(sx, sy + this.halfTileHeight);
      ctx.lineTo(sx + this.halfTileWidth / 2, sy + this.tileHeight / 2);
      ctx.lineTo(sx, sy + this.tileHeight / 2 + this.halfTileHeight / 2);
      ctx.lineTo(sx - this.halfTileWidth / 2, sy + this.tileHeight / 2);
      ctx.closePath();
      ctx.fill();
    } else if (pattern === 'grid') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy + this.halfTileHeight / 2);
      ctx.lineTo(sx, sy + this.tileHeight - this.halfTileHeight / 2);
      ctx.moveTo(sx - this.halfTileWidth / 2, sy + this.halfTileHeight);
      ctx.lineTo(sx + this.halfTileWidth / 2, sy + this.halfTileHeight);
      ctx.stroke();
    } else if (pattern === 'stripes') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      const startY = sy + 4;
      const endY = sy + this.tileHeight - 4;
      for (let offset = -this.halfTileWidth; offset <= this.halfTileWidth; offset += 8) {
        ctx.beginPath();
        ctx.moveTo(sx + offset, startY);
        ctx.lineTo(sx + offset + this.halfTileWidth, endY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawFurniture(ctx) {
    for (let y = 0; y < this.state.height; y += 1) {
      for (let x = 0; x < this.state.width; x += 1) {
        const furniture = this.state.getFurnitureAt(x, y);
        if (!furniture) {
          continue;
        }

        const definition = findPaletteItem('furniture', furniture.id);
        if (!definition) {
          continue;
        }

        const { x: screenX, y: screenY } = this.gridToScreen(x, y);
        this.drawFurnitureBlock(ctx, screenX, screenY, definition, furniture.rotation ?? 0);
      }
    }
  }

  drawFurnitureBlock(ctx, sx, sy, definition, rotation) {
    const base = this.getTileVertices(sx, sy);
    const top = this.getTileVertices(sx, sy - definition.height);

    this.drawFurnitureShadow(ctx, base, definition.height);

    const leftColor = this.shadeColor(definition.color, -0.35);
    const rightColor = this.shadeColor(definition.color, -0.18);
    const topColor = this.shadeColor(definition.color, 0.18);

    ctx.beginPath();
    ctx.moveTo(top.left.x, top.left.y);
    ctx.lineTo(base.left.x, base.left.y);
    ctx.lineTo(base.bottom.x, base.bottom.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(top.right.x, top.right.y);
    ctx.lineTo(base.right.x, base.right.y);
    ctx.lineTo(base.bottom.x, base.bottom.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(top.top.x, top.top.y);
    ctx.lineTo(top.right.x, top.right.y);
    ctx.lineTo(top.bottom.x, top.bottom.y);
    ctx.lineTo(top.left.x, top.left.y);
    ctx.closePath();
    ctx.fillStyle = topColor;
    ctx.fill();

    ctx.strokeStyle = this.shadeColor(definition.color, -0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.top.x, top.top.y);
    ctx.lineTo(top.right.x, top.right.y);
    ctx.lineTo(base.right.x, base.right.y);
    ctx.lineTo(base.bottom.x, base.bottom.y);
    ctx.lineTo(base.left.x, base.left.y);
    ctx.lineTo(top.left.x, top.left.y);
    ctx.lineTo(top.top.x, top.top.y);
    ctx.stroke();

    this.drawOrientationCue(ctx, top, rotation);
  }

  drawFurnitureShadow(ctx, base, height) {
    const intensity = Math.min(0.35, 0.2 + height / 300);
    ctx.save();
    ctx.fillStyle = `rgba(6, 10, 26, ${intensity.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(base.bottom.x, base.bottom.y + 6, this.halfTileWidth * 0.85, this.halfTileHeight * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawOrientationCue(ctx, top, rotation) {
    const centerX = (top.left.x + top.right.x) / 2;
    const centerY = (top.top.y + top.bottom.y) / 2;
    const targets = [top.right, top.bottom, top.left, top.top];
    const target = targets[rotation % targets.length];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo((centerX + target.x) / 2, (centerY + target.y) / 2);
    ctx.stroke();
  }

  drawHoverFill(ctx) {
    const hovered = this.state.hoveredTile;
    if (!hovered) {
      return;
    }

    const { x, y } = hovered;
    if (!this.state.isInside(x, y)) {
      return;
    }

    const { x: sx, y: sy } = this.gridToScreen(x, y);
    ctx.save();
    this.drawDiamondPath(ctx, sx, sy);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.restore();
  }

  drawHoverOutline(ctx) {
    const hovered = this.state.hoveredTile;
    if (!hovered) {
      return;
    }

    const { x, y } = hovered;
    if (!this.state.isInside(x, y)) {
      return;
    }

    const { x: sx, y: sy } = this.gridToScreen(x, y);
    ctx.save();
    this.drawDiamondPath(ctx, sx, sy);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  drawDiamondPath(ctx, sx, sy) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + this.halfTileWidth, sy + this.halfTileHeight);
    ctx.lineTo(sx, sy + this.tileHeight);
    ctx.lineTo(sx - this.halfTileWidth, sy + this.halfTileHeight);
    ctx.closePath();
  }

  getTileVertices(sx, sy) {
    return {
      top: { x: sx, y: sy },
      right: { x: sx + this.halfTileWidth, y: sy + this.halfTileHeight },
      bottom: { x: sx, y: sy + this.tileHeight },
      left: { x: sx - this.halfTileWidth, y: sy + this.halfTileHeight }
    };
  }

  gridToScreen(x, y) {
    const screenX = (x - y) * this.halfTileWidth + this.originX;
    const screenY = (x + y) * this.halfTileHeight + this.originY;
    return { x: screenX, y: screenY };
  }

  screenToGrid(x, y) {
    if (x < this.minX - this.halfTileWidth || x > this.maxX + this.halfTileWidth || y > this.maxY) {
      return null;
    }

    const relX = x - this.originX;
    const relY = y - this.originY;
    const isoX = (relY / this.halfTileHeight + relX / this.halfTileWidth) / 2;
    const isoY = (relY / this.halfTileHeight - relX / this.halfTileWidth) / 2;
    const tileX = Math.floor(isoX);
    const tileY = Math.floor(isoY);

    if (!this.state.isInside(tileX, tileY)) {
      return null;
    }

    const { x: sx, y: sy } = this.gridToScreen(tileX, tileY);
    if (!this.pointInDiamond(x, y, sx, sy)) {
      return null;
    }

    return { x: tileX, y: tileY };
  }

  pointInDiamond(px, py, sx, sy) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;
    const dx = Math.abs(px - centerX);
    const dy = Math.abs(py - centerY);
    return dx / this.halfTileWidth + dy / this.halfTileHeight <= 1;
  }

  shadeColor(hex, percent) {
    if (!hex) {
      return '#000000';
    }

    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const newR = Math.round((t - r) * p) + r;
    const newG = Math.round((t - g) * p) + g;
    const newB = Math.round((t - b) * p) + b;

    return `#${this.componentToHex(newR)}${this.componentToHex(newG)}${this.componentToHex(newB)}`;
  }

  componentToHex(value) {
    const clamped = Math.max(0, Math.min(255, value));
    return clamped.toString(16).padStart(2, '0');
  }
}
