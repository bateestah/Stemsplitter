import { GameState } from './game/GameState.js';
import { IsoRenderer } from './game/IsoRenderer.js';
import { InputController } from './game/InputController.js';
import { Avatar } from './game/Avatar.js';
import { createPaletteView } from './ui/paletteView.js';
import { findPaletteItem, rotationLabels } from './game/palette.js';

const canvas = document.getElementById('gameCanvas');
const paletteRoot = document.getElementById('paletteRoot');
const rotateButton = document.getElementById('rotateButton');
const rotationLabel = document.getElementById('rotationLabel');
const tileIndicator = document.getElementById('tileIndicator');

const state = new GameState(14, 14);
const renderer = new IsoRenderer(canvas, state);
const avatar = new Avatar(state);
renderer.setAvatar(avatar);
const input = new InputController(canvas, state, renderer, avatar);
createPaletteView(paletteRoot, state);

state.onChange(() => {
  renderer.draw();
  updateRotationUI();
  updateTileIndicator();
});

let previousTime = null;
function animationFrame(timestamp) {
  if (previousTime === null) {
    previousTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - previousTime) / 1000, 0.25);
  previousTime = timestamp;

  avatar.update(deltaSeconds);
  renderer.draw();

  requestAnimationFrame(animationFrame);
}

requestAnimationFrame(animationFrame);

if (rotateButton) {
  rotateButton.addEventListener('click', (event) => {
    const step = event.shiftKey ? -1 : 1;
    if (!state.rotateHoveredFurniture(step)) {
      state.rotateSelection(step);
    }
  });
}

updateRotationUI();
updateTileIndicator();

function updateRotationUI() {
  const isFurnitureSelection = state.selectedCategory === 'furniture';
  const hovered = state.hoveredTile;
  const hoveredFurniture = hovered ? state.getFurnitureAt(hovered.x, hovered.y) : null;
  const canRotateSelection = isFurnitureSelection;
  const canRotateHovered = Boolean(hoveredFurniture);

  if (rotateButton) {
    rotateButton.disabled = !canRotateSelection && !canRotateHovered;
  }

  if (!rotationLabel) {
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
    const facing = rotationLabels[furnitureData.rotation ?? 0] ?? rotationLabels[0];
    message += ` · Furniture: ${furnitureName} · Facing: ${facing}`;
  } else {
    message += ' · Furniture: empty';
  }

  tileIndicator.textContent = message;
}

window.addEventListener('beforeunload', () => {
  input.destroy();
});
