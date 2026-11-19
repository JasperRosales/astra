'use strict';
/* Astra — a journal written in stars. Vanilla JS + Canvas, data in localStorage. */

const MOODS = {
  joy:   { label: 'Joyful',  color: '#ffd27a' },
  calm:  { label: 'Calm',    color: '#8fd3ff' },
  love:  { label: 'Loved',   color: '#ff9ecb' },
  hope:  { label: 'Hopeful', color: '#9dffc3' },
  blue:  { label: 'Blue',    color: '#a99bff' },
  storm: { label: 'Stormy',  color: '#ff7a6b' },
};
const KEY = 'astra.v1';
const DAY = 864e5;

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const easeOutBack = k => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
const pad = n => String(n).padStart(2, '0');
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmt = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

/* ---------- data ---------- */
function clean(o) {
  if (!o || typeof o !== 'object') return null;
  const ts = Number(o.ts);
  if (!Number.isFinite(ts)) return null;
  return {
    id: String(o.id || uid()),
    title: String(o.title || 'Untitled').slice(0, 80),
    text: String(o.text || '').slice(0, 4000),
    mood: MOODS[o.mood] ? o.mood : 'calm',
    group: String(o.group || '').trim().slice(0, 40),
    mag: clamp(Math.round(Number(o.mag) || 3), 1, 5),
    x: Number.isFinite(+o.x) && o.x !== null ? +o.x : NaN,
    y: Number.isFinite(+o.y) && o.y !== null ? +o.y : NaN,
    ts,
    demo: !!o.demo,
  };
}

function autoPlace(group, list, center) {
  const placed = list.filter(s => Number.isFinite(s.x));
  const same = group ? placed.filter(s => s.group === group).sort((a, b) => a.ts - b.ts) : [];
  const minD = (x, y) => placed.reduce((m, s) => Math.min(m, Math.hypot(s.x - x, s.y - y)), Infinity);
  let best = { x: center.x, y: center.y }, bestD = -1;
  for (let i = 0; i < 80; i++) {
    let x, y;
    const a = rand(0, Math.PI * 2);
    if (same.length) {
      const last = same[same.length - 1], d = rand(70, 150);
      x = last.x + Math.cos(a) * d; y = last.y + Math.sin(a) * d * .8;
    } else {
      const d = placed.length ? rand(240, 520 + i * 4) : rand(0, 80);
      x = center.x + Math.cos(a) * d; y = center.y + Math.sin(a) * d * .7;
    }
    const md = minD(x, y);
    if (md >= (same.length ? 60 : 200)) return { x, y };
    if (md > bestD) { bestD = md; best = { x, y }; }
  }
  return best;
}

function demoSky() {
  const now = Date.now();
  const raw = [
    [41, 'Small Wins', 'hope', 3, 'Started this journal', 'Trying something new: one star for every day worth remembering.'],
    [37, 'Finals Week', 'storm', 3, 'Three exams in one week', 'Coffee count: 4. Brain cells: maybe half. Why is everything due on Friday?'],
    [35, 'Finals Week', 'blue', 2, 'Blanked on question 7', 'Knew the answer an hour after the exam. Classic.'],
    [33, 'Finals Week', 'calm', 3, 'Study group at the library', 'We stayed until closing. Someone brought pandesal. Morale restored.'],
    [31, 'Finals Week', 'joy', 5, 'Passed everything!', 'Checked the portal three times to make sure it was real. It was.'],
    [26, 'Home', 'love', 4, 'Sunday lunch with Lola', 'She still makes the best sinigang and still asks when I\'ll get a haircut.'],
    [22, 'Small Wins', 'joy', 2, 'Fixed the bug that haunted me', 'It was a missing semicolon. I will not be taking questions.'],
    [19, 'Home', 'calm', 2, 'Rainy afternoon', 'Power went out, so we played cards by candlelight. Honestly kind of perfect.'],
    [15, 'Small Wins', 'hope', 4, 'First 5K run', 'Slow, sweaty, finished. Next goal: not walking up the last hill.'],
    [11, 'Home', 'blue', 3, 'Missing old friends', 'Scrolled through old photos. Sent a message to the group chat. Nobody replied yet.'],
    [8, 'Home', 'joy', 3, 'The group chat replied', 'Reunion planned for December. I\'m bringing the cards.'],
    [4, 'Small Wins', 'joy', 5, 'Joined a hackathon', 'Building a journal where every memory becomes a star. Meta, I know.'],
    [1, '', 'calm', 2, 'Quiet night', 'Nothing special happened. Wanted to remember it anyway.'],
  ];
  const list = [];
  for (const [ago, group, mood, mag, title, text] of raw) {
    const s = { id: uid(), title, text, mood, group, mag, ts: now - ago * DAY - rand(0, 6) * 36e5, x: NaN, y: NaN, demo: true };
    Object.assign(s, autoPlace(group, list, { x: 0, y: 0 }));
    list.push(s);
  }
  return list;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.stars)) return raw.stars.map(clean).filter(Boolean);
  } catch { /* corrupted storage: fall through to demo */ }
  return demoSky();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, stars })); }
  catch { toast('Could not save — storage is full or blocked.'); }
}

/* ---------- state ---------- */
const canvas = $('#sky'), ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, z: 1 };
let stars = load();
for (const s of stars) if (!Number.isFinite(s.x)) Object.assign(s, autoPlace(s.group, stars, { x: 0, y: 0 }));
let selected = null, hover = null, query = '', cutoff = Infinity, editing = null;
let flight = null, pinch = null, drag = null, replay = null, shooting = null;
let nextShoot = performance.now() + 5000, toastMsg = null, toastTimer = 0;
const born = new Map();
const pointers = new Map();
let visible = new Set(stars.map(s => s.id));

/* ---------- camera ---------- */
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });
const toWorld = (x, y) => ({ x: (x - W / 2) / cam.z + cam.x, y: (y - H / 2) / cam.z + cam.y });

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function flyTo(x, y, z = cam.z, dur = 850) {
  flight = { from: { ...cam }, to: { x, y, z: clamp(z, .3, 3) }, t0: performance.now(), dur };
}
function fitAll(instant) {
  const vis = stars.filter(s => s.ts <= cutoff);
  if (!vis.length) return instant ? Object.assign(cam, { x: 0, y: 0, z: 1 }) : flyTo(0, 0, 1);
  const xs = vis.map(s => s.x), ys = vis.map(s => s.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const padX = W < 700 ? 80 : 360, padY = 260;
  const z = clamp(Math.min(W / (x1 - x0 + padX), H / (y1 - y0 + padY)), .35, 1.5);
  const t = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 + (W < 700 ? 20 : 0) };
  if (instant) Object.assign(cam, t, { z }); else flyTo(t.x, t.y, z);
}
function focusStar(s) {
  const off = W < 700 ? { x: 0, y: H * .2 } : { x: 190, y: 0 };
  const z = Math.max(cam.z, 1);
  flyTo(s.x + off.x / z, s.y + off.y / z, z);
}

/* ---------- rendering ---------- */
const T = 1100;
const bg = Array.from({ length: 340 }, () => ({ x: rand(0, T), y: rand(0, T), r: Math.random() ** 3 * 1.4 + .3, p: rand(.04, .3), ph: rand(0, 6.28), sp: rand(.0006, .002) }));
const NEB = [
  { x: -500, y: -250, r: 720, c: '#3b2a7a' },
  { x: 650, y: 280, r: 820, c: '#173a6b' },
  { x: 80, y: 700, r: 620, c: '#5a1f4f' },
  { x: -900, y: 600, r: 560, c: '#123d4a' },
];

const matches = s => !query || (s.title + ' ' + s.text + ' ' + s.group + ' ' + MOODS[s.mood].label).toLowerCase().includes(query);
function scaleOf(s, t) {
  const b = born.get(s.id);
  if (b === undefined) return 1;
  const k = (t - b) / 900;
  if (k < 0) return 0;
  if (k >= 1) { born.delete(s.id); return 1; }
  return easeOutBack(k);
}
const radius = s => (1.4 + s.mag * .75) * Math.sqrt(cam.z);

function groupsOf(list) {
  const g = new Map();
  for (const s of list) if (s.group) { if (!g.has(s.group)) g.set(s.group, []); g.get(s.group).push(s); }
  for (const arr of g.values()) arr.sort((a, b) => a.ts - b.ts);
  return g;
}

function drawBackground(t) {
  ctx.fillStyle = '#04050d';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (const n of NEB) {
    const x = (n.x - cam.x * .5) * Math.sqrt(cam.z) + W / 2, y = (n.y - cam.y * .5) * Math.sqrt(cam.z) + H / 2;
    const r = n.r * (.6 + .4 * cam.z);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(n.c, .32)); g.addColorStop(1, rgba(n.c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (const b of bg) {
    ctx.fillStyle = `rgba(220,228,255,${.3 + .3 * Math.sin(t * b.sp + b.ph)})`;
    const x0 = mod(b.x - cam.x * b.p * cam.z, T), y0 = mod(b.y - cam.y * b.p * cam.z, T);
    for (let x = x0; x < W; x += T) for (let y = y0; y < H; y += T) ctx.fillRect(x, y, b.r, b.r);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawConstellations(vis, t) {
  const groups = groupsOf(vis.filter(s => scaleOf(s, t) > .5));
  ctx.lineWidth = 1;
  for (const [name, arr] of groups) {
    const lit = !query || arr.some(matches);
    const pts = arr.map(s => toScreen(s.x, s.y));
    if (pts.length > 1) {
      ctx.strokeStyle = `rgba(190,205,255,${lit ? .3 : .07})`;
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    if (cam.z > .45) {
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const my = Math.max(...pts.map(p => p.y));
      ctx.font = `500 ${cam.z > 1.2 ? 11 : 10}px "DM Mono", monospace`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(215,222,255,${lit ? .5 : .12})`;
      ctx.fillText(name.toUpperCase(), cx, my + 34);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }
  }
}

function drawStar(s, t) {
  const { x, y } = toScreen(s.x, s.y);
  if (x < -80 || y < -80 || x > W + 80 || y > H + 80) return;
  const g = scaleOf(s, t);
  if (g <= 0) return;
  const dim = matches(s) ? 1 : .12;
  const col = MOODS[s.mood].color;
  const tw = .82 + .18 * Math.sin(t / 700 + hash(s.id) * 6.28);
  const r = radius(s) * g, R = r * (5 + s.mag) * tw;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, rgba(col, .6 * dim)); gr.addColorStop(.22, rgba(col, .18 * dim)); gr.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
  if (s.mag >= 4) {
    const L = R * .95;
    ctx.strokeStyle = rgba(col, .45 * dim * tw); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - L, y); ctx.lineTo(x + L, y); ctx.moveTo(x, y - L); ctx.lineTo(x, y + L); ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${.95 * dim})`;
  ctx.beginPath(); ctx.arc(x, y, r * .8, 0, 7); ctx.fill();
}

function drawRing(s, t, strong) {
  if (!s || s.ts > cutoff) return;
  const { x, y } = toScreen(s.x, s.y), R = radius(s) * 3 + 10;
  ctx.strokeStyle = `rgba(243,227,192,${strong ? .8 : .45})`;
  ctx.lineWidth = 1;
  if (strong) { ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t / 60; }
  ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
  ctx.setLineDash([]);
  if (!strong && hover && !selected) {
    ctx.font = 'italic 500 18px "Cormorant Garamond", serif';
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(233,236,255,.9)';
    ctx.fillText(s.title, x, y - R - 10);
  }
}

function drawShooting(t) {
  if (!shooting && t > nextShoot && !document.hidden) {
    const a = rand(.25, .6), v = rand(9, 13);
    shooting = { x: rand(-100, W * .7), y: rand(-40, H * .35), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0 };
  }
  if (!shooting) return;
  const s = shooting; s.life++; s.x += s.vx; s.y += s.vy;
  const a = Math.sin(Math.min(s.life / 60, 1) * Math.PI);
  const g = ctx.createLinearGradient(s.x - s.vx * 14, s.y - s.vy * 14, s.x, s.y);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${.8 * a})`);
  ctx.strokeStyle = g; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.lineTo(s.x, s.y); ctx.stroke();
  if (s.life > 60) { shooting = null; nextShoot = t + rand(8000, 18000); }
}

function step(t) {
  if (flight) {
    const k = clamp((t - flight.t0) / flight.dur, 0, 1), e = easeInOut(k);
    for (const p of ['x', 'y', 'z']) cam[p] = flight.from[p] + (flight.to[p] - flight.from[p]) * e;
    if (k >= 1) flight = null;
  }
  if (replay) {
    const k = clamp((t - replay.t0) / replay.dur, 0, 1);
    timeline.value = Math.round(k * 1000);
    setCutoff(+timeline.value);
    if (k >= 1) stopReplay();
  }
}

function frame(t) {
  step(t);
  drawBackground(t);
  const vis = stars.filter(s => s.ts <= cutoff);
  const now = new Set();
  for (const s of vis) { now.add(s.id); if (!visible.has(s.id) && !born.has(s.id)) born.set(s.id, t); }
  visible = now;
  drawConstellations(vis, t);
  ctx.globalCompositeOperation = 'lighter';
  for (const s of vis) drawStar(s, t);
  ctx.globalCompositeOperation = 'source-over';
  if (hover && hover !== selected) drawRing(hover, t, false);
  drawRing(selected, t, true);
  drawShooting(t);
  requestAnimationFrame(frame);
}

/* ---------- interaction ---------- */
function hitTest(px, py) {
  let best = null, bd = Infinity;
  for (const s of stars) {
    if (s.ts > cutoff) continue;
    const p = toScreen(s.x, s.y), d = Math.hypot(p.x - px, p.y - py);
    if (d < Math.max(18, radius(s) * 4) && d < bd) { bd = d; best = s; }
  }
  return best;
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  flight = null; closeMenu();
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.z, w: toWorld(mid.x, mid.y) };
    drag = null; return;
  }
  const hit = hitTest(e.clientX, e.clientY);
  drag = { star: hit, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
});
canvas.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    cam.z = clamp(pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0, .3, 3);
    cam.x = pinch.w.x - (mid.x - W / 2) / cam.z;
    cam.y = pinch.w.y - (mid.y - H / 2) / cam.z;
    return;
  }
  if (drag) {
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; canvas.classList.add('dragging'); }
    if (drag.moved) {
      if (drag.star) Object.assign(drag.star, toWorld(e.clientX, e.clientY));
      else { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; }
    }
    return;
  }
  if (e.pointerType === 'mouse') {
    hover = hitTest(e.clientX, e.clientY);
    canvas.classList.toggle('pointer', !!hover);
  }
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; return; }
  if (!drag) return;
  if (!drag.moved) drag.star ? select(drag.star) : select(null);
  else if (drag.star) save();
  drag = null; canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { if (!drag) hover = null; });
canvas.addEventListener('wheel', e => {
  e.preventDefault(); flight = null;
  const before = toWorld(e.clientX, e.clientY);
  cam.z = clamp(cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)), .3, 3);
  const after = toWorld(e.clientX, e.clientY);
  cam.x += before.x - after.x; cam.y += before.y - after.y;
}, { passive: false });

/* ---------- UI: panel ---------- */
const panel = $('#panel');
const chrono = () => stars.filter(s => s.ts <= cutoff).sort((a, b) => a.ts - b.ts);

function select(s, fly = true) {
  selected = s;
  document.body.classList.toggle('panel-open', !!s);
  if (!s) { panel.hidden = true; return; }
  const m = MOODS[s.mood];
  $('#pDate').textContent = new Date(s.ts).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const chip = $('#pMood');
  chip.style.setProperty('--c', m.color);
  chip.replaceChildren(el('span', { className: 'dot' }), m.label);
  $('#pTitle').textContent = s.title;
  $('#pGroup').textContent = s.group ? `in ${s.group}` : 'a lone star';
  $('#pMag').textContent = '✦'.repeat(s.mag) + '·'.repeat(5 - s.mag);
  $('#pText').textContent = s.text || '—';
  const list = chrono(), i = list.indexOf(s);
  $('#pPrev').disabled = i <= 0; $('#pNext').disabled = i < 0 || i >= list.length - 1;
  $('#pPrev').style.opacity = i <= 0 ? .4 : 1; $('#pNext').style.opacity = i >= list.length - 1 ? .4 : 1;
  panel.hidden = false;
  panel.scrollTop = 0;
  if (fly) focusStar(s);
}
function browse(dir) {
  if (!selected) return;
  const list = chrono(), i = list.indexOf(selected);
  const n = list[i + dir];
  if (n) select(n);
}
$('#panelClose').onclick = () => select(null);
$('#pPrev').onclick = () => browse(-1);
$('#pNext').onclick = () => browse(1);
$('#pEdit').onclick = () => openEditor(selected);
$('#pDel').onclick = () => {
  if (!selected || !confirm(`Let "${selected.title}" fade from your sky? This can't be undone.`)) return;
  stars = stars.filter(s => s !== selected);
  select(null); save(); updateHint();
};

/* ---------- UI: editor ---------- */
const editor = $('#editor'), form = $('#editorForm');
$('#fMoods').append(...Object.entries(MOODS).flatMap(([k, m]) => [
  el('input', { type: 'radio', name: 'mood', id: 'm-' + k, value: k }),
  Object.assign(el('label', { htmlFor: 'm-' + k }, el('span', { className: 'dot' }), m.label), { style: `--c:${m.color}` }),
]));
const fMag = $('#fMag'), fMagOut = $('#fMagOut');
const magText = () => { fMagOut.textContent = '✦'.repeat(+fMag.value); };
fMag.oninput = magText;
const toInputDate = ts => dayKey(ts);

function openEditor(s = null) {
  editing = s;
  closeMenu();
  $('#edHead').textContent = s ? 'Edit star' : 'A new star';
  form.querySelector('[type=submit]').textContent = s ? 'Save changes' : 'Place star';
  $('#fTitle').value = s ? s.title : '';
  $('#fText').value = s ? s.text : '';
  $('#fGroup').value = s ? s.group : '';
  $('#fDate').value = toInputDate(s ? s.ts : Date.now());
  $('#fDate').max = toInputDate(Date.now());
  fMag.value = s ? s.mag : 3; magText();
  form.mood.value = s ? s.mood : 'calm';
  const names = [...new Set(stars.map(x => x.group).filter(Boolean))];
  $('#groups').replaceChildren(...names.map(n => el('option', { value: n })));
  editor.showModal();
  setTimeout(() => $('#fTitle').focus(), 50);
}
$('#edCancel').onclick = () => editor.close();
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = $('#fTitle').value.trim();
  if (!title) return $('#fTitle').focus();
  const [y, m, d] = $('#fDate').value.split('-').map(Number);
  const now = new Date();
  let ts = y ? new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).getTime() : Date.now();
  ts = Math.min(ts, Date.now());
  const data = { title, text: $('#fText').value.trim(), mood: form.mood.value || 'calm', group: $('#fGroup').value.trim(), mag: +fMag.value, ts };
  editor.close();
  if (editing) {
    const regroup = data.group && data.group !== editing.group;
    Object.assign(editing, data, { demo: false });
    if (regroup) { editing.x = NaN; Object.assign(editing, autoPlace(data.group, stars.filter(s => s !== editing), cam)); }
    save(); select(editing);
  } else {
    if (cutoff !== Infinity) { timeline.value = 1000; setCutoff(1000); }
    const s = { id: uid(), ...data, demo: false, x: NaN, y: NaN };
    Object.assign(s, autoPlace(s.group, stars, cam));
    stars.push(s);
    born.set(s.id, performance.now() + 500);
    visible.add(s.id);
    save();
    select(s);
    toast(s.group ? `A new star joins ${s.group}.` : 'A new star is born.');
  }
  updateHint();
});

/* ---------- timeline & replay ---------- */
const timeline = $('#timeline'), timeLabel = $('#timeLabel'), replayBtn = $('#replayBtn');
function span() {
  const now = Date.now();
  if (!stars.length) return [now - DAY, now];
  return [Math.min(...stars.map(s => s.ts)) - DAY * .5, now];
}
function setCutoff(v) {
  if (v >= 1000) { cutoff = Infinity; timeLabel.textContent = 'Today'; }
  else { const [a, b] = span(); cutoff = a + (b - a) * v / 1000; timeLabel.textContent = fmt(cutoff); }
  if (selected && selected.ts > cutoff) select(null);
  if (hover && hover.ts > cutoff) hover = null;
}
timeline.oninput = () => { stopReplay(); setCutoff(+timeline.value); };
function stopReplay() { replay = null; replayBtn.textContent = '▶'; replayBtn.setAttribute('aria-label', 'Replay your sky'); }
replayBtn.onclick = () => {
  if (replay) return stopReplay();
  if (!stars.length) return toast('Add a star first — then watch your sky form.');
  select(null);
  replay = { t0: performance.now() + 300, dur: Math.min(9000, 2500 + stars.length * 350) };
  replayBtn.textContent = '❚❚'; replayBtn.setAttribute('aria-label', 'Pause replay');
  setCutoff(0); timeline.value = 0;
  const keep = cutoff; cutoff = Infinity; fitAll(); cutoff = keep;
};

/* ---------- search, hint, toast ---------- */
const hint = $('#hint');
$('#search').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); updateHint(); });
function toast(msg) { toastMsg = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastMsg = null; updateHint(); }, 2800); updateHint(); }
function updateHint() {
  hint.replaceChildren();
  if (toastMsg) return hint.append(toastMsg);
  if (query) {
    const n = stars.filter(matches).length;
    return hint.append(n ? `${n} star${n > 1 ? 's' : ''} match “${query}”` : `No stars match “${query}”`);
  }
  if (!stars.length) {
    return hint.append('Your sky is empty. Every entry becomes a star.', el('button', { textContent: 'Write the first one', onclick: () => openEditor() }));
  }
  if (stars.some(s => s.demo)) {
    hint.append('This is a sample sky — explore it, then make it yours.', el('button', {
      textContent: 'Clear samples',
      onclick: () => { stars = stars.filter(s => !s.demo); select(null); save(); updateHint(); fitAll(); },
    }));
  }
}

/* ---------- dialogs: report, list, about ---------- */
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.hasAttribute('data-close')) d.close(); });
});

function longestStreak(keys) {
  const days = [...keys].sort().map(k => new Date(k + 'T00:00:00').getTime());
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev !== null && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}
function openReport() {
  closeMenu();
  const body = $('#reportBody');
  body.replaceChildren(el('h2', { textContent: 'Your sky report' }));
  if (!stars.length) { body.append(el('p', { className: 'empty', textContent: 'No stars yet. Write an entry to start your sky.' })); return $('#report').showModal(); }
  const days = new Set(stars.map(s => dayKey(s.ts)));
  const groups = groupsOf(stars);
  const stat = (n, label) => el('div', { className: 'stat' }, el('b', { textContent: n }), el('span', { textContent: label }));
  body.append(el('div', { className: 'stats' },
    stat(stars.length, 'stars'), stat(groups.size, 'constellations'), stat(longestStreak(days), 'best streak (days)')));

  body.append(el('h3', { textContent: 'Mood spectrum' }));
  const counts = Object.keys(MOODS).map(k => [k, stars.filter(s => s.mood === k).length]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...counts.map(c => c[1]), 1);
  for (const [k, n] of counts) {
    const fill = el('div', { className: 'fill' }); fill.style.width = (n / max * 100) + '%';
    const row = el('div', { className: 'bar' }, el('span', { textContent: MOODS[k].label }), el('div', { className: 'track' }, fill), el('em', { textContent: n }));
    row.style.setProperty('--c', MOODS[k].color);
    body.append(row);
  }
  const top = counts[0][0];
  const recent = stars.filter(s => s.ts > Date.now() - 7 * DAY);
  body.append(el('p', { className: 'small', textContent:
    `Your sky glows mostly ${MOODS[top].label.toLowerCase()}. ${recent.length} star${recent.length === 1 ? '' : 's'} appeared in the last 7 days.` }));

  const bright = [...stars].sort((a, b) => b.mag - a.mag || b.ts - a.ts).slice(0, 3);
  body.append(el('h3', { textContent: 'Brightest memories' }), listOf(bright, $('#report')));
  $('#report').showModal();
}
function listOf(arr, dlg) {
  const wrap = el('div', { className: 'list' });
  for (const s of arr) {
    const dot = el('span', { className: 'dot' }); dot.style.setProperty('--c', MOODS[s.mood].color);
    wrap.append(el('button', {
      onclick: () => { dlg.close(); if (s.ts > cutoff) { timeline.value = 1000; setCutoff(1000); } select(s); },
    }, dot, el('span', {}, el('span', { className: 't', textContent: s.title }), el('small', { textContent: `${fmt(s.ts)}${s.group ? ' · ' + s.group : ''}` }))));
  }
  return wrap;
}
function openList() {
  closeMenu();
  const body = $('#listBody');
  const arr = [...stars].sort((a, b) => b.ts - a.ts);
  body.replaceChildren(arr.length ? listOf(arr, $('#list')) : el('p', { className: 'empty', textContent: 'No entries yet.' }));
  $('#list').showModal();
}
$('#reportBtn').onclick = openReport;

/* ---------- menu & file ops ---------- */
const menu = $('#menu');
function closeMenu() { menu.hidden = true; }
$('#menuBtn').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
document.addEventListener('click', e => { if (!menu.contains(e.target)) closeMenu(); });

function download(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const actions = {
  list: openList,
  report: openReport,
  memory() {
    const pool = stars.filter(s => s.ts <= cutoff);
    if (!pool.length) return toast('No memories to revisit yet.');
    select(pool[Math.floor(Math.random() * pool.length)]);
  },
  fit: () => fitAll(),
  export() {
    download(new Blob([JSON.stringify({ app: 'astra', v: 1, exported: new Date().toISOString(), stars }, null, 2)], { type: 'application/json' }), `astra-journal-${dayKey(Date.now())}.json`);
  },
  import: () => $('#importFile').click(),
  png() {
    const prev = [hover, selected]; hover = selected = null;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      canvas.toBlob(b => { download(b, `astra-sky-${dayKey(Date.now())}.png`); [hover, selected] = prev; });
    }));
  },
  clear() {
    if (!confirm('Clear your entire sky? Export first if you want a backup.')) return;
    stars = []; select(null); save(); updateHint();
  },
  about: () => $('#about').showModal(),
};
menu.addEventListener('click', e => {
  const act = e.target.closest('button')?.dataset.act;
  if (act) { closeMenu(); actions[act](); }
});
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = (Array.isArray(data) ? data : data.stars || []).map(clean).filter(Boolean);
    if (!list.length) throw new Error('empty');
    const ids = new Set(stars.map(s => s.id));
    const fresh = list.filter(s => !ids.has(s.id));
    for (const s of fresh) { if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) Object.assign(s, autoPlace(s.group, stars, cam)); stars.push(s); }
    save(); updateHint(); fitAll();
    toast(`Imported ${fresh.length} star${fresh.length === 1 ? '' : 's'}.`);
  } catch { toast('That file doesn’t look like an Astra journal.'); }
});

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]');
  if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { select(null); closeMenu(); $('#search').blur(); }
  if (typing) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openEditor(); }
  else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  else if (e.key === 'ArrowLeft') browse(-1);
  else if (e.key === 'ArrowRight') browse(1);
});
$('#newBtn').onclick = () => openEditor();

/* ---------- boot ---------- */
addEventListener('resize', resize);
resize();
fitAll(true);
{
  const t0 = performance.now() + 250;
  [...stars].sort((a, b) => a.ts - b.ts).forEach((s, i) => born.set(s.id, t0 + i * 90));
}
updateHint();
requestAnimationFrame(frame);
