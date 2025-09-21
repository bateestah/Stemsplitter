export class Avatar {
  constructor(startX, startY) {
    const initialX = Math.round(startX);
    const initialY = Math.round(startY);

    this.currentTile = { x: initialX, y: initialY };
    this.position = { x: initialX, y: initialY };
    this.nextTile = null;
    this.pathQueue = [];
    this.segmentProgress = 0;
    this.walkSpeed = 2.8;
    this.walkCycle = 0;
    this.isMoving = false;
    this.idleTime = 0;
    this.facing = 'se';
    this.targetTile = { x: initialX, y: initialY };
  }

  setTarget(tileX, tileY) {
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) {
      return false;
    }

    const targetX = Math.round(tileX);
    const targetY = Math.round(tileY);

    const currentTarget = this.targetTile;
    if (
      currentTarget &&
      currentTarget.x === targetX &&
      currentTarget.y === targetY &&
      !this.nextTile &&
      this.pathQueue.length === 0
    ) {
      return false;
    }

    const target = { x: targetX, y: targetY };
    this.targetTile = target;

    const start = this.nextTile ? { ...this.nextTile } : { ...this.currentTile };
    this.pathQueue = this.buildTilePath(start, target);

    if (!this.nextTile) {
      this.nextTile = this.pathQueue.shift() ?? null;
      this.segmentProgress = 0;
      if (this.nextTile) {
        this.updateFacing(this.currentTile, this.nextTile);
      }
    }

    return true;
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    let distanceBudget = this.walkSpeed * deltaSeconds;
    let distanceTravelled = 0;

    while (distanceBudget > 0 && this.nextTile) {
      const start = this.currentTile;
      const target = this.nextTile;
      const dx = target.x - start.x;
      const dy = target.y - start.y;
      const segmentLength = Math.hypot(dx, dy);

      if (segmentLength === 0) {
        this.currentTile = target;
        this.position = { ...target };
        this.nextTile = this.pathQueue.shift() ?? null;
        this.segmentProgress = 0;
        if (this.nextTile) {
          this.updateFacing(this.currentTile, this.nextTile);
        }
        continue;
      }

      const remaining = segmentLength * (1 - this.segmentProgress);
      if (distanceBudget >= remaining) {
        distanceTravelled += remaining;
        distanceBudget -= remaining;
        this.segmentProgress = 0;
        this.currentTile = target;
        this.position = { ...target };
        this.nextTile = this.pathQueue.shift() ?? null;
        if (this.nextTile) {
          this.updateFacing(this.currentTile, this.nextTile);
        }
      } else {
        const progressIncrement = distanceBudget / segmentLength;
        this.segmentProgress += progressIncrement;
        distanceTravelled += distanceBudget;
        distanceBudget = 0;
        this.position = {
          x: start.x + dx * this.segmentProgress,
          y: start.y + dy * this.segmentProgress
        };
      }
    }

    if (!this.nextTile && this.segmentProgress === 0) {
      this.position = { ...this.currentTile };
    }

    if (distanceTravelled > 0) {
      this.isMoving = true;
      this.walkCycle = (this.walkCycle + distanceTravelled) % 1;
      this.idleTime = 0;
    } else {
      this.isMoving = false;
      this.idleTime += deltaSeconds;
    }
  }

  buildTilePath(start, target) {
    const path = [];
    let cx = start.x;
    let cy = start.y;
    let safety = 0;

    while ((cx !== target.x || cy !== target.y) && safety < 512) {
      const dx = target.x - cx;
      const dy = target.y - cy;

      if (dx !== 0 && dy !== 0) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          cx += Math.sign(dx);
        } else {
          cy += Math.sign(dy);
        }
      } else if (dx !== 0) {
        cx += Math.sign(dx);
      } else if (dy !== 0) {
        cy += Math.sign(dy);
      }

      path.push({ x: cx, y: cy });
      safety += 1;
    }

    return path;
  }

  updateFacing(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      this.facing = dx >= 0 ? 'se' : 'nw';
    } else {
      this.facing = dy >= 0 ? 'sw' : 'ne';
    }
  }
}
