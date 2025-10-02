const SPRITE_WIDTH = 48;
const SPRITE_HEIGHT = 56;
const SPRITE_ANCHOR_X = 24;
const SPRITE_ANCHOR_Y = 48;
const FACING_NAMES = ['northEast', 'southEast', 'southWest', 'northWest'];
const WALK_POSES = [
  { offsetX: -1.5, offsetY: -1.5 },
  { offsetX: 0, offsetY: 0 },
  { offsetX: 1.5, offsetY: -1.5 },
  { offsetX: 0, offsetY: 0 }
];
const IDLE_POSES = [
  { offsetX: 0, offsetY: 0 },
  { offsetX: 0, offsetY: -1 }
];
const SIT_POSES = [{ offsetX: 0, offsetY: 5 }];

const layerCatalog = {
  body: [],
  hair: [],
  clothing: []
};
const layerLookup = new Map();

function adjustColor(hex, amount) {
  const normalized = Math.max(-1, Math.min(1, amount));
  const color = hex.replace('#', '');
  const num = parseInt(color, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;

  const apply = value => {
    if (normalized >= 0) {
      return Math.round(value + (255 - value) * normalized);
    }
    return Math.round(value + value * normalized);
  };

  const nr = Math.max(0, Math.min(255, apply(r)));
  const ng = Math.max(0, Math.min(255, apply(g)));
  const nb = Math.max(0, Math.min(255, apply(b)));

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb
    .toString(16)
    .padStart(2, '0')}`;
}

function createCanvas(drawFn) {
  if (typeof document === 'undefined' && typeof OffscreenCanvas !== 'function') {
    return null;
  }

  const canvas = typeof document !== 'undefined'
    ? document.createElement('canvas')
    : new OffscreenCanvas(SPRITE_WIDTH, SPRITE_HEIGHT);
  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
    drawFn(ctx);
  }
  return canvas;
}

function drawBodySprite(ctx, palette, posture, facingIndex) {
  const torsoTop = posture === 'sit' ? 20 : 18;
  const torsoHeight = posture === 'sit' ? 16 : 20;
  const torsoWidth = 12;
  const torsoLeft = SPRITE_ANCHOR_X - torsoWidth / 2;
  const legLength = posture === 'sit' ? 6 : 12;
  const armLength = posture === 'sit' ? 10 : 14;
  const armWidth = 3;
  const legWidth = 4;
  const handRadius = 2;
  const isFacingEast = facingIndex === 0 || facingIndex === 1;
  const frontSide = isFacingEast ? 'right' : 'left';

  const legPositions = {
    left: SPRITE_ANCHOR_X - 5,
    right: SPRITE_ANCHOR_X + 1
  };

  const armPositions = {
    left: SPRITE_ANCHOR_X - torsoWidth / 2 - 2,
    right: SPRITE_ANCHOR_X + torsoWidth / 2 - armWidth + 2
  };

  const backLegX = frontSide === 'left' ? legPositions.right : legPositions.left;
  const frontLegX = frontSide === 'left' ? legPositions.left : legPositions.right;
  const backArmX = frontSide === 'left' ? armPositions.right : armPositions.left;
  const frontArmX = frontSide === 'left' ? armPositions.left : armPositions.right;

  const legTop = SPRITE_ANCHOR_Y - legLength;
  const armTop = torsoTop + torsoHeight / 2 - 2;

  const skinShadow = adjustColor(palette.skin, -0.18);
  const skinHighlight = adjustColor(palette.skin, 0.12);

  // legs
  ctx.fillStyle = skinShadow;
  ctx.fillRect(backLegX, legTop, legWidth, legLength);
  ctx.fillStyle = palette.skin;
  ctx.fillRect(frontLegX, legTop, legWidth, legLength);

  // torso
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.roundRect(torsoLeft, torsoTop, torsoWidth, torsoHeight, 4);
  ctx.fill();
  ctx.strokeStyle = adjustColor(palette.skin, -0.28);
  ctx.lineWidth = 1;
  ctx.stroke();

  // arms
  ctx.fillStyle = skinShadow;
  ctx.fillRect(backArmX, armTop, armWidth, armLength);
  ctx.fillStyle = palette.skin;
  ctx.fillRect(frontArmX, armTop, armWidth, armLength);

  ctx.fillStyle = skinHighlight;
  ctx.beginPath();
  ctx.arc(frontArmX + armWidth / 2, armTop + armLength + handRadius, handRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = adjustColor(palette.skin, -0.12);
  ctx.beginPath();
  ctx.arc(backArmX + armWidth / 2, armTop + armLength + handRadius, handRadius, 0, Math.PI * 2);
  ctx.fill();

  // head
  const headCenterX = SPRITE_ANCHOR_X;
  const headCenterY = torsoTop - 6;
  const headRadius = 7;
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = adjustColor(palette.skin, -0.3);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = skinHighlight;
  ctx.beginPath();
  ctx.arc(headCenterX + 2, headCenterY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  if (posture === 'sit') {
    ctx.fillStyle = skinShadow;
    const seatY = SPRITE_ANCHOR_Y - 4;
    ctx.fillRect(backLegX, seatY, legWidth, 4);
    ctx.fillStyle = palette.skin;
    ctx.fillRect(frontLegX, seatY, legWidth, 4);
  }
}

function drawClothingSprite(ctx, palette, posture, facingIndex) {
  const baseTop = posture === 'sit' ? 22 : 20;
  const baseHeight = posture === 'sit' ? 14 : 18;
  const baseWidth = 14;
  const baseLeft = SPRITE_ANCHOR_X - baseWidth / 2;
  const hemHeight = posture === 'sit' ? 4 : 6;
  const accentHeight = Math.max(3, Math.floor(baseHeight * 0.35));
  const isFacingEast = facingIndex === 0 || facingIndex === 1;
  const gradientStartX = isFacingEast ? baseLeft : baseLeft + baseWidth;
  const gradientEndX = isFacingEast ? baseLeft + baseWidth : baseLeft;

  const gradient = ctx.createLinearGradient(gradientStartX, baseTop, gradientEndX, baseTop);
  gradient.addColorStop(0, adjustColor(palette.primary, -0.25));
  gradient.addColorStop(0.5, palette.primary);
  gradient.addColorStop(1, adjustColor(palette.primary, 0.2));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(baseLeft, baseTop, baseWidth, baseHeight, 5);
  ctx.fill();

  ctx.fillStyle = adjustColor(palette.primary, -0.35);
  ctx.fillRect(baseLeft, baseTop + baseHeight - hemHeight, baseWidth, hemHeight);

  ctx.fillStyle = palette.accent;
  ctx.fillRect(baseLeft + 2, baseTop + 3, baseWidth - 4, accentHeight);

  if (palette.detail) {
    ctx.fillStyle = adjustColor(palette.detail, 0.1);
    ctx.fillRect(baseLeft + baseWidth / 2 - 1, baseTop + 1, 2, baseHeight - 2);
  }
}

function drawHairSprite(ctx, palette, posture, facingIndex) {
  const baseTop = posture === 'sit' ? 9 : 8;
  const baseHeight = posture === 'sit' ? 14 : 16;
  const baseWidth = 20;
  const baseLeft = SPRITE_ANCHOR_X - baseWidth / 2;
  const isFacingEast = facingIndex === 0 || facingIndex === 1;
  const gradientStartX = isFacingEast ? baseLeft + baseWidth : baseLeft;
  const gradientEndX = isFacingEast ? baseLeft : baseLeft + baseWidth;

  const gradient = ctx.createLinearGradient(gradientStartX, baseTop, gradientEndX, baseTop);
  gradient.addColorStop(0, adjustColor(palette.base, -0.25));
  gradient.addColorStop(0.45, palette.base);
  gradient.addColorStop(1, adjustColor(palette.base, 0.28));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(baseLeft, baseTop, baseWidth, baseHeight, 8);
  ctx.fill();

  ctx.fillStyle = adjustColor(palette.base, -0.32);
  ctx.beginPath();
  ctx.roundRect(baseLeft + 2, baseTop + baseHeight - 6, baseWidth - 4, 6, 4);
  ctx.fill();

  if (palette.highlight) {
    ctx.fillStyle = palette.highlight;
    ctx.beginPath();
    ctx.roundRect(baseLeft + 4, baseTop + 3, baseWidth / 2, 6, 3);
    ctx.fill();
  }
}

function createFramesForLayer(palette, postureFn, poses) {
  const framesByFacing = {};
  for (let facingIndex = 0; facingIndex < FACING_NAMES.length; facingIndex += 1) {
    const facingName = FACING_NAMES[facingIndex];
    const directionFactor = facingIndex >= 2 ? -1 : 1;
    const postureSprites = postureFn(facingIndex);
    framesByFacing[facingName] = poses.map(pose => ({
      image: postureSprites.image,
      width: SPRITE_WIDTH,
      height: SPRITE_HEIGHT,
      anchorX: SPRITE_ANCHOR_X,
      anchorY: SPRITE_ANCHOR_Y,
      offsetX: pose.offsetX * directionFactor,
      offsetY: pose.offsetY,
      posture: postureSprites.posture
    }));
  }
  return framesByFacing;
}

function createLayer({
  id,
  name,
  category,
  order,
  palette,
  draw
}) {
  const animations = {};
  animations.idle = createFramesForLayer(palette, facingIndex => ({
    image: createCanvas(ctx => draw(ctx, palette, 'stand', facingIndex)),
    posture: 'stand'
  }), IDLE_POSES);
  animations.walk = createFramesForLayer(palette, facingIndex => ({
    image: createCanvas(ctx => draw(ctx, palette, 'stand', facingIndex)),
    posture: 'stand'
  }), WALK_POSES);
  animations.sit = createFramesForLayer(palette, facingIndex => ({
    image: createCanvas(ctx => draw(ctx, palette, 'sit', facingIndex)),
    posture: 'sit'
  }), SIT_POSES);

  const layer = {
    id,
    name,
    category,
    order,
    palette,
    animations,
    swatch: palette.swatch ?? palette.primary ?? palette.base ?? palette.skin
  };

  layerCatalog[category].push(layer);
  layerLookup.set(id, layer);
}

const bodyPalettes = [
  { id: 'body-sunrise', name: 'Sunrise', skin: '#f4c9a5', swatch: '#f4c9a5' },
  { id: 'body-harbor', name: 'Harbor', skin: '#d89d78', swatch: '#d89d78' },
  { id: 'body-mocha', name: 'Mocha', skin: '#9c5a3a', swatch: '#9c5a3a' }
];

for (const palette of bodyPalettes) {
  createLayer({
    id: palette.id,
    name: palette.name,
    category: 'body',
    order: 0,
    palette,
    draw: drawBodySprite
  });
}

const clothingPalettes = [
  {
    id: 'clothes-astro',
    name: 'Astro Jumpsuit',
    primary: '#6772ff',
    accent: '#9aa6ff',
    detail: '#4a55dd',
    swatch: '#6772ff'
  },
  {
    id: 'clothes-melon',
    name: 'Melon Hoodie',
    primary: '#ff7a7a',
    accent: '#ffe27d',
    detail: '#ff967d',
    swatch: '#ff7a7a'
  },
  {
    id: 'clothes-lagoon',
    name: 'Lagoon Tee',
    primary: '#2ec4b6',
    accent: '#cbf3f0',
    detail: '#0b7a6a',
    swatch: '#2ec4b6'
  }
];

for (const palette of clothingPalettes) {
  createLayer({
    id: palette.id,
    name: palette.name,
    category: 'clothing',
    order: 1,
    palette,
    draw: drawClothingSprite
  });
}

const hairPalettes = [
  {
    id: 'hair-violet',
    name: 'Violet Waves',
    base: '#6f42b5',
    highlight: '#b18ce3',
    swatch: '#6f42b5'
  },
  {
    id: 'hair-ember',
    name: 'Ember Fade',
    base: '#c85c30',
    highlight: '#ffd09b',
    swatch: '#c85c30'
  },
  {
    id: 'hair-forest',
    name: 'Forest Braid',
    base: '#2f6f4f',
    highlight: '#6dd3a8',
    swatch: '#2f6f4f'
  }
];

for (const palette of hairPalettes) {
  createLayer({
    id: palette.id,
    name: palette.name,
    category: 'hair',
    order: 2,
    palette,
    draw: drawHairSprite
  });
}

function ensureAppearanceValue(appearance, category) {
  const current = appearance?.[category];
  const options = layerCatalog[category];
  if (options.length === 0) {
    return null;
  }

  const exists = options.some(option => option.id === current);
  if (exists) {
    return current;
  }

  return options[0]?.id ?? null;
}

export function getDefaultAppearance() {
  return {
    body: ensureAppearanceValue({}, 'body'),
    clothing: ensureAppearanceValue({}, 'clothing'),
    hair: ensureAppearanceValue({}, 'hair')
  };
}

export function getAppearanceOptions(category) {
  return layerCatalog[category]?.map(layer => ({
    id: layer.id,
    name: layer.name,
    swatch: layer.swatch
  })) ?? [];
}

export function getLayerDefinition(category, id) {
  const layer = layerLookup.get(id);
  if (layer && layer.category === category) {
    return layer;
  }
  return null;
}

export function resolveLayers(appearance) {
  const resolved = [];
  for (const category of ['body', 'clothing', 'hair']) {
    const id = ensureAppearanceValue(appearance, category);
    if (!id) {
      continue;
    }
    const layer = getLayerDefinition(category, id);
    if (layer) {
      resolved.push(layer);
    }
  }
  return resolved.sort((a, b) => a.order - b.order);
}

export function getAnimationFrame(layer, animation, facingIndex, progress) {
  if (!layer || !layer.animations) {
    return null;
  }
  const facingName = FACING_NAMES[facingIndex] ?? FACING_NAMES[0];
  const animationKey = animation in layer.animations ? animation : 'idle';
  const frames = layer.animations[animationKey]?.[facingName];
  if (!frames || frames.length === 0) {
    return null;
  }
  const normalized = ((progress % 1) + 1) % 1;
  const index = Math.floor(normalized * frames.length) % frames.length;
  return frames[index];
}

export const facingNames = FACING_NAMES.slice();
