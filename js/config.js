export const GAME_SPEED = 0.8;

export function speed(value) {
  return value * GAME_SPEED;
}

export function timer(frames) {
  return Math.round(frames / GAME_SPEED);
}
