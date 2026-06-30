export const GAME_SPEED = 0.8;

export function scale(value) {
  return value * GAME_SPEED;
}

export function scaleTimer(frames) {
  return Math.round(frames / GAME_SPEED);
}
