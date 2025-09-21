export function isoToScreen(x, y, tileWidth, tileHeight, origin) {
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  const screenX = (x - y) * halfW + origin.x;
  const screenY = (x + y) * halfH + origin.y;
  return { x: screenX, y: screenY };
}

export function screenToIso(screenX, screenY, tileWidth, tileHeight, origin) {
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  const dx = (screenX - origin.x) / halfW;
  const dy = (screenY - origin.y) / halfH;
  const isoX = (dx + dy) / 2;
  const isoY = (dy - dx) / 2;
  return { x: isoX, y: isoY };
}

export function tilePolygon(x, y, tileWidth, tileHeight, origin) {
  const top = isoToScreen(x, y, tileWidth, tileHeight, origin);
  const right = {
    x: top.x + tileWidth / 2,
    y: top.y + tileHeight / 2,
  };
  const bottom = {
    x: top.x,
    y: top.y + tileHeight,
  };
  const left = {
    x: top.x - tileWidth / 2,
    y: top.y + tileHeight / 2,
  };
  return [top, right, bottom, left];
}

export function pointInDiamond(point, polygon) {
  const [top, right, bottom, left] = polygon;

  const area = Math.abs(
    top.x * right.y +
      right.x * bottom.y +
      bottom.x * left.y +
      left.x * top.y -
      (right.x * top.y +
        bottom.x * right.y +
        left.x * bottom.y +
        top.x * left.y)
  );

  const area1 = triangleArea(point, top, right);
  const area2 = triangleArea(point, right, bottom);
  const area3 = triangleArea(point, bottom, left);
  const area4 = triangleArea(point, left, top);

  const sum = area1 + area2 + area3 + area4;
  return Math.abs(sum - area) <= 0.5;
}

function triangleArea(p1, p2, p3) {
  return Math.abs(
    (p1.x * (p2.y - p3.y) +
      p2.x * (p3.y - p1.y) +
      p3.x * (p1.y - p2.y)) /
      2
  );
}
