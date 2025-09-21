import { RoomState } from '../state/RoomState.js';
import { floorPalette, paletteIndex } from '../state/palettes.js';
import { IsometricRenderer } from '../engine/IsometricRenderer.js';
import { ViewportControls } from '../engine/ViewportControls.js';
import { createToolbar } from '../ui/Toolbar.js';
import { createInfoPanel } from '../ui/InfoPanel.js';

export class RoomBuilderApp {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.state = new RoomState(14, 14);
    this.selection = {
      mode: 'floor',
      id: floorPalette[0]?.id ?? null,
    };
    this.hoverCell = null;
    this.toolbar = null;
    this.renderer = null;
    this.viewport = null;
    this.statusElements = {
      tool: null,
      cursor: null,
    };

    this.handleResize = this.handleResize.bind(this);
    this.handleHoverChange = this.handleHoverChange.bind(this);

    this.buildLayout();
    this.state.applyStarterLayout();
    this.updateStatus();
  }

  buildLayout() {
    this.rootElement.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'app-shell';

    const header = document.createElement('header');
    header.className = 'app-header';
    const title = document.createElement('h1');
    title.textContent = 'Stemsplitter Studio';
    header.appendChild(title);

    const controls = document.createElement('div');
    controls.className = 'controls';

    const clearButton = this.createHeaderButton('New Room', 'is-danger');
    clearButton.addEventListener('click', () => {
      this.state.clearRoom();
    });

    const starterButton = this.createHeaderButton('Starter Layout', 'is-primary');
    starterButton.addEventListener('click', () => {
      this.state.applyStarterLayout();
    });

    controls.appendChild(clearButton);
    controls.appendChild(starterButton);
    header.appendChild(controls);

    const workspace = document.createElement('div');
    workspace.className = 'workspace';

    const palettePanel = document.createElement('aside');
    palettePanel.className = 'palette-panel';

    const viewport = document.createElement('div');
    viewport.className = 'viewport';
    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'canvas-wrapper';
    const canvas = document.createElement('canvas');
    canvasWrapper.appendChild(canvas);
    viewport.appendChild(canvasWrapper);

    const statusPanel = document.createElement('div');
    statusPanel.className = 'status-panel';
    const toolLabel = document.createElement('span');
    toolLabel.textContent = 'Active Tool: ';
    const toolValue = document.createElement('strong');
    toolValue.textContent = '–';
    toolLabel.appendChild(toolValue);
    const cursorLabel = document.createElement('span');
    cursorLabel.textContent = 'Cursor: ';
    const cursorValue = document.createElement('strong');
    cursorValue.textContent = '–';
    cursorLabel.appendChild(cursorValue);
    statusPanel.appendChild(toolLabel);
    statusPanel.appendChild(cursorLabel);
    viewport.appendChild(statusPanel);

    this.statusElements = { tool: toolValue, cursor: cursorValue };

    const infoPanel = document.createElement('aside');
    infoPanel.className = 'infobar';
    createInfoPanel(infoPanel);

    workspace.appendChild(palettePanel);
    workspace.appendChild(viewport);
    workspace.appendChild(infoPanel);

    shell.appendChild(header);
    shell.appendChild(workspace);
    this.rootElement.appendChild(shell);

    this.renderer = new IsometricRenderer(canvas, this.state);
    this.state.subscribe(() => this.updateStatus());
    this.toolbar = createToolbar({
      container: palettePanel,
      selection: this.selection,
      onSelect: (tool) => this.setSelection(tool),
    });
    this.viewport = new ViewportControls({
      canvas,
      renderer: this.renderer,
      state: this.state,
      getActiveTool: () => this.selection,
      onHoverChange: this.handleHoverChange,
      onPick: (tool) => this.setSelection(tool),
    });

    window.addEventListener('resize', this.handleResize);
    requestAnimationFrame(() => this.handleResize());
  }

  createHeaderButton(label, modifier) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pixel-button ${modifier ?? ''}`.trim();
    button.textContent = label;
    return button;
  }

  handleResize() {
    const canvas = this.renderer?.canvas;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height);
  }

  handleHoverChange(cell) {
    this.hoverCell = cell;
    this.updateStatus();
  }

  setSelection(selection) {
    if (!selection) return;
    if (selection.mode === 'picker') {
      this.selection = selection;
      this.toolbar?.updateActive(this.selection);
      this.updateStatus();
      return;
    }

    if (selection.mode === 'wall') {
      const wall = paletteIndex.wall[selection.id];
      this.selection = {
        mode: 'wall',
        id: selection.id,
        orientation: selection.orientation ?? wall?.orientation ?? 'north',
      };
    } else {
      this.selection = { ...selection };
    }

    this.toolbar?.updateActive(this.selection);
    this.updateStatus();
  }

  updateStatus() {
    const toolText = describeSelection(this.selection);
    if (this.statusElements.tool) {
      this.statusElements.tool.textContent = toolText;
    }

    if (this.statusElements.cursor) {
      if (!this.hoverCell) {
        this.statusElements.cursor.textContent = '–';
      } else {
        const tile = this.state.getTile(this.hoverCell.x, this.hoverCell.y);
        const details = describeTile(tile);
        this.statusElements.cursor.textContent = `(${this.hoverCell.x}, ${this.hoverCell.y})${details}`;
      }
    }
  }
}

function describeSelection(selection) {
  if (!selection) return 'None';
  if (selection.mode === 'floor') {
    return paletteIndex.floor[selection.id]?.label ?? selection.id;
  }
  if (selection.mode === 'wall') {
    const wall = paletteIndex.wall[selection.id];
    const label = wall?.label ?? selection.id;
    const orientation = selection.orientation ?? wall?.orientation;
    return orientation ? `${label} (${orientation})` : label;
  }
  if (selection.mode === 'furniture') {
    return paletteIndex.furniture[selection.id]?.label ?? selection.id;
  }
  if (selection.mode === 'erase') {
    return 'Eraser';
  }
  if (selection.mode === 'picker') {
    return 'Eyedropper';
  }
  return 'None';
}

function describeTile(tile) {
  if (!tile) return '';
  const parts = [];
  if (tile.floor && paletteIndex.floor[tile.floor]) {
    parts.push(paletteIndex.floor[tile.floor].label);
  }
  if (tile.wallNorth && paletteIndex.wall[tile.wallNorth]) {
    parts.push(`${paletteIndex.wall[tile.wallNorth].label} wall`);
  }
  if (tile.wallWest && paletteIndex.wall[tile.wallWest]) {
    parts.push(`${paletteIndex.wall[tile.wallWest].label} wall`);
  }
  if (tile.furniture && paletteIndex.furniture[tile.furniture]) {
    parts.push(paletteIndex.furniture[tile.furniture].label);
  }
  return parts.length ? ` • ${parts.join(' / ')}` : '';
}
