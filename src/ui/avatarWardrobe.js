import { getAppearanceOptions } from '../game/avatarAppearance.js';

const CATEGORY_CONFIG = [
  { type: 'body', label: 'Body tone' },
  { type: 'clothing', label: 'Outfit' },
  { type: 'hair', label: 'Hairstyle' }
];

function createSwatch(color) {
  const swatch = document.createElement('span');
  swatch.className = 'wardrobe-swatch';
  if (color) {
    swatch.style.setProperty('--swatch-color', color);
  }
  return swatch;
}

function updateSwatchColor(select, swatch) {
  if (!select || !swatch) {
    return;
  }
  const selected = select.selectedOptions[0];
  const color = selected?.dataset.swatch;
  if (color) {
    swatch.style.setProperty('--swatch-color', color);
    swatch.hidden = false;
  } else {
    swatch.hidden = true;
  }
}

export function createAvatarWardrobe(root, avatar, renderer) {
  if (!root) {
    return;
  }

  root.innerHTML = '';
  root.classList.add('wardrobe-controls');

  const appearance = typeof avatar?.getAppearance === 'function' ? avatar.getAppearance() : {};

  CATEGORY_CONFIG.forEach(({ type, label }) => {
    const fieldId = `wardrobe-${type}`;
    const field = document.createElement('div');
    field.className = 'wardrobe-field';

    const fieldLabel = document.createElement('label');
    fieldLabel.className = 'wardrobe-label';
    fieldLabel.setAttribute('for', fieldId);
    fieldLabel.textContent = label;

    const select = document.createElement('select');
    select.id = fieldId;
    select.className = 'wardrobe-select';

    const options = getAppearanceOptions(type);
    let hasInitialValue = false;
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.name;
      if (option.swatch) {
        opt.dataset.swatch = option.swatch;
      }
      select.append(opt);
      if (option.id === appearance[type]) {
        hasInitialValue = true;
      }
    });

    if (hasInitialValue) {
      select.value = appearance[type];
    } else if (select.options.length > 0 && typeof avatar?.setAppearanceLayer === 'function') {
      avatar.setAppearanceLayer(type, select.value);
    }

    const swatch = createSwatch(select.selectedOptions[0]?.dataset.swatch);
    updateSwatchColor(select, swatch);

    select.addEventListener('change', () => {
      updateSwatchColor(select, swatch);
      if (typeof avatar?.setAppearanceLayer === 'function') {
        const changed = avatar.setAppearanceLayer(type, select.value);
        if (changed && typeof renderer?.draw === 'function') {
          renderer.draw();
        }
      }
    });

    field.append(fieldLabel, select, swatch);
    root.append(field);
  });
}
