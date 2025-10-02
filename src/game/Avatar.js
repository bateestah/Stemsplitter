import {
  createDefaultAppearance,
  clampAppearance,
  getLayerOption
} from './avatarAppearance.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Avatar {
  constructor(state) {
    this.state = state;
    const spawnX = Math.floor(state.width / 2);
    const spawnY = Math.floor(state.height / 2);

    this.worldPosition = { x: spawnX, y: spawnY };
    this.currentTile = { x: spawnX, y: spawnY };

    this.path = [];
    this.currentSegment = null;
    this.speedTilesPerSecond = 3.2;

    this.walkCycle = 0;
    this.idleTime = 0;
    this.facing = 1; // default to facing south-east
    this.manualPose = 'idle';
    this.appearance = createDefaultAppearance();
  }

  getPosition() {
    return { x: this.worldPosition.x, y: this.worldPosition.y };
  }

  getFacing() {
    return this.facing;
  }

  isMoving() {
    return Boolean(this.currentSegment) || this.path.length > 0;
  }

  setTarget(x, y) {
    if (!this.state.isInside(x, y)) {
      return false;
    }

    const target = { x: Math.round(x), y: Math.round(y) };
    const start = this.getSnappedTile();
    const path = this.buildPath(start, target);

    if (!path) {
      return false;
    }

    this.worldPosition = { x: start.x, y: start.y };
    this.currentTile = { ...start };
    this.currentSegment = null;

    if (path.length === 0) {
      return true;
    }

    const [firstStep, ...rest] = path;
    this.currentSegment = {
      from: { x: this.worldPosition.x, y: this.worldPosition.y },
      to: { x: firstStep.x, y: firstStep.y },
      progress: 0
    };
    this.facing = this.directionFromSegment(this.currentSegment.from, this.currentSegment.to);
    this.path = rest;
    return true;
  }

  update(deltaSeconds) {
    const delta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
    if (delta <= 0) {
      return;
    }

    if (!this.currentSegment && this.path.length > 0) {
      const next = this.path.shift();
      if (next) {
        this.currentSegment = {
          from: { x: this.worldPosition.x, y: this.worldPosition.y },
          to: { x: next.x, y: next.y },
          progress: 0
        };
        this.facing = this.directionFromSegment(this.currentSegment.from, this.currentSegment.to);
      }
    }

    if (this.currentSegment) {
      this.advanceAlongSegment(delta);
    }

    const moving = this.isMoving();
    const cycleSpeed = moving ? this.speedTilesPerSecond * 0.45 : 0.55;
    this.walkCycle = (this.walkCycle + delta * cycleSpeed) % 1;

    if (!moving) {
      this.idleTime += delta;
    } else {
      this.idleTime = 0;
    }
  }

  getRenderState() {
    const moving = this.isMoving();
    const animation = moving ? 'walk' : this.manualPose;
    const progress = this.resolveAnimationProgress(animation);
    const appearance = clampAppearance(this.appearance);

    return {
      position: { x: this.worldPosition.x, y: this.worldPosition.y },
      facing: this.facing,
      appearance,
      animation,
      frameProgress: progress
    };
  }

  getAppearance() {
    return clampAppearance(this.appearance);
  }

  setAppearance(appearance) {
    const next = clampAppearance(appearance);
    const changed = Object.keys(next).some(key => this.appearance[key] !== next[key]);
    this.appearance = next;
    return changed;
  }

  setWardrobeOption(layerId, optionId) {
    if (typeof layerId !== 'string' || typeof optionId !== 'string') {
      return false;
    }

    const option = getLayerOption(layerId, optionId);
    if (!option) {
      return false;
    }

    const current = this.appearance[layerId];
    if (current === option.id) {
      return false;
    }

    this.appearance = {
      ...this.appearance,
      [layerId]: option.id
    };

    return true;
  }

  setBodyOption(optionId) {
    return this.setWardrobeOption('body', optionId);
  }

  setClothingOption(optionId) {
    return this.setWardrobeOption('clothing', optionId);
  }

  setHairOption(optionId) {
    return this.setWardrobeOption('hair', optionId);
  }

  setPose(pose) {
    if (pose !== 'idle' && pose !== 'sit') {
      return false;
    }

    if (this.manualPose === pose) {
      return false;
    }

    this.manualPose = pose;
    return true;
  }

  resolveAnimationProgress(animation) {
    if (animation === 'walk') {
      return this.walkCycle;
    }

    if (animation === 'idle') {
      return normalizeProgress(this.idleTime * 0.6);
    }

    return 0;
  }

  buildPath(start, target) {
    if (start.x === target.x && start.y === target.y) {
      return [];
    }

    const queue = [start];
    const cameFrom = new Map();
    const visited = new Set([this.key(start.x, start.y)]);
    const offsets = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    for (let i = 0; i < queue.length; i += 1) {
      const current = queue[i];
      if (current.x === target.x && current.y === target.y) {
        break;
      }

      for (const offset of offsets) {
        const nx = current.x + offset.x;
        const ny = current.y + offset.y;

        if (!this.state.isInside(nx, ny)) {
          continue;
        }

        const key = this.key(nx, ny);
        if (visited.has(key)) {
          continue;
        }

        if (this.isBlocked(nx, ny) && (nx !== target.x || ny !== target.y)) {
          continue;
        }

        visited.add(key);
        cameFrom.set(key, current);
        queue.push({ x: nx, y: ny });
      }
    }

    const targetKey = this.key(target.x, target.y);
    if (!visited.has(targetKey)) {
      return null;
    }

    const path = [];
    let current = target;
    while (current.x !== start.x || current.y !== start.y) {
      path.unshift({ x: current.x, y: current.y });
      const prev = cameFrom.get(this.key(current.x, current.y));
      if (!prev) {
        break;
      }
      current = prev;
    }

    return path;
  }

  advanceAlongSegment(delta) {
    const segment = this.currentSegment;
    if (!segment) {
      return;
    }

    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const travel = (this.speedTilesPerSecond * delta) / distance;
    segment.progress = clamp(segment.progress + travel, 0, 1);

    const t = segment.progress;
    this.worldPosition = {
      x: segment.from.x + dx * t,
      y: segment.from.y + dy * t
    };

    if (segment.progress >= 1) {
      this.worldPosition = { x: segment.to.x, y: segment.to.y };
      this.currentTile = { x: segment.to.x, y: segment.to.y };
      this.currentSegment = null;
    }
  }

  getSnappedTile() {
    return {
      x: Math.round(this.worldPosition.x),
      y: Math.round(this.worldPosition.y)
    };
  }

  isBlocked(x, y) {
    const furniture = this.state.getFurnitureAt(x, y);
    return Boolean(furniture);
  }

  directionFromSegment(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) {
      return this.facing;
    }

    if (dx === 1 && dy === 0) {
      return 1; // south-east
    }
    if (dx === -1 && dy === 0) {
      return 3; // north-west
    }
    if (dx === 0 && dy === 1) {
      return 2; // south-west
    }
    if (dx === 0 && dy === -1) {
      return 0; // north-east
    }

    if (dx >= 0 && dy < 0) {
      return 0;
    }
    if (dx > 0 && dy >= 0) {
      return 1;
    }
    if (dx <= 0 && dy > 0) {
      return 2;
    }
    return 3;
  }

  key(x, y) {
    return `${x},${y}`;
  }
}

function normalizeProgress(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const fraction = value % 1;
  return fraction < 0 ? fraction + 1 : fraction;
}
