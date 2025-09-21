import Phaser from 'phaser';

import { translate } from '@game/data/translate';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create(): void {
    this.game.events.emit('scene-transition', this.scene.key);

    const title = translate('app.title');
    const message = translate('scene.main.welcome');

    this.add
      .text(400, 300, `${title}\n${message}`, {
        color: '#f8fafc',
        fontSize: '24px',
        align: 'center'
      })
      .setOrigin(0.5);
  }
}
