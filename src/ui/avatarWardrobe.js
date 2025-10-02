import { getWardrobeLayers } from '../game/avatarAppearance.js';

export function createAvatarWardrobe(root, avatar, renderer) {
  if (!root) {
    throw new Error('Wardrobe root element not found.');
  }

  const layers = getWardrobeLayers();
  const appearance = typeof avatar?.getAppearance === 'function' ? avatar.getAppearance() : {};

  root.innerHTML = '';

  layers.forEach((layer) => {
    const section = document.createElement('section');
    section.className = 'wardrobe-section';

    const heading = document.createElement('h4');
    heading.textContent = layer.name;
    section.appendChild(heading);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'wardrobe-options';

    const groupName = `wardrobe-${layer.id}`;
    layer.options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'wardrobe-option';
      label.title = option.description ?? option.name;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = option.id;
      input.checked = appearance[layer.id] === option.id;

      input.addEventListener('change', () => {
        if (!input.checked) {
          return;
        }

        appearance[layer.id] = option.id;
        let changed = false;
        if (avatar && typeof avatar.setWardrobeOption === 'function') {
          changed = avatar.setWardrobeOption(layer.id, option.id);
        }

        updateActiveStates(layer.id, option.id);

        if (changed && renderer && typeof renderer.draw === 'function') {
          renderer.draw();
        }
      });

      const swatch = createSwatch(option.swatch);
      const name = document.createElement('span');
      name.className = 'wardrobe-option__name';
      name.textContent = option.name;

      label.append(input, swatch, name);
      optionsContainer.appendChild(label);
    });

    section.appendChild(optionsContainer);
    root.appendChild(section);

    updateActiveStates(layer.id, appearance[layer.id]);
  });

  function updateActiveStates(layerId, selectedId) {
    const inputs = root.querySelectorAll(`input[name="wardrobe-${layerId}"]`);
    inputs.forEach((input) => {
      const label = input.closest('.wardrobe-option');
      if (!label) {
        return;
      }
      const isActive = input.checked && (!selectedId || input.value === selectedId);
      label.classList.toggle('active', isActive);
    });
  }

  return {
    destroy() {
      root.innerHTML = '';
    }
  };
}

function createSwatch(colors) {
  const swatch = document.createElement('span');
  swatch.className = 'wardrobe-option__swatch';

  if (Array.isArray(colors) && colors.length > 0) {
    if (colors.length === 1) {
      swatch.style.background = colors[0];
    } else {
      const stops = colors.map((color, index) => {
        const percent = colors.length === 1 ? 0 : Math.round((index / (colors.length - 1)) * 100);
        return `${color} ${percent}%`;
      });
      swatch.style.background = `linear-gradient(135deg, ${stops.join(', ')})`;
    }
  }

  return swatch;
}
