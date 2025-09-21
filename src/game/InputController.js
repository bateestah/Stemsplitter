export class InputController {
  constructor(canvas, state, renderer, avatar) {
    this.canvas = canvas;
    this.state = state;
    this.renderer = renderer;
    this.avatar = avatar;

    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  destroy() {
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  handlePointerMove(event) {
    const tile = this.getTileFromEvent(event);
    if (tile) {
      this.state.setHovered(tile);
    } else {
      this.state.setHovered(null);
    }
  }

  handlePointerLeave() {
    this.state.setHovered(null);
  }

  handlePointerDown(event) {
    const tile = this.getTileFromEvent(event);
    if (!tile) {
      return;
    }

    const isWalkMode = typeof this.state.isWalkMode === 'function' && this.state.isWalkMode();

    if (event.button === 2) {
      event.preventDefault();
      if (!isWalkMode) {
        this.state.removeFurnitureAt(tile.x, tile.y);
      }
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    if (isWalkMode) {
      if (this.avatar) {
        this.avatar.setTarget(tile.x, tile.y);
      }
      return;
    }

    if (event.shiftKey) {
      this.state.sampleFloor(tile.x, tile.y);
      return;
    }

    this.state.placeSelection(tile.x, tile.y);
  }

  handleContextMenu(event) {
    event.preventDefault();
    const tile = this.getTileFromEvent(event);
    if (!tile) {
      return;
    }

    if (typeof this.state.isWalkMode === 'function' && this.state.isWalkMode()) {
      return;
    }

    this.state.removeFurnitureAt(tile.x, tile.y);
  }

  handleKeyDown(event) {
    if (event.key === 'r' || event.key === 'R') {
      const step = event.shiftKey ? -1 : 1;
      if (!this.state.rotateHoveredFurniture(step)) {
        this.state.rotateSelection(step);
      }
    }
  }

  getTileFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      return null;
    }

    return this.renderer.screenToGrid(x, y);
  }
}
