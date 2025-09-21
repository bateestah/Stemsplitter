import Phaser from 'phaser';

import { DataRegistry } from '@game/data/DataRegistry';

export class PreloadScene extends Phaser.Scene {
  private readonly dataRegistry = DataRegistry.getInstance();

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.dataRegistry.queuePreload(this.load);
  }

  create(): void {
    this.dataRegistry.initialize(this);
    this.game.events.emit('scene-transition', this.scene.key);
    this.scene.start('MainScene');
  }
}
