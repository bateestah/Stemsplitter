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
    this.wallHeight = this.tileHeight * 3;

    this.pixelRatio = window.devicePixelRatio || 1;
    this.displayWidth = canvas.clientWidth || canvas.width;
    this.displayHeight = canvas.clientHeight || canvas.height;

    this.renderLoopHandle = null;
    this.lastTimestamp = null;
    this.renderLoop = this.renderLoop.bind(this);

    window.addEventListener('resize', () => this.draw());
    this.draw();
    this.startAnimationLoop();
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

    this.drawWalls(ctx);
    this.drawFloor(ctx);
    this.drawHoverFill(ctx);
    this.drawFurniture(ctx);
    this.drawAvatar(ctx);
    this.drawHoverOutline(ctx);
  }

  startAnimationLoop() {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return;
    }

    if (this.renderLoopHandle) {
      window.cancelAnimationFrame(this.renderLoopHandle);
    }

    this.renderLoopHandle = window.requestAnimationFrame(this.renderLoop);
  }

  renderLoop(timestamp) {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }

    const deltaSeconds = Math.min((timestamp - this.lastTimestamp) / 1000, 0.25);
    this.lastTimestamp = timestamp;

    if (this.state?.avatar) {
      this.state.avatar.update(deltaSeconds);
    }

    this.draw();
    this.renderLoopHandle = window.requestAnimationFrame(this.renderLoop);
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

  drawAvatar(ctx) {
    const avatar = this.state.avatar;
    if (!avatar || !avatar.position) {
      return;
    }

    const { position } = avatar;
    const { x: screenX, y: screenY } = this.gridToScreen(position.x, position.y);
    const baseX = screenX;
    const baseY = screenY + this.halfTileHeight;

    ctx.save();
    ctx.translate(baseX, baseY);

    ctx.save();
    ctx.scale(1, 0.6);
    ctx.fillStyle = 'rgba(12, 16, 34, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.halfTileWidth * 0.35, this.halfTileWidth * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const facing = avatar.facing ?? 'se';
    const horizontalDir = facing === 'sw' || facing === 'nw' ? -1 : 1;
    const verticalDir = facing === 'ne' || facing === 'nw' ? -1 : 1;

    const cycle = ((avatar.walkCycle % 1) + 1) % 1;
    const cycleRadians = cycle * Math.PI * 2;
    const strideBase = avatar.isMoving ? Math.sin(cycleRadians) : 0;
    const bobOffset = avatar.isMoving
      ? Math.sin(cycleRadians * 2) * 1.3
      : Math.sin(avatar.idleTime * 2.4) * 0.6;

    const nearStride = verticalDir > 0 ? strideBase : -strideBase;
    const farStride = -nearStride;

    const footSpacing = 6;
    const swingRange = 3;
    const liftRange = 5.5;
    const nearFootX = horizontalDir * footSpacing + nearStride * swingRange;
    const farFootX = -horizontalDir * footSpacing + farStride * swingRange;
    const nearLift = avatar.isMoving ? Math.max(0, nearStride) * liftRange : 0;
    const farLift = avatar.isMoving ? Math.max(0, farStride) * liftRange : 0;
    const nearFootY = -nearLift;
    const farFootY = -farLift;

    const hipY = -18;
    const hipSpacing = 3.6;
    const nearHipX = horizontalDir * hipSpacing;
    const farHipX = -horizontalDir * hipSpacing;
    const shoulderY = hipY - 10;
    const shoulderSpacing = 5.6;
    const nearShoulderX = horizontalDir * shoulderSpacing;
    const farShoulderX = -horizontalDir * shoulderSpacing;

    const torsoTop = shoulderY + 1;
    const torsoBottom = hipY + 6;

    const skinTone = '#f5d7b5';
    const legColor = '#27386d';
    const legHighlight = '#1b2649';
    const shoeColor = '#0a1027';
    const shirtColor = '#3b5ddc';
    const shirtShadow = '#2f4bc3';
    const accentColor = '#2a3ca1';
    const hairColor = '#1a1333';

    ctx.translate(0, -6 + bobOffset);

    const drawLeg = (hipX, footX, footY, stride, isFront) => {
      ctx.save();
      ctx.globalAlpha = isFront ? 1 : 0.72;

      const kneeOffset = 4 + Math.abs(stride) * 6;
      const kneeX = (hipX + footX) / 2;
      const kneeY = (hipY + footY) / 2 - kneeOffset;

      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = legColor;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = legHighlight;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY + 1);
      ctx.quadraticCurveTo((hipX + kneeX) / 2, (hipY + kneeY) / 2 - 2, (hipX + footX) / 2, (hipY + footY) / 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(footX, footY);
      ctx.rotate((footX - hipX) * 0.06);
      ctx.fillStyle = shoeColor;
      ctx.beginPath();
      ctx.ellipse(0, 4, 5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const drawArm = (shoulderX, stride, isFront) => {
      ctx.save();
      ctx.globalAlpha = isFront ? 1 : 0.75;

      const swing = stride * 0.7;
      const elbowX = shoulderX + swing * 6;
      const elbowY = shoulderY + 6;
      const handX = shoulderX + swing * 5;
      const handY = shoulderY + 14;

      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = accentColor;
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(elbowX, elbowY, handX, handY);
      ctx.stroke();

      ctx.strokeStyle = skinTone;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + swing * 2, handY + 4);
      ctx.stroke();

      ctx.fillStyle = skinTone;
      ctx.beginPath();
      ctx.arc(handX + swing, handY + 2, 2.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const legOrder = verticalDir > 0 ? ['far', 'near'] : ['near', 'far'];
    legOrder.forEach(side => {
      if (side === 'near') {
        drawLeg(nearHipX, nearFootX, nearFootY, nearStride, true);
      } else {
        drawLeg(farHipX, farFootX, farFootY, farStride, false);
      }
    });

    ctx.save();
    const torsoWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-torsoWidth / 2, torsoTop);
    ctx.lineTo(torsoWidth / 2, torsoTop);
    ctx.lineTo(torsoWidth / 2 + 2, torsoBottom);
    ctx.quadraticCurveTo(0, torsoBottom + 6, -torsoWidth / 2 - 2, torsoBottom);
    ctx.closePath();
    ctx.fillStyle = shirtColor;
    ctx.fill();
    ctx.strokeStyle = shirtShadow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const beltY = hipY + 1;
    ctx.strokeStyle = '#141a38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-torsoWidth / 2 + 1, beltY);
    ctx.lineTo(torsoWidth / 2 - 1, beltY);
    ctx.stroke();

    const collarY = shoulderY + 1;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(-torsoWidth / 2 + 2, collarY);
    ctx.lineTo(0, collarY - 3);
    ctx.lineTo(torsoWidth / 2 - 2, collarY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const armOrder = verticalDir > 0 ? ['far', 'near'] : ['near', 'far'];
    armOrder.forEach(side => {
      if (side === 'near') {
        drawArm(nearShoulderX, -nearStride, true);
      } else {
        drawArm(farShoulderX, -farStride, false);
      }
    });

    ctx.save();
    const headY = shoulderY - 6;
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.arc(0, headY, 6.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(0, headY - 2, 6.6, Math.PI, Math.PI * 2);
    ctx.lineTo(3 * horizontalDir, headY + 2);
    ctx.lineTo(-3 * horizontalDir, headY + 2);
    ctx.closePath();
    ctx.fill();

    const faceOffset = horizontalDir * 0.8;
    const eyeOffsetY = verticalDir > 0 ? -1 : -1.5;
    ctx.fillStyle = '#1d223d';
    ctx.beginPath();
    ctx.arc(-2 + faceOffset, headY + eyeOffsetY, 0.9, 0, Math.PI * 2);
    ctx.arc(2 + faceOffset, headY + eyeOffsetY, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#e57a64';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2 + faceOffset, headY + 3);
    ctx.quadraticCurveTo(faceOffset * 0.3, headY + 4.2, 2 + faceOffset, headY + 3);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  drawFurnitureBlock(ctx, sx, sy, definition, rotation) {
    const centerX = sx;
    const centerY = sy + this.halfTileHeight;

    const buildLayer = layerCenterY => ({
      top: { x: centerX, y: layerCenterY - this.halfTileHeight },
      right: { x: centerX + this.halfTileWidth, y: layerCenterY },
      bottom: { x: centerX, y: layerCenterY + this.halfTileHeight },
      left: { x: centerX - this.halfTileWidth, y: layerCenterY }
    });

    const base = buildLayer(centerY);
    const top = buildLayer(centerY - definition.height);

    this.drawFurnitureShadow(ctx, { x: centerX, y: centerY }, definition.height);

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
