const canvas = document.getElementById('testCanvas');
const ctx = canvas.getContext('2d');

const cellSize = 10;

let grid = [];
let gridX = 0;
let gridY = 0;

let activeSnake = null;
let history = [];
let autoTimer = null;

// ---------- LOAD LEVEL ----------
const params = new URLSearchParams(window.location.search);
const levelText = decodeURIComponent(params.get('level') || '');

const lines = levelText.split('\n');
gridY = lines.length;
gridX = Math.max(...lines.map(l => l.length));

grid = Array.from({ length: gridY }, (_, y) =>
  Array.from({ length: gridX }, (_, x) => Number(lines[y][x] || 0))
);

canvas.width = gridX * cellSize;
canvas.height = gridY * cellSize;

// ---------- DRAW ----------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = 'black';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
      if (grid[y][x] === 2) {
        ctx.fillStyle = 'red';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  if (activeSnake) {
    ctx.fillStyle = 'blue';
    activeSnake.body.forEach(p => {
      ctx.fillRect(p.x * cellSize, p.y * cellSize, cellSize, cellSize);
    });
  }
}

// ---------- HELPERS ----------
const dirs = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

function collectSnake(headX, headY) {
  const body = [];
  const visited = new Set();
  const stack = [{ x: headX, y: headY }];

  while (stack.length) {
    const p = stack.pop();
    const key = `${p.x},${p.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (grid[p.y][p.x] === 1) body.push(p);

    dirs.forEach(d => {
      const nx = p.x + d.dx;
      const ny = p.y + d.dy;
      if (
        nx >= 0 && ny >= 0 &&
        nx < gridX && ny < gridY &&
        (grid[ny][nx] === 1 || grid[ny][nx] === 2)
      ) {
        stack.push({ x: nx, y: ny });
      }
    });
  }

  return body;
}

function findDirection(x, y) {
  for (const d of dirs) {
    const nx = x + d.dx;
    const ny = y + d.dy;
    if (
      nx >= 0 && ny >= 0 &&
      nx < gridX && ny < gridY &&
      grid[ny][nx] === 1
    ) {
      return { dx: -d.dx, dy: -d.dy };
    }
  }
  return null;
}

function pathClear(x, y, dir) {
  let cx = x + dir.dx;
  let cy = y + dir.dy;
  while (cx >= 0 && cy >= 0 && cx < gridX && cy < gridY) {
    if (grid[cy][cx] !== 0) return false;
    cx += dir.dx;
    cy += dir.dy;
  }
  return true;
}

function findFreeSnake() {
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      if (grid[y][x] === 2) {
        const dir = findDirection(x, y);
        if (!dir) continue;
        if (!pathClear(x, y, dir)) continue;

        return {
          head: { x, y },
          body: collectSnake(x, y)
        };
      }
    }
  }
  return null;
}

// ---------- ACTIONS ----------
function removeSnake(snake) {
  history.push(JSON.parse(JSON.stringify(snake)));

  snake.body.forEach(p => {
    grid[p.y][p.x] = 0;
  });
  grid[snake.head.y][snake.head.x] = 0;
}

function restoreSnake() {
  if (history.length === 0) return;
  const snake = history.pop();

  snake.body.forEach(p => {
    grid[p.y][p.x] = 1;
  });
  grid[snake.head.y][snake.head.x] = 2;
}

// ---------- BUTTONS ----------
document.getElementById('nextBtn').addEventListener('click', () => {
  if (!activeSnake) return;

  const snake = activeSnake;
  activeSnake = null;
  removeSnake(snake);

  activeSnake = findFreeSnake();
  draw();
});

document.getElementById('prevBtn').addEventListener('click', () => {
  restoreSnake();
  activeSnake = findFreeSnake();
  draw();
});

document.getElementById('autoBtn').addEventListener('click', () => {
  const btn = document.getElementById('autoBtn');

  // ⏸ Пауза
  if (autoRunning) {
    clearInterval(autoTimer);
    autoTimer = null;
    autoRunning = false;
    btn.textContent = 'Автовперед';
    return;
  }

  // ▶ Старт
  autoRunning = true;
  btn.textContent = 'Пауза';

  autoTimer = setInterval(() => {
    const snake = findFreeSnake();

    // ❌ нема що видаляти — стоп
    if (!snake) {
      clearInterval(autoTimer);
      autoTimer = null;
      autoRunning = false;
      btn.textContent = 'Автовперед';
      activeSnake = null;
      draw();
      return;
    }

    // 🔒 атомарно: спочатку зняли активну
    activeSnake = null;

    // ❌ видалили ВСЮ змійку одразу
    removeSnake(snake);

    // 🔍 шукаємо наступну
    activeSnake = findFreeSnake();

    draw();
  }, 100);
});


// ---------- START ----------
activeSnake = findFreeSnake();
draw();

let autoRunning = false;