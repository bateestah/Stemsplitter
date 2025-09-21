import {
  floorPalette,
  wallPalette,
  furniturePalette,
  utilityTools,
} from '../state/palettes.js';

export function createToolbar({ container, selection, onSelect }) {
  const sections = [];
  const elementMap = new Map();

  function makePaletteSection(title, palette, mode) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'palette-grid';

    palette.forEach((entry) => {
      const button = document.createElement('button');
      button.className = 'palette-item';
      button.type = 'button';
      button.dataset.mode = mode;
      button.dataset.id = entry.id;

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = createSwatchBackground(entry);
      button.appendChild(swatch);

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = entry.label;
      button.appendChild(label);

      button.addEventListener('click', () => {
        onSelect?.({ mode, id: entry.id, orientation: entry.orientation });
      });

      grid.appendChild(button);
      elementMap.set(`${mode}:${entry.id}`, button);
    });

    section.appendChild(grid);
    container.appendChild(section);
    sections.push(section);
  }

  function makeUtilitySection() {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = 'Tools';
    section.appendChild(heading);

    const toolbox = document.createElement('div');
    toolbox.className = 'toolbox';

    utilityTools.forEach((tool) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pixel-button tool-button';
      button.dataset.mode = tool.id;
      const icon = document.createElement('span');
      icon.className = 'tool-icon';
      icon.textContent = tool.icon;
      button.appendChild(icon);
      const label = document.createElement('span');
      label.textContent = tool.label;
      button.appendChild(label);
      button.addEventListener('click', () => {
        const mode = tool.id === 'tool-erase' ? 'erase' : 'picker';
        onSelect?.({ mode, id: tool.id });
      });
      toolbox.appendChild(button);
      elementMap.set(`tool:${tool.id}`, button);
    });

    section.appendChild(toolbox);
    container.appendChild(section);
    sections.push(section);
  }

  makePaletteSection('Flooring', floorPalette, 'floor');
  makePaletteSection('Walls', wallPalette, 'wall');
  makePaletteSection('Furniture', furniturePalette, 'furniture');
  makeUtilitySection();

  function updateActive(nextSelection) {
    elementMap.forEach((el) => el.classList.remove('is-active'));
    if (!nextSelection) return;
    if (nextSelection.mode === 'floor' || nextSelection.mode === 'wall' || nextSelection.mode === 'furniture') {
      const key = `${nextSelection.mode}:${nextSelection.id}`;
      const target = elementMap.get(key);
      if (target) target.classList.add('is-active');
    } else if (nextSelection.mode === 'erase' || nextSelection.mode === 'picker') {
      const key = `tool:${nextSelection.id}`;
      const target = elementMap.get(key);
      if (target) target.classList.add('is-active');
    }
  }

  updateActive(selection);

  return {
    updateActive,
  };
}

function createSwatchBackground(entry) {
  if (entry.swatch && entry.border) {
    return `linear-gradient(135deg, ${entry.swatch}, ${entry.border})`;
  }
  if (entry.swatch) {
    return entry.swatch;
  }
  return 'rgba(255, 255, 255, 0.2)';
}
