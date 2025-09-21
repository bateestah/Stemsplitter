import { paletteIndex } from '../state/palettes.js';

export class ViewportControls {
  constructor({
    canvas,
    renderer,
    state,
    getActiveTool,
    onHoverChange,
    onPick,
  }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.state = state;
    this.getActiveTool = getActiveTool;
    this.onHoverChange = onHoverChange;
    this.onPick = onPick;

    this.isDrawing = false;
    this.isPanning = false;
    this.lastCell = null;
    this.panStart = { x: 0, y: 0 };
    this.cameraStart = { x: 0, y: 0 };

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleWheel = this.handleWheel.bind(this);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerUp);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  handlePointerDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    if (event.button === 0) {
      event.preventDefault();
      const cell = this.renderer.screenToCell(localX, localY);
      if (cell) {
        this.isDrawing = true;
        this.lastCell = cell;
        this.applyTool(cell);
        this.renderer.setHoverCell(cell);
        this.onHoverChange?.(cell);
      }
      this.canvas.setPointerCapture(event.pointerId);
    } else if (event.button === 1 || event.button === 2) {
      event.preventDefault();
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY };
      this.cameraStart = { ...this.renderer.camera };
      this.canvas.setPointerCapture(event.pointerId);
    }
  }

  handlePointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    if (this.isPanning) {
      const dx = event.clientX - this.panStart.x;
      const dy = event.clientY - this.panStart.y;
      this.renderer.setCameraPosition(
        this.cameraStart.x + dx,
        this.cameraStart.y + dy
      );
      return;
    }

    const cell = this.renderer.screenToCell(localX, localY);
    if (cell) {
      this.renderer.setHoverCell(cell);
      this.onHoverChange?.(cell);
      if (
        this.isDrawing &&
        (!this.lastCell || cell.x !== this.lastCell.x || cell.y !== this.lastCell.y)
      ) {
        this.lastCell = cell;
        this.applyTool(cell);
      }
    } else {
      this.renderer.clearHover();
      this.onHoverChange?.(null);
    }
  }

  handlePointerUp(event) {
    if (this.isDrawing || this.isPanning) {
      this.isDrawing = false;
      this.isPanning = false;
      this.lastCell = null;
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        // ignore release errors
      }
    }
  }

  handlePointerLeave() {
    this.isDrawing = false;
    this.isPanning = false;
    this.renderer.clearHover();
    this.onHoverChange?.(null);
  }

  handleWheel(event) {
    event.preventDefault();
    const scale = 0.6;
    this.renderer.panBy(-event.deltaX * scale, -event.deltaY * scale);
  }

  applyTool(cell) {
    const tool = this.getActiveTool?.();
    if (!tool) return;

    if (tool.mode === 'floor') {
      this.state.setFloor(cell.x, cell.y, tool.id);
    } else if (tool.mode === 'wall') {
      const wall = paletteIndex.wall[tool.id];
      const orientation = tool.orientation ?? wall?.orientation ?? 'north';
      this.state.toggleWall(cell.x, cell.y, orientation, tool.id);
    } else if (tool.mode === 'furniture') {
      this.state.setFurniture(cell.x, cell.y, tool.id);
    } else if (tool.mode === 'erase') {
      this.state.clearTile(cell.x, cell.y);
    } else if (tool.mode === 'picker') {
      const tile = this.state.getTile(cell.x, cell.y);
      if (!tile) return;
      if (tile.furniture) {
        this.onPick?.({ mode: 'furniture', id: tile.furniture });
      } else if (tile.floor) {
        this.onPick?.({ mode: 'floor', id: tile.floor });
      } else if (tile.wallNorth) {
        const wall = paletteIndex.wall[tile.wallNorth];
        this.onPick?.({
          mode: 'wall',
          id: tile.wallNorth,
          orientation: wall?.orientation ?? 'north',
        });
      } else if (tile.wallWest) {
        const wall = paletteIndex.wall[tile.wallWest];
        this.onPick?.({
          mode: 'wall',
          id: tile.wallWest,
          orientation: wall?.orientation ?? 'west',
        });
      }
    }
  }
}
