import Phaser from 'phaser';

import './style.css';
import { BootScene } from '@game/scenes/BootScene';
import { MainScene } from '@game/scenes/MainScene';
import { PreloadScene } from '@game/scenes/PreloadScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: 'game-root',
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  scene: [BootScene, PreloadScene, MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

const game = new Phaser.Game(config);

export default game;
