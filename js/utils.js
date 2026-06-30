export const TAU = Math.PI * 2;

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function wrap(value, max) {
  if (value < 0) return value + max;
  if (value >= max) return value - max;
  return value;
}

export function wrapPosition(entity, width, height) {
  entity.x = wrap(entity.x, width);
  entity.y = wrap(entity.y, height);
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

export function pointInCircle(px, py, cx, cy, radius) {
  return distance(px, py, cx, cy) < radius;
}

export function lineCircleCollision(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return pointInCircle(x1, y1, cx, cy, radius);

  let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  return pointInCircle(nearestX, nearestY, cx, cy, radius);
}

export function polygonVertices(count, radius, jaggedness = 0.3) {
  const verts = [];
  const step = TAU / count;
  for (let i = 0; i < count; i++) {
    const angle = i * step;
    const r = radius * (1 + rand(-jaggedness, jaggedness));
    verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return verts;
}

export function rotatePoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function pointInPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x, yi = verts[i].y;
    const xj = verts[j].x, yj = verts[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function circlePolygonCollision(cx, cy, radius, verts) {
  if (pointInPolygon(cx, cy, verts)) return true;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    if (lineCircleCollision(verts[i].x, verts[i].y, verts[j].x, verts[j].y, cx, cy, radius)) {
      return true;
    }
  }
  for (const v of verts) {
    if (distance(cx, cy, v.x, v.y) < radius) return true;
  }
  return false;
}
