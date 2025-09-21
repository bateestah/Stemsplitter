# Stemsplitter Room Builder

A lightweight isometric room-building sandbox inspired by classic Habbo Hotel spaces. The project focuses on providing a clean foundation for experimenting with isometric rendering, grid interactions, and UI layout without any external build tooling.

## Features

- **Isometric renderer** that draws layered floors, walls, and furniture primitives on an HTML canvas.
- **Room state management** with helper methods for painting floors, erecting walls, and placing decorative items.
- **Interactive toolbar** for swapping between flooring, wall, furniture, eraser, and eyedropper tools.
- **Viewport controls** with hover feedback, click-to-paint editing, right-click/middle-click panning, and scroll-wheel nudging.
- **Starter layout generator** that instantly populates the room with a demo arrangement.

## Getting started

No build step is required. Simply open `index.html` in any modern browser to launch the experience.

If you prefer to run a local development server (recommended for live reload in some editors), start a basic static server from the project root:

```bash
python3 -m http.server 4173
```

Then navigate to `http://localhost:4173`.

## Controls

- **Left click**: Paint with the currently selected tool.
- **Right click or middle click + drag**: Pan the camera.
- **Mouse wheel / trackpad scroll**: Pan the camera incrementally.
- **Eyedropper tool**: Sample the floor, wall, or furniture style underneath the cursor.

## Project structure

```
├── index.html          # Entry point that wires styles and modules
├── styles.css          # Retro-inspired UI styling
├── src/
│   ├── main.js         # App bootstrap
│   ├── app/
│   │   └── RoomBuilderApp.js
│   ├── engine/
│   │   ├── IsometricRenderer.js
│   │   └── ViewportControls.js
│   ├── state/
│   │   ├── RoomState.js
│   │   └── palettes.js
│   ├── ui/
│   │   ├── InfoPanel.js
│   │   └── Toolbar.js
│   └── utils/
│       └── geometry.js
└── README.md
```

Use this foundation as a stepping stone for adding avatars, tile height variations, networking, or any other Habbo-style features.
