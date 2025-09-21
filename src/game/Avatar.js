export class Avatar {
  constructor(state) {
    this.state = state;

    const startX = Math.floor(state.width / 2);
    const startY = Math.floor(state.height / 2);

    this.position = { x: startX, y: startY };
    this.segmentStart = { ...this.position };
    this.segmentEnd = null;
    this.segmentOffset = 0;
    this.path = [];

    this.speed = 2.8; // tiles per second
    this.walkFrequency = 2.2; // cycles per second
    this.walkPhase = 0;
    this.isMoving = false;
    this.direction = 'south';
  }

  moveTo(x, y) {
    const targetX = Math.round(x);
    const targetY = Math.round(y);

    if (!this.state.isInside(targetX, targetY)) {
      return;
    }

    const startTileX = Math.round(this.position.x);
    const startTileY = Math.round(this.position.y);

    this.path = this.buildPath(startTileX, startTileY, targetX, targetY);
    this.segmentStart = { x: this.position.x, y: this.position.y };
    this.segmentOffset = 0;

    if (this.path.length > 0) {
      this.segmentEnd = this.path.shift();
      this.isMoving = true;
      this.updateDirectionFromSegment();
      return;
    }

    const atTarget =
      Math.abs(this.position.x - targetX) < 1e-3 && Math.abs(this.position.y - targetY) < 1e-3;

    if (!atTarget) {
      this.segmentEnd = { x: targetX, y: targetY };
      this.isMoving = true;
      this.updateDirectionFromSegment();
    } else {
      this.segmentEnd = null;
      this.isMoving = false;
    }
  }

  update(deltaSeconds) {
    if (deltaSeconds <= 0) {
      return;
    }

    let remaining = this.speed * deltaSeconds;

    while (remaining > 0 && this.segmentEnd) {
      const dx = this.segmentEnd.x - this.segmentStart.x;
      const dy = this.segmentEnd.y - this.segmentStart.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1e-6) {
        this.position = { x: this.segmentEnd.x, y: this.segmentEnd.y };
        this.segmentStart = { ...this.segmentEnd };
        this.segmentOffset = 0;
        this.advanceSegment();
        continue;
      }

      const available = distance - this.segmentOffset;

      if (remaining >= available) {
        this.segmentOffset = 0;
        remaining -= available;
        this.segmentStart = { ...this.segmentEnd };
        this.position = { ...this.segmentEnd };
        this.advanceSegment();
      } else {
        this.segmentOffset += remaining;
        remaining = 0;
        const t = this.segmentOffset / distance;
        this.position = {
          x: this.segmentStart.x + dx * t,
          y: this.segmentStart.y + dy * t
        };
      }
    }

    if (!this.segmentEnd) {
      this.position = { x: this.segmentStart.x, y: this.segmentStart.y };
      this.isMoving = false;
    } else {
      this.isMoving = true;
      const dx = this.segmentEnd.x - this.segmentStart.x;
      const dy = this.segmentEnd.y - this.segmentStart.y;
      if (Math.hypot(dx, dy) < 1e-6) {
        this.updateDirectionFromSegment();
      }
    }

    if (this.isMoving) {
      this.walkPhase = (this.walkPhase + deltaSeconds * this.walkFrequency) % 1;
    } else {
      this.walkPhase = 0;
    }
  }

  getVisualState() {
    return {
      position: { ...this.position },
      direction: this.direction,
      isMoving: this.isMoving,
      walkPhase: this.walkPhase
    };
  }

  advanceSegment() {
    if (this.path.length > 0) {
      this.segmentEnd = this.path.shift();
      this.segmentOffset = 0;
      this.updateDirectionFromSegment();
    } else {
      this.segmentEnd = null;
      this.segmentOffset = 0;
      this.isMoving = false;
    }
  }

  updateDirectionFromSegment() {
    if (!this.segmentEnd) {
      return;
    }

    const dx = this.segmentEnd.x - this.segmentStart.x;
    const dy = this.segmentEnd.y - this.segmentStart.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (Math.abs(dx) > 1e-6) {
        this.direction = dx > 0 ? 'east' : 'west';
      }
    } else if (Math.abs(dy) > 1e-6) {
      this.direction = dy > 0 ? 'south' : 'north';
    }
  }

  buildPath(startX, startY, targetX, targetY) {
    const path = [];

    let currentX = startX;
    let currentY = startY;

    const dx = targetX - currentX;
    const stepX = Math.sign(dx);
    for (let i = 0; i < Math.abs(dx); i += 1) {
      currentX += stepX;
      path.push({ x: currentX, y: currentY });
    }

    const dy = targetY - currentY;
    const stepY = Math.sign(dy);
    for (let i = 0; i < Math.abs(dy); i += 1) {
      currentY += stepY;
      path.push({ x: currentX, y: currentY });
    }

    return path;
  }
}
