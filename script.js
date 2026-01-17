const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

let gridX = 30;
let gridY = 30;
let cellSize = 30;
let grid = [];
let hoveredCell = null;

// Зум та панорамування
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let dragStart = {x:0, y:0};
let dragOffsetStart = {x:0, y:0};

// Інструменти
let currentTool = 'pan';
document.querySelectorAll('.tool').forEach(tool => {
  tool.addEventListener('click', () => {
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
    tool.classList.add('active');
    currentTool = tool.dataset.tool;
    canvas.style.cursor = currentTool === 'pan' ? 'grab' : 'crosshair';
  });
});

// Ініціалізація сітки
function initGrid() {
  grid = Array.from({length: gridY}, () => Array(gridX).fill(0));

  canvas.width = gridX * cellSize;
  canvas.height = gridY * cellSize;

  scale = 1;

  const worldWidth  = gridX * cellSize;
  const worldHeight = gridY * cellSize;

  offsetX = (canvas.parentElement.clientWidth  - worldWidth  * scale) / 2;
  offsetY = (canvas.parentElement.clientHeight - worldHeight * scale) / 2;

  drawGrid();
}


let bgImage = null;
let bgEnabled = true;
let bgOpacity = 0.4;

// Малювання сітки без ліній + світлі кружки на парних координатах
function drawGrid() {
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.clearRect(-offsetX/scale, -offsetY/scale, canvas.width/scale, canvas.height/scale);

  if (bgImage && bgEnabled) {
    ctx.save();
    ctx.globalAlpha = bgOpacity;

    const cw = canvas.width;
    const ch = canvas.height;

    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = cw / ch;

    let w, h, x, y;

    if (imgRatio > canvasRatio) {
      h = ch;
      w = ch * imgRatio;
      x = (cw - w) / 2;
      y = 0;
    } else {
      w = cw;
      h = cw / imgRatio;
      x = 0;
      y = (ch - h) / 2;
    }

    ctx.setTransform(bgScale, 0, 0, bgScale, bgOffsetX, bgOffsetY);
    ctx.drawImage(bgImage, x, y, w, h);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.restore();
  }


  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      

      // Світло-сірі кружки на парних координатах
      if (x % 2 === 0 && y % 2 === 0) {
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;
        const radius = cellSize * 0.5; // маленькі кружечки
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#cccccc';
        ctx.fill();
      }

      // Малюємо клітинку якщо заповнена
      let color = null;
      if (grid[y][x] === 1) color = 'black';
      if (grid[y][x] === 2) color = 'red';
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

// Перетворення координат canvas у клітинки
function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;
  return { x: Math.floor(x / cellSize), y: Math.floor(y / cellSize) };
}

// Малювання клітинки
function paintCell(e) {
  const cell = getCellFromEvent(e);
  if (cell.x < 0 || cell.y < 0 || cell.x >= gridX || cell.y >= gridY) return;

  if (currentTool === 'black') grid[cell.y][cell.x] = 1;
  if (currentTool === 'white') grid[cell.y][cell.x] = 0;
  if (currentTool === 'red') {
    if (cell.x % 2 === 0 && cell.y % 2 === 0) {
      grid[cell.y][cell.x] = 2;
    }
  }
  drawGrid();
}

// Миша
canvas.addEventListener('mousedown', (e) => {
  if (currentTool === 'bg' && bgImage) {
    bgDragging = true;
    bgDragStart = { x: e.clientX, y: e.clientY };
    bgDragOffsetStart = { x: bgOffsetX, y: bgOffsetY };
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (currentTool === 'pan') {
    isDragging = true;
    dragStart = {x: e.clientX, y: e.clientY};
    dragOffsetStart = { x: offsetX, y: offsetY };
    bgDragOffsetStart = { x: bgOffsetX, y: bgOffsetY };
    canvas.style.cursor = 'grabbing';
  } else {
    isDragging = true;
    paintCell(e);
  }
});


canvas.addEventListener('mousemove', (e) => {
  if (bgDragging) {
    bgOffsetX = bgDragOffsetStart.x + (e.clientX - bgDragStart.x);
    bgOffsetY = bgDragOffsetStart.y + (e.clientY - bgDragStart.y);
    drawGrid();
  }

  hoveredCell = getCellFromEvent(e);
  if (!isDragging) return;
  if (currentTool === 'pan') {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    offsetX = dragOffsetStart.x + dx;
    offsetY = dragOffsetStart.y + dy;

    // 👉 рухаємо фон разом із полем
    bgOffsetX = bgDragOffsetStart.x + dx;
    bgOffsetY = bgDragOffsetStart.y + dy;

    drawGrid();
  } else {
    paintCell(e);
  }
});
canvas.addEventListener('mouseup', () => {
  bgDragging = false;
  isDragging = false;
  canvas.style.cursor = currentTool === 'pan' || currentTool === 'bg' ? 'grab' : 'crosshair';
});
canvas.addEventListener('mouseleave', () => isDragging = false);

// Зум колесом
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();

  // CTRL + колесо — масштаб фону
  if (currentTool === 'bg' && bgImage) {
    const zoomFactor = 1 + e.deltaY * -0.001;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    bgOffsetX -= (mx - bgOffsetX) * (zoomFactor - 1);
    bgOffsetY -= (my - bgOffsetY) * (zoomFactor - 1);
    bgScale *= zoomFactor;
    drawGrid();
    return;
  }

  // звичайний zoom світу
  // zoom моноліту (рука)
  const zoomFactor = 1 + e.deltaY * -0.0015;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // світ
  offsetX -= (mouseX - offsetX) * (zoomFactor - 1);
  offsetY -= (mouseY - offsetY) * (zoomFactor - 1);
  scale *= zoomFactor;

  // фон — ТОЧНО ТАК САМО
  bgOffsetX -= (mouseX - bgOffsetX) * (zoomFactor - 1);
  bgOffsetY -= (mouseY - bgOffsetY) * (zoomFactor - 1);
  bgScale *= zoomFactor;

  drawGrid();
});


// Копіювання рівня
document.getElementById('copyLevel').addEventListener('click', () => {
  const text = grid.map(row => row.join('')).join('\n');
  navigator.clipboard.writeText(text).then(() => alert('Рівень скопійовано!'));
});

// Застосування налаштувань
document.getElementById('applySettings').addEventListener('click', () => {
  gridX = parseInt(document.getElementById('gridX').value);
  gridY = parseInt(document.getElementById('gridY').value);
  cellSize = parseInt(document.getElementById('cellSize').value);

  initGrid();
  resizeCanvas();
});

// Клавіші z/x
document.addEventListener('keydown', (e) => {
  if (!hoveredCell) return;
  const {x, y} = hoveredCell;
  if (x < 0 || y < 0 || x >= gridX || y >= gridY) return;
  if (e.key === 'z') grid[y][x] = 2;
  if (e.key === 'x') grid[y][x] = 0;
  drawGrid();
});

function loadLevelFromText(text) {
  const lines = text
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return;

  const newGridY = lines.length;
  const newGridX = Math.max(...lines.map(l => l.length));

  gridX = newGridX;
  gridY = newGridY;

  document.getElementById('gridX').value = gridX;
  document.getElementById('gridY').value = gridY;

  grid = Array.from({ length: gridY }, (_, y) =>
    Array.from({ length: gridX }, (_, x) => {
      const char = lines[y][x] || '0';
      return char === '1' ? 1 : char === '2' ? 2 : 0;
    })
  );

  canvas.width = gridX * cellSize;
  canvas.height = gridY * cellSize;

  scale = 1;
  offsetX = 0;
  offsetY = 0;
  resizeCanvas();
  drawGrid();
}

document.getElementById('loadLevel').addEventListener('click', () => {
  const text = document.getElementById('levelInput').value;
  loadLevelFromText(text);
});


document.getElementById('bgImageInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.onload = () => {
    bgImage = img;
    drawGrid();
  };
  img.src = URL.createObjectURL(file);
});

document.getElementById('bgEnabled').addEventListener('change', (e) => {
  bgEnabled = e.target.checked;
  drawGrid();
});

document.getElementById('bgOpacity').addEventListener('input', (e) => {
  bgOpacity = parseFloat(e.target.value);
  drawGrid();
});



// Ініціалізація
initGrid();

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  drawGrid();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();


let bgScale = 1;
let bgOffsetX = 0;
let bgOffsetY = 0;
let bgDragging = false;
let bgDragStart = { x: 0, y: 0 };
let bgDragOffsetStart = { x: 0, y: 0 };


document.getElementById('testLevelBtn').addEventListener('click', () => {
  const levelCode = grid.map(row => row.join('')).join('\n');
  const encoded = encodeURIComponent(levelCode);
  window.open(`test.html?level=${encoded}`, '_blank');
});
