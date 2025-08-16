// Simple canvas-based drag & drop puzzle
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('reset');

// List of bones and their target positions.
const parts = [
  { name: 'skull', file: 'Skull.png',            target: {x: 261, y: 40,} },
  { name: 'ribs left', file: 'Ribs left.png',    target: {x: 200, y: 190} },
  { name: 'ribs right', file: 'Ribs right.png',  target: {x: 301, y: 190} },
  { name: 'spine', file: 'Spine.png',            target: {x: 275, y: 165} },
  { name: 'pelvis left', file: 'Pelvis left.png',target: {x: 231, y: 340} },
  { name: 'pelvis right', file: 'Pelvis right.png', target: {x: 311, y: 340} },
  { name: 'left leg upper', file: 'Left leg upper.png', target: {x: 218, y: 412} },
  { name: 'left leg lower', file: 'Left leg lower.png', target: {x: 215, y: 675} },
  { name: 'right leg upper', file: 'Right leg upper.png', target: {x: 326, y: 425} },
  { name: 'right leg lower', file: 'Right leg lower.png', target: {x: 316, y: 680} },
  { name: 'left arm upper', file: 'Left arm upper.png', target: {x: 131, y: 230} },
  { name: 'left arm lower', file: 'Left arm lower.png', target: {x: 121, y: 420} },
];

const ASSET_PATH = 'static/images/';

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
const SNAP_TOL = 10;
let flashColor = null;
let flashUntil = 0;

async function init() {
  const loaded = await Promise.all(parts.map(async p => ({...p, img: await loadImage(p.file)})));

  // Scatter initial positions around the edges
  pieces = loaded.map((p, i) => {
    const maxX = canvas.width - p.img.width;
    const maxY = canvas.height - p.img.height;

    // Choose random edge with some randomness
    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
      case 0: // Left side
        x = Math.random() * 80; // Within 80 pixels of left edge
        y = Math.random() * maxY;
        break;
      case 1: // Right side
        x = maxX - Math.random() * 80; // Within 80 pixels of right edge
        y = Math.random() * maxY;
        break;
      case 2: // Top side
        x = Math.random() * maxX;
        y = Math.random() * 80; // Within 80 pixels of top edge
        break;
      case 3: // Bottom side
        x = Math.random() * maxX;
        y = maxY - Math.random() * 80; // Within 80 pixels of bottom edge
        break;
    }

    return { ...p, x: Math.max(0, x), y: Math.max(0, y), placed: false };
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

  /*
  // Show target boxes (for debugging)
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // semi-transparent green
  ctx.lineWidth = 2;
  for (const p of pieces) {
    ctx.strokeRect(p.target.x, p.target.y, p.img.width, p.img.height);
  }
  */
  

  // Show tolerance range only for the bone being dragged (with debug info)
  if (dragging) {
    const tol = dragging.target.tolerance || SNAP_TOL;
    
    // Calculate tolerance box bounds
    const tolLeft = dragging.target.x - tol;
    const tolTop = dragging.target.y - tol;
    const tolRight = dragging.target.x + dragging.img.width + tol;
    const tolBottom = dragging.target.y + dragging.img.height + tol;
    
    // Debug: log the values (remove this after testing)
    console.log(`Canvas: ${canvas.width}x${canvas.height}`);
    console.log(`Tolerance box: ${tolLeft}, ${tolTop}, ${tolRight}, ${tolBottom}`);
    console.log(`Going outside? Left: ${tolLeft < 0}, Top: ${tolTop < 0}, Right: ${tolRight > canvas.width}, Bottom: ${tolBottom > canvas.height}`);
    console.log(`Image size: ${dragging.img.width}x${dragging.img.height}`);
    console.log(`Tolerance value: ${tol}`);
    console.log(`Target position: ${dragging.target.x}, ${dragging.target.y}`);
    
    // Only draw parts that are within canvas bounds
    if (tolRight > 0 && tolLeft < canvas.width && tolBottom > 0 && tolTop < canvas.height) {
      const drawLeft = Math.max(0, tolLeft);
      const drawTop = Math.max(0, tolTop);
      const drawRight = Math.min(canvas.width, tolRight);
      const drawBottom = Math.min(canvas.height, tolBottom);
      
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)'; // Made more opaque to see better
      ctx.lineWidth = 2;
      
      // Draw as separate lines to be more explicit
      if (drawTop === tolTop && drawLeft < drawRight) {
        // Top line
        ctx.beginPath();
        ctx.moveTo(drawLeft, drawTop);
        ctx.lineTo(drawRight, drawTop);
        ctx.stroke();
      }
      
      if (drawBottom === tolBottom && drawLeft < drawRight) {
        // Bottom line
        ctx.beginPath();
        ctx.moveTo(drawLeft, drawBottom);
        ctx.lineTo(drawRight, drawBottom);
        ctx.stroke();
      }
      
      if (drawLeft === tolLeft && drawTop < drawBottom) {
        // Left line
        ctx.beginPath();
        ctx.moveTo(drawLeft, drawTop);
        ctx.lineTo(drawLeft, drawBottom);
        ctx.stroke();
      }
      
      if (drawRight === tolRight && drawTop < drawBottom) {
        // Right line
        ctx.beginPath();
        ctx.moveTo(drawRight, drawTop);
        ctx.lineTo(drawRight, drawBottom);
        ctx.stroke();
      }
    }
  }
  
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

  // per-part tolerance (falls back to SNAP_TOL if not set)
  const tolX = p.target.toleranceX ?? p.target.tolerance ?? SNAP_TOL;
  const tolY = p.target.toleranceY ?? p.target.tolerance ?? SNAP_TOL;

  // square/rectangular check instead of circular distance
  const within =
    Math.abs(p.x - p.target.x) <= tolX &&
    Math.abs(p.y - p.target.y) <= tolY;

  if (within) {
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
