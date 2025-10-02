const FACING_FRONT = ['right', 'left', 'left', 'right'];
const BASE_TRANSLATE_Y = 0;
const SIT_TRANSLATE_Y = -6;

const WALK_STEPS = [
  { legSwing: -1.2, armSwing: 1, bob: -0.8, sway: -0.6 },
  { legSwing: -0.2, armSwing: 0.2, bob: -1.3, sway: 0 },
  { legSwing: 1.2, armSwing: -1, bob: -0.8, sway: 0.6 },
  { legSwing: -0.2, armSwing: 0.2, bob: -1.1, sway: 0 }
];

const IDLE_POSE = { legSwing: 0, armSwing: 0, bob: -0.3, sway: 0 };

const SHADOW_COLOR = 'rgba(8, 12, 34, 0.32)';

const bodyOptions = [
  createBodyOption('fair', 'Sunlit complexion', '#f7c9b2'),
  createBodyOption('warm', 'Warm amber complexion', '#dba389'),
  createBodyOption('rich', 'Deep cocoa complexion', '#9c5f3d')
];

const clothingOptions = [
  createClothingOption('indigo', 'Indigo streetwear', '#5b64f2', '#424ac4', '#f2f3ff'),
  createClothingOption('ember', 'Ember jumper', '#ff7f5b', '#d55438', '#ffe6d8'),
  createClothingOption('forest', 'Forest parka', '#4ba074', '#2f6b4b', '#dff7e9')
];

const hairOptions = [
  createHairOption('violet', 'Violet bob', '#5d3db5', '#8d6bff'),
  createHairOption('copper', 'Copper curls', '#b36b3c', '#f5a15c'),
  createHairOption('midnight', 'Midnight swoop', '#2f3c6f', '#6a8cff')
];

const shadowLayer = {
  id: 'shadow',
  name: 'Ground Shadow',
  drawOrder: 0,
  defaultOptionId: 'default',
  animations: createShadowAnimations()
};

const bodyLayer = {
  id: 'body',
  name: 'Body',
  drawOrder: 1,
  defaultOptionId: bodyOptions[0].id,
  options: bodyOptions
};

const clothingLayer = {
  id: 'clothing',
  name: 'Clothing',
  drawOrder: 2,
  defaultOptionId: clothingOptions[0].id,
  options: clothingOptions
};

const hairLayer = {
  id: 'hair',
  name: 'Hair',
  drawOrder: 3,
  defaultOptionId: hairOptions[0].id,
  options: hairOptions
};

const layers = [shadowLayer, bodyLayer, clothingLayer, hairLayer];

export function getWardrobeLayers() {
  return layers.filter(layer => layer.options).map(layer => ({
    id: layer.id,
    name: layer.name,
    defaultOptionId: layer.defaultOptionId,
    options: layer.options.map(option => ({
      id: option.id,
      name: option.name,
      description: option.description,
      swatch: option.swatch
    }))
  }));
}

export function createDefaultAppearance() {
  const appearance = {};
  for (const layer of layers) {
    if (!layer.options) {
      continue;
    }
    appearance[layer.id] = layer.defaultOptionId;
  }
  return appearance;
}

export function clampAppearance(input) {
  const result = {};
  for (const layer of layers) {
    if (!layer.options) {
      continue;
    }
    const requested = input?.[layer.id];
    const fallback = layer.defaultOptionId;
    if (requested && getLayerOption(layer.id, requested)) {
      result[layer.id] = requested;
    } else {
      result[layer.id] = fallback;
    }
  }
  return result;
}

export function getLayerDefinition(id) {
  return layers.find(layer => layer.id === id) ?? null;
}

export function getLayerOption(layerId, optionId) {
  const layer = getLayerDefinition(layerId);
  if (!layer || !layer.options) {
    return null;
  }
  return layer.options.find(option => option.id === optionId) ?? null;
}

export function getLayerFrame(layerId, optionId, animation, facing, progress) {
  const layer = getLayerDefinition(layerId);
  if (!layer) {
    return null;
  }

  const source = layer.options ? getLayerOption(layerId, optionId) ?? getLayerOption(layerId, layer.defaultOptionId) : layer;
  const sequences = source?.animations;
  if (!sequences) {
    return null;
  }

  const sequence = sequences[animation] ?? sequences.idle;
  if (!sequence) {
    return null;
  }

  const frames = sequence[facing] ?? sequence[1] ?? sequence[0];
  if (!Array.isArray(frames) || frames.length === 0) {
    return null;
  }

  const normalized = normalizeProgress(progress);
  const index = Math.floor(normalized * frames.length) % frames.length;
  return frames[index] ?? frames[0];
}

export function getDrawableLayers() {
  return [...layers].sort((a, b) => a.drawOrder - b.drawOrder);
}

function normalizeProgress(progress) {
  if (!Number.isFinite(progress)) {
    return 0;
  }
  const value = progress % 1;
  return value < 0 ? value + 1 : value;
}

function createBodyOption(id, name, skinColor) {
  const description = name;
  const palette = createSkinPalette(skinColor);
  const animations = {
    idle: buildStandingFrames([IDLE_POSE], (facing, step) => createBodyFrame(palette, facing, step)),
    walk: buildStandingFrames(WALK_STEPS, (facing, step) => createBodyFrame(palette, facing, step)),
    sit: buildSittingFrames(step => createBodySitFrame(palette, step))
  };

  return {
    id,
    name,
    description,
    swatch: [palette.highlight, palette.base, palette.shadow],
    animations
  };
}

function createClothingOption(id, name, primary, shadowBase, accent) {
  const palette = createClothingPalette(primary, shadowBase, accent);
  const description = name;
  const animations = {
    idle: buildStandingFrames([IDLE_POSE], (facing, step) => createClothingFrame(palette, facing, step)),
    walk: buildStandingFrames(WALK_STEPS, (facing, step) => createClothingFrame(palette, facing, step)),
    sit: buildSittingFrames(step => createClothingSitFrame(palette, step))
  };

  return {
    id,
    name,
    description,
    swatch: [palette.primary, palette.highlight, palette.accent],
    animations
  };
}

function createHairOption(id, name, base, highlight) {
  const palette = createHairPalette(base, highlight);
  const description = name;
  const animations = {
    idle: buildStandingFrames([IDLE_POSE], (facing, step) => createHairFrame(palette, facing, step)),
    walk: buildStandingFrames(WALK_STEPS, (facing, step) => createHairFrame(palette, facing, step)),
    sit: buildSittingFrames(step => createHairSitFrame(palette, step))
  };

  return {
    id,
    name,
    description,
    swatch: [palette.highlight, palette.base],
    animations
  };
}

function createShadowAnimations() {
  const idleFrames = buildStandingFrames([IDLE_POSE], () => createShadowFrame());
  const walkFrames = buildStandingFrames(WALK_STEPS, step => createShadowFrame(step));
  const sitFrames = buildSittingFrames(step => createShadowFrame(step));
  return {
    idle: idleFrames,
    walk: walkFrames,
    sit: sitFrames
  };
}

function buildStandingFrames(steps, factory) {
  const result = {};
  for (let facing = 0; facing < 4; facing += 1) {
    result[facing] = steps.map(step => factory(facing, step));
  }
  return result;
}

function buildSittingFrames(factory) {
  const result = {};
  for (let facing = 0; facing < 4; facing += 1) {
    result[facing] = [factory({ facing, pose: 'sit' })];
  }
  return result;
}

function createBodyFrame(palette, facing, step) {
  const geometry = computeStandingPose(step);
  const front = FACING_FRONT[facing] ?? 'right';
  const back = front === 'left' ? 'right' : 'left';
  const elements = [];

  const legs = {
    left: geometry.leftLeg,
    right: geometry.rightLeg
  };

  const arms = {
    left: geometry.leftArm,
    right: geometry.rightArm
  };

  const backLeg = legs[back];
  const frontLeg = legs[front];
  const backArm = arms[back];
  const frontArm = arms[front];

  if (backLeg) {
    elements.push(rectElement(backLeg, palette.shadow));
  }

  elements.push(rectElement(geometry.torso, palette.base));

  if (backArm) {
    elements.push(rectElement(backArm, palette.shadow));
  }

  if (frontLeg) {
    elements.push(rectElement(frontLeg, palette.base));
  }

  if (frontArm) {
    elements.push(rectElement(frontArm, palette.highlight));
  }

  elements.push(ellipseElement(geometry.head.cx, geometry.head.cy, geometry.head.rx, geometry.head.ry, palette.highlight, palette.outline, 0.8));

  const eyeY = geometry.head.cy - geometry.head.ry * 0.2;
  const eyeWidth = 1.8;
  const eyeHeight = 1.6;
  elements.push(rectElement({ x: -3.2, y: eyeY, width: eyeWidth, height: eyeHeight }, '#1e223d'));
  elements.push(rectElement({ x: 1.4, y: eyeY, width: eyeWidth, height: eyeHeight }, '#1e223d'));

  const mouthY = geometry.head.cy + geometry.head.ry * 0.3;
  elements.push(rectElement({ x: -2.5, y: mouthY, width: 5, height: 1.2 }, palette.mouth));

  return {
    translate: geometry.translate,
    elements
  };
}

function createBodySitFrame(palette, step) {
  const geometry = computeSittingPose();
  const elements = [];
  elements.push(rectElement(geometry.leftLeg, palette.shadow));
  elements.push(rectElement(geometry.rightLeg, palette.base));
  elements.push(rectElement(geometry.torso, palette.base));
  elements.push(rectElement(geometry.leftArm, palette.shadow));
  elements.push(rectElement(geometry.rightArm, palette.highlight));
  elements.push(ellipseElement(geometry.head.cx, geometry.head.cy, geometry.head.rx, geometry.head.ry, palette.highlight, palette.outline, 0.8));

  const eyeY = geometry.head.cy - geometry.head.ry * 0.2;
  elements.push(rectElement({ x: -2.8, y: eyeY, width: 1.6, height: 1.4 }, '#1e223d'));
  elements.push(rectElement({ x: 1.2, y: eyeY, width: 1.6, height: 1.4 }, '#1e223d'));
  const mouthY = geometry.head.cy + geometry.head.ry * 0.3;
  elements.push(rectElement({ x: -2.2, y: mouthY, width: 4.4, height: 1.2 }, palette.mouth));

  return {
    translate: geometry.translate,
    elements
  };
}

function createClothingFrame(palette, facing, step) {
  const geometry = computeStandingPose(step);
  const front = FACING_FRONT[facing] ?? 'right';
  const back = front === 'left' ? 'right' : 'left';
  const elements = [];

  const legs = {
    left: geometry.leftLeg,
    right: geometry.rightLeg
  };

  const backLeg = legs[back];
  const frontLeg = legs[front];
  if (backLeg) {
    const rect = expandRect(backLeg, -0.6, 0);
    elements.push(rectElement(rect, palette.shadow));
    elements.push(ellipseElement(backLeg.x + backLeg.width / 2, geometry.feet[back].cy, 4.2, 2.1, palette.shoeShadow));
  }

  const torso = expandRect(geometry.torso, -0.8, -1.2);
  elements.push(rectElement(torso, palette.primary));

  const chest = {
    x: torso.x,
    y: torso.y,
    width: torso.width,
    height: torso.height * 0.42
  };
  elements.push(rectElement(chest, palette.highlight));

  const belt = {
    x: torso.x,
    y: torso.y + torso.height - 4,
    width: torso.width,
    height: 4
  };
  elements.push(rectElement(belt, palette.accent));

  if (frontLeg) {
    const rect = expandRect(frontLeg, -0.6, 0);
    elements.push(rectElement(rect, palette.primary));
    elements.push(ellipseElement(frontLeg.x + frontLeg.width / 2, geometry.feet[front].cy, 4.4, 2.2, palette.shoe));
  }

  return {
    translate: geometry.translate,
    elements
  };
}

function createClothingSitFrame(palette, step) {
  const geometry = computeSittingPose();
  const elements = [];
  const torso = expandRect(geometry.torso, -0.6, -1);
  elements.push(rectElement(torso, palette.primary));
  elements.push(rectElement({ x: torso.x, y: torso.y, width: torso.width, height: torso.height * 0.4 }, palette.highlight));

  const leftLeg = expandRect(geometry.leftLeg, -0.6, 0);
  const rightLeg = expandRect(geometry.rightLeg, -0.6, 0);
  elements.push(rectElement(leftLeg, palette.shadow));
  elements.push(rectElement(rightLeg, palette.primary));
  elements.push(ellipseElement(geometry.feet.left.cx, geometry.feet.left.cy, 4.2, 2.1, palette.shoeShadow));
  elements.push(ellipseElement(geometry.feet.right.cx, geometry.feet.right.cy, 4.2, 2.1, palette.shoe));

  const scarf = {
    x: torso.x + 2,
    y: torso.y + torso.height * 0.25,
    width: torso.width - 4,
    height: 5
  };
  elements.push(rectElement(scarf, palette.accent));

  return {
    translate: geometry.translate,
    elements
  };
}

function createHairFrame(palette, facing, step) {
  const geometry = computeStandingPose(step);
  const sway = step?.sway ?? 0;
  const translate = {
    x: geometry.translate.x + sway * 0.3,
    y: geometry.translate.y
  };

  const front = FACING_FRONT[facing] ?? 'right';
  const back = front === 'left' ? 'right' : 'left';

  const elements = [];
  const cap = ellipseElement(geometry.head.cx, geometry.head.cy - 2.4, geometry.head.rx + 2.4, geometry.head.ry, palette.shadow);
  const fringe = rectElement({ x: -geometry.head.rx, y: geometry.head.cy - geometry.head.ry * 0.2, width: geometry.head.rx * 2, height: 4.2 }, palette.base);
  const highlight = ellipseElement(geometry.head.cx + (front === 'left' ? -2.2 : 2.2), geometry.head.cy - geometry.head.ry * 0.8, geometry.head.rx * 0.7, geometry.head.ry * 0.5, palette.highlight);

  if (back === 'left') {
    elements.push(cap);
  }

  elements.push(fringe);
  elements.push(highlight);

  if (back === 'right') {
    elements.unshift(cap);
  }

  return {
    translate,
    elements
  };
}

function createHairSitFrame(palette, step) {
  const geometry = computeSittingPose();
  const cap = ellipseElement(geometry.head.cx, geometry.head.cy - 2.4, geometry.head.rx + 2.2, geometry.head.ry, palette.shadow);
  const fringe = rectElement({ x: -geometry.head.rx, y: geometry.head.cy - geometry.head.ry * 0.2, width: geometry.head.rx * 2, height: 4 }, palette.base);
  const highlight = ellipseElement(geometry.head.cx + 1.8, geometry.head.cy - geometry.head.ry * 0.8, geometry.head.rx * 0.6, geometry.head.ry * 0.45, palette.highlight);
  return {
    translate: geometry.translate,
    elements: [cap, fringe, highlight]
  };
}

function createShadowFrame(step) {
  const base = step?.pose === 'sit' ? 12 : 14;
  const spread = base + Math.abs(step?.legSwing ?? 0) * 0.35;
  const offsetY = step?.pose === 'sit' ? -1 : -2;
  return {
    translate: { x: 0, y: offsetY },
    elements: [
      ellipseElement(0, 0, spread, 5.6, SHADOW_COLOR)
    ]
  };
}

function computeStandingPose(step = {}) {
  const legSwing = step?.legSwing ?? 0;
  const armSwing = step?.armSwing ?? 0;
  const sway = step?.sway ?? 0;
  const bob = step?.bob ?? 0;

  const legHeight = 22;
  const legWidth = 6;
  const leftLeg = {
    x: -8 - legSwing * 0.9,
    y: -legHeight,
    width: legWidth,
    height: legHeight
  };
  const rightLeg = {
    x: 2 + legSwing * 0.9,
    y: -legHeight,
    width: legWidth,
    height: legHeight
  };

  const torsoHeight = 24;
  const torsoWidth = 18;
  const torso = {
    x: -torsoWidth / 2,
    y: -legHeight - torsoHeight,
    width: torsoWidth,
    height: torsoHeight
  };

  const armHeight = 18;
  const armWidth = 4;
  const armTop = torso.y + 4;

  const leftArm = {
    x: torso.x - armWidth - 2 - armSwing * 0.8,
    y: armTop,
    width: armWidth,
    height: armHeight
  };

  const rightArm = {
    x: torso.x + torso.width + 2 + armSwing * 0.8,
    y: armTop,
    width: armWidth,
    height: armHeight
  };

  const head = {
    cx: 0,
    cy: torso.y - 10,
    rx: 7.2,
    ry: 9
  };

  const feet = {
    left: { cx: leftLeg.x + leftLeg.width / 2, cy: -1.2 },
    right: { cx: rightLeg.x + rightLeg.width / 2, cy: -1.2 }
  };

  return {
    translate: { x: sway * 0.5, y: BASE_TRANSLATE_Y + bob },
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torso,
    head,
    feet
  };
}

function computeSittingPose() {
  const legHeight = 14;
  const legWidth = 10;
  const leftLeg = {
    x: -legWidth - 2,
    y: -legHeight,
    width: legWidth,
    height: legHeight
  };
  const rightLeg = {
    x: 2,
    y: -legHeight,
    width: legWidth,
    height: legHeight
  };

  const torsoWidth = 20;
  const torsoHeight = 20;
  const torso = {
    x: -torsoWidth / 2,
    y: -legHeight - torsoHeight,
    width: torsoWidth,
    height: torsoHeight
  };

  const armWidth = 4;
  const armHeight = 16;
  const leftArm = {
    x: torso.x - armWidth - 1,
    y: torso.y + 6,
    width: armWidth,
    height: armHeight
  };
  const rightArm = {
    x: torso.x + torso.width + 1,
    y: torso.y + 6,
    width: armWidth,
    height: armHeight
  };

  const head = {
    cx: 0,
    cy: torso.y - 9,
    rx: 7,
    ry: 8.6
  };

  const feet = {
    left: { cx: leftLeg.x + leftLeg.width - 1, cy: -2 },
    right: { cx: rightLeg.x + 1, cy: -2 }
  };

  return {
    translate: { x: 0, y: SIT_TRANSLATE_Y },
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torso,
    head,
    feet
  };
}

function rectElement(rect, fill, stroke, strokeWidth = 0) {
  return {
    type: 'rect',
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    radius: rect.radius ?? 0,
    fill,
    stroke,
    strokeWidth
  };
}

function ellipseElement(cx, cy, rx, ry, fill, stroke, strokeWidth = 0) {
  return {
    type: 'ellipse',
    cx,
    cy,
    rx,
    ry,
    fill,
    stroke,
    strokeWidth
  };
}

function expandRect(rect, insetX, insetY) {
  const x = rect.x + insetX;
  const y = rect.y + insetY;
  const width = rect.width - insetX * 2;
  const height = rect.height - insetY * 2;
  return { x, y, width, height };
}

function createSkinPalette(base) {
  return {
    base,
    highlight: shadeColor(base, 0.12),
    shadow: shadeColor(base, -0.12),
    outline: shadeColor(base, -0.45),
    mouth: shadeColor(base, -0.25)
  };
}

function createClothingPalette(primary, shadowBase, accent) {
  return {
    primary,
    highlight: shadeColor(primary, 0.22),
    shadow: shadeColor(shadowBase, -0.1),
    accent,
    shoe: shadeColor(primary, -0.35),
    shoeShadow: shadeColor(shadowBase, -0.45)
  };
}

function createHairPalette(base, highlight) {
  return {
    base,
    highlight,
    shadow: shadeColor(base, -0.2)
  };
}

function shadeColor(hex, percent) {
  if (!hex) {
    return '#000000';
  }

  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }

  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const newR = Math.round((t - r) * p) + r;
  const newG = Math.round((t - g) * p) + g;
  const newB = Math.round((t - b) * p) + b;

  return `#${componentToHex(newR)}${componentToHex(newG)}${componentToHex(newB)}`;
}

function componentToHex(value) {
  const clamped = Math.max(0, Math.min(255, value));
  return clamped.toString(16).padStart(2, '0');
}
