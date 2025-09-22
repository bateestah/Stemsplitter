import {
  palette,
  findPaletteItem,
  addFurnitureDefinition,
  updateFurnitureDefinition,
  onPaletteChange,
  furnitureShapeOptions,
  furnitureHeightRange
} from '../game/palette.js';

const DEFAULT_NEW_COLOR = '#8bd8ff';
const DEFAULT_SHAPE = 'block';
const HEX_SIX = /^#([0-9a-fA-F]{6})$/;
const HEX_THREE = /^#([0-9a-fA-F]{3})$/;

export function createFurnitureStudio(root, state) {
  if (!root) {
    return {
      destroy() {}
    };
  }

  root.innerHTML = '';

  const cleanupFns = [];
  const addListener = (target, type, handler) => {
    target.addEventListener(type, handler);
    cleanupFns.push(() => target.removeEventListener(type, handler));
  };

  const idSuffix = Math.random().toString(36).slice(2, 8);
  const selectId = `studio-existing-${idSuffix}`;
  const nameInputId = `studio-name-${idSuffix}`;
  const colorInputId = `studio-color-${idSuffix}`;
  const heightInputId = `studio-height-${idSuffix}`;
  const shapeSelectId = `studio-shape-${idSuffix}`;
  const descriptionId = `studio-description-${idSuffix}`;

  const container = document.createElement('div');
  container.className = 'furniture-studio';

  const toolbar = document.createElement('div');
  toolbar.className = 'studio-toolbar';
  container.appendChild(toolbar);

  const toolbarGroup = document.createElement('div');
  toolbarGroup.className = 'studio-toolbar-group';
  toolbar.appendChild(toolbarGroup);

  const modeChip = document.createElement('span');
  modeChip.className = 'studio-mode-chip';
  toolbarGroup.appendChild(modeChip);

  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'studio-select-wrapper';
  toolbarGroup.appendChild(selectWrapper);

  const selectLabel = document.createElement('label');
  selectLabel.className = 'studio-select-label';
  selectLabel.htmlFor = selectId;
  selectLabel.textContent = 'Edit existing';
  selectWrapper.appendChild(selectLabel);

  const existingSelect = document.createElement('select');
  existingSelect.id = selectId;
  existingSelect.className = 'studio-select';
  selectWrapper.appendChild(existingSelect);

  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.className = 'studio-new-button';
  newButton.textContent = 'New furniture prototype';
  toolbar.appendChild(newButton);

  const idDisplay = document.createElement('div');
  idDisplay.className = 'studio-id';
  container.appendChild(idDisplay);

  const tip = document.createElement('p');
  tip.className = 'studio-tip';
  tip.textContent = 'Tip: Saving applies updates to every placed copy instantly.';
  container.appendChild(tip);

  const form = document.createElement('form');
  form.className = 'studio-form';
  form.setAttribute('novalidate', 'novalidate');
  container.appendChild(form);

  const nameField = document.createElement('div');
  nameField.className = 'studio-field';
  const nameLabel = document.createElement('label');
  nameLabel.className = 'studio-field-label';
  nameLabel.htmlFor = nameInputId;
  nameLabel.textContent = 'Display name';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = nameInputId;
  nameInput.placeholder = 'Neon Bar Stool';
  nameField.append(nameLabel, nameInput);
  form.appendChild(nameField);

  const colorField = document.createElement('div');
  colorField.className = 'studio-field';
  const colorLabel = document.createElement('label');
  colorLabel.className = 'studio-field-label';
  colorLabel.htmlFor = colorInputId;
  colorLabel.textContent = 'Accent colour';
  const colorRow = document.createElement('div');
  colorRow.className = 'studio-color-row';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = colorInputId;
  colorInput.className = 'studio-color-input';
  const colorValue = document.createElement('span');
  colorValue.className = 'studio-color-value';
  colorRow.append(colorInput, colorValue);
  colorField.append(colorLabel, colorRow);
  form.appendChild(colorField);

  const heightField = document.createElement('div');
  heightField.className = 'studio-field';
  const heightLabel = document.createElement('label');
  heightLabel.className = 'studio-field-label';
  heightLabel.htmlFor = heightInputId;
  heightLabel.textContent = 'Height';
  const heightRow = document.createElement('div');
  heightRow.className = 'studio-height-row';
  const heightInput = document.createElement('input');
  heightInput.type = 'range';
  heightInput.id = heightInputId;
  heightInput.className = 'studio-height-slider';
  const heightValue = document.createElement('span');
  heightValue.className = 'studio-height-value';
  heightRow.append(heightInput, heightValue);
  heightField.append(heightLabel, heightRow);
  form.appendChild(heightField);

  const shapeField = document.createElement('div');
  shapeField.className = 'studio-field';
  const shapeLabel = document.createElement('label');
  shapeLabel.className = 'studio-field-label';
  shapeLabel.htmlFor = shapeSelectId;
  shapeLabel.textContent = 'Shape preset';
  const shapeSelect = document.createElement('select');
  shapeSelect.id = shapeSelectId;
  shapeSelect.className = 'studio-shape-select';
  furnitureShapeOptions.forEach((option) => {
    const opt = document.createElement('option');
    opt.value = option.id;
    opt.textContent = option.label;
    shapeSelect.appendChild(opt);
  });
  shapeField.append(shapeLabel, shapeSelect);
  form.appendChild(shapeField);

  const descriptionField = document.createElement('div');
  descriptionField.className = 'studio-field';
  const descriptionLabel = document.createElement('label');
  descriptionLabel.className = 'studio-field-label';
  descriptionLabel.htmlFor = descriptionId;
  descriptionLabel.textContent = 'Description';
  const descriptionInput = document.createElement('textarea');
  descriptionInput.id = descriptionId;
  descriptionInput.placeholder = 'What vibe does this piece add to the room?';
  descriptionField.append(descriptionLabel, descriptionInput);
  form.appendChild(descriptionField);

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'studio-submit';
  form.appendChild(submitButton);

  const status = document.createElement('div');
  status.className = 'studio-status';
  status.setAttribute('aria-live', 'polite');
  container.appendChild(status);

  root.appendChild(container);

  const sliderMin = Number.isFinite(furnitureHeightRange?.min) ? furnitureHeightRange.min : 12;
  const sliderMax = Number.isFinite(furnitureHeightRange?.max) ? furnitureHeightRange.max : 96;
  const sliderDefault = Number.isFinite(furnitureHeightRange?.default)
    ? furnitureHeightRange.default
    : Math.round((sliderMin + sliderMax) / 2);
  heightInput.min = String(sliderMin);
  heightInput.max = String(sliderMax);
  heightInput.step = '1';

  let mode = 'edit';
  let editingId = null;
  let lastEditedId = null;
  let draft = createEmptyDraft(sliderDefault);

  const initialSelection =
    state?.selectedCategory === 'furniture'
      ? findPaletteItem('furniture', state.selectedItemId)
      : null;

  if (initialSelection) {
    editingId = initialSelection.id;
    lastEditedId = initialSelection.id;
    draft = createDraftFromDefinition(initialSelection, sliderDefault, sliderMin, sliderMax);
  } else if (palette.furniture.length > 0) {
    editingId = palette.furniture[0].id;
    lastEditedId = editingId;
    draft = createDraftFromDefinition(
      findPaletteItem('furniture', editingId),
      sliderDefault,
      sliderMin,
      sliderMax
    );
  } else {
    mode = 'create';
  }

  refreshExistingOptions();
  applyDraftToInputs();
  updateModeChip();
  updateIdDisplay();
  updateSubmitLabel();
  updateSubmitDisabled();

  addListener(existingSelect, 'change', () => {
    if (!existingSelect.value) {
      return;
    }

    editingId = existingSelect.value;
    lastEditedId = editingId;
    mode = 'edit';
    draft = createDraftFromDefinition(
      findPaletteItem('furniture', editingId),
      sliderDefault,
      sliderMin,
      sliderMax
    );
    clearStatus();
    applyDraftToInputs();
    updateModeChip();
    updateIdDisplay();
    updateSubmitLabel();
    updateSubmitDisabled();
  });

  addListener(newButton, 'click', () => {
    mode = 'create';
    editingId = null;
    draft = createEmptyDraft(sliderDefault);
    clearStatus();
    applyDraftToInputs();
    updateModeChip();
    updateIdDisplay();
    updateSubmitLabel();
    updateSubmitDisabled();
    nameInput.focus({ preventScroll: true });
  });

  addListener(nameInput, 'input', () => {
    draft.name = nameInput.value;
    clearStatus();
    updateSubmitDisabled();
  });

  addListener(colorInput, 'input', () => {
    draft.color = normalizeColorHex(colorInput.value, DEFAULT_NEW_COLOR);
    colorValue.textContent = draft.color.toUpperCase();
    clearStatus();
  });

  addListener(heightInput, 'input', () => {
    const newValue = clampHeightWithinRange(heightInput.value, sliderDefault, sliderMin, sliderMax);
    draft.height = newValue;
    heightInput.value = String(newValue);
    heightValue.textContent = `${newValue} px`;
    clearStatus();
  });

  addListener(shapeSelect, 'change', () => {
    draft.shape = shapeSelect.value || DEFAULT_SHAPE;
    clearStatus();
  });

  addListener(descriptionInput, 'input', () => {
    draft.description = descriptionInput.value;
    clearStatus();
  });

  addListener(form, 'submit', (event) => {
    event.preventDefault();
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      setStatus('Give your furniture a name before saving.', 'error');
      nameInput.focus({ preventScroll: true });
      return;
    }

    const payload = {
      name: trimmedName,
      color: draft.color,
      height: clampHeightWithinRange(draft.height, sliderDefault, sliderMin, sliderMax),
      shape: draft.shape || DEFAULT_SHAPE,
      description: draft.description.trim()
    };

    if (mode === 'create') {
      const existingIds = palette.furniture.map((item) => item.id);
      const newId = generateUniqueId(trimmedName, existingIds);
      const created = addFurnitureDefinition({ id: newId, ...payload });
      mode = 'edit';
      editingId = created.id;
      lastEditedId = created.id;
      draft = createDraftFromDefinition(created, sliderDefault, sliderMin, sliderMax);
      refreshExistingOptions();
      applyDraftToInputs();
      updateModeChip();
      updateIdDisplay();
      updateSubmitLabel();
      updateSubmitDisabled();
      setStatus(`Created "${created.name}". It's ready to place!`, 'success');
      state?.setSelection?.('furniture', created.id);
      return;
    }

    if (editingId) {
      const updated = updateFurnitureDefinition(editingId, payload);
      if (!updated) {
        setStatus('Unable to update this furniture item.', 'error');
        return;
      }

      draft = createDraftFromDefinition(updated, sliderDefault, sliderMin, sliderMax);
      refreshExistingOptions();
      applyDraftToInputs();
      updateSubmitDisabled();
      setStatus(`Updated "${updated.name}". All copies refreshed.`, 'success');
    }
  });

  const removePaletteListener = onPaletteChange(() => {
    refreshExistingOptions();
    if (mode === 'edit' && editingId) {
      const definition = findPaletteItem('furniture', editingId);
      if (definition) {
        draft = createDraftFromDefinition(definition, sliderDefault, sliderMin, sliderMax);
        applyDraftToInputs();
        updateSubmitDisabled();
      }
    } else if (palette.furniture.length === 0 && mode !== 'create') {
      mode = 'create';
      editingId = null;
      lastEditedId = null;
      draft = createEmptyDraft(sliderDefault);
      clearStatus();
      applyDraftToInputs();
      updateModeChip();
      updateIdDisplay();
      updateSubmitLabel();
      updateSubmitDisabled();
    }
  });
  cleanupFns.push(removePaletteListener);

  return {
    destroy() {
      cleanupFns.forEach((fn) => fn());
    }
  };

  function refreshExistingOptions() {
    const items = palette.furniture;
    existingSelect.innerHTML = '';

    if (!items.length) {
      existingSelect.disabled = true;
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'No furniture prototypes yet';
      placeholder.disabled = true;
      placeholder.selected = true;
      existingSelect.appendChild(placeholder);
      return;
    }

    existingSelect.disabled = false;
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name ?? item.id;
      existingSelect.appendChild(option);
    });

    const targetId = (mode === 'edit' ? editingId : lastEditedId) ?? items[0].id;
    if (targetId && items.some((item) => item.id === targetId)) {
      existingSelect.value = targetId;
      if (mode !== 'edit') {
        lastEditedId = targetId;
      }
    } else {
      existingSelect.value = items[0].id;
      if (mode === 'edit') {
        editingId = items[0].id;
      }
      lastEditedId = items[0].id;
    }
  }

  function applyDraftToInputs() {
    draft.color = normalizeColorHex(draft.color, DEFAULT_NEW_COLOR);
    colorInput.value = draft.color;
    colorValue.textContent = draft.color.toUpperCase();

    const height = clampHeightWithinRange(draft.height, sliderDefault, sliderMin, sliderMax);
    draft.height = height;
    heightInput.value = String(height);
    heightValue.textContent = `${height} px`;

    const shape = draft.shape || DEFAULT_SHAPE;
    draft.shape = shape;
    ensureShapeOption(shapeSelect, shape);
    shapeSelect.value = shape;

    draft.name = draft.name ?? '';
    nameInput.value = draft.name;

    draft.description = typeof draft.description === 'string' ? draft.description : '';
    descriptionInput.value = draft.description;
  }

  function updateModeChip() {
    if (mode === 'create') {
      modeChip.textContent = 'Mode: New prototype';
      modeChip.dataset.mode = 'create';
    } else {
      modeChip.textContent = 'Mode: Editing existing';
      modeChip.dataset.mode = 'edit';
    }
  }

  function updateIdDisplay() {
    idDisplay.innerHTML = '';
    if (mode === 'edit' && editingId) {
      const label = document.createElement('span');
      label.textContent = 'Furniture ID:';
      const code = document.createElement('code');
      code.textContent = editingId;
      idDisplay.append(label, code);
    } else {
      idDisplay.textContent = 'ID will be generated when you save.';
    }
  }

  function updateSubmitLabel() {
    submitButton.textContent = mode === 'create' ? 'Create furniture' : 'Save changes';
  }

  function updateSubmitDisabled() {
    submitButton.disabled = draft.name.trim().length === 0;
  }

  function setStatus(message, stateName) {
    status.textContent = message;
    if (stateName) {
      status.dataset.state = stateName;
    } else {
      delete status.dataset.state;
    }
  }

  function clearStatus() {
    setStatus('', null);
  }
}

function createEmptyDraft(defaultHeight) {
  return {
    name: '',
    color: DEFAULT_NEW_COLOR,
    height: defaultHeight,
    shape: DEFAULT_SHAPE,
    description: ''
  };
}

function createDraftFromDefinition(definition, defaultHeight, minHeight, maxHeight) {
  if (!definition) {
    return createEmptyDraft(defaultHeight);
  }

  return {
    name: typeof definition.name === 'string' ? definition.name : '',
    color: normalizeColorHex(definition.color, DEFAULT_NEW_COLOR),
    height: clampHeightWithinRange(definition.height, defaultHeight, minHeight, maxHeight),
    shape: definition.shape || DEFAULT_SHAPE,
    description: typeof definition.description === 'string' ? definition.description : ''
  };
}

function clampHeightWithinRange(value, fallback, min, max) {
  const numeric = Number.isFinite(value) ? value : Number.parseFloat(value);
  const safeFallback = Number.isFinite(fallback) ? fallback : Math.round((min + max) / 2);
  const base = Number.isFinite(numeric) ? numeric : safeFallback;
  const rounded = Math.round(base);
  return Math.max(min, Math.min(max, rounded));
}

function normalizeColorHex(value, fallback = DEFAULT_NEW_COLOR) {
  const candidate = parseColorHex(value);
  if (candidate) {
    return candidate;
  }

  const fallbackCandidate = parseColorHex(fallback);
  if (fallbackCandidate) {
    return fallbackCandidate;
  }

  return DEFAULT_NEW_COLOR;
}

function parseColorHex(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (HEX_SIX.test(trimmed)) {
    return `#${trimmed.slice(1).toLowerCase()}`;
  }

  if (HEX_THREE.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return null;
}

function ensureShapeOption(select, shapeId) {
  if (!shapeId) {
    return;
  }

  const exists = Array.from(select.options).some((option) => option.value === shapeId);
  if (exists) {
    return;
  }

  const option = document.createElement('option');
  option.value = shapeId;
  option.textContent = `Custom (${shapeId})`;
  select.appendChild(option);
}

function generateUniqueId(name, existingIds) {
  const taken = new Set(existingIds);
  const base = slugifyName(name) || 'custom-item';
  let candidate = base;
  let suffix = 2;

  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function slugifyName(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
