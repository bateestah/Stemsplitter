import { Room } from './room.js';
import { IsometricRenderer } from './renderer.js';

const FLOOR_TYPES = {
  void: {
    id: 'void',
    label: 'Empty',
    color: '#1b243b',
    stroke: 'rgba(0, 0, 0, 0.45)',
  },
  wood: {
    id: 'wood',
    label: 'Golden Wood',
    color: '#c7834a',
    stroke: '#8c5b33',
  },
  tile: {
    id: 'tile',
    label: 'Ice Tile',
    color: '#6f9dd5',
    stroke: '#4d74a7',
  },
  carpet: {
    id: 'carpet',
    label: 'Sunset Carpet',
    color: '#d55a92',
    stroke: '#9d3a67',
  },
  grass: {
    id: 'grass',
    label: 'Emerald Turf',
    color: '#54b36a',
    stroke: '#3e8c4d',
  },
};

const ITEM_TYPES = {
  seat: {
    id: 'seat',
    label: 'Retro Seat',
    color: '#f9b946',
    height: 34,
  },
  table: {
    id: 'table',
    label: 'Cafe Table',
    color: '#bed5f5',
    height: 26,
  },
  lamp: {
    id: 'lamp',
    label: 'Floor Lamp',
    color: '#ffe066',
    height: 54,
  },
};

const TOOL_GROUPS = [
  {
    id: 'flooring',
    buttons: [
      { id: 'floor-wood', label: 'Wood Floor', icon: '🪵', kind: 'floor', floor: 'wood' },
      { id: 'floor-tile', label: 'Ice Tile', icon: '🧊', kind: 'floor', floor: 'tile' },
      { id: 'floor-carpet', label: 'Carpet', icon: '🪄', kind: 'floor', floor: 'carpet' },
      { id: 'floor-grass', label: 'Turf', icon: '🌿', kind: 'floor', floor: 'grass' },
    ],
  },
  {
    id: 'furni',
    buttons: [
      { id: 'item-seat', label: 'Retro Seat', icon: '🪑', kind: 'item', item: 'seat' },
      { id: 'item-table', label: 'Table', icon: '🧋', kind: 'item', item: 'table' },
      { id: 'item-lamp', label: 'Lamp', icon: '💡', kind: 'item', item: 'lamp' },
    ],
  },
  {
    id: 'utility',
    buttons: [{ id: 'tool-broom', label: 'Broom', icon: '🧹', kind: 'broom' }],
  },
];

function setup() {
  const room = new Room(12, 12, { defaultFloor: 'void' });
  const canvas = document.getElementById('room-canvas');
  const stage = document.querySelector('.stage');
  if (!canvas || !stage) {
    console.error('Unable to initialize the room builder: missing canvas or stage element.');
    return;
  }
  const renderer = new IsometricRenderer(canvas, room, {
    floorDefinitions: FLOOR_TYPES,
    itemDefinitions: ITEM_TYPES,
  });
  const initialWidth = stage.clientWidth || canvas.clientWidth || canvas.width;
  const initialHeight = stage.clientHeight || canvas.clientHeight || canvas.height;
  renderer.resize(initialWidth, initialHeight);

  const state = {
    activeToolId: 'floor-wood',
    hoverTile: null,
  };

  const paletteRoots = {
    flooring: document.getElementById('floor-tools'),
    furni: document.getElementById('furni-tools'),
    utility: document.getElementById('utility-tools'),
  };

  const paletteButtons = new Map();
  const toolsById = new Map();
  TOOL_GROUPS.forEach((group) => {
    group.buttons.forEach((tool) => toolsById.set(tool.id, tool));
  });

  const hoverReadout = document.getElementById('hover-readout');
  const toolReadoutValue = document.querySelector('#tool-readout .value');
  const inspectorTile = document.getElementById('inspector-tile');
  const inspectorFloor = document.getElementById('inspector-floor');
  const inspectorItem = document.getElementById('inspector-item');
  const gridToggle = document.getElementById('toggle-grid');
  const resetButton = document.getElementById('reset-room');

  function buildPalette() {
    TOOL_GROUPS.forEach((group) => {
      const container = paletteRoots[group.id];
      if (!container) {
        return;
      }
      container.innerHTML = '';
      group.buttons.forEach((tool) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'palette-item';
        button.dataset.toolId = tool.id;
        button.title = tool.label;

        if (tool.kind === 'floor' || tool.kind === 'item') {
          const swatch = document.createElement('span');
          swatch.className = 'swatch';
          const palette = tool.kind === 'floor' ? FLOOR_TYPES : ITEM_TYPES;
          const reference = palette[tool.floor ?? tool.item];
          swatch.style.background = reference?.color ?? '#ccc';
          button.appendChild(swatch);
        } else {
          const swatch = document.createElement('span');
          swatch.className = 'swatch';
          swatch.style.background = 'linear-gradient(135deg, #ffef9c, #ffbd4a)';
          button.appendChild(swatch);
        }

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = tool.icon ? `${tool.icon} ${tool.label}` : tool.label;
        button.appendChild(label);

        button.addEventListener('click', () => setActiveTool(tool.id));

        container.appendChild(button);
        paletteButtons.set(tool.id, button);
      });
    });
  }

  function setActiveTool(toolId) {
    if (!toolsById.has(toolId)) {
      return;
    }
    const previous = paletteButtons.get(state.activeToolId);
    if (previous) {
      previous.classList.remove('active');
    }
    state.activeToolId = toolId;
    const current = paletteButtons.get(toolId);
    if (current) {
      current.classList.add('active');
    }
    updateToolReadout();
  }

  function updateToolReadout() {
    const tool = toolsById.get(state.activeToolId);
    if (toolReadoutValue) {
      toolReadoutValue.textContent = tool ? tool.label : 'None';
    }
  }

  function describeFloor(id) {
    if (!id) {
      return 'None';
    }
    const definition = FLOOR_TYPES[id];
    if (!definition) {
      return id;
    }
    if (id === 'void') {
      return 'Empty';
    }
    return definition.label;
  }

  function describeItem(item) {
    if (!item) {
      return 'None';
    }
    const definition = ITEM_TYPES[item.type];
    return definition ? definition.label : item.type;
  }

  function updateInspector() {
    if (!hoverReadout || !inspectorTile || !inspectorFloor || !inspectorItem) {
      return;
    }
    if (!state.hoverTile) {
      inspectorTile.textContent = 'None';
      inspectorFloor.textContent = '-';
      inspectorItem.textContent = '-';
      hoverReadout.textContent = 'Hover over a tile to inspect it.';
      return;
    }
    const { x, y } = state.hoverTile;
    inspectorTile.textContent = `${x}, ${y}`;
    const floorId = room.getFloor(x, y);
    inspectorFloor.textContent = describeFloor(floorId);
    const item = room.itemAt(x, y);
    inspectorItem.textContent = describeItem(item);
    hoverReadout.textContent = `Tile (${x}, ${y}) • Floor: ${describeFloor(floorId)} • Item: ${describeItem(item)}`;
  }

  function translatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || 1;
    const cssHeight = rect.height || 1;
    const ratio = renderer.pixelRatio || 1;
    const renderWidth = canvas.width / ratio;
    const renderHeight = canvas.height / ratio;
    const x = ((event.clientX - rect.left) / cssWidth) * renderWidth;
    const y = ((event.clientY - rect.top) / cssHeight) * renderHeight;
    return { x, y };
  }

  function updateHoverFromEvent(event) {
    const point = translatePointer(event);
    const tile = renderer.pickTile(point.x, point.y);
    const current = state.hoverTile;
    const changed =
      (current && tile && (current.x !== tile.x || current.y !== tile.y)) ||
      (!current && tile) ||
      (current && !tile);
    state.hoverTile = tile;
    renderer.setHoverTile(tile);
    if (changed) {
      renderer.render();
    }
    updateInspector();
  }

  function applyTool(tile) {
    const tool = toolsById.get(state.activeToolId);
    if (!tile || !tool) {
      return;
    }

    if (tool.kind === 'floor' && tool.floor) {
      room.setFloor(tile.x, tile.y, tool.floor);
    } else if (tool.kind === 'item' && tool.item) {
      const definition = ITEM_TYPES[tool.item];
      room.placeItem(tile.x, tile.y, definition);
    } else if (tool.kind === 'broom') {
      const removed = room.removeItem(tile.x, tile.y);
      if (!removed) {
        room.setFloor(tile.x, tile.y, room.defaultFloor);
      }
    }

    renderer.render();
    updateInspector();
  }

  canvas.addEventListener('mousemove', (event) => {
    updateHoverFromEvent(event);
  });

  canvas.addEventListener('mouseleave', () => {
    state.hoverTile = null;
    renderer.setHoverTile(null);
    renderer.render();
    updateInspector();
  });

  canvas.addEventListener('click', (event) => {
    updateHoverFromEvent(event);
    if (state.hoverTile) {
      applyTool(state.hoverTile);
    }
  });

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const point = translatePointer(event);
    const tile = renderer.pickTile(point.x, point.y);
    if (!tile) {
      return;
    }
    const removed = room.removeItem(tile.x, tile.y);
    if (!removed) {
      room.setFloor(tile.x, tile.y, room.defaultFloor);
    }
    state.hoverTile = tile;
    renderer.setHoverTile(tile);
    renderer.render();
    updateInspector();
  });

  if (gridToggle) {
    gridToggle.addEventListener('change', () => {
      renderer.setGridVisible(gridToggle.checked);
    });
    renderer.setGridVisible(gridToggle.checked);
  } else {
    renderer.setGridVisible(true);
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      room.clear();
      renderer.render();
      updateInspector();
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        renderer.resize(width, height);
      }
    });
    observer.observe(stage);
  } else {
    window.addEventListener('resize', () => {
      renderer.resize(stage.clientWidth, stage.clientHeight);
    });
  }

  buildPalette();
  setActiveTool(state.activeToolId);
  renderer.render();
  updateInspector();
}

window.addEventListener('DOMContentLoaded', setup);
