import {
  palette,
  findPaletteItem,
  onPaletteChange,
  furnitureShapeOptions,
  createFurnitureDefinition,
  updateFurnitureDefinition
} from '../game/palette.js';

const HEIGHT_MIN = 12;
const HEIGHT_MAX = 160;
const DEFAULT_HEIGHT = 52;
const DEFAULT_COLOR = '#cccccc';

export function createFurnitureStudio(root, state) {
  if (!root) {
    throw new Error('Furniture studio root element not found.');
  }

  root.classList.add('furniture-studio');

  const headerRow = document.createElement('div');
  headerRow.className = 'studio-row';

  const pickerLabel = document.createElement('label');
  pickerLabel.className = 'studio-field';
  const pickerLabelText = document.createElement('span');
  pickerLabelText.textContent = 'Edit furniture';
  const existingSelect = document.createElement('select');
  existingSelect.className = 'studio-select';
  existingSelect.setAttribute('aria-label', 'Choose furniture to edit');
  pickerLabel.append(pickerLabelText, existingSelect);

  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.className = 'studio-secondary-button';
  newButton.textContent = 'New furniture';
  newButton.title = 'Start a fresh furniture design based on the current fields.';

  headerRow.append(pickerLabel, newButton);

  const form = document.createElement('form');
  form.className = 'studio-form';
  form.addEventListener('submit', (event) => event.preventDefault());

  const modeIndicator = document.createElement('div');
  modeIndicator.className = 'studio-mode-indicator';
  modeIndicator.textContent = 'Select a furniture item to begin.';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.required = true;
  nameInput.maxLength = 48;
  nameInput.placeholder = 'Name your furniture';
  nameInput.className = 'studio-input';

  const descriptionInput = document.createElement('textarea');
  descriptionInput.rows = 3;
  descriptionInput.maxLength = 160;
  descriptionInput.placeholder = 'Describe the vibe or purpose of this piece.';
  descriptionInput.className = 'studio-textarea';

  const shapeSelect = document.createElement('select');
  shapeSelect.className = 'studio-select';
  furnitureShapeOptions.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = option.label;
    shapeSelect.appendChild(opt);
  });

  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.className = 'studio-color-input';
  colorPicker.value = DEFAULT_COLOR;

  const colorHexInput = document.createElement('input');
  colorHexInput.type = 'text';
  colorHexInput.className = 'studio-color-hex';
  colorHexInput.value = DEFAULT_COLOR;
  colorHexInput.maxLength = 7;
  colorHexInput.spellcheck = false;
  colorHexInput.autocapitalize = 'none';

  const colorGroup = document.createElement('div');
  colorGroup.className = 'studio-color-group';
  colorGroup.append(colorPicker, colorHexInput);

  const heightSlider = document.createElement('input');
  heightSlider.type = 'range';
  heightSlider.className = 'studio-range';
  heightSlider.min = String(HEIGHT_MIN);
  heightSlider.max = String(HEIGHT_MAX);
  heightSlider.step = '2';
  heightSlider.value = String(DEFAULT_HEIGHT);

  const heightNumber = document.createElement('input');
  heightNumber.type = 'number';
  heightNumber.className = 'studio-number';
  heightNumber.min = String(HEIGHT_MIN);
  heightNumber.max = String(HEIGHT_MAX);
  heightNumber.value = String(DEFAULT_HEIGHT);

  const heightLabel = document.createElement('span');
  heightLabel.className = 'studio-height-label';
  heightLabel.textContent = `${DEFAULT_HEIGHT} px`;

  const heightGroup = document.createElement('div');
  heightGroup.className = 'studio-height-group';
  heightGroup.append(heightSlider, heightNumber, heightLabel);

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'studio-primary-button';
  saveButton.textContent = 'Save changes';

  const duplicateButton = document.createElement('button');
  duplicateButton.type = 'button';
  duplicateButton.className = 'studio-secondary-button';
  duplicateButton.textContent = 'Save as new';

  const actionRow = document.createElement('div');
  actionRow.className = 'studio-actions';
  actionRow.append(saveButton, duplicateButton);

  const statusEl = document.createElement('p');
  statusEl.className = 'studio-status';
  statusEl.setAttribute('role', 'status');
  statusEl.setAttribute('aria-live', 'polite');
  statusEl.textContent = 'Create remix furniture or tweak the classics.';

  form.append(
    modeIndicator,
    createField('Display name', nameInput),
    createField('Description', descriptionInput),
    createField('Shape', shapeSelect),
    createField('Base color', colorGroup),
    createField('Height', heightGroup),
    actionRow,
    statusEl
  );

  root.append(headerRow, form);

  let currentItemId = null;

  const desiredInitialId =
    state?.selectedCategory === 'furniture' ? state.selectedItemId : palette.furniture[0]?.id;
  const activeId = refreshOptions(desiredInitialId);

  if (activeId) {
    loadFurniture(activeId);
  } else {
    enterCreateMode();
  }

  existingSelect.addEventListener('change', () => {
    const selectedId = existingSelect.value;
    if (selectedId && selectedId !== currentItemId) {
      loadFurniture(selectedId);
      if (state && typeof state.setSelection === 'function') {
        state.setSelection('furniture', selectedId);
      }
    }
  });

  newButton.addEventListener('click', () => {
    const template = currentItemId ? findPaletteItem('furniture', currentItemId) : null;
    enterCreateMode(template || findPaletteItem('furniture', existingSelect.value));
  });

  colorPicker.addEventListener('input', () => {
    colorHexInput.value = colorPicker.value;
  });

  colorHexInput.addEventListener('change', () => {
    const normalized = normalizeColor(colorHexInput.value, colorPicker.value);
    colorPicker.value = normalized;
    colorHexInput.value = normalized;
  });

  heightSlider.addEventListener('input', () => {
    const value = clampHeightValue(heightSlider.value);
    heightNumber.value = String(value);
    heightLabel.textContent = `${value} px`;
  });

  heightNumber.addEventListener('change', () => {
    const value = clampHeightValue(heightNumber.value);
    heightNumber.value = String(value);
    heightSlider.value = String(value);
    heightLabel.textContent = `${value} px`;
  });

  saveButton.addEventListener('click', () => {
    if (!currentItemId) {
      setStatus('Select a furniture item to update or create a new one first.', 'warning');
      return;
    }

    const payload = readFormValues();
    const updated = updateFurnitureDefinition(currentItemId, payload);
    if (!updated) {
      setStatus('Unable to save changes. Try again.', 'error');
      return;
    }

    refreshOptions(updated.id);
    loadFurniture(updated.id);
    if (state && typeof state.refresh === 'function') {
      state.refresh();
    }
    setStatus(`Saved changes to “${updated.name}”.`, 'success');
  });

  duplicateButton.addEventListener('click', () => {
    const payload = readFormValues();
    const created = createFurnitureDefinition(payload);
    if (!created) {
      setStatus('Unable to create furniture right now.', 'error');
      return;
    }

    refreshOptions(created.id);
    loadFurniture(created.id);
    if (state) {
      if (typeof state.setSelection === 'function') {
        state.setSelection('furniture', created.id);
      }
      if (typeof state.refresh === 'function') {
        state.refresh();
      }
    }
    setStatus(`Minted a new piece named “${created.name}”.`, 'success');
  });

  nameInput.addEventListener('input', () => {
    updateModeIndicator();
  });

  const unsubscribeState = state?.onChange
    ? state.onChange(() => {
        if (state.selectedCategory === 'furniture' && state.selectedItemId) {
          if (state.selectedItemId !== currentItemId) {
            refreshOptions(state.selectedItemId);
            loadFurniture(state.selectedItemId);
          }
        }
      })
    : () => {};

  const unsubscribePalette = onPaletteChange((event) => {
    if (!event || event.category !== 'furniture') {
      return;
    }

    const activeId = refreshOptions(currentItemId ?? event.item?.id);
    if (currentItemId && activeId === currentItemId) {
      loadFurniture(currentItemId);
    }
  });

  function refreshOptions(forcedId) {
    const items = Array.isArray(palette.furniture) ? palette.furniture : [];
    const desiredId = typeof forcedId === 'string' ? forcedId : existingSelect.value;

    existingSelect.innerHTML = '';

    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      existingSelect.appendChild(option);
    });

    if (items.length === 0) {
      existingSelect.disabled = true;
      currentItemId = null;
      modeIndicator.textContent = 'Create your first furniture piece.';
      saveButton.disabled = true;
      duplicateButton.textContent = 'Create furniture';
      return '';
    }

    existingSelect.disabled = false;

    const fallbackId = items[0]?.id ?? '';
    const targetId = items.some((item) => item.id === desiredId) ? desiredId : fallbackId;
    if (targetId) {
      existingSelect.value = targetId;
    }

    return targetId;
  }

  function loadFurniture(id) {
    const definition = findPaletteItem('furniture', id);
    if (!definition) {
      return;
    }

    currentItemId = definition.id;

    const color = normalizeColor(definition.color, DEFAULT_COLOR);
    const height = clampHeightValue(definition.height);
    const shape = normalizeShapeValue(definition.shape);

    nameInput.value = definition.name ?? '';
    descriptionInput.value = definition.description ?? '';
    shapeSelect.value = shape;
    colorPicker.value = color;
    colorHexInput.value = color;
    heightSlider.value = String(height);
    heightNumber.value = String(height);
    heightLabel.textContent = `${height} px`;

    saveButton.disabled = false;
    duplicateButton.textContent = 'Save as new';

    modeIndicator.textContent = `Editing: ${definition.name}`;
    setStatus(`Tuning “${definition.name}”.`, 'info');
  }

  function enterCreateMode(template) {
    currentItemId = null;

    const base = template || {
      name: 'New Furniture',
      description: '',
      color: colorPicker.value,
      shape: shapeSelect.value,
      height: heightSlider.value
    };

    const color = normalizeColor(base.color, DEFAULT_COLOR);
    const height = clampHeightValue(base.height);
    const shape = normalizeShapeValue(base.shape);

    nameInput.value = base.name ? `${base.name} Remix` : 'New Furniture';
    descriptionInput.value = base.description ?? '';
    shapeSelect.value = shape;
    colorPicker.value = color;
    colorHexInput.value = color;
    heightSlider.value = String(height);
    heightNumber.value = String(height);
    heightLabel.textContent = `${height} px`;

    saveButton.disabled = true;
    duplicateButton.textContent = 'Create furniture';

    updateModeIndicator();
    setStatus('Ready to mint a fresh furniture entry.', 'info');
  }

  function readFormValues() {
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    const color = normalizeColor(colorPicker.value, DEFAULT_COLOR);
    const shape = normalizeShapeValue(shapeSelect.value);
    const height = clampHeightValue(heightNumber.value);

    return {
      name: name.length > 0 ? name : 'Custom Furniture',
      description,
      color,
      shape,
      height
    };
  }

  function updateModeIndicator() {
    if (currentItemId) {
      modeIndicator.textContent = `Editing: ${nameInput.value.trim() || 'Furniture'}`;
    } else {
      const name = nameInput.value.trim();
      modeIndicator.textContent = name ? `Creating: ${name}` : 'Creating new furniture';
    }
  }

  function setStatus(message, tone = 'info') {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  }

  function normalizeColor(value, fallback) {
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();
    const six = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
    if (six) {
      return `#${six[1].toLowerCase()}`;
    }

    const three = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
    if (three) {
      const expanded = three[1]
        .split('')
        .map((char) => `${char}${char}`)
        .join('');
      return `#${expanded.toLowerCase()}`;
    }

    return fallback;
  }

  function clampHeightValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_HEIGHT;
    }

    const rounded = Math.round(numeric);
    return Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, rounded));
  }

  function normalizeShapeValue(value) {
    const valid = furnitureShapeOptions.find((option) => option.id === value);
    if (valid) {
      return valid.id;
    }

    return furnitureShapeOptions[0]?.id ?? 'block';
  }

  function createField(labelText, control) {
    const field = document.createElement('label');
    field.className = 'studio-field';
    const span = document.createElement('span');
    span.textContent = labelText;
    field.append(span, control);
    return field;
  }

  return {
    destroy() {
      unsubscribeState();
      unsubscribePalette();
    }
  };
}
