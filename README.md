# Retro Room Architect

A browser-based playground for sketching out isometric rooms in the spirit of early-2000s social hotel builders. The project focuses on delivering a clean foundation for experimenting with tile placement, furniture rotation, and palette-driven styling without committing to a specific framework.

## Features

- **Isometric canvas renderer** that draws a diamond grid, stylised floor tiles, and blocky faux-3D furniture pieces.
- **Interactive placement tools** for swapping floor finishes, placing furniture, rotating items in place, sampling existing tiles, and removing furniture with right click.
- **Habbo-inspired palette** with a handful of colourful floor patterns and furniture prototypes to expand later.
- **Modular architecture** consisting of a small state container, renderer, input controller, and vanilla DOM UI components.

## Getting started

No build tooling is required; everything runs in the browser with native ES modules.

1. Serve the repository root with any static file server. Examples:
   ```bash
   # Using Python
   python3 -m http.server 5173

   # Or with Node's built-in http server (requires Node 18+)
   npx http-server . -p 5173
   ```
2. Visit `http://localhost:5173` (or whichever port you choose).
3. Start painting tiles and placing furniture.

You can also open `index.html` directly in a modern browser, though running from a static server avoids cross-origin restrictions for future asset loading.

## Controls

- **Left click**: place the currently selected floor or furniture.
- **Right click**: remove furniture from the hovered tile.
- **Shift + click**: sample the hovered floor style and set it as the active selection.
- **R key / Rotate button**: rotate hovered furniture in place, or cycle the active furniture selection (hold Shift to rotate backward).

## Project structure

```
index.html          # Page shell and layout
styles/main.css     # Neon-tinged UI styling inspired by retro hotel builders
src/game/GameState  # Tile state, selection management, notifications
src/game/IsoRenderer# Canvas renderer for floor tiles, objects, and hover cues
src/game/InputController # Pointer + keyboard input wiring
src/game/palette    # Floor & furniture definitions with metadata
src/ui/paletteView  # Vanilla DOM palette component
src/main.js         # App bootstrap and UI wiring
```

## Next ideas

- Support multi-tile furniture with collision and footprint previews.
- Add avatars, chat bubbles, and simple walkable path previews.
- Persist rooms to localStorage or export/import JSON layouts.
- Animate ambient effects (sparkles, water, neon flickers) for livelier rooms.
