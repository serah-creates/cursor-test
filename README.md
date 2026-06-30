# ASTEROIDS

A classic arcade-style Asteroids game built with HTML5 Canvas and vanilla JavaScript.

![Asteroids](https://img.shields.io/badge/Genre-Arcade-white?style=flat-square)
![Tech](https://img.shields.io/badge/Tech-HTML5%20Canvas-green?style=flat-square)

## Play

Open `index.html` in a modern web browser, or serve the directory locally:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then navigate to `http://localhost:8080`.

## Controls

| Key | Action |
|-----|--------|
| `←` `→` or `A` `D` | Rotate ship |
| `↑` or `W` | Thrust |
| `Space` | Fire |
| `Shift` or `H` | Hyperspace (risky teleport) |
| `P` | Pause / Resume |

## Gameplay

- Destroy asteroids to score points. Large asteroids split into smaller ones when hit.
- Avoid colliding with asteroids and UFO enemy fire.
- UFOs appear periodically and shoot at your ship — destroy them for 200 points.
- Earn an extra life every 10,000 points.
- Clear all asteroids to advance to the next level (more asteroids, faster speeds).
- Your high score is saved locally in the browser.

## Scoring

| Target | Points |
|--------|--------|
| Large asteroid | 20 |
| Medium asteroid | 50 |
| Small asteroid | 100 |
| UFO | 200 |

## Project Structure

```
├── index.html       # Game page
├── css/style.css    # UI styling
└── js/
    ├── main.js      # Game loop, state, collisions
    ├── entities.js  # Ship, Asteroid, Bullet, UFO, etc.
    ├── utils.js     # Math and collision helpers
    └── audio.js     # Web Audio sound effects
```

## Features

- Authentic vector-graphics aesthetic
- Momentum-based ship physics with screen wrap-around
- Procedurally generated jagged asteroids
- Particle explosion effects
- Procedural sound effects via Web Audio API
- Local high score persistence
- Progressive difficulty across levels
