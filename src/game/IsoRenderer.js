import { findPaletteItem } from './palette.js';
import { getDrawableLayers, getLayerFrame } from './avatarAppearance.js';

const TWO_PI = Math.PI * 2;

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
    const shape = definition?.shape;

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

  drawRetroSofa(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const baseCenterY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition?.height) ? definition.height : 52;

    const seatHeight = Math.max(16, baseHeight * 0.45);
    const backHeight = Math.max(14, baseHeight - seatHeight);
    const scaledSeatHeight = seatHeight * this.zoom;
    const scaledBackHeight = backHeight * this.zoom;

    this.drawFurnitureShadow(ctx, { x: centerX, y: baseCenterY }, baseHeight);

    const seatBase = this.createLayer(centerX, baseCenterY, 1.08, 1.05);
    const seatTop = this.createLayer(centerX, baseCenterY - scaledSeatHeight, 0.95, 0.9);
    const backBaseCenterY = seatTop.centerY - this.halfTileHeight * 0.28;
    const backBase = this.createLayer(centerX, backBaseCenterY, 0.95, 0.65);
    const backTop = this.createLayer(centerX, backBaseCenterY - scaledBackHeight, 0.9, 0.5);

    const color = definition?.color ?? '#cccccc';
    const backStroke = this.shadeColor(color, -0.5);
    const backLeft = this.shadeColor(color, -0.48);
    const backRight = this.shadeColor(color, -0.28);
    const backTopColor = this.shadeColor(color, 0.08);

    this.drawPrismFaces(ctx, backBase, backTop, {
      leftColor: backLeft,
      rightColor: backRight,
      topColor: backTopColor,
      strokeColor: backStroke
    });

    ctx.strokeStyle = this.shadeColor(color, -0.35);
    ctx.lineWidth = 1;
    const backSeamStart = lerpVec(backTop.left, backTop.top, 0.45);
    const backSeamEnd = lerpVec(backTop.right, backTop.top, 0.45);
    ctx.beginPath();
    ctx.moveTo(backSeamStart.x, backSeamStart.y);
    ctx.lineTo(backSeamEnd.x, backSeamEnd.y);
    ctx.stroke();

    const seatLeft = this.shadeColor(color, -0.38);
    const seatRight = this.shadeColor(color, -0.2);
    const seatTopColor = this.shadeColor(color, 0.22);
    const seatStroke = this.shadeColor(color, -0.48);

    this.drawPrismFaces(ctx, seatBase, seatTop, {
      leftColor: seatLeft,
      rightColor: seatRight,
      topColor: seatTopColor,
      strokeColor: seatStroke
    });

    ctx.strokeStyle = this.shadeColor(color, -0.25);
    ctx.lineWidth = 1;
    const seatSeamStart = lerpVec(seatTop.left, seatTop.top, 0.52);
    const seatSeamEnd = lerpVec(seatTop.right, seatTop.top, 0.52);
    ctx.beginPath();
    ctx.moveTo(seatSeamStart.x, seatSeamStart.y);
    ctx.lineTo(seatSeamEnd.x, seatSeamEnd.y);
    ctx.stroke();

    const seatFrontStart = lerpVec(seatTop.bottom, seatTop.left, 0.38);
    const seatFrontEnd = lerpVec(seatTop.bottom, seatTop.right, 0.38);
    ctx.strokeStyle = this.shadeColor(color, -0.32);
    ctx.beginPath();
    ctx.moveTo(seatFrontStart.x, seatFrontStart.y);
    ctx.lineTo(seatFrontEnd.x, seatFrontEnd.y);
    ctx.stroke();

    this.drawOrientationCue(ctx, seatTop, rotation);
  }

  drawLofiTable(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const baseCenterY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition?.height) ? definition.height : 32;

    const topThickness = Math.max(8, baseHeight * 0.25);
    const legHeight = Math.max(6, baseHeight - topThickness);
    const scaledTopThickness = topThickness * this.zoom;
    const scaledLegHeight = legHeight * this.zoom;

    this.drawFurnitureShadow(ctx, { x: centerX, y: baseCenterY }, baseHeight);

    const footLayer = this.createLayer(centerX, baseCenterY, 0.92, 0.92);
    const legColor = this.shadeColor(definition?.color ?? '#8c6f5a', -0.45);
    const legTopColor = this.shadeColor(definition?.color ?? '#8c6f5a', -0.15);

    const legPositions = [
      lerpVec(footLayer.left, footLayer.top, 0.4),
      lerpVec(footLayer.right, footLayer.top, 0.4),
      lerpVec(footLayer.left, footLayer.bottom, 0.4),
      lerpVec(footLayer.right, footLayer.bottom, 0.4)
    ];

    for (const legCenter of legPositions) {
      this.drawSlenderColumn(ctx, legCenter, legHeight, legColor, {
        widthScale: 0.18,
        depthScale: 0.18,
        topScale: 1,
        topColor: legTopColor,
        strokeColor: this.shadeColor(legColor, -0.35)
      });
    }

    const tableBase = this.createLayer(centerX, baseCenterY - scaledLegHeight, 1.02, 1.02);
    const tableTop = this.createLayer(centerX, tableBase.centerY - scaledTopThickness, 1.08, 1.04);

    const color = definition?.color ?? '#c3a38a';
    const left = this.shadeColor(color, -0.32);
    const right = this.shadeColor(color, -0.18);
    const topColor = this.shadeColor(color, 0.16);
    const stroke = this.shadeColor(color, -0.42);

    this.drawPrismFaces(ctx, tableBase, tableTop, {
      leftColor: left,
      rightColor: right,
      topColor,
      strokeColor: stroke
    });

    const inlayStart = lerpVec(tableTop.left, tableTop.top, 0.35);
    const inlayEnd = lerpVec(tableTop.right, tableTop.top, 0.35);
    ctx.strokeStyle = this.shadeColor(color, 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inlayStart.x, inlayStart.y);
    ctx.lineTo(inlayEnd.x, inlayEnd.y);
    ctx.stroke();

    this.drawOrientationCue(ctx, tableTop, rotation);
  }

  drawNeonLamp(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const baseCenterY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition?.height) ? definition.height : 70;

    this.drawFurnitureShadow(ctx, { x: centerX, y: baseCenterY }, baseHeight);

    const baseBlockHeight = Math.min(16, baseHeight * 0.22);
    const headHeight = Math.max(14, baseHeight * 0.32);
    const columnHeight = Math.max(0, baseHeight - baseBlockHeight - headHeight);

    const scaledBaseHeight = baseBlockHeight * this.zoom;
    const scaledColumnHeight = columnHeight * this.zoom;
    const scaledHeadHeight = headHeight * this.zoom;

    const baseBase = this.createLayer(centerX, baseCenterY, 0.48, 0.48);
    const baseTop = this.createLayer(centerX, baseCenterY - scaledBaseHeight, 0.38, 0.38);

    const pedestalColor = this.shadeColor(definition?.color ?? '#8bf6ff', -0.55);
    this.drawPrismFaces(ctx, baseBase, baseTop, {
      leftColor: this.shadeColor(pedestalColor, -0.18),
      rightColor: this.shadeColor(pedestalColor, -0.05),
      topColor: this.shadeColor(pedestalColor, 0.12),
      strokeColor: this.shadeColor(pedestalColor, -0.38)
    });

    const columnBaseCenter = { x: centerX, y: baseTop.centerY };
    const columnColor = this.shadeColor(definition?.color ?? '#8bf6ff', -0.12);
    const column = this.drawSlenderColumn(ctx, columnBaseCenter, columnHeight, columnColor, {
      widthScale: 0.14,
      depthScale: 0.14,
      topScale: 1,
      topColor: this.shadeColor(definition?.color ?? '#8bf6ff', 0.22),
      strokeColor: this.shadeColor(columnColor, -0.4)
    });

    const headBaseCenterY = column.top.centerY;
    const headBase = this.createLayer(centerX, headBaseCenterY, 0.62, 0.62);
    const headTop = this.createLayer(centerX, headBaseCenterY - scaledHeadHeight, 0.68, 0.68);

    const glowColor = definition?.color ?? '#8bf6ff';
    this.drawPrismFaces(ctx, headBase, headTop, {
      leftColor: this.shadeColor(glowColor, -0.18),
      rightColor: this.shadeColor(glowColor, -0.02),
      topColor: this.shadeColor(glowColor, 0.28),
      strokeColor: this.shadeColor(glowColor, -0.25)
    });

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    const glowCenterY = headTop.top.y + this.halfTileHeight * 0.25;
    ctx.ellipse(centerX, glowCenterY, this.halfTileWidth * 0.72, this.halfTileHeight * 1.1, 0, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    this.drawOrientationCue(ctx, headTop, rotation);
  }

  drawPalmPlant(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const baseCenterY = sy + this.halfTileHeight;
    const baseHeight = Number.isFinite(definition?.height) ? definition.height : 62;

    this.drawFurnitureShadow(ctx, { x: centerX, y: baseCenterY }, baseHeight);

    const potHeight = Math.min(20, baseHeight * 0.32);
    const stemHeight = Math.max(12, baseHeight * 0.35);
    const canopyHeight = Math.max(12, baseHeight - potHeight - stemHeight);

    const scaledPotHeight = potHeight * this.zoom;
    const scaledStemHeight = stemHeight * this.zoom;
    const scaledCanopyHeight = canopyHeight * this.zoom;

    const potBase = this.createLayer(centerX, baseCenterY, 0.58, 0.58);
    const potTop = this.createLayer(centerX, baseCenterY - scaledPotHeight, 0.64, 0.64);

    const potColor = this.shadeColor(definition?.color ?? '#6bd88f', -0.55);
    this.drawPrismFaces(ctx, potBase, potTop, {
      leftColor: this.shadeColor(potColor, -0.18),
      rightColor: this.shadeColor(potColor, -0.05),
      topColor: this.shadeColor(potColor, 0.12),
      strokeColor: this.shadeColor(potColor, -0.35)
    });

    const rimHeight = Math.max(2, 3 * this.zoom);
    const rimBase = this.createLayer(centerX, potTop.centerY, 0.68, 0.68);
    const rimTop = this.createLayer(centerX, potTop.centerY - rimHeight, 0.7, 0.7);
    const rimColor = this.shadeColor(definition?.color ?? '#6bd88f', -0.42);
    this.drawPrismFaces(ctx, rimBase, rimTop, {
      leftColor: this.shadeColor(rimColor, -0.2),
      rightColor: this.shadeColor(rimColor, -0.05),
      topColor: this.shadeColor(rimColor, 0.08),
      strokeColor: this.shadeColor(rimColor, -0.3)
    });

    const stemBaseCenter = { x: centerX, y: rimTop.centerY };
    const stemColor = this.shadeColor(definition?.color ?? '#6bd88f', -0.1);
    const stem = this.drawSlenderColumn(ctx, stemBaseCenter, stemHeight, stemColor, {
      widthScale: 0.1,
      depthScale: 0.1,
      topScale: 0.9,
      topColor: this.shadeColor(definition?.color ?? '#6bd88f', 0.18),
      strokeColor: this.shadeColor(stemColor, -0.35)
    });

    const canopyBaseY = stem.top.centerY;
    const canopyMidY = canopyBaseY - scaledCanopyHeight * 0.45;
    const leafColorBase = definition?.color ?? '#6bd88f';
    const leafShadow = this.shadeColor(leafColorBase, -0.08);
    const leafMid = this.shadeColor(leafColorBase, 0.18);
    const leafHighlight = this.shadeColor(leafColorBase, 0.3);

    ctx.save();
    ctx.fillStyle = leafShadow;
    ctx.beginPath();
    ctx.ellipse(centerX - this.halfTileWidth * 0.18, canopyMidY, this.halfTileWidth * 0.65, this.halfTileHeight * 1.05, -0.35, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = leafMid;
    ctx.beginPath();
    ctx.ellipse(centerX + this.halfTileWidth * 0.18, canopyMidY - this.halfTileHeight * 0.1, this.halfTileWidth * 0.62, this.halfTileHeight * 0.95, 0.35, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = leafHighlight;
    ctx.beginPath();
    ctx.ellipse(centerX, canopyMidY - this.halfTileHeight * 0.35, this.halfTileWidth * 0.72, this.halfTileHeight * 0.85, 0, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = this.shadeColor(leafColorBase, -0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, canopyBaseY);
    ctx.lineTo(centerX, canopyMidY - this.halfTileHeight * 0.6);
    ctx.stroke();
    ctx.restore();

    this.drawOrientationCue(ctx, potTop, rotation);
  }

  drawSlenderColumn(ctx, baseCenter, height, color, options = {}) {
    const {
      widthScale = 0.2,
      depthScale = 0.2,
      topScale = 0.8,
      topColor = this.shadeColor(color, 0.18),
      leftColor = this.shadeColor(color, -0.35),
      rightColor = this.shadeColor(color, -0.18),
      strokeColor = this.shadeColor(color, -0.45)
    } = options;

    const scaledHeight = Math.max(0, height) * this.zoom;
    const base = this.createLayer(baseCenter.x, baseCenter.y, widthScale, depthScale);
    const top = scaledHeight > 0
      ? this.createLayer(baseCenter.x, baseCenter.y - scaledHeight, widthScale * topScale, depthScale * topScale)
      : this.createLayer(baseCenter.x, baseCenter.y, widthScale * topScale, depthScale * topScale);

    this.drawPrismFaces(ctx, base, top, {
      leftColor,
      rightColor,
      topColor,
      strokeColor,
      strokeWidth: 0.9
    });

    return { base, top };
  }

  drawPrismFaces(ctx, base, top, options = {}) {
    if (!base || !top) {
      return;
    }

    const {
      leftColor,
      rightColor,
      topColor,
      strokeColor,
      strokeWidth = 1
    } = options;

    if (leftColor) {
      ctx.beginPath();
      ctx.moveTo(top.left.x, top.left.y);
      ctx.lineTo(base.left.x, base.left.y);
      ctx.lineTo(base.bottom.x, base.bottom.y);
      ctx.lineTo(top.bottom.x, top.bottom.y);
      ctx.closePath();
      ctx.fillStyle = leftColor;
      ctx.fill();
    }

    if (rightColor) {
      ctx.beginPath();
      ctx.moveTo(top.right.x, top.right.y);
      ctx.lineTo(base.right.x, base.right.y);
      ctx.lineTo(base.bottom.x, base.bottom.y);
      ctx.lineTo(top.bottom.x, top.bottom.y);
      ctx.closePath();
      ctx.fillStyle = rightColor;
      ctx.fill();
    }

    if (topColor) {
      ctx.beginPath();
      ctx.moveTo(top.top.x, top.top.y);
      ctx.lineTo(top.right.x, top.right.y);
      ctx.lineTo(top.bottom.x, top.bottom.y);
      ctx.lineTo(top.left.x, top.left.y);
      ctx.closePath();
      ctx.fillStyle = topColor;
      ctx.fill();
    }

    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.moveTo(top.top.x, top.top.y);
      ctx.lineTo(top.right.x, top.right.y);
      ctx.lineTo(base.right.x, base.right.y);
      ctx.lineTo(base.bottom.x, base.bottom.y);
      ctx.lineTo(base.left.x, base.left.y);
      ctx.lineTo(top.left.x, top.left.y);
      ctx.lineTo(top.top.x, top.top.y);
      ctx.stroke();
    }
  }

  createLayer(centerX, centerY, widthScale = 1, depthScale = 1) {
    const halfWidth = this.halfTileWidth * widthScale;
    const halfDepth = this.halfTileHeight * depthScale;

    return {
      centerY,
      top: { x: centerX, y: centerY - halfDepth },
      right: { x: centerX + halfWidth, y: centerY },
      bottom: { x: centerX, y: centerY + halfDepth },
      left: { x: centerX - halfWidth, y: centerY }
    };
  }

  drawFurnitureBlock(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;

    const baseHeight = Number.isFinite(definition.height) ? definition.height : 0;
    const scaledHeight = baseHeight * this.zoom;

    const base = this.createLayer(centerX, centerY, 1, 1);
    const top = this.createLayer(centerX, centerY - scaledHeight, 1, 1);

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, baseHeight);

    this.drawPrismFaces(ctx, base, top, {
      leftColor: this.shadeColor(definition.color, -0.35),
      rightColor: this.shadeColor(definition.color, -0.18),
      topColor: this.shadeColor(definition.color, 0.18),
      strokeColor: this.shadeColor(definition.color, -0.4)
    });

    this.drawOrientationCue(ctx, top, rotation);
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

  drawAvatar(ctx, avatarState, screenX, screenY) {
    if (!avatarState) {
      return;
    }

    const layers = getDrawableLayers();
    const appearance = avatarState.appearance ?? {};
    const animation = avatarState.animation ?? 'idle';
    const facing = typeof avatarState.facing === 'number' ? avatarState.facing : 1;
    const progress = typeof avatarState.frameProgress === 'number' ? avatarState.frameProgress : 0;

    const baseX = screenX;
    const baseY = screenY + this.halfTileHeight;

    for (const layer of layers) {
      const optionId = layer.options ? appearance[layer.id] ?? layer.defaultOptionId : layer.defaultOptionId;
      const frame = getLayerFrame(layer.id, optionId, animation, facing, progress);
      if (!frame) {
        continue;
      }

      this.drawAvatarFrame(ctx, frame, baseX, baseY);
    }
  }

  drawAvatarFrame(ctx, frame, baseX, baseY) {
    const scale = this.zoom;
    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.scale(scale, scale);

    if (frame.translate) {
      const tx = Number.isFinite(frame.translate.x) ? frame.translate.x : 0;
      const ty = Number.isFinite(frame.translate.y) ? frame.translate.y : 0;
      ctx.translate(tx, ty);
    }

    const previousAlpha = ctx.globalAlpha;
    if (typeof frame.opacity === 'number' && Number.isFinite(frame.opacity)) {
      ctx.globalAlpha *= frame.opacity;
    }

    const elements = Array.isArray(frame.elements) ? frame.elements : [];
    for (const element of elements) {
      this.drawAvatarElement(ctx, element);
    }

    ctx.globalAlpha = previousAlpha;
    ctx.restore();
  }

  drawAvatarElement(ctx, element) {
    if (!element || typeof element !== 'object') {
      return;
    }

    const previousAlpha = ctx.globalAlpha;
    if (typeof element.opacity === 'number' && Number.isFinite(element.opacity)) {
      ctx.globalAlpha *= element.opacity;
    }

    switch (element.type) {
      case 'rect':
        this.drawAvatarRect(ctx, element);
        break;
      case 'ellipse':
        this.drawAvatarEllipse(ctx, element);
        break;
      default:
        break;
    }

    ctx.globalAlpha = previousAlpha;
  }

  drawAvatarRect(ctx, rect) {
    const { x, y, width, height, fill, stroke, strokeWidth, radius } = rect;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return;
    }

    if (radius && radius > 0 && typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, Math.min(radius, Math.min(width, height) / 2));
    } else if (radius && radius > 0) {
      this.drawRoundedRectPath(ctx, x, y, width, height, radius);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, width, height);
    }

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke && Number.isFinite(strokeWidth) && strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  drawRoundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(Math.abs(radius), Math.min(Math.abs(width), Math.abs(height)) / 2);
    const signW = width >= 0 ? 1 : -1;
    const signH = height >= 0 ? 1 : -1;
    const w = Math.abs(width);
    const h = Math.abs(height);
    ctx.beginPath();
    ctx.moveTo(x, y + r * signH);
    ctx.lineTo(x, y + (h - r) * signH);
    ctx.quadraticCurveTo(x, y + h * signH, x + r * signW, y + h * signH);
    ctx.lineTo(x + (w - r) * signW, y + h * signH);
    ctx.quadraticCurveTo(x + w * signW, y + h * signH, x + w * signW, y + (h - r) * signH);
    ctx.lineTo(x + w * signW, y + r * signH);
    ctx.quadraticCurveTo(x + w * signW, y, x + (w - r) * signW, y);
    ctx.lineTo(x + r * signW, y);
    ctx.quadraticCurveTo(x, y, x, y + r * signH);
    ctx.closePath();
  }

  drawAvatarEllipse(ctx, ellipse) {
    const { cx, cy, rx, ry, fill, stroke, strokeWidth } = ellipse;
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(rx) || !Number.isFinite(ry)) {
      return;
    }

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, TWO_PI);

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    if (stroke && Number.isFinite(strokeWidth) && strokeWidth > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
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
