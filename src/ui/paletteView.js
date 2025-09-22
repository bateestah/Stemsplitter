import { palette, onPaletteChange } from '../game/palette.js';

export function createPaletteView(root, state) {
  if (!root) {
    throw new Error('Palette root element not found.');
  }

  const categoryContainer = document.createElement('div');
  categoryContainer.className = 'palette-categories';

  const itemGrid = document.createElement('div');
  itemGrid.className = 'item-grid';

  const selectionDetails = document.createElement('div');
  selectionDetails.className = 'selection-details';
  selectionDetails.innerHTML = `
    <div class="selection-heading">Current Selection</div>
    <div class="selection-summary">
      <span class="selection-category"></span>
      <span class="selection-name"></span>
    </div>
    <p class="selection-description"></p>
  `;

  root.append(categoryContainer, itemGrid, selectionDetails);

  const categoryButtons = new Map();
  const itemButtons = new Map();
  const selectionCategoryEl = selectionDetails.querySelector('.selection-category');
  const selectionNameEl = selectionDetails.querySelector('.selection-name');
  const selectionDescriptionEl = selectionDetails.querySelector('.selection-description');

  Object.entries(palette).forEach(([category, items]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-button';
    button.textContent = category === 'floor' ? 'Flooring' : 'Furniture';
    button.addEventListener('click', () => {
      if (state.selectedCategory === category) {
        return;
      }

      const firstItem = palette[category][0];
      if (firstItem) {
        state.setSelection(category, firstItem.id);
      }
    });

    categoryContainer.appendChild(button);
    categoryButtons.set(category, button);
  });

  let currentCategory = state.selectedCategory;
  renderItems(currentCategory);
  updateActiveStates();
  updateSelectionDetails();

  const unsubscribe = state.onChange(() => {
    if (state.selectedCategory !== currentCategory) {
      currentCategory = state.selectedCategory;
      renderItems(currentCategory);
    }

    updateActiveStates();
    updateSelectionDetails();
  });

  const unsubscribePalette = onPaletteChange((event) => {
    if (!event || event.category === currentCategory) {
      renderItems(currentCategory);
    }

    updateActiveStates();
    updateSelectionDetails();
  });

  return {
    destroy() {
      unsubscribe();
      unsubscribePalette();
    }
  };

  function renderItems(category) {
    itemGrid.innerHTML = '';
    itemButtons.clear();

    const items = palette[category] ?? [];
    items.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'palette-item';
      if (state.selectedItemId === item.id) {
        card.classList.add('active');
      }

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = createSwatchBackground(item, category);

      const title = document.createElement('h4');
      title.textContent = item.name;

      const description = document.createElement('p');
      description.textContent = item.description ?? '';

      card.append(swatch, title, description);
      card.addEventListener('click', () => {
        state.setSelection(category, item.id);
      });

      itemGrid.appendChild(card);
      itemButtons.set(item.id, card);
    });
  }

  function updateActiveStates() {
    categoryButtons.forEach((button, category) => {
      button.classList.toggle('active', category === state.selectedCategory);
    });

    itemButtons.forEach((button, itemId) => {
      button.classList.toggle('active', itemId === state.selectedItemId);
    });
  }

  function updateSelectionDetails() {
    const definition = state.getSelectionDefinition();
    const isFloor = state.selectedCategory === 'floor';
    selectionCategoryEl.textContent = isFloor ? 'Flooring' : 'Furniture';

    if (!definition) {
      selectionNameEl.textContent = 'None';
      selectionDescriptionEl.textContent = '';
      return;
    }

    selectionNameEl.textContent = definition.name;
    selectionDescriptionEl.textContent = definition.description ?? '';
  }
}

function createSwatchBackground(item, category) {
  if (category === 'floor') {
    const base = item.color ?? '#ffffff';
    const accent = shadeColor(base, 0.18);
    return `linear-gradient(135deg, ${accent}, ${base})`;
  }

  const base = item.color ?? '#ffffff';
  const highlight = shadeColor(base, 0.28);
  const shadow = shadeColor(base, -0.25);
  return `linear-gradient(120deg, ${highlight}, ${base} 60%, ${shadow})`;
}

function shadeColor(hex, percent) {
  if (!hex) {
    return '#000000';
  }

  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const newR = Math.round((t - r) * p + r);
  const newG = Math.round((t - g) * p + g);
  const newB = Math.round((t - b) * p + b);
  return `#${componentToHex(newR)}${componentToHex(newG)}${componentToHex(newB)}`;
}

function componentToHex(value) {
  const clamped = Math.max(0, Math.min(255, value));
  return clamped.toString(16).padStart(2, '0');
}
