/* A tiny Pac-Man-style clone (arrow-key movement + pellets).
 * Open `index.html` in a browser to play.
 */

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const messageEl = document.getElementById("message");

  const COLS = 21;
  const ROWS = 21;
  const TILE = Math.floor(canvas.width / COLS); // 24

  const PACMAN_STEP_MS = 110; // movement cadence
  const GHOST_STEP_MS = 160;

  const DIRS = [
    { dr: -1, dc: 0, key: "up", name: "up" },
    { dr: 1, dc: 0, key: "down", name: "down" },
    { dr: 0, dc: -1, key: "left", name: "left" },
    { dr: 0, dc: 1, key: "right", name: "right" },
  ];

  // 0-based tile coords.
  let grid = null; // '#': wall, '.': pellet, ' ': empty
  let pacman = null; // { r, c }
  let pacDir = null; // { dr, dc }
  let desiredDir = null; // { dr, dc }
  let ghosts = null; // [{ r, c, dir }]
  let score = 0;
  let pelletsLeft = 0;

  let running = true;
  let gameOverTimer = 0;

  function clampInt(n, min, max) {
    return Math.max(min, Math.min(max, n | 0));
  }

  function keyToDir(e) {
    switch (e.key) {
      case "ArrowUp":
        return { dr: -1, dc: 0 };
      case "ArrowDown":
        return { dr: 1, dc: 0 };
      case "ArrowLeft":
        return { dr: 0, dc: -1 };
      case "ArrowRight":
        return { dr: 0, dc: 1 };
      default:
        return null;
    }
  }

  function buildLevel() {
    // Start with pellets everywhere, then carve corridors and add walls.
    grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "."));

    // Outer walls.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) grid[r][c] = "#";
      }
    }

    function wallRect(r1, c1, r2, c2) {
      const rr1 = Math.min(r1, r2);
      const rr2 = Math.max(r1, r2);
      const cc1 = Math.min(c1, c2);
      const cc2 = Math.max(c1, c2);
      for (let r = rr1; r <= rr2; r++) {
        for (let c = cc1; c <= cc2; c++) {
          grid[r][c] = "#";
        }
      }
    }

    function openCell(r, c, to = ".") {
      if (grid[r]?.[c] === "#") grid[r][c] = to;
    }

    // Central maze walls.
    wallRect(2, 4, 18, 4);
    wallRect(2, 16, 18, 16);
    wallRect(4, 2, 4, 18); // row 4
    wallRect(16, 2, 16, 18); // row 16

    // Openings (so the player can move around).
    openCell(6, 4, ".");
    openCell(10, 4, ".");
    openCell(14, 4, ".");

    openCell(6, 16, ".");
    openCell(10, 16, ".");
    openCell(14, 16, ".");

    openCell(4, 10, ".");
    openCell(16, 10, ".");

    // Ghost pen walls around the middle.
    wallRect(8, 9, 8, 11); // top
    wallRect(12, 9, 12, 11); // bottom
    wallRect(9, 8, 11, 8); // left
    wallRect(9, 12, 11, 12); // right

    // Inside of ghost pen.
    for (let r = 9; r <= 11; r++) {
      for (let c = 9; c <= 11; c++) grid[r][c] = " ";
    }

    // Opening to let ghosts out (and pellets to be collected if they wander back).
    openCell(8, 10, ".");

    // Define start positions and clear their tiles.
    pacman = { r: 15, c: 10 };
    grid[pacman.r][pacman.c] = " ";

    ghosts = [{ r: 10, c: 10, dir: { dr: 0, dc: -1 } }];
    grid[ghosts[0].r][ghosts[0].c] = " ";

    // Count pellets.
    pelletsLeft = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === ".") pelletsLeft++;
      }
    }

    score = 0;
    scoreEl.textContent = String(score);
    messageEl.textContent = "Collect all pellets!";
    running = true;
    gameOverTimer = 0;

    pacDir = { dr: 0, dc: -1 };
    desiredDir = { dr: 0, dc: -1 };
  }

  function isWall(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    return grid[r][c] === "#";
  }

  function canMove(dir, r, c) {
    if (!dir) return false;
    const nr = r + dir.dr;
    const nc = c + dir.dc;
    return !isWall(nr, nc);
  }

  function oppositeDir(dir) {
    return { dr: -dir.dr, dc: -dir.dc };
  }

  function stepPacman() {
    if (!running) return;

    // Try to turn first.
    if (canMove(desiredDir, pacman.r, pacman.c)) {
      pacDir = { dr: desiredDir.dr, dc: desiredDir.dc };
    }

    // If current direction blocked, stop until a valid turn is pressed.
    if (!canMove(pacDir, pacman.r, pacman.c)) {
      pacDir = { dr: 0, dc: 0 };
    }

    if (pacDir.dr !== 0 || pacDir.dc !== 0) {
      pacman.r += pacDir.dr;
      pacman.c += pacDir.dc;

      // Eat pellet.
      if (grid[pacman.r][pacman.c] === ".") {
        grid[pacman.r][pacman.c] = " ";
        score += 10;
        pelletsLeft--;
        scoreEl.textContent = String(score);

        if (pelletsLeft <= 0) {
          running = false;
          messageEl.textContent = "You win! Press R to restart.";
          return;
        }
      }
    }

    // Collision check.
    for (const g of ghosts) {
      if (g.r === pacman.r && g.c === pacman.c) {
        running = false;
        messageEl.textContent = "Game over! Press R to restart.";
        gameOverTimer = 1.1; // seconds (for visual pause)
        return;
      }
    }
  }

  function pickGhostDir(ghost) {
    const dirs = DIRS.filter((d) => canMove(d, ghost.r, ghost.c)).map((d) => ({ dr: d.dr, dc: d.dc }));
    if (dirs.length === 0) return ghost.dir;

    // Avoid reversing direction unless it's the only option.
    const opp = oppositeDir(ghost.dir);
    const nonReverse = dirs.filter((d) => !(d.dr === opp.dr && d.dc === opp.dc));
    const choices = nonReverse.length ? nonReverse : dirs;

    // Mostly chase Pac-Man by choosing the move that reduces Manhattan distance.
    let best = choices[0];
    let bestDist = Infinity;
    for (const d of choices) {
      const nr = ghost.r + d.dr;
      const nc = ghost.c + d.dc;
      const dist = Math.abs(nr - pacman.r) + Math.abs(nc - pacman.c);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }

    // Add some randomness.
    const chase = Math.random() < 0.7;
    if (chase) return best;
    return choices[(Math.random() * choices.length) | 0];
  }

  function stepGhosts() {
    if (!running) return;

    for (const g of ghosts) {
      const nd = pickGhostDir(g);
      if (canMove(nd, g.r, g.c)) {
        g.r += nd.dr;
        g.c += nd.dc;
      }
      g.dir = nd;
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background.
    ctx.fillStyle = "#03060f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Walls and pellets.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE;
        const y = r * TILE;
        if (grid[r][c] === "#") {
          ctx.fillStyle = "#1456ff";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
        } else if (grid[r][c] === ".") {
          ctx.fillStyle = "#f5f7ff";
          const cx = x + TILE / 2;
          const cy = y + TILE / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, TILE * 0.09, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw ghost(s).
    for (const g of ghosts) {
      drawGhost(g);
    }

    // Draw pacman.
    drawPacman(pacman, pacDir);
  }

  function drawPacman(p, dir) {
    const cx = p.c * TILE + TILE / 2;
    const cy = p.r * TILE + TILE / 2;
    const r = TILE * 0.36;

    const speedAnim = (performance.now() / 110) % 1; // mouth anim varies with time
    const mouth = 0.25 + speedAnim * 0.15;

    let dirAngle = 0;
    if (dir.dc === 1) dirAngle = 0;
    else if (dir.dc === -1) dirAngle = Math.PI;
    else if (dir.dr === -1) dirAngle = -Math.PI / 2;
    else if (dir.dr === 1) dirAngle = Math.PI / 2;

    // Arc wedge: draw anticlockwise so the mouth always stays "open" in-front.
    const start = dirAngle + mouth;
    const end = dirAngle - mouth;

    ctx.fillStyle = "#ffd400";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    // Use arc to create a wedge-shaped mouth.
    ctx.arc(cx, cy, r, start, end, true);
    ctx.closePath();
    ctx.fill();

    // Eye for direction.
    const eyeOffset = TILE * 0.12;
    const dx = dir.dc !== 0 ? dir.dc : 1; // if stopped, default "looking right"
    const dy = dir.dr !== 0 ? dir.dr : 0;
    const ex = cx + dx * eyeOffset * 0.55;
    const ey = cy + dy * eyeOffset * 0.55;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.arc(ex, ey, TILE * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGhost(g) {
    const cx = g.c * TILE + TILE / 2;
    const cy = g.r * TILE + TILE / 2;
    const bodyR = TILE * 0.36;

    // Body.
    ctx.fillStyle = "#ff4a5e";
    ctx.beginPath();
    ctx.arc(cx, cy - bodyR * 0.05, bodyR, Math.PI, 0, false);
    ctx.lineTo(cx + bodyR, cy + bodyR * 0.9);
    const wiggle = TILE * 0.18;
    // Make a simple wavy bottom edge.
    const steps = 3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = cx + (t - 0.5) * (bodyR * 2);
      const y = cy + bodyR * 0.9 - (i % 2 === 0 ? 0 : wiggle);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Eyes.
    const faceY = cy - TILE * 0.08;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - TILE * 0.12, faceY, TILE * 0.09, 0, Math.PI * 2);
    ctx.arc(cx + TILE * 0.12, faceY, TILE * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Pupils offset in direction of movement.
    const pdx = g.dir.dc * TILE * 0.06;
    const pdy = g.dir.dr * TILE * 0.06;
    ctx.fillStyle = "#1b1b2a";
    ctx.beginPath();
    ctx.arc(cx - TILE * 0.12 + pdx, faceY + pdy * 0.3, TILE * 0.045, 0, Math.PI * 2);
    ctx.arc(cx + TILE * 0.12 + pdx, faceY + pdy * 0.3, TILE * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  function reset() {
    buildLevel();
  }

  window.addEventListener("keydown", (e) => {
    const dir = keyToDir(e);
    if (dir) {
      e.preventDefault();
      desiredDir = dir;
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      reset();
    }
  });

  // Main loop: fixed-step ticks for movement.
  let lastT = performance.now();
  let pacAcc = 0;
  let ghostAcc = 0;

  function loop(now) {
    const dt = now - lastT;
    lastT = now;

    if (!running) {
      // Visual pause after losing/winning; R restarts immediately anyway.
      if (gameOverTimer > 0) {
        gameOverTimer -= dt / 1000;
      }
    }

    pacAcc += dt;
    ghostAcc += dt;

    while (pacAcc >= PACMAN_STEP_MS) {
      stepPacman();
      pacAcc -= PACMAN_STEP_MS;
    }

    while (ghostAcc >= GHOST_STEP_MS) {
      stepGhosts();
      ghostAcc -= GHOST_STEP_MS;
    }

    render();
    requestAnimationFrame(loop);
  }

  // Init + start.
  reset();
  requestAnimationFrame(loop);
})();

