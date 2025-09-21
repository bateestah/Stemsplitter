import { GameState } from './game/GameState.js';
import { IsoRenderer } from './game/IsoRenderer.js';
import { InputController } from './game/InputController.js';
import { createPaletteView } from './ui/paletteView.js';
import { findPaletteItem, rotationLabels } from './game/palette.js';

const canvas = document.getElementById('gameCanvas');
const paletteRoot = document.getElementById('paletteRoot');
const rotateButton = document.getElementById('rotateButton');
const rotationLabel = document.getElementById('rotationLabel');
const tileIndicator = document.getElementById('tileIndicator');

const state = new GameState(14, 14);
const renderer = new IsoRenderer(canvas, state);
const input = new InputController(canvas, state, renderer);
createPaletteView(paletteRoot, state);

state.onChange(() => {
  renderer.draw();
  updateRotationUI();
  updateTileIndicator();
});

if (rotateButton) {
  rotateButton.addEventListener('click', () => {
    state.rotateSelection();
  });
}

updateRotationUI();
updateTileIndicator();

function updateRotationUI() {
  const isFurniture = state.selectedCategory === 'furniture';
  if (rotateButton) {
    rotateButton.disabled = !isFurniture;
  }

  if (!rotationLabel) {
    return;
  }

  if (!isFurniture) {
    rotationLabel.textContent = 'Facing: —';
    return;
  }

  const label = rotationLabels[state.selectedRotation] ?? rotationLabels[0];
  rotationLabel.textContent = `Facing: ${label}`;
}

function updateTileIndicator() {
  if (!tileIndicator) {
    return;
  }

  const hovered = state.hoveredTile;
  if (!hovered) {
    tileIndicator.textContent = 'Hover over the room to inspect tiles.';
    return;
  }

  const { x, y } = hovered;
  const floorId = state.getFloorAt(x, y);
  const furnitureData = state.getFurnitureAt(x, y);
  const floorDefinition = findPaletteItem('floor', floorId);
  const floorName = floorDefinition?.name ?? 'Unknown floor';

  let message = `Tile (${x + 1}, ${y + 1}) · Floor: ${floorName}`;

  if (furnitureData) {
    const furnitureDefinition = findPaletteItem('furniture', furnitureData.id);
    const furnitureName = furnitureDefinition?.name ?? 'Mystery furniture';
    message += ` · Furniture: ${furnitureName}`;
  } else {
    message += ' · Furniture: empty';
  }

  tileIndicator.textContent = message;
}

window.addEventListener('beforeunload', () => {
  input.destroy();
});
