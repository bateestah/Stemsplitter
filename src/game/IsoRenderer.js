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

export class IsoRenderer {
  constructor(canvas, state, avatar) {
    this.canvas = canvas;
    this.state = state;
    this.avatar = avatar;
    this.ctx = canvas.getContext('2d');

    this.tileWidth = 64;
    this.tileHeight = 32;
    this.halfTileWidth = this.tileWidth / 2;
    this.halfTileHeight = this.tileHeight / 2;
    this.wallHeight = this.tileHeight * 3;

    this.pixelRatio = window.devicePixelRatio || 1;
    this.displayWidth = canvas.clientWidth || canvas.width;
    this.displayHeight = canvas.clientHeight || canvas.height;

    this.directionVectors = [
      { x: this.halfTileWidth, y: -this.halfTileHeight },
      { x: this.halfTileWidth, y: this.halfTileHeight },
      { x: -this.halfTileWidth, y: this.halfTileHeight },
      { x: -this.halfTileWidth, y: -this.halfTileHeight }
    ];

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
        this.drawFurnitureBlock(ctx, entry.screenX, entry.screenY, entry.definition, entry.rotation);
      } else if (entry.type === 'avatar') {
        this.drawAvatar(ctx, entry.avatarState, entry.screenX, entry.screenY);
      }
    }
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

  drawAvatar(ctx, avatarState, screenX, screenY) {
    if (!avatarState) {
      return;
    }

    const { position, facing, walkPhase, stride, bob, sway, lean } = avatarState;
    const forwardBase = this.directionVectors[facing % this.directionVectors.length] ?? this.directionVectors[1];
    const forward = normalizeVec(forwardBase);
    const right = normalizeVec({ x: forward.y, y: -forward.x });

    const baseX = screenX;
    const baseY = screenY + this.halfTileHeight;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 15, 35, 0.42)';
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 2.5, this.halfTileWidth * 0.36, this.halfTileHeight * 0.55, 0, 0, TWO_PI);
    ctx.fill();

    const cycle = walkPhase * TWO_PI;
    const swing = Math.sin(cycle) * stride;
    const legSpread = 7;
    const stepDistance = 10;
    const leftSwing = swing;
    const rightSwing = -swing;
    const leftLift = Math.max(0, leftSwing) * 8;
    const rightLift = Math.max(0, rightSwing) * 8;

    const swayOffset = scaleVec(right, sway);
    const leanOffset = scaleVec(forward, lean * 0.1);
    const hip = addVec(addVec({ x: baseX, y: baseY - 24 - bob }, swayOffset), leanOffset);
    const footBase = addVec(addVec({ x: baseX, y: baseY }, scaleVec(right, sway * 0.2)), scaleVec(forward, lean * 0.04));
    const chest = addVec(hip, { x: 0, y: -18 });
    const shoulderBase = addVec(chest, { x: 0, y: -6 });

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
      addVec(scaleVec(forward, leftSwing * 3.6), scaleVec(right, -leftSwing * 1.6))
    );
    const rightKnee = addVec(
      lerpVec(hip, rightFoot, 0.45),
      addVec(scaleVec(forward, rightSwing * 3.6), scaleVec(right, rightSwing * 1.6))
    );

    const hipOffset = 4;
    const hipLeft = addVec(hip, scaleVec(right, -hipOffset));
    const hipRight = addVec(hip, scaleVec(right, hipOffset));

    const armSpread = 9;
    const shoulderLeft = addVec(shoulderBase, scaleVec(right, -armSpread));
    const shoulderRight = addVec(shoulderBase, scaleVec(right, armSpread));
    const armForward = stepDistance * 0.65;
    const leftArmSwing = -leftSwing;
    const rightArmSwing = -rightSwing;

    const leftHand = addVec(
      shoulderLeft,
      addVec(scaleVec(forward, leftArmSwing * armForward + lean * 0.05), { x: 0, y: 16 + Math.max(0, leftArmSwing) * 6 })
    );
    const rightHand = addVec(
      shoulderRight,
      addVec(scaleVec(forward, rightArmSwing * armForward + lean * 0.05), { x: 0, y: 16 + Math.max(0, rightArmSwing) * 6 })
    );

    const leftElbow = addVec(
      lerpVec(shoulderLeft, leftHand, 0.45),
      addVec(scaleVec(forward, leftArmSwing * -2.4), scaleVec(right, -leftArmSwing * 1.2))
    );
    const rightElbow = addVec(
      lerpVec(shoulderRight, rightHand, 0.45),
      addVec(scaleVec(forward, rightArmSwing * -2.4), scaleVec(right, rightArmSwing * 1.2))
    );

    const headCenter = addVec(shoulderBase, { x: 0, y: -12 - bob * 0.25 });

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
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(segment.hip.x, segment.hip.y);
      ctx.lineTo(segment.knee.x, segment.knee.y);
      ctx.lineTo(segment.foot.x, segment.foot.y);
      ctx.stroke();

      ctx.fillStyle = this.shadeColor(color, -0.25);
      ctx.beginPath();
      ctx.ellipse(segment.foot.x, segment.foot.y, 5.6, 2.8, 0, 0, TWO_PI);
      ctx.fill();
    };

    const drawArm = (segment, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(segment.shoulder.x, segment.shoulder.y);
      ctx.lineTo(segment.elbow.x, segment.elbow.y);
      ctx.lineTo(segment.hand.x, segment.hand.y);
      ctx.stroke();

      ctx.fillStyle = handHighlight;
      ctx.beginPath();
      ctx.arc(segment.hand.x, segment.hand.y, 2.4, 0, TWO_PI);
      ctx.fill();
    };

    drawLeg(limbs[backSide].leg, legBackColor);
    drawArm(limbs[backSide].arm, skinBack, 4.2);

    const waistLeft = addVec(hip, scaleVec(right, -7.6));
    const waistRight = addVec(hip, scaleVec(right, 7.6));
    const shoulderLeftEdge = addVec(shoulderBase, scaleVec(right, -6.6));
    const shoulderRightEdge = addVec(shoulderBase, scaleVec(right, 6.6));

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
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(waistLeft.x, waistLeft.y);
    ctx.lineTo(waistRight.x, waistRight.y);
    ctx.stroke();

    const collarCenter = addVec(shoulderBase, { x: 0, y: -3.8 });
    const collarLeft = addVec(collarCenter, scaleVec(right, -4));
    const collarRight = addVec(collarCenter, scaleVec(right, 4));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(collarLeft.x, collarLeft.y);
    ctx.lineTo(collarRight.x, collarRight.y);
    ctx.stroke();

    drawLeg(limbs[frontSide].leg, legFrontColor);
    drawArm(limbs[frontSide].arm, skinFront, 4.8);

    const headGradient = ctx.createRadialGradient(
      headCenter.x - 2,
      headCenter.y - 3,
      1.5,
      headCenter.x,
      headCenter.y,
      8.6
    );
    headGradient.addColorStop(0, '#ffe3c4');
    headGradient.addColorStop(1, '#f2b18d');

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, 8.6, 0, TWO_PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(34, 32, 56, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const hairGradient = ctx.createLinearGradient(
      headCenter.x - 6,
      headCenter.y - 10,
      headCenter.x + 6,
      headCenter.y
    );
    hairGradient.addColorStop(0, hairBase);
    hairGradient.addColorStop(1, hairHighlight);

    const hairTop = addVec(headCenter, { x: 0, y: -7 });
    ctx.fillStyle = hairGradient;
    ctx.beginPath();
    ctx.ellipse(hairTop.x + right.x * 1.8, hairTop.y, 9, 6.8, 0, 0, TWO_PI);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(headCenter.x + right.x * -3.5, headCenter.y - 2.5);
    ctx.lineTo(headCenter.x + right.x * 2.8, headCenter.y - 4.1);
    ctx.stroke();

    const eyeBase = addVec(headCenter, { x: 0, y: 1.6 });
    const leftEye = addVec(eyeBase, addVec(scaleVec(right, -2.4), scaleVec(forward, 0.4)));
    const rightEye = addVec(eyeBase, addVec(scaleVec(right, 2.4), scaleVec(forward, 0.4)));
    ctx.fillStyle = '#2f2947';
    ctx.beginPath();
    ctx.arc(leftEye.x, leftEye.y, 1.15, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEye.x, rightEye.y, 1.15, 0, TWO_PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(leftEye.x + 0.5, leftEye.y - 0.4, 0.4, 0, TWO_PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEye.x + 0.5, rightEye.y - 0.4, 0.4, 0, TWO_PI);
    ctx.fill();

    const nose = addVec(headCenter, addVec({ x: 0, y: 2.2 }, scaleVec(forward, 0.8)));
    ctx.strokeStyle = 'rgba(206, 122, 100, 0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y - 1.1);
    ctx.lineTo(nose.x, nose.y + 1.2);
    ctx.stroke();

    const mouth = addVec(headCenter, { x: 0, y: 4.8 });
    ctx.strokeStyle = '#ce7b63';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(mouth.x, mouth.y, 2.3, Math.PI * 0.1, Math.PI - Math.PI * 0.1);
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
