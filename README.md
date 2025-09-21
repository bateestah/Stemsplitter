# Stemsplitter Plaza

An isometric room-building sandbox inspired by the classic Habbo Hotel look and feel. This project focuses on providing a clean skeleton that demonstrates how an isometric grid, tile placement, and simple furniture rendering can work inside a modern browser with vanilla JavaScript.

## Features

- 🎨 **Isometric floor renderer** – draws a diamond grid with multiple floor swatches.
- 🪑 **Basic furnishing system** – place or replace colourful voxel-style furniture blocks.
- 🧹 **Utility tools** – clear tiles with the broom and toggle the grid overlay.
- 🧭 **Inspector HUD** – surface details about the hovered tile including floor and furniture types.

## Getting started

No build step is required. Open `index.html` in a modern browser and start arranging tiles. For best results, serve the directory through a simple static file server (for example `python -m http.server`) and navigate to `http://localhost:8000`.

## Extending the skeleton

- Add more floor textures or item definitions in `src/main.js` to expand the palette.
- Implement avatar sprites or multi-tile furniture by extending `Room` and the `IsometricRenderer`.
- Persist user creations by serializing the `Room` state via the provided `serialize()` helper.

This foundation is intentionally lightweight to stay framework-agnostic and easy to extend.
