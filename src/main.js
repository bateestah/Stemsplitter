import { RoomBuilderApp } from './app/RoomBuilderApp.js';

const root = document.getElementById('app');
if (root) {
  const app = new RoomBuilderApp(root);
  window.stemsplitter = { app };
} else {
  console.error('Failed to locate application root element.');
}
