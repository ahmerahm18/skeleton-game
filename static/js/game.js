// Simple canvas-based drag & drop puzzle
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');

// List of bones and their target positions.
const parts = [
  { name: 'skull', file: 'skull.png',            target: {x: 261, y: 40} },
  { name: 'ribs left', file: 'ribs left.png',    target: {x: 221, y: 190} },
  { name: 'ribs right', file: 'ribs right.png',  target: {x: 301, y: 190} },
  { name: 'spine', file: 'spine.png',            target: {x: 291, y: 200} },
  { name: 'pelvis left', file: 'pelvis left.png',target: {x: 221, y: 340} },
  { name: 'pelvis right', file: 'pelvis right.png', target: {x: 301, y: 340} },
  { name: 'left leg upper', file: 'left leg upper.png', target: {x: 241, y: 420} },
  { name: 'left leg lower', file: 'left leg lower.png', target: {x: 236, y: 700} },
  { name: 'right leg upper', file: 'right leg upper.png', target: {x: 331, y: 430} },
  { name: 'right leg lower', file: 'right leg lower.png', target: {x: 336, y: 700} },
  { name: 'left arm upper', file: 'left arm upper.png', target: {x: 131, y: 230} },
  { name: 'left arm lower', file: 'left arm lower.png', target: {x: 121, y: 420} },
];

const ASSET_PATH = './static/images/';

// Load images
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = ASSET_PATH + src; // bust cache
  });
}

let pieces = [];
let dragging = null;
let offsetX = 0;
let offsetY = 0;
const SNAP_TOL = 28;
let flashColor = null;
let flashUntil = 0;

async function init() {
  const loaded = await Promise.all(parts.map(async p => ({...p, img: await loadImage(p.file)})));
  // Scatter initial positions around the edges
  pieces = loaded.map((p, i) => {
    const side = i % 4;
    let x, y;
    switch (side) {
      case 0: x = 20; y = 30 + i*30; break;
      case 1: x = canvas.width - p.img.width - 20; y = 20 + i*20; break;
      case 2: x = 40 + (i*15)%200; y = canvas.height - p.img.height - 40; break;
      default: x = 20 + (i*25)%220; y = 20; break;
    }
    return { ...p, x, y, placed: false };
  });
  loop();
}

function draw() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  // background
  ctx.fillStyle = '#2a1e1a';
  ctx.fillRect(0,0,canvas.width, canvas.height);

  // flash feedback layer
  if (flashColor && Date.now() < flashUntil) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Draw pieces, ensure the dragged one is on top
  for (const p of pieces) {
    if (p === dragging) continue;
    ctx.drawImage(p.img, p.x, p.y);
  }
  if (dragging) ctx.drawImage(dragging.img, dragging.x, dragging.y);

  // Status
  const done = pieces.filter(p=>p.placed).length;
  statusEl.textContent = done === pieces.length ? 'All bones placed! 🥳' : `Placed: ${done}/${pieces.length}`;
}

function setFlash(ok) {
  flashColor = ok ? '#00ff55' : '#ff0033';
  flashUntil = Date.now() + 220;
}

function loop() { draw(); requestAnimationFrame(loop); }

function hitTest(x, y) {
  for (let i = pieces.length-1; i >= 0; i--) {
    const p = pieces[i];
    if (x >= p.x && x <= p.x + p.img.width && y >= p.y && y <= p.y + p.img.height) {
      // Check alpha to avoid dragging transparent pixels
      const localX = Math.floor(x - p.x);
      const localY = Math.floor(y - p.y);
      const off = document.createElement('canvas');
      off.width = p.img.width; off.height = p.img.height;
      const octx = off.getContext('2d');
      octx.drawImage(p.img, 0, 0);
      const alpha = octx.getImageData(localX, localY, 1, 1).data[3];
      if (alpha > 10) return p;
    }
  }
  return null;
}

function onDown(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  const p = hitTest(x, y);
  if (p && !p.placed) {
    dragging = p;
    offsetX = x - p.x;
    offsetY = y - p.y;
    // Move to top of draw order
    pieces = pieces.filter(pp => pp !== p).concat([p]);
  }
}

function onMove(e) {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  dragging.x = x - offsetX;
  dragging.y = y - offsetY;
  e.preventDefault();
}

function onUp() {
  if (!dragging) return;
  const p = dragging;
  dragging = null;
  // Check snap
  const dx = (p.x - p.target.x);
  const dy = (p.y - p.target.y);
  const dist = Math.hypot(dx, dy);
  if (dist <= SNAP_TOL) {
    p.x = p.target.x;
    p.y = p.target.y;
    p.placed = true;
    setFlash(true);
  } else {
    setFlash(false);
  }
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onUp);
canvas.addEventListener('touchstart', onDown, {passive:false});
canvas.addEventListener('touchmove', onMove, {passive:false});
window.addEventListener('touchend', onUp);

resetBtn.addEventListener('click', init);

// Boot
init();
