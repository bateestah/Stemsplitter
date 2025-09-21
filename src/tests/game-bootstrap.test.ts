import Phaser from 'phaser';

import { BootScene } from '@game/scenes/BootScene';
import { MainScene } from '@game/scenes/MainScene';
import { PreloadScene } from '@game/scenes/PreloadScene';

describe('Game bootstrap', () => {
  it('transitions from Boot to Main scene', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const transitions: string[] = [];

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      width: 320,
      height: 240,
      parent: container,
      scene: [BootScene, PreloadScene, MainScene],
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      callbacks: {
        preBoot: (game) => {
          const onTransition = (key: string) => {
            transitions.push(key);
            if (key === 'MainScene') {
              game.events.off('scene-transition', onTransition);
            }
          };

          game.events.on('scene-transition', onTransition);
        }
      }
    };

    const game = new Phaser.Game(config);

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Scene transition timeout')), 2000);

      const handler = (key: string) => {
        if (key === 'MainScene') {
          window.clearTimeout(timeout);
          game.events.off('scene-transition', handler);
          resolve();
        }
      };

      game.events.on('scene-transition', handler);
    });

    expect(transitions).toEqual(['BootScene', 'PreloadScene', 'MainScene']);

    game.destroy(true);
    container.remove();
  });
});
