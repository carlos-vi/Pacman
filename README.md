# Pacman

A small Pac-Man-style game that runs in the browser, written in plain HTML, CSS and JavaScript. No dependencies and no build step.

## How to play

- Move Pac-Man with the **arrow keys**.
- Eat all the pellets to win (10 points each).
- Avoid the ghost: if it catches you, it's game over.
- Press **R** at any time to restart.

Pac-Man keeps moving in the last direction until it hits a wall, and the next turn you press is applied as soon as there is a free path in that direction.

## Running it

Open `index.html` in a browser. That's all.

If you prefer to serve it locally:

```
python -m http.server 8000
```

and open <http://localhost:8000>.

## Project structure

| File | Description |
|------|-------------|
| `index.html` | Page with the score, status message and the game canvas |
| `style.css` | Styling of the page |
| `game.js` | Game logic and rendering on a `<canvas>` |

## How it works

- The level is a 21x21 tile grid built in code (`buildLevel`): outer walls, a few corridors, and a ghost pen in the center.
- Movement runs on fixed time steps (Pac-Man every 110 ms, the ghost every 160 ms) inside a `requestAnimationFrame` loop.
- The ghost picks the direction that gets it closer to Pac-Man (Manhattan distance) about 70% of the time and a random one otherwise. It avoids reversing unless it has no other option.
- Everything is drawn directly on the canvas: walls, pellets, Pac-Man (with an animated mouth) and the ghost.

## Customizing

A few constants at the top of `game.js` are easy to tweak:

- `COLS` / `ROWS`: size of the grid.
- `PACMAN_STEP_MS` / `GHOST_STEP_MS`: speed of Pac-Man and the ghost.

The maze layout is defined in `buildLevel`, and more ghosts can be added by adding entries to the `ghosts` array.

## License

This project is released under the [MIT License](LICENSE).
