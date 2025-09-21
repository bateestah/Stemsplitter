import { GameState } from './game/GameState.js';
import { IsoRenderer } from './game/IsoRenderer.js';
import { InputController } from './game/InputController.js';
import { createPaletteView } from './ui/paletteView.js';
import { findPaletteItem, rotationLabels } from './game/palette.js';
import { Avatar } from './game/Avatar.js';

const canvas = document.getElementById('gameCanvas');
const paletteRoot = document.getElementById('paletteRoot');
const rotateButton = document.getElementById('rotateButton');
const rotationLabel = document.getElementById('rotationLabel');
const tileIndicator = document.getElementById('tileIndicator');
const modeToggleButton = document.getElementById('modeToggle');
const zoomInButton = document.getElementById('zoomInButton');
const zoomOutButton = document.getElementById('zoomOutButton');

const state = new GameState(14, 14);
const avatar = new Avatar(state);
const renderer = new IsoRenderer(canvas, state, avatar);
const input = new InputController(canvas, state, renderer, avatar);
createPaletteView(paletteRoot, state);

state.onChange(() => {
  renderer.draw();
  updateRotationUI();
  updateTileIndicator();
  updateModeToggle();
});

if (rotateButton) {
  rotateButton.addEventListener('click', (event) => {
    const step = event.shiftKey ? -1 : 1;
    if (!state.rotateHoveredFurniture(step)) {
      state.rotateSelection(step);
    }
  });
}

if (modeToggleButton) {
  modeToggleButton.addEventListener('click', () => {
    state.setInteractionMode(state.isWalkMode() ? 'build' : 'walk');
  });
}

if (zoomInButton) {
  zoomInButton.addEventListener('click', () => {
    renderer.zoomIn();
  });
}

if (zoomOutButton) {
  zoomOutButton.addEventListener('click', () => {
    renderer.zoomOut();
  });
}

if (canvas) {
  canvas.addEventListener('iso-renderer-zoom-change', updateZoomControls);
}

updateRotationUI();
updateTileIndicator();
updateModeToggle();
updateZoomControls();

function updateRotationUI() {
  const isWalkMode = state.isWalkMode();
  const isFurnitureSelection = state.selectedCategory === 'furniture';
  const hovered = state.hoveredTile;
  const hoveredFurniture = hovered ? state.getFurnitureAt(hovered.x, hovered.y) : null;
  const canRotateSelection = isFurnitureSelection;
  const canRotateHovered = Boolean(hoveredFurniture);

  if (rotateButton) {
    rotateButton.disabled = isWalkMode || (!canRotateSelection && !canRotateHovered);
  }

  if (!rotationLabel) {
    return;
  }

  if (isWalkMode) {
    rotationLabel.textContent = 'Walk mode active — avatar follows your clicks';
    return;
  }

  if (canRotateSelection) {
    const label = rotationLabels[state.selectedRotation] ?? rotationLabels[0];
    rotationLabel.textContent = `Facing (selection): ${label}`;
    return;
  }

  if (hoveredFurniture) {
    const facing = rotationLabels[hoveredFurniture.rotation ?? 0] ?? rotationLabels[0];
    rotationLabel.textContent = `Facing (hovered): ${facing}`;
    return;
  }

  rotationLabel.textContent = 'Facing: —';
}

function updateTileIndicator() {
  if (!tileIndicator) {
    return;
  }

  const isWalkMode = state.isWalkMode();
  const hovered = state.hoveredTile;
  if (!hovered) {
    tileIndicator.textContent = isWalkMode
      ? 'Walk mode active — click a tile to send the avatar exploring.'
      : 'Hover over the room to inspect tiles.';
    return;
  }

  const { x, y } = hovered;
  const floorId = state.getFloorAt(x, y);
  const furnitureData = state.getFurnitureAt(x, y);
  const floorDefinition = findPaletteItem('floor', floorId);
  const floorName = floorDefinition?.name ?? 'Unknown floor';

  let message = `${isWalkMode ? 'Walk mode · ' : ''}Tile (${x + 1}, ${y + 1}) · Floor: ${floorName}`;

  if (furnitureData) {
    const furnitureDefinition = findPaletteItem('furniture', furnitureData.id);
    const furnitureName = furnitureDefinition?.name ?? 'Mystery furniture';
    const facing = rotationLabels[furnitureData.rotation ?? 0] ?? rotationLabels[0];
    message += ` · Furniture: ${furnitureName} · Facing: ${facing}`;
  } else {
    message += ' · Furniture: empty';
  }

  if (isWalkMode) {
    message += ' · Click to walk here';
  }

  tileIndicator.textContent = message;
}

function updateModeToggle() {
  const isWalkMode = state.isWalkMode();

  if (modeToggleButton) {
    modeToggleButton.classList.toggle('active', isWalkMode);
    modeToggleButton.textContent = isWalkMode ? 'Walk Mode: On' : 'Walk Mode: Off';
    modeToggleButton.setAttribute('aria-pressed', isWalkMode ? 'true' : 'false');
    modeToggleButton.title = isWalkMode
      ? 'Click to return to build mode and resume editing.'
      : 'Click to control the avatar with left clicks.';
  }

  if (canvas) {
    canvas.classList.toggle('walk-mode', isWalkMode);
  }
}

function updateZoomControls(event) {
  if (!zoomInButton || !zoomOutButton) {
    return;
  }

  const zoomLevel = typeof event?.detail?.zoom === 'number' ? event.detail.zoom : renderer.getZoom();
  const zoomPercent = Math.round(zoomLevel * 100);

  zoomInButton.disabled = !renderer.canZoomIn();
  zoomOutButton.disabled = !renderer.canZoomOut();

  const zoomLabel = `current zoom ${zoomPercent}%`;
  zoomInButton.title = `Zoom in — ${zoomPercent}%`;
  zoomOutButton.title = `Zoom out — ${zoomPercent}%`;
  zoomInButton.setAttribute('aria-label', `Zoom in (${zoomLabel})`);
  zoomOutButton.setAttribute('aria-label', `Zoom out (${zoomLabel})`);
}

window.addEventListener('beforeunload', () => {
  input.destroy();
  renderer.destroy();
});
