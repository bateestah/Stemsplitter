# Room Builder

Browser-based isometric room-building prototype powered by Phaser 3. This repository tracks the second milestone of the multi-step delivery plan: establishing the technical foundations that future features will build upon.

## Technical stack decisions

| Area | Choice | Rationale |
| ---- | ------ | --------- |
| Runtime | [Phaser 3.70+](https://phaser.io/phaser3) | Mature 2D engine with WebGL/Canvas fallback, rich plugin ecosystem, and robust scene lifecycle support for complex UI flows. |
| Language | TypeScript 5 (ESM) | Enables modern language features, strong typing, and aligns with Node 18+/Vite defaults. Strict mode + `noUncheckedIndexedAccess` help catch data bugs early. |
| State management | [Zustand](https://github.com/pmndrs/zustand) | Lightweight store with simple API ideal for sandbox-style editor state without boilerplate. |
| Pathfinding | [easy-star.js](https://github.com/prettymuchbryce/easystarjs) | Proven grid pathfinding solution compatible with Phaser tile maps; added now to avoid churn later. |
| Data validation | [Zod](https://github.com/colinhacks/zod) | Runtime validation for external manifests so bad content fails fast. |
| Tooling | Vite + Vitest + Playwright | Vite provides fast dev/build pipeline. Vitest (with jsdom + canvas stubs) enables unit testing without leaving Vite ecosystem. Playwright is added as a placeholder for future E2E automation. |
| Code quality | ESLint (`@typescript-eslint`), Prettier, Husky + lint-staged | Enforces consistent style, catches bugs, and guards commits with automatic formatting & lint/test runs. |

## Project structure

```
src/
  main.ts              # Game bootstrap + Phaser config
  style.css            # Basic global styling + canvas sizing
  assets/data/         # Placeholder manifests validated at load time
  game/
    scenes/            # Boot, Preload, Main placeholder scenes
    data/              # Typed contracts, DataRegistry service, translate helper
    systems/           # Reserved for simulation/logic modules
    ui/                # Reserved for UI layers
  tests/               # Vitest suites + setup for Phaser canvas mocks
```

Key configuration files:

- `tsconfig.json` / `tsconfig.node.json`: Strict compiler settings with `@game/*` alias for engine code.
- `vite.config.ts`: Adds the same alias and ensures JSON manifests are bundled as assets.
- `vitest.config.ts`: Extends Vite config, selects the jsdom environment, and applies a canvas mock via `src/tests/setupTests.ts`.
- `.eslintrc.cjs` + `.prettierrc`: Enforce linting/formatting aligned with team standards.
- `.husky/pre-commit`: Runs `npm run lint`, `npm run test`, and lint-staged formatting before commits.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start Vite dev server with hot module reload. |
| `npm run build` | Production build through Vite. |
| `npm run test` | Run Vitest in CI mode using the jsdom canvas mocks. |
| `npm run lint` | ESLint over `.ts` sources with Prettier integration. |
| `npm run typecheck` | Standalone `tsc --noEmit` verification. |
| `npm run format` | Apply Prettier to the entire repository. |

> **Note:** `npm run prepare` installs Husky hooks automatically after `npm install`.

## Data layer foundation

`DataRegistry` queues manifest loading through Phaser's loader (populated with the placeholder JSON bundled at build time), validates them with Zod, and exposes typed getters plus translation helpers. `translate(id, locale)` centralizes string lookup so future UI systems can localize easily.

`PreloadScene` is responsible for invoking the registry, ensuring core manifests load before the main gameplay scene starts. The placeholder manifests in `src/assets/data/` illustrate the structure for tiles, furniture, NPCs, and localization.

## Testing & automation

- `src/tests/game-bootstrap.test.ts` constructs a Phaser game instance and asserts the `BootScene → PreloadScene → MainScene` flow through emitted transition events.
- `.github/workflows/ci.yml` (added this step) will execute `npm ci`, `npm run lint`, `npm run test`, and `npm run build` on pushes and pull requests.

## Next steps

With the technical scaffolding in place, upcoming milestones can focus on gameplay systems (isometric renderer, editor tooling, asset ingestion) while relying on the shared registry, strict typing, and automation set up here.
