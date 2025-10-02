const FACING_KEYS = ['north-east', 'south-east', 'south-west', 'north-west'];
const FALLBACK_FACING = 'south-east';
const FALLBACK_ANIMATION = 'idle';

const BASE_POSES = {
  idle: [
    { bob: -1.4, sway: -0.25 },
    { bob: 0, sway: 0.25 }
  ],
  walk: [
    { bob: -2.6, sway: -0.6, leftLift: 2.4, rightLift: 0.6 },
    { bob: -1, sway: 0.6, leftLift: 0.6, rightLift: 2.2 },
    { bob: -2.2, sway: -0.5, leftLift: 1.8, rightLift: 0.4 },
    { bob: -0.8, sway: 0.45, leftLift: 0.4, rightLift: 1.6 }
  ],
  sit: [
    { bob: 4.4, sway: 0, leftLift: 4, rightLift: 4 },
    { bob: 4.8, sway: 0, leftLift: 4, rightLift: 4 }
  ]
};

const FACING_VARIANTS = {
  'north-east': { flipX: false, horizontalOffset: -0.4, verticalOffset: -0.5, lightShift: -0.06 },
  'south-east': { flipX: false, horizontalOffset: 0.55, verticalOffset: 0.3, lightShift: 0.08 },
  'south-west': { flipX: true, horizontalOffset: 0.55, verticalOffset: 0.3, lightShift: 0.1 },
  'north-west': { flipX: true, horizontalOffset: -0.4, verticalOffset: -0.5, lightShift: -0.02 }
};

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
  const newR = Math.round((t - r) * p) + r;
  const newG = Math.round((t - g) * p) + g;
  const newB = Math.round((t - b) * p) + b;

  return `#${componentToHex(newR)}${componentToHex(newG)}${componentToHex(newB)}`;
}

function componentToHex(value) {
  const clamped = Math.max(0, Math.min(255, value));
  return clamped.toString(16).padStart(2, '0');
}

function buildFrames(factory) {
  const facingMap = {};

  for (const facingKey of FACING_KEYS) {
    const facingVariant = FACING_VARIANTS[facingKey] ?? {};
    const animations = {};

    for (const [animationName, poses] of Object.entries(BASE_POSES)) {
      animations[animationName] = poses.map((pose, frameIndex) =>
        factory({ pose, facingKey, facingVariant, frameIndex, animationName })
      );
    }

    facingMap[facingKey] = animations;
  }

  return facingMap;
}

function buildShadowLayer() {
  const frames = buildFrames(({ facingVariant }) => {
    const rx = 10.8 - (facingVariant.verticalOffset ?? 0) * 0.5;
    const ry = 5.4 + (facingVariant.verticalOffset ?? 0) * 0.15;
    return {
      origin: { x: facingVariant.horizontalOffset ?? 0, y: 0 },
      flipX: false,
      scale: 1,
      opacity: 1,
      shapes: [
        {
          type: 'ellipse',
          cx: 0,
          cy: 2.6,
          rx,
          ry,
          fill: 'rgba(6, 10, 26, 0.4)'
        }
      ]
    };
  });

  return {
    id: 'default',
    name: 'Ground Shadow',
    description: 'Soft ellipse to anchor the avatar in the scene.',
    swatch: ['rgba(6,10,26,0.4)'],
    frames,
    drawOrder: 0
  };
}

function createBodyOptions() {
  const palettes = [
    {
      id: 'amber-glow',
      name: 'Amber Glow',
      description: 'Warm skin with rosy highlights for a sunlit vibe.',
      swatch: ['#f6c7a1', '#d38463'],
      skin: '#f6c7a1'
    },
    {
      id: 'cool-olive',
      name: 'Cool Olive',
      description: 'Earthy midtones with cool shadows for evening scenes.',
      swatch: ['#d7b49d', '#9a6f5a'],
      skin: '#d7b49d'
    },
    {
      id: 'rose-quartz',
      name: 'Rose Quartz',
      description: 'Soft pink undertones with gentle highlights.',
      swatch: ['#f7c0c4', '#db8ca2'],
      skin: '#f7c0c4'
    }
  ];

  const result = {};

  for (const palette of palettes) {
    const frames = buildFrames(({ pose, facingVariant }) => {
      const lightShift = facingVariant.lightShift ?? 0;
      const skin = palette.skin;
      const legTone = shadeColor(skin, -0.22 - lightShift * 0.4);
      const highlight = shadeColor(skin, 0.18 + lightShift * 0.6);
      const cheek = shadeColor(skin, 0.1 + lightShift * 0.3);
      const outline = shadeColor(skin, -0.35);

      const baseLegHeight = 12;
      const leftLift = Math.max(0, Math.min(baseLegHeight - 4, pose.leftLift ?? 0));
      const rightLift = Math.max(0, Math.min(baseLegHeight - 4, pose.rightLift ?? 0));
      const leftHeight = Math.max(6, baseLegHeight - leftLift);
      const rightHeight = Math.max(6, baseLegHeight - rightLift);

      return {
        origin: {
          x: (pose.sway ?? 0) + (facingVariant.horizontalOffset ?? 0),
          y: (pose.bob ?? 0) + (facingVariant.verticalOffset ?? 0)
        },
        flipX: Boolean(facingVariant.flipX),
        scale: 1,
        opacity: 1,
        shapes: [
          {
            type: 'rect',
            x: -4.6,
            y: -leftHeight,
            width: 3.4,
            height: leftHeight,
            fill: legTone,
            radius: 1.4
          },
          {
            type: 'rect',
            x: 1.2,
            y: -rightHeight,
            width: 3.4,
            height: rightHeight,
            fill: legTone,
            radius: 1.4
          },
          {
            type: 'rect',
            x: -5.4,
            y: -30,
            width: 10.8,
            height: 15.5,
            fill: skin,
            radius: 2.4
          },
          {
            type: 'rect',
            x: -3.2,
            y: -33,
            width: 6.4,
            height: 4.2,
            fill: skin,
            radius: 1.8
          },
          {
            type: 'ellipse',
            cx: 0,
            cy: -38.5,
            rx: 7.6,
            ry: 8.4,
            fill: skin,
            stroke: { color: outline, width: 0.6 }
          },
          {
            type: 'ellipse',
            cx: -2.1,
            cy: -38.2,
            rx: 0.95,
            ry: 0.95,
            fill: '#2c1d1c'
          },
          {
            type: 'ellipse',
            cx: 2.1,
            cy: -38.2,
            rx: 0.95,
            ry: 0.95,
            fill: '#2c1d1c'
          },
          {
            type: 'ellipse',
            cx: 0,
            cy: -36,
            rx: 2.8,
            ry: 1.4,
            fill: cheek,
            alpha: 0.4
          },
          {
            type: 'rect',
            x: -2.4,
            y: -33,
            width: 4.8,
            height: 0.8,
            fill: shadeColor(skin, -0.12)
          },
          {
            type: 'arc',
            cx: 0,
            cy: -34.2,
            radius: 2.5,
            startAngle: Math.PI * 0.1,
            endAngle: Math.PI - Math.PI * 0.1,
            stroke: { color: shadeColor(skin, -0.22), width: 0.7 },
            lineCap: 'round'
          },
          {
            type: 'ellipse',
            cx: -1.8,
            cy: -40.1,
            rx: 1.2,
            ry: 1.2,
            fill: highlight,
            alpha: 0.3
          },
          {
            type: 'ellipse',
            cx: 1.8,
            cy: -40.1,
            rx: 1.2,
            ry: 1.2,
            fill: highlight,
            alpha: 0.3
          }
        ]
      };
    });

    result[palette.id] = {
      id: palette.id,
      name: palette.name,
      description: palette.description,
      swatch: palette.swatch,
      frames,
      drawOrder: 10
    };
  }

  return result;
}

function createOutfitOptions() {
  const outfits = [
    {
      id: 'midnight-runner',
      name: 'Midnight Runner',
      description: 'Electric bomber with cobalt joggers built for neon nightscapes.',
      swatch: ['#5f6cff', '#1d214f'],
      top: '#5f6cff',
      trim: '#8ea2ff',
      accent: '#ffd27d',
      bottom: '#2d335f'
    },
    {
      id: 'sunset-chiller',
      name: 'Sunset Chiller',
      description: 'Peach hoodie paired with seafoam pants—perfect for rooftop lounging.',
      swatch: ['#ff9a7f', '#67d9c2'],
      top: '#ff9a7f',
      trim: '#ffc5b3',
      accent: '#ffe27d',
      bottom: '#67d9c2'
    },
    {
      id: 'cosmic-dream',
      name: 'Cosmic Dream',
      description: 'Starlit sweater and midnight leggings for cosmic cafe hopping.',
      swatch: ['#b58bff', '#2f2d68'],
      top: '#b58bff',
      trim: '#d7c1ff',
      accent: '#ffd9f2',
      bottom: '#2f2d68'
    }
  ];

  const result = {};

  for (const outfit of outfits) {
    const frames = buildFrames(({ pose, facingVariant }) => {
      const topShadow = shadeColor(outfit.top, -0.25);
      const topHighlight = shadeColor(outfit.top, 0.2 + (facingVariant.lightShift ?? 0) * 0.6);
      const pantHighlight = shadeColor(outfit.bottom, 0.18 + (facingVariant.lightShift ?? 0) * 0.4);
      const baseLegHeight = 12;
      const leftLift = Math.max(0, Math.min(baseLegHeight - 4, pose.leftLift ?? 0));
      const rightLift = Math.max(0, Math.min(baseLegHeight - 4, pose.rightLift ?? 0));
      const leftHeight = Math.max(6, baseLegHeight - leftLift);
      const rightHeight = Math.max(6, baseLegHeight - rightLift);

      return {
        origin: {
          x: (pose.sway ?? 0) + (facingVariant.horizontalOffset ?? 0),
          y: (pose.bob ?? 0) + (facingVariant.verticalOffset ?? 0)
        },
        flipX: Boolean(facingVariant.flipX),
        scale: 1,
        opacity: 1,
        shapes: [
          {
            type: 'rect',
            x: -5.2,
            y: -28.2,
            width: 10.4,
            height: 13.2,
            fill: outfit.top,
            radius: 2.6
          },
          {
            type: 'rect',
            x: -5.2,
            y: -27,
            width: 10.4,
            height: 2.2,
            fill: topHighlight,
            alpha: 0.45,
            radius: 2.6
          },
          {
            type: 'rect',
            x: -5.3,
            y: -15.6,
            width: 10.6,
            height: 2.2,
            fill: shadeColor(outfit.top, -0.18)
          },
          {
            type: 'rect',
            x: -4.5,
            y: -13.6,
            width: 9,
            height: 1.6,
            fill: outfit.accent,
            radius: 1.2
          },
          {
            type: 'rect',
            x: -4.8,
            y: -12,
            width: 3.2,
            height: leftHeight,
            fill: outfit.bottom,
            radius: 1.5
          },
          {
            type: 'rect',
            x: 1.6,
            y: -12,
            width: 3.2,
            height: rightHeight,
            fill: outfit.bottom,
            radius: 1.5
          },
          {
            type: 'rect',
            x: -4.6,
            y: -11.2,
            width: 2.8,
            height: Math.max(3.5, leftHeight * 0.45),
            fill: pantHighlight,
            alpha: 0.45
          },
          {
            type: 'rect',
            x: 1.8,
            y: -11.2,
            width: 2.8,
            height: Math.max(3.5, rightHeight * 0.45),
            fill: pantHighlight,
            alpha: 0.45
          },
          {
            type: 'rect',
            x: -5,
            y: -26.5,
            width: 10,
            height: 13.6,
            stroke: { color: topShadow, width: 0.9, alpha: 0.7 },
            radius: 2.8
          }
        ]
      };
    });

    result[outfit.id] = {
      id: outfit.id,
      name: outfit.name,
      description: outfit.description,
      swatch: outfit.swatch,
      frames,
      drawOrder: 20
    };
  }

  return result;
}

function createHairOptions() {
  const styles = [
    {
      id: 'violet-bob',
      name: 'Violet Bob',
      description: 'Rounded bob with lavender sheen and playful fringe.',
      swatch: ['#6c4bd4', '#bfa3ff'],
      base: '#6c4bd4'
    },
    {
      id: 'ember-fade',
      name: 'Ember Fade',
      description: 'Fiery gradients flowing back with a soft fade.',
      swatch: ['#ff845e', '#ffc27a'],
      base: '#ff845e'
    },
    {
      id: 'mint-wave',
      name: 'Mint Wave',
      description: 'Wavy undercut topped with breezy mint locks.',
      swatch: ['#4cd0aa', '#c8ffe5'],
      base: '#4cd0aa'
    }
  ];

  const result = {};

  for (const style of styles) {
    const frames = buildFrames(({ pose, facingVariant }) => {
      const base = style.base;
      const depth = shadeColor(base, -0.35);
      const highlight = shadeColor(base, 0.32 + (facingVariant.lightShift ?? 0) * 0.6);

      return {
        origin: {
          x: (pose.sway ?? 0) * 0.65 + (facingVariant.horizontalOffset ?? 0),
          y: (pose.bob ?? 0) - 0.8 + (facingVariant.verticalOffset ?? 0)
        },
        flipX: Boolean(facingVariant.flipX),
        scale: 1,
        opacity: 1,
        shapes: [
          {
            type: 'ellipse',
            cx: 0,
            cy: -40,
            rx: 8.6,
            ry: 9.6,
            fill: base,
            stroke: { color: depth, width: 0.8 }
          },
          {
            type: 'rect',
            x: -7.6,
            y: -39.5,
            width: 15.2,
            height: 8.6,
            fill: base,
            radius: 4.4
          },
          {
            type: 'rect',
            x: -6.4,
            y: -34,
            width: 12.8,
            height: 6.8,
            fill: shadeColor(base, -0.18),
            alpha: 0.75,
            radius: 3.2
          },
          {
            type: 'ellipse',
            cx: -2.4,
            cy: -42.2,
            rx: 4.2,
            ry: 2.6,
            fill: highlight,
            alpha: 0.55
          },
          {
            type: 'ellipse',
            cx: 1.6,
            cy: -41.8,
            rx: 3,
            ry: 2,
            fill: highlight,
            alpha: 0.4
          }
        ]
      };
    });

    result[style.id] = {
      id: style.id,
      name: style.name,
      description: style.description,
      swatch: style.swatch,
      frames,
      drawOrder: 30
    };
  }

  return result;
}

const LAYERS = {
  shadow: {
    drawOrder: 0,
    options: { default: buildShadowLayer() }
  },
  body: {
    drawOrder: 10,
    options: createBodyOptions()
  },
  outfit: {
    drawOrder: 20,
    options: createOutfitOptions()
  },
  hair: {
    drawOrder: 30,
    options: createHairOptions()
  }
};

export const renderLayerOrder = ['shadow', 'body', 'outfit', 'hair'];

export const defaultAppearance = {
  body: 'amber-glow',
  outfit: 'midnight-runner',
  hair: 'violet-bob'
};

export function getFacingKey(index) {
  return FACING_KEYS[index] ?? FALLBACK_FACING;
}

export function getLayerOption(layer, optionId) {
  const layerEntry = LAYERS[layer];
  if (!layerEntry) {
    return null;
  }

  const options = layerEntry.options;
  if (!options) {
    return null;
  }

  if (optionId && options[optionId]) {
    return options[optionId];
  }

  const fallback = layer === 'shadow' ? options.default : null;
  if (fallback) {
    return fallback;
  }

  const firstOption = Object.values(options)[0];
  return firstOption ?? null;
}

export function getLayerAnimationFrames(layer, optionId, facingKey, animationName) {
  const option = getLayerOption(layer, optionId);
  if (!option || !option.frames) {
    return null;
  }

  const facingFrames = option.frames[facingKey] ?? option.frames[FALLBACK_FACING] ?? Object.values(option.frames)[0];
  if (!facingFrames) {
    return null;
  }

  const frames = facingFrames[animationName] ?? facingFrames[FALLBACK_ANIMATION] ?? Object.values(facingFrames)[0];
  return frames ?? null;
}

export function getWardrobeOptions(layer) {
  const layerEntry = LAYERS[layer];
  if (!layerEntry) {
    return [];
  }

  return Object.values(layerEntry.options)
    .filter(Boolean)
    .map(({ id, name, description, swatch }) => ({ id, name, description, swatch: swatch ?? [] }));
}

export function isValidAppearanceOption(layer, optionId) {
  const layerEntry = LAYERS[layer];
  if (!layerEntry) {
    return false;
  }

  return Boolean(layerEntry.options[optionId]);
}

export function getLayerDrawOrder(layer) {
  return LAYERS[layer]?.drawOrder ?? 0;
}

export function getSupportedAnimations() {
  return Object.keys(BASE_POSES);
}

export function normalizeAnimationName(value) {
  if (typeof value !== 'string') {
    return FALLBACK_ANIMATION;
  }

  const lower = value.toLowerCase();
  return getSupportedAnimations().includes(lower) ? lower : FALLBACK_ANIMATION;
}

export function normalizeFrameProgress(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = value % 1;
  if (normalized < 0) {
    return normalized + 1;
  }
  return normalized;
}

export function getRenderLayerEntries(appearance = {}) {
  const resolved = {
    body: appearance.body ?? defaultAppearance.body,
    outfit: appearance.outfit ?? defaultAppearance.outfit,
    hair: appearance.hair ?? defaultAppearance.hair
  };

  return renderLayerOrder.map((layer) => {
    if (layer === 'shadow') {
      return { layer, option: 'default' };
    }

    return { layer, option: resolved[layer] };
  });
}
