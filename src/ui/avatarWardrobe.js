import { defaultAppearance, getWardrobeOptions } from '../game/avatarAppearance.js';

const LAYER_LABELS = {
  body: 'Body Tone',
  outfit: 'Outfit',
  hair: 'Hair Style'
};

const CONTROL_ORDER = ['body', 'outfit', 'hair'];

export function createAvatarWardrobe(rootElement, avatar, renderer) {
  if (!rootElement) {
    return;
  }

  const initialAppearance =
    avatar && typeof avatar.getAppearance === 'function'
      ? avatar.getAppearance()
      : { ...defaultAppearance };
  const selectionState = { ...defaultAppearance, ...initialAppearance };

  const container = document.createElement('section');
  container.className = 'wardrobe-panel';
  container.setAttribute('aria-label', 'Avatar wardrobe');

  const heading = document.createElement('h3');
  heading.textContent = 'Avatar Wardrobe';
  container.appendChild(heading);

  const intro = document.createElement('p');
  intro.className = 'wardrobe-intro';
  intro.textContent = 'Mix body tones, outfits, and hairstyles to instantly refresh your explorer.';
  container.appendChild(intro);

  for (const layer of CONTROL_ORDER) {
    const group = document.createElement('div');
    group.className = 'wardrobe-group';

    const title = document.createElement('h4');
    title.textContent = LAYER_LABELS[layer] ?? layer;
    group.appendChild(title);

    const options = getWardrobeOptions(layer);
    const optionRow = document.createElement('div');
    optionRow.className = 'wardrobe-options';
    group.appendChild(optionRow);

    const description = document.createElement('p');
    description.className = 'wardrobe-description';
    group.appendChild(description);

    const buttons = [];

    const updateGroupSelection = (selectedId) => {
      for (const { element, option } of buttons) {
        const isActive = option.id === selectedId;
        element.classList.toggle('active', isActive);
        element.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }

      const activeOption = buttons.find(({ option }) => option.id === selectedId)?.option;
      description.textContent = activeOption?.description ?? '';
    };

    const changeAppearance = (layerName, optionId) => {
      if (!avatar) {
        selectionState[layerName] = optionId;
        return true;
      }

      switch (layerName) {
        case 'body':
          return avatar.setBodyStyle?.(optionId) ?? false;
        case 'hair':
          return avatar.setHairStyle?.(optionId) ?? false;
        case 'outfit':
          return avatar.setOutfitStyle?.(optionId) ?? false;
        default:
          return false;
      }
    };

    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wardrobe-choice';
      button.dataset.value = option.id;
      button.title = option.description ?? option.name;

      const swatch = document.createElement('span');
      swatch.className = 'wardrobe-swatch';
      const gradient = buildSwatchGradient(option.swatch);
      if (gradient) {
        swatch.style.background = gradient;
      }
      button.appendChild(swatch);

      const label = document.createElement('span');
      label.className = 'wardrobe-choice-label';
      label.textContent = option.name;
      button.appendChild(label);

      button.addEventListener('click', () => {
        const changed = changeAppearance(layer, option.id);
        const latestAppearance =
          avatar && typeof avatar.getAppearance === 'function'
            ? avatar.getAppearance()
            : { ...selectionState, [layer]: option.id };
        const currentValue = latestAppearance[layer] ?? option.id;
        selectionState[layer] = currentValue;
        updateGroupSelection(currentValue);

        if (changed && renderer && typeof renderer.draw === 'function') {
          renderer.draw();
        }
      });

      optionRow.appendChild(button);
      buttons.push({ element: button, option });
    }

    const currentSelection = selectionState[layer] ?? options[0]?.id;
    updateGroupSelection(currentSelection);

    container.appendChild(group);
  }

  rootElement.innerHTML = '';
  rootElement.appendChild(container);
}

function buildSwatchGradient(colors) {
  if (!Array.isArray(colors) || colors.length === 0) {
    return '';
  }

  if (colors.length === 1) {
    return colors[0];
  }

  const stops = colors.map((color, index) => {
    const percent = colors.length === 1 ? 0 : Math.round((index / (colors.length - 1)) * 100);
    return `${color} ${percent}%`;
  });

  return `linear-gradient(135deg, ${stops.join(', ')})`;
}
