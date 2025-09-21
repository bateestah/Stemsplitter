export function createInfoPanel(container) {
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = 'Builder Tips';
  container.appendChild(title);

  const description = document.createElement('p');
  description.textContent =
    'Sketch out floor plans, add accent walls, and drop in furniture to shape your own hangout. This is a sandbox to prototype Habbo-style rooms.';
  container.appendChild(description);

  const hint = document.createElement('div');
  hint.className = 'hint';

  const hintTitle = document.createElement('strong');
  hintTitle.textContent = 'Quick Controls';
  hint.appendChild(hintTitle);

  const list = document.createElement('ul');
  const tips = [
    'Left click to paint with the selected tool.',
    'Right click or middle click and drag to pan the room.',
    'Scroll to nudge the camera view.',
    'Pick colors and styles with the eyedropper tool.',
  ];
  tips.forEach((tip) => {
    const item = document.createElement('li');
    item.textContent = tip;
    list.appendChild(item);
  });
  hint.appendChild(list);

  container.appendChild(hint);
}
