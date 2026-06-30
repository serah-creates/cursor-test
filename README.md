# Space Invaders

A classic arcade-style Space Invaders game built with HTML5 Canvas and vanilla JavaScript.

## Play

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Controls

| Key | Action |
|-----|--------|
| `←` / `→` or `A` / `D` | Move ship |
| `SPACE` | Shoot / Start / Restart |
| `P` | Pause |

## Features

- 5 rows of invaders with distinct colors and point values
- Progressive difficulty across levels (faster aliens, more frequent fire)
- Defensive bunkers that block bullets
- Retro synth sound effects
- Score, lives, and level tracking
- Particle explosion effects

## Scoring

| Row | Points |
|-----|--------|
| Top (magenta) | 30 |
| 2nd (red) | 20 |
| 3rd (orange) | 20 |
| 4th (blue) | 10 |
| Bottom (green) | 10 |
