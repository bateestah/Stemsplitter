import {
  palette,
  furnitureShapes,
  addFurnitureDefinition,
  updateFurnitureDefinition,
  onPaletteChange,
  findPaletteItem
} from '../game/palette.js';

const DEFAULT_NEW_PIECE = {
  name: 'Custom Lounge Seat',
  description: 'Dream up a fresh piece and drop it into your suite.',
  color: '#c9c3ff',
  height: 48,
  shape: 'block'
};

const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

export function createFurnitureStudio(root, state) {
  if (!root) {
    return null;
  }

  root.classList.add('furniture-studio');

  const shapeOptions = furnitureShapes
    .map(({ id, label }) => `<option value="${id}">${label}</option>`)
    .join('');

  root.innerHTML = `
    <div class="studio-toolbar">
      <label class="studio-select-field">
        <span class="studio-label">Edit existing piece</span>
        <select class="studio-select" data-role="existing-select"></select>
      </label>
      <button type="button" class="studio-secondary studio-new" data-role="new-button">Start from blank</button>
    </div>
    <form class="studio-form" novalidate>
      <div class="studio-meta" data-role="mode-label">Editing existing piece</div>
      <div class="studio-meta-id" data-role="current-id">ID: —</div>
      <div class="studio-field">
        <label class="studio-field-label">
          <span class="studio-label">Furniture name</span>
          <input type="text" maxlength="48" class="studio-input" data-role="name" required />
        </label>
      </div>
      <div class="studio-field">
        <label class="studio-field-label">
          <span class="studio-label">Description</span>
          <textarea class="studio-input studio-textarea" rows="3" data-role="description"></textarea>
        </label>
      </div>
      <div class="studio-field studio-color-field">
        <span class="studio-label">Color</span>
        <div class="studio-color-controls">
          <input type="color" class="studio-color-picker" data-role="color-picker" aria-label="Pick furniture color" />
          <input
            type="text"
            class="studio-input studio-color-hex"
            data-role="color-hex"
            maxlength="7"
            placeholder="#aabbcc"
            aria-label="Hex color"
          />
        </div>
      </div>
      <div class="studio-field studio-height-field">
        <label class="studio-field-label">
          <span class="studio-label">Height</span>
          <input
            type="number"
            min="8"
            max="160"
            step="1"
            class="studio-input"
            data-role="height"
            required
          />
        </label>
        <div class="studio-meter" data-role="height-value">48 px tall</div>
      </div>
      <div class="studio-field studio-shape-field">
        <label class="studio-field-label">
          <span class="studio-label">Shape preset</span>
          <select class="studio-select" data-role="shape">${shapeOptions}</select>
        </label>
        <p class="studio-hint" data-role="shape-hint"></p>
      </div>
      <div class="studio-actions">
        <button type="submit" class="studio-primary" data-role="save">Save changes</button>
        <button type="button" class="studio-secondary" data-role="add">Add to palette</button>
      </div>
    </form>
    <p class="studio-help">
      Tip: Use “Save changes” to update the selected piece or “Add to palette” to duplicate your tweaks as a brand new item.
    </p>
    <div class="studio-feedback" data-role="status" role="status" aria-live="polite"></div>
  `;

  const existingSelect = root.querySelector('[data-role="existing-select"]');
  const newButton = root.querySelector('[data-role="new-button"]');
  const modeLabel = root.querySelector('[data-role="mode-label"]');
  const idLabel = root.querySelector('[data-role="current-id"]');
  const nameInput = root.querySelector('[data-role="name"]');
  const descriptionInput = root.querySelector('[data-role="description"]');
  const colorPicker = root.querySelector('[data-role="color-picker"]');
  const colorHexInput = root.querySelector('[data-role="color-hex"]');
  const heightInput = root.querySelector('[data-role="height"]');
  const heightValue = root.querySelector('[data-role="height-value"]');
  const shapeSelect = root.querySelector('[data-role="shape"]');
  const shapeHint = root.querySelector('[data-role="shape-hint"]');
  const saveButton = root.querySelector('[data-role="save"]');
  const addButton = root.querySelector('[data-role="add"]');
  const statusArea = root.querySelector('[data-role="status"]');

  const shapesById = new Map(furnitureShapes.map((shape) => [shape.id, shape]));

  let editingId = null;
  updateSelectOptions();

  if (palette.furniture.length > 0) {
    loadExistingDefinition(palette.furniture[0].id);
  } else {
    switchToNew(DEFAULT_NEW_PIECE);
  }

  existingSelect.addEventListener('change', () => {
    const selectedId = existingSelect.value;
    if (!selectedId) {
      switchToNew(DEFAULT_NEW_PIECE);
      return;
    }

    loadExistingDefinition(selectedId);
  });

  newButton.addEventListener('click', () => {
    switchToNew({ ...DEFAULT_NEW_PIECE, name: suggestUniqueName() });
    existingSelect.value = '';
  });

  heightInput.addEventListener('input', () => {
    const value = normalizeHeight(heightInput.value);
    heightValue.textContent = `${value} px tall`;
  });

  shapeSelect.addEventListener('change', updateShapeHint);

  colorPicker.addEventListener('input', () => {
    const normalized = toValidColor(colorPicker.value);
    colorPicker.value = normalized;
    colorHexInput.value = normalized.toUpperCase();
  });

  colorHexInput.addEventListener('input', () => {
    const normalized = tryParseColor(colorHexInput.value);
    if (normalized) {
      colorPicker.value = normalized;
      colorHexInput.value = normalized.toUpperCase();
    }
  });

  colorHexInput.addEventListener('blur', () => {
    const normalized = tryParseColor(colorHexInput.value) ?? toValidColor(colorPicker.value);
    colorPicker.value = normalized;
    colorHexInput.value = normalized.toUpperCase();
  });

  const form = root.querySelector('.studio-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSave();
  });

  addButton.addEventListener('click', (event) => {
    event.preventDefault();
    handleAdd();
  });

  const unsubscribePalette = onPaletteChange(() => {
    updateSelectOptions();
    if (editingId) {
      const current = findPaletteItem('furniture', editingId);
      if (current) {
        fillForm(current);
      }
    }
  });

  updateShapeHint();

  return {
    destroy() {
      unsubscribePalette();
    }
  };

  function handleSave() {
    if (!editingId) {
      setStatus('Select a furniture piece to update, or add it as a new entry instead.', 'warning');
      return;
    }

    const payload = collectFormValues();
    const updated = updateFurnitureDefinition(editingId, payload);
    if (!updated) {
      setStatus('Something went wrong while saving your changes.', 'error');
      return;
    }

    setStatus(`Saved updates to “${updated.name}”.`, 'success');
    state?.setSelection?.('furniture', updated.id);
    fillForm(updated);
    updateSelectOptions();
    existingSelect.value = updated.id;
  }

  function handleAdd() {
    const payload = collectFormValues();
    const created = addFurnitureDefinition(payload);
    if (!created) {
      setStatus('Unable to add the furniture to the palette.', 'error');
      return;
    }

    setStatus(`Added “${created.name}” to the palette.`, 'success');
    editingId = created.id;
    state?.setSelection?.('furniture', created.id);
    fillForm(created);
    updateSelectOptions();
    existingSelect.value = created.id;
    modeLabel.textContent = 'Editing existing piece';
    idLabel.textContent = `ID: ${created.id}`;
    saveButton.disabled = false;
  }

  function collectFormValues() {
    return {
      name: nameInput.value.trim() || DEFAULT_NEW_PIECE.name,
      description: descriptionInput.value.trim(),
      color: tryParseColor(colorHexInput.value) ?? toValidColor(colorPicker.value),
      height: normalizeHeight(heightInput.value),
      shape: shapeSelect.value
    };
  }

  function loadExistingDefinition(id) {
    const definition = findPaletteItem('furniture', id);
    if (!definition) {
      switchToNew(DEFAULT_NEW_PIECE);
      return;
    }

    editingId = id;
    modeLabel.textContent = 'Editing existing piece';
    idLabel.textContent = `ID: ${definition.id}`;
    fillForm(definition);
    existingSelect.value = definition.id;
    saveButton.disabled = false;
    setStatus('Editing an existing piece. Save to apply your adjustments.', 'info');
  }

  function switchToNew(template) {
    editingId = null;
    modeLabel.textContent = 'Designing a new piece';
    idLabel.textContent = 'ID: (new)';
    fillForm(template);
    saveButton.disabled = true;
    existingSelect.value = '';
    setStatus('Designing a fresh piece. Use “Add to palette” to store it.', 'info');
  }

  function fillForm(definition) {
    const color = toValidColor(definition?.color);
    nameInput.value = definition?.name ?? DEFAULT_NEW_PIECE.name;
    descriptionInput.value = definition?.description ?? '';
    colorPicker.value = color;
    colorHexInput.value = color.toUpperCase();
    const height = normalizeHeight(definition?.height);
    heightInput.value = height;
    heightValue.textContent = `${height} px tall`;
    shapeSelect.value = definition?.shape && shapesById.has(definition.shape)
      ? definition.shape
      : DEFAULT_NEW_PIECE.shape;
    updateShapeHint();
  }

  function updateSelectOptions() {
    const previouslySelected = existingSelect.value;

    existingSelect.innerHTML = '';
    const newOption = document.createElement('option');
    newOption.value = '';
    newOption.textContent = 'Create new furniture';
    existingSelect.appendChild(newOption);

    palette.furniture.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      existingSelect.appendChild(option);
    });

    if (editingId) {
      existingSelect.value = editingId;
    } else if (previouslySelected === '') {
      existingSelect.value = '';
    }
  }

  function updateShapeHint() {
    const selected = shapesById.get(shapeSelect.value);
    shapeHint.textContent = selected?.description ?? '';
  }

  function setStatus(message, variant = 'info') {
    statusArea.textContent = message;
    statusArea.classList.remove('is-success', 'is-error', 'is-warning');
    if (variant === 'success') {
      statusArea.classList.add('is-success');
    } else if (variant === 'error') {
      statusArea.classList.add('is-error');
    } else if (variant === 'warning') {
      statusArea.classList.add('is-warning');
    }
  }

  function normalizeHeight(value) {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return DEFAULT_NEW_PIECE.height;
    }

    return Math.max(8, Math.min(160, Math.round(numeric)));
  }

  function tryParseColor(value) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const formatted = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (HEX_COLOR_PATTERN.test(formatted)) {
      return formatted.slice(0, 7).toLowerCase();
    }

    return null;
  }

  function toValidColor(value, fallback = DEFAULT_NEW_PIECE.color) {
    return tryParseColor(value) ?? fallback;
  }

  function suggestUniqueName() {
    const base = 'Custom Piece';
    const existingNames = new Set(palette.furniture.map((item) => item.name));
    if (!existingNames.has(base)) {
      return base;
    }

    let suffix = 2;
    while (existingNames.has(`${base} ${suffix}`)) {
      suffix += 1;
    }

    return `${base} ${suffix}`;
  }
}
