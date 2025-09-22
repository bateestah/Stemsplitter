import { findPaletteItem } from './palette.js';

const TWO_PI = Math.PI * 2;

function addVec(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subVec(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scaleVec(v, scalar) {
  return { x: v.x * scalar, y: v.y * scalar };
}

function normalizeVec(v) {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

function lerpVec(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class IsoRenderer {
  constructor(canvas, state, avatar) {
    this.canvas = canvas;
    this.state = state;
    this.avatar = avatar;
    this.ctx = canvas.getContext('2d');

    this.baseTileWidth = 64;
    this.baseTileHeight = 32;
    this.minZoom = 0.6;
    this.maxZoom = 1.6;
    this.zoomStep = 0.2;
    this.zoom = 1;
    this.updateTileMetrics();

    this.pixelRatio = window.devicePixelRatio || 1;
    this.displayWidth = canvas.clientWidth || canvas.width;
    this.displayHeight = canvas.clientHeight || canvas.height;

    this.forceRedraw = true;
    this.lastTimestamp = performance.now();
    this.animationFrameId = null;

    this.handleResize = () => {
      this.forceRedraw = true;
    };

    window.addEventListener('resize', this.handleResize);

    this.renderLoop = this.renderLoop.bind(this);
    this.drawFrame();
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  updateTileMetrics() {
    this.tileWidth = this.baseTileWidth * this.zoom;
    this.tileHeight = this.baseTileHeight * this.zoom;
    this.halfTileWidth = this.tileWidth / 2;
    this.halfTileHeight = this.tileHeight / 2;
    this.wallHeight = this.tileHeight * 3;

    this.directionVectors = [
      { x: this.halfTileWidth, y: -this.halfTileHeight },
      { x: this.halfTileWidth, y: this.halfTileHeight },
      { x: -this.halfTileWidth, y: this.halfTileHeight },
      { x: -this.halfTileWidth, y: -this.halfTileHeight }
    ];
  }

  setZoom(zoom) {
    const value = Number.isFinite(zoom) ? zoom : this.zoom;
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, value));
    if (Math.abs(clamped - this.zoom) < 0.001) {
      return false;
    }

    this.zoom = clamped;
    this.updateTileMetrics();
    this.forceRedraw = true;
    this.emitZoomChange();
    return true;
  }

  zoomIn(step = this.zoomStep) {
    return this.setZoom(this.zoom + step);
  }

  zoomOut(step = this.zoomStep) {
    return this.setZoom(this.zoom - step);
  }

  canZoomIn() {
    return this.zoom < this.maxZoom - 0.001;
  }

  canZoomOut() {
    return this.zoom > this.minZoom + 0.001;
  }

  getZoom() {
    return this.zoom;
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
    this.forceRedraw = true;
  }

  drawFrame() {
    if (!this.ctx) {
      return;
    }

    this.resizeCanvas();

    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.pixelRatio, this.pixelRatio);

    this.drawWalls(ctx);
    this.drawFloor(ctx);
    this.drawHoverFill(ctx);
    this.drawEntities(ctx);
    this.drawHoverOutline(ctx);
  }

  renderLoop(timestamp) {
    if (!this.ctx) {
      return;
    }

    const deltaMs = timestamp - this.lastTimestamp;
    const delta = Number.isFinite(deltaMs) ? Math.min(0.1, Math.max(0, deltaMs / 1000)) : 0;
    this.lastTimestamp = timestamp;

    const hasAvatar = Boolean(this.avatar && typeof this.avatar.update === 'function');
    if (hasAvatar) {
      this.avatar.update(delta);
    }

    if (this.forceRedraw || hasAvatar) {
      this.drawFrame();
      this.forceRedraw = false;
    }

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  drawWalls(ctx) {
    if (this.state.width <= 0 || this.state.height <= 0) {
      return;
    }

    const baseColor = '#d8dbe3';
    const strokeColor = this.shadeColor(baseColor, -0.4);
    const leftFill = this.shadeColor(baseColor, -0.25);
    const rightFill = this.shadeColor(baseColor, -0.1);

    const topCorner = this.gridToScreen(0, 0);

    const backLeftBase = [
      { x: topCorner.x, y: topCorner.y }
    ];
    for (let y = 0; y < this.state.height; y += 1) {
      const { x: sx, y: sy } = this.gridToScreen(0, y);
      backLeftBase.push({
        x: sx - this.halfTileWidth,
        y: sy + this.halfTileHeight
      });
    }

    const backRightBase = [
      { x: topCorner.x, y: topCorner.y }
    ];
    for (let x = 0; x < this.state.width; x += 1) {
      const { x: sx, y: sy } = this.gridToScreen(x, 0);
      backRightBase.push({
        x: sx + this.halfTileWidth,
        y: sy + this.halfTileHeight
      });
    }

    this.drawWallFace(ctx, backLeftBase, leftFill, strokeColor);
    this.drawWallFace(ctx, backRightBase, rightFill, strokeColor);
  }

  drawWallFace(ctx, basePoints, fillColor, strokeColor) {
    if (!basePoints || basePoints.length < 2) {
      return;
    }

    const topPoints = basePoints.map(point => ({
      x: point.x,
      y: point.y - this.wallHeight
    }));

    ctx.beginPath();
    ctx.moveTo(basePoints[0].x, basePoints[0].y);
    for (let i = 1; i < basePoints.length; i += 1) {
      ctx.lineTo(basePoints[i].x, basePoints[i].y);
    }
    for (let i = topPoints.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i += 1) {
      ctx.lineTo(topPoints[i].x, topPoints[i].y);
    }
    ctx.strokeStyle = this.shadeColor(fillColor, 0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
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

  drawEntities(ctx) {
    const entries = [];

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
        entries.push({
          type: 'furniture',
          depth: x + y,
          secondary: y,
          tertiary: x,
          screenX,
          screenY,
          definition,
          rotation: furniture.rotation ?? 0
        });
      }
    }

    if (this.avatar && typeof this.avatar.getRenderState === 'function') {
      const avatarState = this.avatar.getRenderState();
      if (avatarState) {
        const { position } = avatarState;
        const { x: screenX, y: screenY } = this.gridToScreen(position.x, position.y);
        entries.push({
          type: 'avatar',
          depth: position.x + position.y,
          secondary: position.y,
          tertiary: position.x,
          screenX,
          screenY,
          avatarState
        });
      }
    }

    entries.sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }

      if (a.secondary !== b.secondary) {
        return a.secondary - b.secondary;
      }

      return a.tertiary - b.tertiary;
    });

    for (const entry of entries) {
      if (entry.type === 'furniture') {
        this.drawFurniture(ctx, entry.screenX, entry.screenY, entry.definition, entry.rotation);
      } else if (entry.type === 'avatar') {
        this.drawAvatar(ctx, entry.avatarState, entry.screenX, entry.screenY);
      }
    }
  }

  drawFurniture(ctx, sx, sy, definition, rotation) {
    const shape = definition?.shape ?? definition?.modelId ?? definition?.id;
    switch (shape) {
      case 'retro-sofa':
        this.drawRetroSofa(ctx, sx, sy, definition, rotation);
        break;
      case 'lofi-table':
        this.drawLofiTable(ctx, sx, sy, definition, rotation);
        break;
      case 'neon-lamp':
        this.drawNeonLamp(ctx, sx, sy, definition, rotation);
        break;
      case 'palm-plant':
        this.drawPalmPlant(ctx, sx, sy, definition, rotation);
        break;
      default:
        this.drawFurnitureBlock(ctx, sx, sy, definition, rotation);
        break;
    }
  }

  drawFurnitureBlock(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;

    const baseHeight = Number.isFinite(definition.height) ? definition.height : 0;
    const scaledHeight = baseHeight * this.zoom;

    const base = this.getLayerPoints(centerX, centerY);
    const top = this.getLayerPoints(centerX, centerY - scaledHeight);

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, baseHeight);

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

  drawRetroSofa(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition.height) ? definition.height : 0;
    const scaledHeight = baseHeight * this.zoom;

    if (scaledHeight <= 0) {
      this.drawFurnitureBlock(ctx, sx, sy, definition, rotation);
      return;
    }

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, baseHeight);

    const baseColor = definition?.color ?? '#ff6f91';
    const seatHeight = Math.max(scaledHeight * 0.45, this.zoom * 8);
    const backHeight = scaledHeight;

    const baseLayer = this.getLayerPoints(centerX, centerY);
    const seatTopLayer = this.getLayerPoints(centerX, centerY - seatHeight);
    const backTopLayer = this.getLayerPoints(centerX, centerY - backHeight);

    const baseCenter = { x: centerX, y: centerY };
    const seatTopCenter = { x: centerX, y: centerY - seatHeight };
    const backTopCenter = { x: centerX, y: centerY - backHeight };

    const seatBase = this.computeInsetFootprint(baseLayer, baseCenter, rotation, {
      side: 0.28,
      frontSide: 0.24,
      backSide: 0.34,
      frontDepth: 0.2,
      backDepth: 0.36
    });
    const seatTop = this.computeInsetFootprint(seatTopLayer, seatTopCenter, rotation, {
      side: 0.32,
      frontSide: 0.32,
      backSide: 0.4,
      frontDepth: 0.33,
      backDepth: 0.48
    });

    this.drawPrism(ctx, seatBase, seatTop, {
      leftColor: this.shadeColor(baseColor, -0.38),
      rightColor: this.shadeColor(baseColor, -0.2),
      topColor: this.shadeColor(baseColor, 0.12),
      strokeColor: this.shadeColor(baseColor, -0.48)
    });

    const backBase = this.computeInsetFootprint(seatTopLayer, seatTopCenter, rotation, {
      side: 0.3,
      frontSide: 0.34,
      backSide: 0.24,
      frontDepth: 0.62,
      backDepth: 0.16
    });
    const backTop = this.computeInsetFootprint(backTopLayer, backTopCenter, rotation, {
      side: 0.28,
      frontSide: 0.38,
      backSide: 0.2,
      frontDepth: 0.78,
      backDepth: 0.08
    });

    this.drawPrism(ctx, backBase, backTop, {
      leftColor: this.shadeColor(baseColor, -0.32),
      rightColor: this.shadeColor(baseColor, -0.14),
      topColor: this.shadeColor(baseColor, 0.2),
      strokeColor: this.shadeColor(baseColor, -0.52)
    });

    ctx.strokeStyle = this.shadeColor(baseColor, 0.3);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(seatTop.frontLeft.x, seatTop.frontLeft.y);
    ctx.lineTo(seatTop.frontRight.x, seatTop.frontRight.y);
    ctx.stroke();

    ctx.strokeStyle = this.shadeColor(baseColor, -0.52);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(seatTop.backLeft.x, seatTop.backLeft.y);
    ctx.lineTo(seatTop.backRight.x, seatTop.backRight.y);
    ctx.stroke();

    ctx.strokeStyle = this.shadeColor(baseColor, 0.26);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(backTop.frontLeft.x, backTop.frontLeft.y);
    ctx.lineTo(backTop.frontRight.x, backTop.frontRight.y);
    ctx.stroke();

    this.drawOrientationCue(ctx, backTopLayer, rotation);
  }

  drawLofiTable(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition.height) ? definition.height : 0;
    const scaledHeight = baseHeight * this.zoom;

    if (scaledHeight <= 0) {
      this.drawFurnitureBlock(ctx, sx, sy, definition, rotation);
      return;
    }

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, baseHeight);

    const woodColor = definition?.color ?? '#c3a38a';
    const boardThickness = Math.max(this.zoom * 5, scaledHeight * 0.25);
    const boardBottomHeight = Math.max(0, scaledHeight - boardThickness);

    const baseLayer = this.getLayerPoints(centerX, centerY);
    const boardBottomLayer = this.getLayerPoints(centerX, centerY - boardBottomHeight);
    const boardTopLayer = this.getLayerPoints(centerX, centerY - scaledHeight);

    const boardBottomCenter = { x: centerX, y: centerY - boardBottomHeight };
    const boardTopCenter = { x: centerX, y: centerY - scaledHeight };

    const boardBase = this.computeInsetFootprint(boardBottomLayer, boardBottomCenter, rotation, {
      side: 0.28,
      frontSide: 0.28,
      backSide: 0.32,
      frontDepth: 0.24,
      backDepth: 0.3
    });
    const boardTop = this.computeInsetFootprint(boardTopLayer, boardTopCenter, rotation, {
      side: 0.32,
      frontSide: 0.32,
      backSide: 0.36,
      frontDepth: 0.3,
      backDepth: 0.36
    });

    this.drawPrism(ctx, boardBase, boardTop, {
      leftColor: this.shadeColor(woodColor, -0.38),
      rightColor: this.shadeColor(woodColor, -0.22),
      topColor: this.shadeColor(woodColor, 0.1),
      strokeColor: this.shadeColor(woodColor, -0.48)
    });

    ctx.strokeStyle = this.shadeColor(woodColor, 0.28);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boardTop.frontLeft.x, boardTop.frontLeft.y);
    ctx.lineTo(boardTop.frontRight.x, boardTop.frontRight.y);
    ctx.stroke();

    if (boardBottomHeight > this.zoom * 1.5) {
      const { forward, right } = this.getOrientationBasis(rotation);
      const forwardSpan = this.tileHeight * 0.55;
      const sideSpan = this.halfTileWidth * 0.6;
      const legDepth = this.tileHeight * 0.18;
      const legWidth = this.halfTileWidth * 0.11;
      const legTopDepth = legDepth * 0.7;
      const legTopWidth = legWidth * 0.7;
      const legTopCenterY = centerY - boardBottomHeight;

      const legPositions = [
        { forward: 0.45, side: -0.32 },
        { forward: 0.45, side: 0.32 },
        { forward: -0.4, side: -0.32 },
        { forward: -0.4, side: 0.32 }
      ];

      for (const leg of legPositions) {
        const offset = addVec(
          scaleVec(forward, forwardSpan * leg.forward),
          scaleVec(right, sideSpan * leg.side)
        );
        const baseCenter = addVec({ x: centerX, y: centerY }, offset);
        const topCenter = addVec({ x: centerX, y: legTopCenterY }, offset);

        const basePolygon = this.buildOrientedFootprint(baseCenter, forward, right, legDepth, legWidth);
        const topPolygon = this.buildOrientedFootprint(topCenter, forward, right, legTopDepth, legTopWidth);

        this.drawPrism(ctx, basePolygon, topPolygon, {
          leftColor: this.shadeColor(woodColor, -0.5),
          rightColor: this.shadeColor(woodColor, -0.32),
          topColor: this.shadeColor(woodColor, -0.18),
          strokeColor: this.shadeColor(woodColor, -0.56)
        });
      }
    }

    this.drawOrientationCue(ctx, boardTopLayer, rotation);
  }

  drawNeonLamp(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition.height) ? definition.height : 0;
    const scaledHeight = baseHeight * this.zoom;

    if (scaledHeight <= 0) {
      this.drawFurnitureBlock(ctx, sx, sy, definition, rotation);
      return;
    }

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, baseHeight);

    const glowColor = definition?.color ?? '#8bf6ff';
    const baseThickness = Math.max(this.zoom * 5, scaledHeight * 0.16);
    const glowHeight = Math.max(this.zoom * 8, scaledHeight * 0.28);
    const columnHeight = Math.max(0, scaledHeight - glowHeight - baseThickness);
    const columnTopHeight = baseThickness + columnHeight;
    const glowBottomHeight = Math.max(columnTopHeight, scaledHeight - glowHeight);

    const baseBottomLayer = this.getLayerPoints(centerX, centerY);
    const baseTopLayer = this.getLayerPoints(centerX, centerY - baseThickness);
    const columnTopLayer = this.getLayerPoints(centerX, centerY - columnTopHeight);
    const glowBottomLayer = this.getLayerPoints(centerX, centerY - glowBottomHeight);
    const glowTopLayer = this.getLayerPoints(centerX, centerY - scaledHeight);

    const baseBottomCenter = { x: centerX, y: centerY };
    const baseTopCenter = { x: centerX, y: centerY - baseThickness };
    const columnTopCenter = { x: centerX, y: centerY - columnTopHeight };
    const glowBottomCenter = { x: centerX, y: centerY - glowBottomHeight };
    const glowTopCenter = { x: centerX, y: centerY - scaledHeight };

    const baseBottom = this.computeInsetFootprint(baseBottomLayer, baseBottomCenter, rotation, {
      side: 0.42,
      frontDepth: 0.28,
      backDepth: 0.28
    });
    const baseTop = this.computeInsetFootprint(baseTopLayer, baseTopCenter, rotation, {
      side: 0.35,
      frontDepth: 0.35,
      backDepth: 0.35
    });

    this.drawPrism(ctx, baseBottom, baseTop, {
      leftColor: this.shadeColor(glowColor, -0.55),
      rightColor: this.shadeColor(glowColor, -0.38),
      topColor: this.shadeColor(glowColor, -0.25),
      strokeColor: this.shadeColor(glowColor, -0.6)
    });

    if (columnHeight > this.zoom * 2) {
      const columnBottom = this.computeInsetFootprint(baseTopLayer, baseTopCenter, rotation, {
        side: 0.25,
        frontDepth: 0.32,
        backDepth: 0.32
      });
      const columnTop = this.computeInsetFootprint(columnTopLayer, columnTopCenter, rotation, {
        side: 0.2,
        frontDepth: 0.38,
        backDepth: 0.38
      });

      this.drawPrism(ctx, columnBottom, columnTop, {
        leftColor: this.shadeColor(glowColor, -0.42),
        rightColor: this.shadeColor(glowColor, -0.25),
        topColor: this.shadeColor(glowColor, -0.08),
        strokeColor: this.shadeColor(glowColor, -0.5)
      });
    }

    const glowBottom = this.computeInsetFootprint(glowBottomLayer, glowBottomCenter, rotation, {
      side: 0.28,
      frontDepth: 0.45,
      backDepth: 0.45
    });
    const glowTop = this.computeInsetFootprint(glowTopLayer, glowTopCenter, rotation, {
      side: 0.35,
      frontDepth: 0.55,
      backDepth: 0.55
    });

    this.drawPrism(ctx, glowBottom, glowTop, {
      leftColor: this.shadeColor(glowColor, -0.25),
      rightColor: this.shadeColor(glowColor, -0.08),
      topColor: this.shadeColor(glowColor, 0.22),
      strokeColor: this.shadeColor(glowColor, -0.32)
    });

    ctx.strokeStyle = this.shadeColor(glowColor, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(glowTop.frontLeft.x, glowTop.frontLeft.y);
    ctx.lineTo(glowTop.frontRight.x, glowTop.frontRight.y);
    ctx.stroke();

    this.drawOrientationCue(ctx, glowTopLayer, rotation);
  }

  drawPalmPlant(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition.height) ? definition.height : 0;
    const scaledHeight = baseHeight * this.zoom;

    if (scaledHeight <= 0) {
      this.drawFurnitureBlock(ctx, sx, sy, definition, rotation);
      return;
    }

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, baseHeight);

    const foliageColor = definition?.color ?? '#6bd88f';
    const potHeight = Math.max(this.zoom * 6, scaledHeight * 0.28);
    const canopyHeight = Math.max(0, scaledHeight - potHeight);

    const baseLayer = this.getLayerPoints(centerX, centerY);
    const potTopLayer = this.getLayerPoints(centerX, centerY - potHeight);
    const canopyTopLayer = this.getLayerPoints(centerX, centerY - scaledHeight);

    const baseCenter = { x: centerX, y: centerY };
    const potTopCenter = { x: centerX, y: centerY - potHeight };
    const canopyTopCenter = { x: centerX, y: centerY - scaledHeight };

    const potBase = this.computeInsetFootprint(baseLayer, baseCenter, rotation, {
      side: 0.3,
      frontDepth: 0.22,
      backDepth: 0.26
    });
    const potTop = this.computeInsetFootprint(potTopLayer, potTopCenter, rotation, {
      side: 0.36,
      frontDepth: 0.32,
      backDepth: 0.36
    });

    this.drawPrism(ctx, potBase, potTop, {
      leftColor: this.shadeColor(foliageColor, -0.55),
      rightColor: this.shadeColor(foliageColor, -0.38),
      topColor: this.shadeColor(foliageColor, -0.18),
      strokeColor: this.shadeColor(foliageColor, -0.48)
    });

    ctx.strokeStyle = this.shadeColor(foliageColor, -0.3);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(potTop.frontLeft.x, potTop.frontLeft.y);
    ctx.lineTo(potTop.frontRight.x, potTop.frontRight.y);
    ctx.stroke();

    if (canopyHeight <= this.zoom * 2) {
      this.drawOrientationCue(ctx, potTopLayer, rotation);
      return;
    }

    const canopyBottom = this.computeInsetFootprint(potTopLayer, potTopCenter, rotation, {
      side: 0.4,
      frontDepth: 0.34,
      backDepth: 0.4
    });
    const canopyTop = this.computeInsetFootprint(canopyTopLayer, canopyTopCenter, rotation, {
      side: 0.28,
      frontDepth: 0.62,
      backDepth: 0.55
    });

    this.drawPrism(ctx, canopyBottom, canopyTop, {
      leftColor: this.shadeColor(foliageColor, -0.28),
      rightColor: this.shadeColor(foliageColor, -0.12),
      strokeColor: this.shadeColor(foliageColor, -0.4)
    });

    const frontMid = {
      x: (canopyTop.frontLeft.x + canopyTop.frontRight.x) / 2,
      y: (canopyTop.frontLeft.y + canopyTop.frontRight.y) / 2
    };
    const backMid = {
      x: (canopyTop.backLeft.x + canopyTop.backRight.x) / 2,
      y: (canopyTop.backLeft.y + canopyTop.backRight.y) / 2
    };
    const leftMid = {
      x: (canopyTop.frontLeft.x + canopyTop.backLeft.x) / 2,
      y: (canopyTop.frontLeft.y + canopyTop.backLeft.y) / 2
    };
    const rightMid = {
      x: (canopyTop.frontRight.x + canopyTop.backRight.x) / 2,
      y: (canopyTop.frontRight.y + canopyTop.backRight.y) / 2
    };

    ctx.fillStyle = this.shadeColor(foliageColor, 0.16);
    ctx.beginPath();
    ctx.moveTo(canopyTop.frontLeft.x, canopyTop.frontLeft.y);
    ctx.quadraticCurveTo(frontMid.x, frontMid.y - this.tileHeight * 0.15, canopyTop.frontRight.x, canopyTop.frontRight.y);
    ctx.quadraticCurveTo(
      rightMid.x + this.halfTileWidth * 0.06,
      rightMid.y - this.tileHeight * 0.1,
      canopyTop.backRight.x,
      canopyTop.backRight.y
    );
    ctx.quadraticCurveTo(backMid.x, backMid.y + this.tileHeight * 0.08, canopyTop.backLeft.x, canopyTop.backLeft.y);
    ctx.quadraticCurveTo(
      leftMid.x - this.halfTileWidth * 0.06,
      leftMid.y - this.tileHeight * 0.1,
      canopyTop.frontLeft.x,
      canopyTop.frontLeft.y
    );
    ctx.fill();

    ctx.strokeStyle = this.shadeColor(foliageColor, -0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(frontMid.x, frontMid.y - this.tileHeight * 0.12);
    ctx.lineTo(backMid.x, backMid.y + this.tileHeight * 0.05);
    ctx.stroke();

    ctx.strokeStyle = this.shadeColor(foliageColor, 0.28);
    ctx.beginPath();
    ctx.moveTo(leftMid.x - this.halfTileWidth * 0.04, leftMid.y - this.tileHeight * 0.08);
    ctx.lineTo(rightMid.x + this.halfTileWidth * 0.04, rightMid.y - this.tileHeight * 0.04);
    ctx.stroke();

    this.drawOrientationCue(ctx, canopyTopLayer, rotation);
  }

  drawFurnitureShadow(ctx, center, height) {
    const intensity = Math.min(0.35, 0.2 + height / 300);
    ctx.save();
    ctx.fillStyle = `rgba(6, 10, 26, ${intensity.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, this.halfTileWidth * 0.6, this.halfTileHeight * 0.45, 0, 0, Math.PI * 2);
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

  drawPrism(ctx, base, top, colors) {
    const {
      leftColor,
      rightColor,
      topColor,
      strokeColor,
      strokeWidth = 1
    } = colors ?? {};

    if (leftColor) {
      ctx.beginPath();
      ctx.moveTo(top.backLeft.x, top.backLeft.y);
      ctx.lineTo(top.frontLeft.x, top.frontLeft.y);
      ctx.lineTo(base.frontLeft.x, base.frontLeft.y);
      ctx.lineTo(base.backLeft.x, base.backLeft.y);
      ctx.closePath();
      ctx.fillStyle = leftColor;
      ctx.fill();
    }

    if (rightColor) {
      ctx.beginPath();
      ctx.moveTo(top.frontRight.x, top.frontRight.y);
      ctx.lineTo(top.backRight.x, top.backRight.y);
      ctx.lineTo(base.backRight.x, base.backRight.y);
      ctx.lineTo(base.frontRight.x, base.frontRight.y);
      ctx.closePath();
      ctx.fillStyle = rightColor;
      ctx.fill();
    }

    if (topColor) {
      ctx.beginPath();
      ctx.moveTo(top.frontLeft.x, top.frontLeft.y);
      ctx.lineTo(top.frontRight.x, top.frontRight.y);
      ctx.lineTo(top.backRight.x, top.backRight.y);
      ctx.lineTo(top.backLeft.x, top.backLeft.y);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.moveTo(top.frontLeft.x, top.frontLeft.y);
      ctx.lineTo(top.frontRight.x, top.frontRight.y);
      ctx.lineTo(top.backRight.x, top.backRight.y);
      ctx.lineTo(top.backLeft.x, top.backLeft.y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  computeInsetFootprint(layer, center, rotation, options = {}) {
    const { frontKey, rightKey, backKey, leftKey } = this.getRotationKeys(rotation);

    const defaultSide = clamp(options.side ?? 0.35, 0, 1);
    const frontLeftSide = clamp(options.frontLeftSide ?? options.frontSide ?? defaultSide, 0, 1);
    const frontRightSide = clamp(options.frontRightSide ?? options.frontSide ?? defaultSide, 0, 1);
    const backLeftSide = clamp(options.backLeftSide ?? options.backSide ?? defaultSide, 0, 1);
    const backRightSide = clamp(options.backRightSide ?? options.backSide ?? defaultSide, 0, 1);

    const defaultDepth = clamp(options.depth ?? 0.3, 0, 1);
    const frontLeftDepth = clamp(options.frontLeftDepth ?? options.frontDepth ?? defaultDepth, 0, 1);
    const frontRightDepth = clamp(options.frontRightDepth ?? options.frontDepth ?? defaultDepth, 0, 1);
    const backLeftDepth = clamp(options.backLeftDepth ?? options.backDepth ?? defaultDepth, 0, 1);
    const backRightDepth = clamp(options.backRightDepth ?? options.backDepth ?? defaultDepth, 0, 1);

    const frontLeftEdge = lerpVec(layer[frontKey], layer[leftKey], frontLeftSide);
    const frontRightEdge = lerpVec(layer[frontKey], layer[rightKey], frontRightSide);
    const backLeftEdge = lerpVec(layer[backKey], layer[leftKey], backLeftSide);
    const backRightEdge = lerpVec(layer[backKey], layer[rightKey], backRightSide);

    return {
      frontLeft: lerpVec(frontLeftEdge, center, frontLeftDepth),
      frontRight: lerpVec(frontRightEdge, center, frontRightDepth),
      backLeft: lerpVec(backLeftEdge, center, backLeftDepth),
      backRight: lerpVec(backRightEdge, center, backRightDepth)
    };
  }

  getLayerPoints(centerX, layerCenterY) {
    return {
      top: { x: centerX, y: layerCenterY - this.halfTileHeight },
      right: { x: centerX + this.halfTileWidth, y: layerCenterY },
      bottom: { x: centerX, y: layerCenterY + this.halfTileHeight },
      left: { x: centerX - this.halfTileWidth, y: layerCenterY }
    };
  }

  getRotationKeys(rotation) {
    const order = ['right', 'bottom', 'left', 'top'];
    const normalized = ((rotation % order.length) + order.length) % order.length;
    return {
      frontKey: order[normalized],
      rightKey: order[(normalized + 1) % order.length],
      backKey: order[(normalized + 2) % order.length],
      leftKey: order[(normalized + 3) % order.length]
    };
  }

  getOrientationBasis(rotation) {
    const normalized = ((rotation % this.directionVectors.length) + this.directionVectors.length) % this.directionVectors.length;
    const forwardBase = this.directionVectors[normalized] ?? this.directionVectors[0];
    const forward = normalizeVec(forwardBase);
    const right = normalizeVec({ x: forward.y, y: -forward.x });
    return { forward, right };
  }

  buildOrientedFootprint(center, forwardDir, rightDir, depth, width) {
    const frontOffset = scaleVec(forwardDir, depth);
    const backOffset = scaleVec(forwardDir, -depth);
    const rightOffset = scaleVec(rightDir, width);
    const leftOffset = scaleVec(rightDir, -width);

    const frontCenter = addVec(center, frontOffset);
    const backCenter = addVec(center, backOffset);

    return {
      frontLeft: addVec(frontCenter, leftOffset),
      frontRight: addVec(frontCenter, rightOffset),
      backRight: addVec(backCenter, rightOffset),
      backLeft: addVec(backCenter, leftOffset)
    };
  }

  drawAvatar(ctx, avatarState, screenX, screenY) {
    if (!avatarState) {
      return;
    }

    const { facing, walkPhase, stride, bob, sway, lean } = avatarState;
    const forwardBase = this.directionVectors[facing % this.directionVectors.length] ?? this.directionVectors[1];
    const forward = normalizeVec(forwardBase);
    const right = normalizeVec({ x: forward.y, y: -forward.x });

    const baseX = screenX;
    const baseY = screenY + this.halfTileHeight;

    const scale = this.zoom;
    const px = value => value * scale;
    const scaledBob = bob * scale;
    const scaledSway = sway * scale;
    const scaledLean = lean * scale;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 15, 35, 0.42)';
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + px(2.5), this.halfTileWidth * 0.36, this.halfTileHeight * 0.55, 0, 0, TWO_PI);
    ctx.fill();

    const cycle = walkPhase * TWO_PI;
    const swing = Math.sin(cycle) * stride;
    const legSpread = px(7);
    const stepDistance = px(10);
    const leftSwing = swing;
    const rightSwing = -swing;
    const leftLift = Math.max(0, leftSwing) * px(8);
    const rightLift = Math.max(0, rightSwing) * px(8);

    const swayOffset = scaleVec(right, scaledSway);
    const leanOffset = scaleVec(forward, scaledLean * 0.1);
    const hip = addVec(addVec({ x: baseX, y: baseY - px(24) - scaledBob }, swayOffset), leanOffset);
    const footBase = addVec(
      addVec({ x: baseX, y: baseY }, scaleVec(right, scaledSway * 0.2)),
      scaleVec(forward, scaledLean * 0.04)
    );
    const chest = addVec(hip, { x: 0, y: -px(18) });
    const shoulderBase = addVec(chest, { x: 0, y: -px(6) });

    const leftFoot = addVec(
      footBase,
      addVec(scaleVec(right, -legSpread), addVec(scaleVec(forward, leftSwing * stepDistance), { x: 0, y: -leftLift }))
    );
    const rightFoot = addVec(
      footBase,
      addVec(scaleVec(right, legSpread), addVec(scaleVec(forward, rightSwing * stepDistance), { x: 0, y: -rightLift }))
    );

    const leftKnee = addVec(
      lerpVec(hip, leftFoot, 0.45),
      addVec(scaleVec(forward, leftSwing * 3.6 * scale), scaleVec(right, -leftSwing * 1.6 * scale))
    );
    const rightKnee = addVec(
      lerpVec(hip, rightFoot, 0.45),
      addVec(scaleVec(forward, rightSwing * 3.6 * scale), scaleVec(right, rightSwing * 1.6 * scale))
    );

    const hipOffset = px(4);
    const hipLeft = addVec(hip, scaleVec(right, -hipOffset));
    const hipRight = addVec(hip, scaleVec(right, hipOffset));

    const armSpread = px(9);
    const shoulderLeft = addVec(shoulderBase, scaleVec(right, -armSpread));
    const shoulderRight = addVec(shoulderBase, scaleVec(right, armSpread));
    const armForward = stepDistance * 0.65;
    const leftArmSwing = -leftSwing;
    const rightArmSwing = -rightSwing;

    const leftHand = addVec(
      shoulderLeft,
      addVec(
        scaleVec(forward, leftArmSwing * armForward + scaledLean * 0.05),
        { x: 0, y: px(16) + Math.max(0, leftArmSwing) * px(6) }
      )
    );
    const rightHand = addVec(
      shoulderRight,
      addVec(
        scaleVec(forward, rightArmSwing * armForward + scaledLean * 0.05),
        { x: 0, y: px(16) + Math.max(0, rightArmSwing) * px(6) }
      )
    );

    const leftElbow = addVec(
      lerpVec(shoulderLeft, leftHand, 0.45),
      addVec(scaleVec(forward, leftArmSwing * -2.4 * scale), scaleVec(right, -leftArmSwing * 1.2 * scale))
    );
    const rightElbow = addVec(
      lerpVec(shoulderRight, rightHand, 0.45),
      addVec(scaleVec(forward, rightArmSwing * -2.4 * scale), scaleVec(right, rightArmSwing * 1.2 * scale))
    );

    const headCenter = addVec(shoulderBase, { x: 0, y: -px(12) - scaledBob * 0.25 });

    const limbs = {
      left: {
        leg: { hip: hipLeft, knee: leftKnee, foot: leftFoot },
        arm: { shoulder: shoulderLeft, elbow: leftElbow, hand: leftHand }
      },
      right: {
        leg: { hip: hipRight, knee: rightKnee, foot: rightFoot },
        arm: { shoulder: shoulderRight, elbow: rightElbow, hand: rightHand }
      }
    };

    const frontSide = right.y > 0 ? 'right' : 'left';
    const backSide = frontSide === 'right' ? 'left' : 'right';

    const legBackColor = '#20264d';
    const legFrontColor = '#303a7f';
    const skinBack = '#d58f6d';
    const skinFront = '#f6b88e';
    const handHighlight = '#fde2d4';
    const outfitBase = '#6772ff';
    const outfitShadow = this.shadeColor(outfitBase, -0.32);
    const outfitHighlight = this.shadeColor(outfitBase, 0.28);
    const hairBase = '#3f2a75';
    const hairHighlight = '#6f42b5';

    const drawLeg = (segment, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(segment.hip.x, segment.hip.y);
      ctx.lineTo(segment.knee.x, segment.knee.y);
      ctx.lineTo(segment.foot.x, segment.foot.y);
      ctx.stroke();

      ctx.fillStyle = this.shadeColor(color, -0.25);
      ctx.beginPath();
      ctx.ellipse(segment.foot.x, segment.foot.y, 5.6 * scale, 2.8 * scale, 0, 0, TWO_PI);
      ctx.fill();
    };

    const drawArm = (segment, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(segment.shoulder.x, segment.shoulder.y);
      ctx.lineTo(segment.elbow.x, segment.elbow.y);
      ctx.lineTo(segment.hand.x, segment.hand.y);
      ctx.stroke();

      ctx.fillStyle = handHighlight;
      ctx.beginPath();
      ctx.arc(segment.hand.x, segment.hand.y, 2.4 * scale, 0, TWO_PI);
      ctx.fill();
    };

    drawLeg(limbs[backSide].leg, legBackColor);
    drawArm(limbs[backSide].arm, skinBack, 4.2);

    const waistLeft = addVec(hip, scaleVec(right, -7.6 * scale));
    const waistRight = addVec(hip, scaleVec(right, 7.6 * scale));
    const shoulderLeftEdge = addVec(shoulderBase, scaleVec(right, -6.6 * scale));
    const shoulderRightEdge = addVec(shoulderBase, scaleVec(right, 6.6 * scale));

    const torsoGradient = ctx.createLinearGradient(
      shoulderLeftEdge.x,
      shoulderLeftEdge.y,
      shoulderRightEdge.x,
      shoulderRightEdge.y
    );
    torsoGradient.addColorStop(0, outfitShadow);
    torsoGradient.addColorStop(0.52, outfitBase);
    torsoGradient.addColorStop(1, outfitHighlight);

    ctx.fillStyle = torsoGradient;
    ctx.beginPath();
    ctx.moveTo(shoulderLeftEdge.x, shoulderLeftEdge.y);
    ctx.lineTo(shoulderRightEdge.x, shoulderRightEdge.y);
    ctx.lineTo(waistRight.x, waistRight.y);
    ctx.lineTo(waistLeft.x, waistLeft.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(12, 18, 44, 0.55)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(waistLeft.x, waistLeft.y);
    ctx.lineTo(waistRight.x, waistRight.y);
    ctx.stroke();

    const collarCenter = addVec(shoulderBase, { x: 0, y: -px(3.8) });
    const collarLeft = addVec(collarCenter, scaleVec(right, -4 * scale));
    const collarRight = addVec(collarCenter, scaleVec(right, 4 * scale));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(collarLeft.x, collarLeft.y);
    ctx.lineTo(collarRight.x, collarRight.y);
    ctx.stroke();

    drawLeg(limbs[frontSide].leg, legFrontColor);
    drawArm(limbs[frontSide].arm, skinFront, 4.8);

    const headGradient = ctx.createRadialGradient(
      headCenter.x - px(2),
      headCenter.y - px(3),
      1.5 * scale,
      headCenter.x,
      headCenter.y,
      8.6 * scale
    );
    headGradient.addColorStop(0, '#ffe3c4');
    headGradient.addColorStop(1, '#f2b18d');

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, 8.6 * scale, 0, TWO_PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 32, 56, 0.35)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    const hairGradient = ctx.createLinearGradient(
      headCenter.x - px(6),
      headCenter.y - px(10),
      headCenter.x + px(6),
      headCenter.y
    );
    hairGradient.addColorStop(0, hairBase);
    hairGradient.addColorStop(1, hairHighlight);

    const hairTop = addVec(headCenter, { x: 0, y: -px(7) });
    ctx.fillStyle = hairGradient;
    ctx.beginPath();
    ctx.ellipse(hairTop.x + right.x * px(1.8), hairTop.y, 9 * scale, 6.8 * scale, 0, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.1 * scale;
    ctx.beginPath();
    ctx.moveTo(headCenter.x + right.x * -px(3.5), headCenter.y - px(2.5));
    ctx.lineTo(headCenter.x + right.x * px(2.8), headCenter.y - px(4.1));
    ctx.stroke();

    const eyeBase = addVec(headCenter, { x: 0, y: px(1.6) });
    const leftEye = addVec(eyeBase, addVec(scaleVec(right, -2.4 * scale), scaleVec(forward, 0.4 * scale)));
    const rightEye = addVec(eyeBase, addVec(scaleVec(right, 2.4 * scale), scaleVec(forward, 0.4 * scale)));
    const eyeLineY = (leftEye.y + rightEye.y) / 2;
    const adjustedLeftEye = { x: leftEye.x, y: eyeLineY };
    const adjustedRightEye = { x: rightEye.x, y: eyeLineY };
    ctx.fillStyle = '#2f2947';
    ctx.beginPath();
    ctx.arc(adjustedLeftEye.x, adjustedLeftEye.y, 1.15 * scale, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(adjustedRightEye.x, adjustedRightEye.y, 1.15 * scale, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(adjustedLeftEye.x + px(0.5), adjustedLeftEye.y - px(0.4), 0.4 * scale, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(adjustedRightEye.x + px(0.5), adjustedRightEye.y - px(0.4), 0.4 * scale, 0, TWO_PI);
    ctx.fill();

    const nose = addVec(headCenter, addVec({ x: 0, y: px(2.2) }, scaleVec(forward, 0.8 * scale)));
    ctx.strokeStyle = 'rgba(206, 122, 100, 0.42)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y - px(1.1));
    ctx.lineTo(nose.x, nose.y + px(1.2));
    ctx.stroke();

    const mouth = addVec(headCenter, { x: 0, y: px(4.8) });
    ctx.strokeStyle = '#ce7b63';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.arc(mouth.x, mouth.y, 2.3 * scale, Math.PI * 0.1, Math.PI - Math.PI * 0.1);
    ctx.stroke();

    ctx.restore();
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

  emitZoomChange() {
    if (!this.canvas || typeof this.canvas.dispatchEvent !== 'function') {
      return;
    }

    const event = new CustomEvent('iso-renderer-zoom-change', {
      detail: { zoom: this.zoom }
    });
    this.canvas.dispatchEvent(event);
  }

  destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
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
