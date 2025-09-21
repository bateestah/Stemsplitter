import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.game.events.emit('scene-transition', this.scene.key);
    this.scene.start('PreloadScene');
  }
}
