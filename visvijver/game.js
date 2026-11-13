// Visvijver - hoofdspel: lopen, vissen, spanningsmeter, kraampje, visboek en aquarium
import * as THREE from './vendor/three.module.min.js';
import { SPECIES, SOORT, ZONES, CATS, BRIEFJES, HENGELS, LIJNEN, AAS, EMMER_MAX, AQUARIUM_MAX } from './data.js?v=2';
import { Sound } from './sound.js?v=2';
import { buildModel, animeerModel } from './models.js?v=2';
import { buildWorld, WATER_Y, WERELD_R, pondR, DOCK, STALL, HUT, OBST, inPond, onDock, zoneAt } from './world.js?v=2';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------- opslaan
const SAVE_KEY = 'visvijver_save';
const nieuwSpel = () => ({ v: 1, geld: 0, hengel: 0, lijn: 0, aas: 0, emmer: [], aquarium: [], boek: {}, vangsten: 0, uitleg: false });
function laad() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.v === 1) {
      const d = { ...nieuwSpel(), ...s };
      d.emmer = (d.emmer || []).filter(r => SOORT[r.id]);
      d.aquarium = (d.aquarium || []).filter(r => SOORT[r.id]);
      d.hengel = clamp(d.hengel | 0, 0, HENGELS.length - 1);
      d.lijn = clamp(d.lijn | 0, 0, LIJNEN.length - 1);
      d.aas = clamp(d.aas | 0, 0, AAS.length - 1);
      return d;
    }
  } catch (e) { /* kapotte of geen opslag: gewoon opnieuw beginnen */ }
  return nieuwSpel();
}
let save = laad();
function bewaar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* geen opslag */ } }

// ---------------------------------------------------------------- 3D opzet
const canvas = $('gameCanvas');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.querySelector('.start-doos').innerHTML = '<h1>🎣 Visvijver</h1><p>Helaas: dit apparaat of deze browser kan geen 3D (WebGL) laten zien. Probeer een andere browser.</p>';
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
// schaduwen worden één keer berekend (de zon staat stil), dat kost daarna niets meer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);
camera.rotation.order = 'YXZ';
scene.add(camera);
const world = buildWorld(scene);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 78 : 65;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// hengel in je hand
const hengel = new THREE.Group();
hengel.position.set(0.42, -0.45, -0.7);
const stokMat = new THREE.MeshLambertMaterial({ color: HENGELS[save.hengel].kleur });
hengel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.022, 1.7, 6).translate(0, 0.85, 0), stokMat));
hengel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6).translate(0, 0.1, 0), new THREE.MeshLambertMaterial({ color: 0x33261a })));
const molen = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), new THREE.MeshLambertMaterial({ color: 0xb0b0b0 }));
molen.rotation.z = Math.PI / 2; molen.position.set(0.04, 0.32, 0); hengel.add(molen);
const hengelTop = new THREE.Object3D(); hengelTop.position.set(0, 1.7, 0); hengel.add(hengelTop);
hengel.rotation.set(-1.0, 0, 0.14);
camera.add(hengel);
const toonLicht = new THREE.PointLight(0xffffff, 0, 0, 0);
toonLicht.position.set(0.5, 0.8, 0);
camera.add(toonLicht);

// dobber, lijn en richtring
const dobber = new THREE.Group();
dobber.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffffff })));
const dobTop = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8262d }));
dobber.add(dobTop);
const dobStok = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5), new THREE.MeshLambertMaterial({ color: 0xffd633 }));
dobStok.position.y = 0.22; dobber.add(dobStok);
dobber.visible = false; scene.add(dobber);

const LIJN_N = 10;
const lijnGeo = new THREE.BufferGeometry();
lijnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LIJN_N * 3), 3));
const lijn = new THREE.Line(lijnGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
lijn.frustumCulled = false; lijn.visible = false; scene.add(lijn);

const richtRing = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.45, 24).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
richtRing.position.y = WATER_Y + 0.08; richtRing.visible = false; scene.add(richtRing);

// ---------------------------------------------------------------- plaatjes voor het visboek
const plaatjes = {};
(function maakPlaatjes() {
  try {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.setSize(240, 168);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
    const dl = new THREE.DirectionalLight(0xffffff, 2); dl.position.set(1, 2, 3); sc.add(dl);
    const cam = new THREE.PerspectiveCamera(28, 240 / 168, 0.1, 20);
    cam.position.set(0.4, 0.3, 2.15); cam.lookAt(0, 0, 0);
    for (const s of SPECIES) {
      const m = buildModel(s); sc.add(m);
      r.render(sc, cam);
      plaatjes[s.id] = r.domElement.toDataURL('image/png');
      sc.remove(m);
    }
    r.dispose(); r.forceContextLoss();
  } catch (e) { console.warn('Visboekplaatjes maken lukte niet', e); }
})();

// ---------------------------------------------------------------- speler en besturing
const speler = { x: 3.6, z: 15.6, yaw: 0.2, pitch: -0.2, hoogte: 1.6, loopT: 0, stapT: 0 };
const toetsen = {};
const joy = { x: 0, y: 0, id: null };
const kijk = { id: null, x: 0, y: 0, bewogen: 0 };
const actie = { ingedrukt: false };
let paneelOpen = null;      // 'kraam' | 'boek' | 'aquarium' | 'emmer' | null
let gestart = false;
let isTouch = false;

function zetTouch() { if (!isTouch) { isTouch = true; document.body.classList.add('touch'); } }
if (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.matchMedia('(pointer: coarse)').matches) zetTouch();
window.addEventListener('touchstart', zetTouch, { passive: true, once: true });

function draai(dx, dy) {
  speler.yaw -= dx;
  speler.pitch = clamp(speler.pitch - dy, -1.25, 0.7);
}
const magKijken = () => gestart && !paneelOpen && F.state !== 'toon';

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') zetTouch();
  if (document.pointerLockElement === canvas || kijk.id !== null) return;
  kijk.id = e.pointerId; kijk.x = e.clientX; kijk.y = e.clientY; kijk.bewogen = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* maakt niet uit */ }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== kijk.id) return;
  const dx = e.clientX - kijk.x, dy = e.clientY - kijk.y;
  kijk.x = e.clientX; kijk.y = e.clientY; kijk.bewogen += Math.abs(dx) + Math.abs(dy);
  if (magKijken()) draai(dx * 0.006, dy * 0.006);
});
function kijkEinde(e) {
  if (e.pointerId !== kijk.id) return;
  kijk.id = null;
  if (e.type === 'pointerup' && e.pointerType === 'mouse' && kijk.bewogen < 5 && !isTouch && magKijken() && canvas.requestPointerLock) {
    vergrendel();
  }
}
// muis vastzetten in het spel; daarna onthouden we dat de speler zo wil spelen
let wilLock = false;
function vergrendel() {
  if (isTouch || !canvas.requestPointerLock || document.pointerLockElement === canvas) return;
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* geen muisvergrendeling: slepen werkt ook */ }
}
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement === canvas) wilLock = true; });
canvas.addEventListener('pointerup', kijkEinde);
canvas.addEventListener('pointercancel', kijkEinde);
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas && magKijken()) draai(e.movementX * 0.0026, e.movementY * 0.0026);
});
document.addEventListener('mousedown', e => { if (document.pointerLockElement === canvas && e.button === 0) zetActie(true); });
document.addEventListener('mouseup', e => { if (e.button === 0 && document.pointerLockElement === canvas) zetActie(false); });

const joyEl = $('joystick'), joyKnop = $('joystick-knop');
function joyBeweeg(e) {
  const r = joyEl.getBoundingClientRect(), straal = r.width / 2 - 20;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const l = Math.hypot(dx, dy);
  if (l > straal) { dx *= straal / l; dy *= straal / l; }
  joy.x = dx / straal; joy.y = dy / straal;
  joyKnop.style.transform = `translate(${dx}px, ${dy}px)`;
}
joyEl.addEventListener('pointerdown', e => { joy.id = e.pointerId; try { joyEl.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } joyBeweeg(e); e.preventDefault(); });
joyEl.addEventListener('pointermove', e => { if (e.pointerId === joy.id) joyBeweeg(e); });
function joyEinde(e) { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; joyKnop.style.transform = ''; }
joyEl.addEventListener('pointerup', joyEinde); joyEl.addEventListener('pointercancel', joyEinde);

const btnActie = $('btn-actie');
btnActie.addEventListener('pointerdown', e => { try { btnActie.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } zetActie(true); e.preventDefault(); });
btnActie.addEventListener('pointerup', () => zetActie(false));
btnActie.addEventListener('pointercancel', () => zetActie(false));
btnActie.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (e.code === 'Escape' && paneelOpen) { sluitPaneel(); return; }
  if (!gestart) { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); start(); } return; }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  toetsen[e.code] = true;
  if (e.code === 'Space') zetActie(true);
  if (F.state === 'toon') {
    if (e.code === 'Enter') sluitVangst(true);
    if (e.code === 'KeyT' || e.code === 'Backspace') sluitVangst(false);
    return;
  }
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyB') paneelOpen === 'boek' ? sluitPaneel() : openPaneel('boek');
  if (e.code === 'KeyM') wisselGeluid();
});
window.addEventListener('keyup', e => { toetsen[e.code] = false; if (e.code === 'Space') zetActie(false); });
window.addEventListener('blur', () => { for (const k in toetsen) toetsen[k] = false; zetActie(false); });

function kanStaan(x, z) {
  const d = Math.hypot(x, z);
  if (d > WERELD_R) return false;
  for (const o of OBST) if (Math.hypot(x - o.x, z - o.z) < o.r) return false;
  if (onDock(x, z, 0.25)) return true;
  return d >= pondR(Math.atan2(z, x)) + 0.7;
}

function beweegSpeler(dt) {
  let vooruit = 0, opzij = 0;
  if (toetsen.KeyW || toetsen.ArrowUp) vooruit += 1;
  if (toetsen.KeyS || toetsen.ArrowDown) vooruit -= 1;
  if (toetsen.KeyD || toetsen.ArrowRight) opzij += 1;
  if (toetsen.KeyA || toetsen.ArrowLeft) opzij -= 1;
  vooruit -= joy.y; opzij += joy.x;
  const l = Math.hypot(vooruit, opzij);
  const vast = paneelOpen || ['werpen', 'beet', 'inhalen', 'toon'].includes(F.state);
  if (l > 0.08 && !vast) {
    if (F.state === 'wachten') haalIn();
    const k = Math.min(1, l) / l * 5.2 * dt;
    const s = Math.sin(speler.yaw), c = Math.cos(speler.yaw);
    const dx = (-s * vooruit + c * opzij) * k, dz = (-c * vooruit - s * opzij) * k;
    if (kanStaan(speler.x + dx, speler.z + dz)) { speler.x += dx; speler.z += dz; }
    else if (kanStaan(speler.x + dx, speler.z)) speler.x += dx;
    else if (kanStaan(speler.x, speler.z + dz)) speler.z += dz;
    speler.loopT += dt * 9;
    speler.stapT -= dt;
    if (speler.stapT <= 0) { speler.stapT = 0.36; Sound.stap(); }
  }
  const doel = 1.6 + (onDock(speler.x, speler.z, 0.2) && speler.z < DOCK.z1 ? DOCK.y : 0);
  speler.hoogte = lerp(speler.hoogte, doel, Math.min(1, dt * 8));
  camera.position.set(speler.x, speler.hoogte + Math.sin(speler.loopT) * 0.035, speler.z);
  camera.rotation.set(speler.pitch, speler.yaw, 0);
  camera.updateMatrixWorld();
}

// ---------------------------------------------------------------- richten
const richt = { ok: false, p: new THREE.Vector3(), zone: 'open' };
const _dir = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const opSteiger = (x, z) => x > DOCK.x0 - 0.25 && x < DOCK.x1 + 0.25 && z > DOCK.z0 - 0.25;
const inWater = (x, z) => inPond(x, z, 0.5) && !opSteiger(x, z);

function berekenRichtpunt() {
  camera.getWorldDirection(_dir);
  const bereik = HENGELS[save.hengel].bereik;
  const hl = Math.hypot(_dir.x, _dir.z) || 1e-6, hx = _dir.x / hl, hz = _dir.z / hl;
  let d = bereik;
  if (_dir.y < -0.03) d = Math.min(bereik, (WATER_Y - camera.position.y) / _dir.y * hl);
  d = Math.max(d, 1.5);
  richt.ok = false;
  for (let q = d; q >= 1.5; q -= 0.75) {
    const x = camera.position.x + hx * q, z = camera.position.z + hz * q;
    if (inWater(x, z)) { richt.ok = true; richt.p.set(x, WATER_Y, z); richt.zone = zoneAt(x, z); break; }
    if (_dir.y < -0.45) break;        // als je recht naar beneden kijkt, niet verder zoeken
  }
}

// ---------------------------------------------------------------- vissen
const SLAP = 0.15, ROOD = 0.8;
const F = {
  state: 'rust',          // rust | werpen | wachten | beet | inhalen | toon
  t: 0, van: new THREE.Vector3(), doel: new THREE.Vector3(), zone: 'open',
  beetT: 0, n1: false, n2: false, dip: 0, venster: 0, ringT: 0, beetP: 0,
  soort: null, forceer: null, lok: false, bonus: 0, spanning: 0, prog: 0, slap: 0, duur: 0, moe: false, rukT: 0, rukNa: 0, klikT: 0, zwaai: 0,
  toon: null, vangst: null,
};
let tijd = 20;

function zetActie(aan) {
  if (aan === actie.ingedrukt) return;
  actie.ingedrukt = aan;
  btnActie.classList.toggle('ingedrukt', aan);
  if (!aan || !gestart || paneelOpen) return;
  Sound.unlock();
  if (F.state === 'rust') {
    if (richt.ok) werp(); else { toast('Kijk naar het water om uit te gooien 🌊'); Sound.fout(); }
  } else if (F.state === 'wachten') {
    if (F.beetT > 1.3) haalIn();
  } else if (F.state === 'beet') slaAan();
  else if (F.state === 'toon' && F.t >= 1) {
    if (save.emmer.length < EMMER_MAX) sluitVangst(true);
    else { toast(isTouch ? 'Je emmer is vol! Gooi hem terug.' : 'Je emmer is vol! Druk op T om hem terug te gooien.'); Sound.fout(); }
  }
}

// ---- beet: klik op het goede moment. Het streepje gaat heen en weer over rood - geel - groen.
const GROEN = 0.09, GEEL = 0.24;        // afstand tot het midden van de balk
const beetPos = () => { const p = F.beetP % 2; return p < 1 ? p : 2 - p; };
// kans dat de haak blijft zitten; in het groen krijg je 20 erbij
const vangKans = (s, perfect) => save.vangsten < 3 ? 100 : Math.min(100, s.kans + F.bonus + (perfect ? 20 : 0));
function slaAan() {
  const afstand = Math.abs(beetPos() - 0.5);
  if (afstand > GEEL) {
    toast('❌ Mis! Je klikte in het rood. Wacht tot het streepje in het groen staat.', 4);
    Sound.ontsnapt(); world.splash(F.doel.x, F.doel.z, 8, 1); rust(); return;
  }
  const perfect = afstand <= GROEN, kans = vangKans(F.soort, perfect);
  if (Math.random() * 100 >= kans) {
    toast(`🐟💨 Net niet… hij schoot los van de haak! (vangkans ${kans}%)` + (perfect ? '' : ' Tip: in het groen heb je meer kans.'), 4.5);
    Sound.ontsnapt(); world.splash(F.doel.x, F.doel.z, 8, 1); rust(); return;
  }
  if (perfect) toast('🎯 Perfect! Hij zit goed vast.', 1.8);
  startInhalen();
}

function werp() {
  F.state = 'werpen'; F.t = 0; F.zwaai = 1;
  hengelTop.getWorldPosition(F.van);
  F.doel.copy(richt.p); F.zone = richt.zone;
  dobber.visible = true; lijn.visible = true; dobber.position.copy(F.van);
  Sound.werp();
}
function haalIn() {
  if (F.state === 'wachten') { world.ripple(dobber.position.x, dobber.position.z, 0.8, 0.8); Sound.spetter(); }
  rust();
}
function rust() {
  F.state = 'rust'; F.soort = null; F.lok = false; F.bonus = 0;
  if (zwemmer) zwemmer.gelokt = false;
  dobber.visible = false; lijn.visible = false;
  $('meter').classList.add('hidden'); $('banner').classList.add('hidden'); $('beetmeter').classList.add('hidden');
  btnActie.classList.remove('beet');
}

function kiesVangst(zone) {
  if (F.forceer && SOORT[F.forceer]) { const s = SOORT[F.forceer]; F.forceer = null; return s; }
  const geluk = AAS[save.aas].geluk, avond = world.eve > 0.5;
  let totaal = 0; const lijst = [];
  for (const s of SPECIES) {
    let w = s.w[zone] || 0;
    if (!w) continue;
    if (save.vangsten < 3 && s.cat !== 'gewoon') continue;     // eerst rustig beginnen
    if (s.cat === 'zeldzaam') w *= 1 + 0.5 * geluk;
    else if (s.cat === 'legendarisch') w *= 1 + 0.8 * geluk;
    else if (s.cat === 'monster') w *= 1 + 0.6 * geluk;
    if (s.avond === true) w *= avond ? 4 : 0.15;
    if (s.avond === 'bonus' && avond) w *= 2.5;
    if (s.cat === 'monster' && avond) w *= 1.5;
    totaal += w; lijst.push([s, w]);
  }
  let r = Math.random() * totaal;
  for (const [s, w] of lijst) { r -= w; if (r <= 0) return s; }
  return lijst.length ? lijst[lijst.length - 1][0] : SOORT.voorn;
}

function startInhalen() {
  F.state = 'inhalen';
  F.spanning = 0.42; F.prog = 0.12; F.slap = 0; F.duur = 0; F.moe = false; F.rukT = 0; F.rukNa = 1.5 + Math.random() * 2;
  $('banner').classList.add('hidden'); $('beetmeter').classList.add('hidden'); btnActie.classList.remove('beet');
  $('meter').classList.remove('hidden');
}

function maakVangst(s) {
  const geluk = AAS[save.aas].geluk;
  const f = Math.pow(Math.random(), 1.8 - geluk * 0.15);
  let kg = lerp(s.kg[0], s.kg[1], f);
  kg = kg < 1 ? Math.round(kg * 100) / 100 : Math.round(kg * 10) / 10;
  const cm = Math.round(lerp(s.cm[0], s.cm[1], clamp(f + (Math.random() - 0.5) * 0.1, 0, 1)));
  const rec = { id: s.id, kg, cm, waarde: Math.round(s.waarde * (1 + 2 * f)) };
  if (s.id === 'fles') rec.briefje = (Math.random() * BRIEFJES.length) | 0;
  return rec;
}

const fmtKg = kg => kg < 1 ? `${Math.round(kg * 1000)} gram` : `${kg.toFixed(1).replace('.', ',')} kg`;
const fmtCm = cm => cm >= 100 ? `${(cm / 100).toFixed(2).replace('.', ',')} m` : `${cm} cm`;
const fmtMaten = r => `${fmtKg(r.kg)} · ${fmtCm(r.cm)}`;

function vang() {
  const s = F.soort, rec = maakVangst(s);
  const b = save.boek[s.id];
  const isNieuw = !b;
  const record = b && rec.kg > b.kg;
  if (!b) save.boek[s.id] = { n: 1, kg: rec.kg, cm: rec.cm };
  else { b.n++; if (rec.kg > b.kg) { b.kg = rec.kg; b.cm = rec.cm; } }
  save.vangsten++;
  bewaar();

  F.state = 'toon'; F.vangst = rec; F.t = 0;
  $('meter').classList.add('hidden');
  const m = buildModel(s);
  m.position.copy(dobber.position); scene.add(m);
  F.toon = { m, van: dobber.position.clone() };
  world.splash(dobber.position.x, dobber.position.z, 22, 1.5); world.ripple(dobber.position.x, dobber.position.z, 3, 1.5);
  dobber.visible = false; lijn.visible = false;
  Sound.plons(1.4);
  if (s.cat === 'monster') Sound.monster();
  if (isNieuw) setTimeout(() => Sound.fanfare(), 250); else setTimeout(() => Sound.vangst(), 250);

  const cat = CATS[s.cat];
  $('vangst-nieuw').classList.toggle('hidden', !isNieuw);
  $('vangst-cat').textContent = `${cat.naam} · 🎯 vangkans ${s.kans}%`; $('vangst-cat').style.background = cat.kleur;
  $('vangstkaart').style.borderColor = cat.kleur;
  $('vangst-naam').textContent = s.naam;
  $('vangst-maten').textContent = `${fmtMaten(rec)} · €${rec.waarde}` + (record ? ' · 🏆 Nieuw record!' : '');
  $('vangst-info').textContent = s.id === 'fles' ? `Op het briefje staat: ${BRIEFJES[rec.briefje]}` : s.info;
  const vol = save.emmer.length >= EMMER_MAX;
  $('vangst-emmer').disabled = vol;
  $('vangst-emmer').innerHTML = vol ? '🪣 Emmer is vol!' : '🪣 In de emmer <span class="desk">(spatie)</span>';
  $('vangstkaart').classList.remove('hidden');
  hud();
}

function sluitVangst(inEmmer) {
  if (F.state !== 'toon') return;
  const rec = F.vangst;
  if (inEmmer && save.emmer.length < EMMER_MAX) {
    save.emmer.push(rec); Sound.tik(); plop('btn-emmer');
    if (save.emmer.length === 1 && !save.geld && save.hengel + save.lijn + save.aas === 0) toast('Top! Breng je vangst naar het kraampje 🛒 om te verkopen.', 5);
    else if (save.emmer.length >= EMMER_MAX) toast('Je emmer zit vol! Ga naar het kraampje 🛒 of het aquarium 🐠.', 5);
  } else {
    Sound.plons(0.8); world.splash(F.doel.x, F.doel.z, 10, 1); world.ripple(F.doel.x, F.doel.z, 2, 1.3);
    toast(SOORT[rec.id].cat === 'rommel' ? 'Hup, terug de vijver in…' : 'Dag vis! Zwem maar lekker verder. 👋');
  }
  scene.remove(F.toon.m); F.toon = null; F.vangst = null;
  toonLicht.intensity = 0;
  $('vangstkaart').classList.add('hidden');
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (wilLock) vergrendel();          // muis weer vast, zodat je meteen verder kunt kijken en vissen
  bewaar(); hud(); rust();
}
$('vangst-emmer').addEventListener('click', () => sluitVangst(true));
$('vangst-terug').addEventListener('click', () => sluitVangst(false));

// ---- af en toe zwemt er een vis zichtbaar rond. Gooi je er vlakbij, dan bijt juist die vis
// en is je vangkans groter.
const LOK_BONUS = 25, LOK_AFSTAND = 3;
let zwemmer = null, zwemT = 12;
function kiesZwemmer(zone) {
  const avond = world.eve > 0.5, lijst = []; let totaal = 0;
  for (const s of SPECIES) {
    if (!s.w[zone] || !['gewoon', 'zeldzaam', 'legendarisch'].includes(s.cat)) continue;
    if (save.vangsten < 3 && s.cat !== 'gewoon') continue;
    if (s.avond === true && !avond) continue;
    const w = s.w[zone] * (s.cat === 'zeldzaam' ? 1.5 : s.cat === 'legendarisch' ? 2 : 1);
    totaal += w; lijst.push([s, w]);
  }
  let r = Math.random() * totaal;
  for (const [s, w] of lijst) { r -= w; if (r <= 0) return s; }
  return null;
}
function wegZwemmer() { if (zwemmer) { scene.remove(zwemmer.m); zwemmer = null; zwemT = 18 + Math.random() * 18; } }
function updateZwemmer(dt) {
  if (!zwemmer) {
    zwemT -= dt;
    if (zwemT > 0 || !gestart) return;
    zwemT = 4;                                   // mislukt de plek? Dan zo opnieuw proberen
    const a = Math.random() * 6.28, r = 2 + Math.random() * 8, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!inPond(x, z, 2) || opSteiger(x, z)) return;
    const s = kiesZwemmer(zoneAt(x, z)); if (!s) return;
    const m = buildModel(s); m.scale.setScalar(1.2); scene.add(m);
    zwemmer = { m, s, x, z, a: Math.random() * 6.28, t: 0, duur: 28 + Math.random() * 14, ringT: 0, gelokt: false, f: Math.random() * 6, boven: 0 };
  }
  const q = zwemmer; q.t += dt;
  const draaiNaar = (hoek, snel) => { q.a += Math.atan2(Math.sin(hoek - q.a), Math.cos(hoek - q.a)) * Math.min(1, dt * snel); };
  let v = 0.9;
  if (q.gelokt) {
    const dx = F.doel.x - q.x, dz = F.doel.z - q.z;
    draaiNaar(Math.atan2(dz, dx), 4); v = Math.hypot(dx, dz) > 0.7 ? 1.4 : 0;
  } else {
    q.a += Math.sin(q.t * 0.7 + q.f) * 0.7 * dt;
    const nx = q.x + Math.cos(q.a) * 2.2, nz = q.z + Math.sin(q.a) * 2.2;
    if (!inPond(nx, nz, 1.6) || opSteiger(nx, nz)) draaiNaar(Math.atan2(-q.z, -q.x), 2.5);
  }
  q.x += Math.cos(q.a) * v * dt; q.z += Math.sin(q.a) * v * dt;
  // rustig omhoog komen en aan het eind weer wegduiken
  q.boven = q.gelokt ? Math.min(1, q.boven + dt) : clamp(Math.min(q.t / 2, (q.duur - q.t) / 2), 0, 1);
  q.m.position.set(q.x, WATER_Y - 0.08 - (1 - q.boven) * 1.1 + Math.sin(tijd * 1.8 + q.f) * 0.02, q.z);
  q.m.rotation.y = -q.a;
  animeerModel(q.m, tijd + q.f, v ? 1 : 0.5);
  q.ringT -= dt;
  if (q.ringT <= 0 && q.boven > 0.8) { q.ringT = 1.3; world.ripple(q.x, q.z, 0.8, 1); }
  if (!q.gelokt && q.t > q.duur) wegZwemmer();
}

function updateVissen(dt) {
  updateZwemmer(dt);
  const lijnS = LIJNEN[save.lijn].sterkte, stok = HENGELS[save.hengel];
  F.zwaai = Math.max(0, F.zwaai - dt * 2.2);
  let hengelX = -1.0 - Math.sin(F.zwaai * Math.PI) * 0.55;

  if (F.state === 'rust') {
    berekenRichtpunt();
    richtRing.visible = richt.ok && gestart && !paneelOpen;
    if (richt.ok) { richtRing.position.x = richt.p.x; richtRing.position.z = richt.p.z; richtRing.scale.setScalar(1 + Math.sin(tijd * 5) * 0.12); }
  } else richtRing.visible = false;

  if (F.state === 'werpen') {
    F.t += dt / 0.75;
    const t = Math.min(1, F.t);
    dobber.position.lerpVectors(F.van, F.doel, t);
    dobber.position.y += Math.sin(t * Math.PI) * 2.4;
    if (t >= 1) {
      F.state = 'wachten';
      F.beetT = save.vangsten === 0 ? 2.6 : (2.5 + Math.random() * 6) * AAS[save.aas].tijd + 1.3;
      F.n1 = F.n2 = false; F.dip = 0.3;
      // vlak bij de zwemmende vis gegooid? Dan komt die op je dobber af
      if (zwemmer && zwemmer.boven > 0.8 && Math.hypot(zwemmer.x - F.doel.x, zwemmer.z - F.doel.z) < LOK_AFSTAND) {
        zwemmer.gelokt = true; F.lok = true; F.beetT = 2.4 + Math.random() * 1.2;
        toast(`👀 De vis heeft je dobber gezien! Extra vangkans: +${LOK_BONUS}%`, 3);
      }
      world.splash(F.doel.x, F.doel.z, 9, 0.8); world.ripple(F.doel.x, F.doel.z, 1.6, 1.2);
      Sound.plons();
    }
  } else if (F.state === 'wachten') {
    F.beetT -= dt; F.dip = Math.max(0, F.dip - dt * 0.9);
    if (F.beetT < 1.2 && !F.n1) { F.n1 = true; F.dip = 0.14; world.ripple(F.doel.x, F.doel.z, 0.9, 0.8); Sound.knabbel(); }
    if (F.beetT < 0.55 && !F.n2) { F.n2 = true; F.dip = 0.18; world.ripple(F.doel.x, F.doel.z, 1.0, 0.8); Sound.knabbel(); }
    dobber.position.set(F.doel.x, WATER_Y + 0.03 + Math.sin(tijd * 2.2) * 0.025 - F.dip, F.doel.z);
    dobber.rotation.z = Math.sin(tijd * 1.7) * 0.12;
    if (F.beetT <= 0) {
      if (F.lok && zwemmer) { F.soort = zwemmer.s; F.bonus = LOK_BONUS; wegZwemmer(); }
      else F.soort = kiesVangst(F.zone);
      F.state = 'beet'; F.venster = 5.5; F.ringT = 0; F.beetP = 0;
      $('beet-kans').textContent = `🎯 vangkans ${vangKans(F.soort, false)}%` + (F.bonus ? ' 👀' : '');
      $('beet-wijzer').style.left = '0%';
      $('beetmeter').classList.remove('hidden');
      world.splash(F.doel.x, F.doel.z, 14, 1.1); world.ripple(F.doel.x, F.doel.z, 2.2, 1);
      Sound.beet();
      $('banner').textContent = '❗ BEET! ❗'; $('banner').classList.remove('hidden');
      btnActie.classList.add('beet');
    }
  } else if (F.state === 'beet') {
    F.venster -= dt; F.ringT -= dt;
    dobber.position.set(F.doel.x + Math.sin(tijd * 30) * 0.04, WATER_Y - 0.2 + Math.sin(tijd * 14) * 0.05, F.doel.z);
    if (F.ringT <= 0) { F.ringT = 0.35; world.ripple(F.doel.x, F.doel.z, 1.5, 0.8); world.splash(F.doel.x, F.doel.z, 2, 0.6); }
    // sterke vissen laten het streepje sneller gaan
    F.beetP += dt * (save.vangsten < 3 ? 0.6 : 0.75 + 0.3 * F.soort.f);
    $('beet-wijzer').style.left = beetPos() * 100 + '%';
    if (F.venster <= 0) { toast('Te laat… de vis is er vandoor! 🐟💨'); Sound.ontsnapt(); rust(); }
  } else if (F.state === 'inhalen') {
    // de vis wordt langzaam moe, zodat ook een zware vis met geduld te vangen is
    F.duur += dt;
    if (F.duur > 20 && !F.moe) { F.moe = true; toast('Hij wordt moe… volhouden! 💪'); }
    const s = F.soort, f = s.f * (save.vangsten < 3 ? 0.75 : 1) * (1 - 0.5 * clamp(F.duur / 45, 0, 1));
    F.rukNa -= dt;
    if (F.rukNa <= 0 && F.rukT <= 0) { F.rukT = 0.6 + Math.random() * 0.5; F.rukNa = 1.8 + Math.random() * 2.6; world.splash(dobber.position.x, dobber.position.z, 8, 1); Sound.spetter(); }
    const ruk = F.rukT > 0;
    if (ruk) { F.rukT -= dt; F.spanning += 0.32 * f / lijnS * dt; }
    if (actie.ingedrukt) {
      F.spanning += 0.42 * f / lijnS * dt;
      F.prog += 0.2 * stok.kracht / (0.5 + 0.5 * f) * dt * (ruk ? 0.4 : 1);
      F.klikT -= dt; if (F.klikT <= 0) { F.klikT = 0.085; Sound.klik(F.spanning); }
      hengelX = -0.72 + Math.sin(tijd * 40) * 0.015 * (1 + F.spanning * 2);
      molen.rotation.x += dt * 14;
    } else {
      F.spanning -= 0.4 * dt;
      F.prog = Math.max(0, F.prog - 0.022 * f * dt);
    }
    F.spanning = Math.max(0, F.spanning);
    const teSlap = F.spanning < SLAP;
    F.slap = teSlap ? F.slap + dt : Math.max(0, F.slap - dt * 0.5);

    // de vis komt dichterbij en zwemt heen en weer
    const p = clamp(F.prog, 0, 1) * 0.86;
    _v.set(lerp(F.doel.x, speler.x, p), 0, lerp(F.doel.z, speler.z, p));
    const lx = F.doel.z - speler.z, lz = -(F.doel.x - speler.x), ll = Math.hypot(lx, lz) || 1;
    const zw = Math.sin(tijd * (2.5 + f)) * (ruk ? 1.3 : 0.6) * (1 - p * 0.8);
    let bx = _v.x + lx / ll * zw, bz = _v.z + lz / ll * zw;
    if (!inPond(bx, bz, 0.3)) { bx = _v.x; bz = _v.z; }
    dobber.position.set(bx, WATER_Y - 0.08 + Math.sin(tijd * 12) * 0.04, bz);
    F.ringT -= dt; if (F.ringT <= 0) { F.ringT = ruk ? 0.2 : 0.5; world.ripple(bx, bz, ruk ? 1.6 : 1, 0.8); }

    // meter tekenen
    $('spanning-wijzer').style.left = clamp(F.spanning, 0, 1) * 100 + '%';
    $('prog-vul').style.width = clamp(F.prog, 0, 1) * 100 + '%';
    $('prog-vis').style.left = clamp(F.prog, 0, 1) * 100 + '%';
    $('meter').classList.toggle('schud', ruk || F.spanning > ROOD);
    $('slap-waarschuwing').classList.toggle('hidden', !teSlap);

    if (F.spanning >= 1) {
      Sound.knap(); world.splash(bx, bz, 12, 1.2);
      toast(s.f / lijnS > 1.2 ? '💥 KNAP! Lijn gebroken… Deze was heel sterk. Tip: koop een sterkere lijn bij het kraampje!' : '💥 KNAP! Je lijn is gebroken. Laat de knop los als de meter rood wordt!', 5);
      rust();
    } else if (F.slap > (save.vangsten < 3 ? 6 : 3.2)) {
      Sound.ontsnapt(); world.splash(bx, bz, 8, 1);
      toast('🐟💨 Ontsnapt! De lijn was te slap. Houd de meter in het groen.', 4.5);
      rust();
    } else if (F.prog >= 1) vang();
  } else if (F.state === 'toon' && F.toon) {
    F.t = Math.min(1, F.t + dt / 0.7);
    const breed = 2 * 2.3 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const schaal = Math.min(1.25, breed * 0.52) * (SOORT[F.vangst.id].cat === 'monster' ? 1.15 : 1);
    _v2.set(0, camera.aspect < 1 ? 0.45 : 0.3, -2.3); camera.localToWorld(_v2);
    const e = 1 - Math.pow(1 - F.t, 3);
    F.toon.m.position.lerpVectors(F.toon.van, _v2, e);
    F.toon.m.position.y += Math.sin(F.t * Math.PI) * 1.2;
    F.toon.m.scale.setScalar(lerp(0.3, schaal, e));
    F.toon.m.rotation.y = speler.yaw + Math.PI / 2 + tijd * 1.2;
    F.toon.m.rotation.z = Math.sin(tijd * 2) * 0.1;
    animeerModel(F.toon.m, tijd, 1);
    toonLicht.intensity = e * (0.6 + world.eve * 1.6);
  }

  hengel.rotation.x = lerp(hengel.rotation.x, hengelX, Math.min(1, dt * 14));
  hengel.visible = F.state !== 'toon';

  // vislijn tekenen
  if (lijn.visible) {
    hengelTop.getWorldPosition(_v);
    const zak = F.state === 'inhalen' ? (actie.ingedrukt ? 0.03 : 0.3) : F.state === 'werpen' ? 0.1 : 0.45;
    const a = lijnGeo.attributes.position.array;
    for (let i = 0; i < LIJN_N; i++) {
      const u = i / (LIJN_N - 1);
      a[i * 3] = lerp(_v.x, dobber.position.x, u);
      a[i * 3 + 1] = lerp(_v.y, dobber.position.y + 0.1, u) - Math.sin(u * Math.PI) * zak;
      a[i * 3 + 2] = lerp(_v.z, dobber.position.z, u);
    }
    lijnGeo.attributes.position.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- aquarium (3D)
let aqua = [];
function bouwAquarium() {
  for (const a of aqua) world.tank.remove(a.m);
  aqua = save.aquarium.map((rec, i) => {
    const s = SOORT[rec.id], m = buildModel(s);
    const L = clamp(rec.cm / 100 * 1.3, 0.32, s.model.type === 'vis' || s.model.type === 'paling' ? 1.7 : 1.3);
    m.scale.setScalar(L);
    world.tank.add(m);
    return { m, half: L / 2, x: (Math.random() - 0.5) * 3, y: 1.05 + ((i * 0.37) % 1) * 1.2, z: -0.5 + ((i * 0.61) % 1) * 1.0, dir: i % 2 ? 1 : -1, v: 0.35 + Math.random() * 0.45, rot: 0, f: Math.random() * 6 };
  });
}
function updateAquarium(dt) {
  for (const a of aqua) {
    const lim = 2.45 - a.half;
    a.x += a.dir * a.v * dt;
    if (a.x > lim) { a.x = lim; a.dir = -1; } else if (a.x < -lim) { a.x = -lim; a.dir = 1; }
    a.rot += ((a.dir > 0 ? 0 : Math.PI) - a.rot) * Math.min(1, dt * 4);
    a.m.position.set(a.x, a.y + Math.sin(tijd * 0.8 + a.f) * 0.12, a.z);
    a.m.rotation.y = a.rot;
    animeerModel(a.m, tijd + a.f, 0.7);
  }
}

// ---------------------------------------------------------------- HUD, toast, panelen
let toastTimer = 0;
function toast(tekst, sec = 3) {
  const el = $('toast');
  el.textContent = tekst; el.classList.remove('hidden');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  toastTimer = sec;
}
function plop(id) { const el = $(id); el.classList.remove('plop'); void el.offsetWidth; el.classList.add('plop'); }
function hud() {
  $('geld').textContent = '€' + save.geld;
  $('emmer').textContent = `${save.emmer.length}/${EMMER_MAX}`;
  $('btn-mute').textContent = Sound.isMuted() ? '🔇' : '🔊';
  stokMat.color.set(HENGELS[save.hengel].kleur);
}
function wisselGeluid() { Sound.setMuted(!Sound.isMuted()); hud(); if (!Sound.isMuted()) Sound.tik(); }

let hintOud = '', knopOud = '', nabij = null;
function updateHud() {
  let hint = '', knop = '🎣<small>Gooi</small>';
  const k = isTouch ? 'de knop' : 'spatie';
  if (F.state === 'rust') hint = richt.ok ? `Druk op ${k} om uit te gooien` : 'Loop naar de vijver en kijk naar het water';
  else if (F.state === 'wachten') { hint = 'Wachten op beet… 🤫'; knop = '↩️<small>Haal in</small>'; }
  else if (F.state === 'beet') { hint = `Druk op ${k} als het streepje in het GROEN staat!`; knop = '❗<small>BEET!</small>'; }
  else if (F.state === 'inhalen') { hint = 'Vasthouden = inhalen · Loslaten = spanning omlaag'; knop = '💪<small>Trek!</small>'; }
  if (paneelOpen || F.state === 'toon' || !gestart) hint = '';
  if (hint !== hintOud) { $('hint').textContent = hint; hintOud = hint; }
  if (knop !== knopOud) { btnActie.innerHTML = knop; knopOud = knop; }

  const plekEl = $('plek');
  const toonPlek = gestart && !paneelOpen && ((F.state === 'rust' && richt.ok) || F.state === 'wachten' || F.state === 'werpen');
  if (toonPlek) {
    const z = ZONES[F.state === 'rust' ? richt.zone : F.zone];
    const txt = `📍 ${z.emoji} ${z.naam}`;
    if (plekEl.textContent !== txt) plekEl.textContent = txt;
  }
  plekEl.classList.toggle('hidden', !toonPlek);

  // dichtbij kraampje of aquarium?
  let n = null;
  if (F.state === 'rust' || F.state === 'wachten') {
    if (Math.hypot(speler.x - STALL.x, speler.z - STALL.z) < 5.6) n = 'kraam';
    else if (Math.hypot(speler.x - HUT.x, speler.z - HUT.z) < 6.6) n = 'aquarium';
  }
  if (paneelOpen || !gestart) n = null;
  if (n !== nabij) {
    nabij = n;
    const b = $('btn-interact');
    b.classList.toggle('hidden', !n);
    if (n) b.textContent = (n === 'kraam' ? '🛒 Kraampje' : '🐠 Aquarium') + (isTouch ? '' : ' (E)');
  }
  const weg = !!paneelOpen || F.state === 'toon' || !gestart;
  btnActie.classList.toggle('hidden', weg);
  joyEl.classList.toggle('hidden', weg);
  $('richtpunt').classList.toggle('hidden', weg);
}
function interact() { if (nabij && !paneelOpen) openPaneel(nabij); }
$('btn-interact').addEventListener('click', interact);

const plaatje = id => plaatjes[id] ? `<img src="${plaatjes[id]}" alt="">` : '';
function rijVangst(rec, knoppen) {
  const s = SOORT[rec.id];
  return `<div class="rij">${plaatje(rec.id)}<div class="tekst"><b>${s.naam}</b><small>${fmtMaten(rec)}</small></div><span class="prijs">€${rec.waarde}</span>${knoppen}</div>`;
}
function winkelDeel(titel, soort, lijst, eigenschap) {
  let h = `<h3>${titel}</h3>`;
  lijst.forEach((it, i) => {
    const niv = save[soort];
    let rechts, kl = '';
    if (i < niv) { rechts = '✔️'; kl = 'heb'; }
    else if (i === niv) { rechts = '<b>✔️ In gebruik</b>'; kl = 'heb'; }
    else if (i === niv + 1) rechts = `<button class="action-btn goud klein" data-actie="koop" data-soort="${soort}" ${save.geld < it.prijs ? 'disabled' : ''}>Koop €${it.prijs}</button>`;
    else { rechts = `<span class="prijs">🔒 €${it.prijs}</span>`; kl = 'dicht'; }
    h += `<div class="rij ${kl}"><div class="tekst"><b>${it.naam}</b><small>${it.info} ${eigenschap(it)}</small></div>${rechts}</div>`;
  });
  return h;
}

function tekenPaneel() {
  const el = $('paneel-inhoud'), scroll = el.scrollTop;
  let h = '', titel = '';
  if (paneelOpen === 'kraam') {
    titel = '🛒 Kraampje “Vis & Spul”';
    h += `<div class="boek-kop">💰 Je hebt €${save.geld}</div><h3>🪣 Jouw vangst verkopen</h3>`;
    if (!save.emmer.length) h += `<div class="leeg">Je emmer is leeg. Ga eerst iets vangen!</div>`;
    else {
      const som = save.emmer.reduce((a, r) => a + r.waarde, 0);
      h += `<div class="totaal"><span>${save.emmer.length} in je emmer</span><button class="action-btn" data-actie="allesverkopen">💰 Alles verkopen (€${som})</button></div>`;
      save.emmer.forEach((r, i) => { h += rijVangst(r, `<button class="action-btn klein" data-actie="verkoop" data-i="${i}">Verkoop</button>`); });
    }
    h += winkelDeel('🎣 Hengels', 'hengel', HENGELS, it => `(gooit ${it.bereik} meter)`);
    h += winkelDeel('🧵 Lijnen', 'lijn', LIJNEN, () => '');
    h += winkelDeel('🪱 Aas', 'aas', AAS, () => '');
  } else if (paneelOpen === 'emmer') {
    titel = `🪣 Je emmer (${save.emmer.length}/${EMMER_MAX})`;
    if (!save.emmer.length) h += `<div class="leeg">Nog leeg. Gooi je hengel uit!</div>`;
    save.emmer.forEach((r, i) => { h += rijVangst(r, `<button class="action-btn grijs klein" data-actie="weg" data-i="${i}">🌊 Terug</button>`); });
    h += `<div class="leeg">Verkopen kan bij het kraampje 🛒. Bewaren kan in het aquarium 🐠.</div>`;
  } else if (paneelOpen === 'aquarium') {
    titel = `🐠 Jouw aquarium (${save.aquarium.length}/${AQUARIUM_MAX})`;
    h += `<h3>In het aquarium</h3>`;
    if (!save.aquarium.length) h += `<div class="leeg">Nog leeg. Zet hier je mooiste vissen in!</div>`;
    save.aquarium.forEach((r, i) => { h += rijVangst(r, `<button class="action-btn grijs klein" data-actie="uitaquarium" data-i="${i}" ${save.emmer.length >= EMMER_MAX ? 'disabled' : ''}>🪣 Naar emmer</button>`); });
    h += `<h3>In je emmer</h3>`;
    const vissen = save.emmer.map((r, i) => [r, i]).filter(([r]) => SOORT[r.id].cat !== 'rommel');
    if (!vissen.length) h += `<div class="leeg">Geen vissen in je emmer. (Rare dingen kunnen niet in het aquarium.)</div>`;
    vissen.forEach(([r, i]) => { h += rijVangst(r, `<button class="action-btn klein" data-actie="inaquarium" data-i="${i}" ${save.aquarium.length >= AQUARIUM_MAX ? 'disabled' : ''}>🐠 Bewaren</button>`); });
  } else if (paneelOpen === 'boek') {
    const aantal = SPECIES.filter(s => save.boek[s.id]).length;
    titel = '📖 Visboek';
    h += `<div class="boek-kop">Ontdekt: ${aantal} van de ${SPECIES.length} soorten · ${save.vangsten}× iets gevangen</div><div class="boek-grid">`;
    for (const s of SPECIES) {
      const b = save.boek[s.id], kleur = CATS[s.cat].kleur;
      if (b) h += `<div class="boek-kaart" style="border-color:${kleur}">${plaatje(s.id)}<b>${s.naam}</b><small>${b.n}× gevangen</small><small>Grootste: ${fmtMaten(b)}</small><small class="kans">🎯 Vangkans ${s.kans}%</small></div>`;
      else {
        const plek = Object.keys(s.w).sort((a, c) => s.w[c] - s.w[a])[0];
        h += `<div class="boek-kaart onbekend" style="border-color:${kleur}">${plaatje(s.id)}<b>???</b><small>${CATS[s.cat].naam}</small><small>Tip: ${ZONES[plek].naam.toLowerCase()}${s.avond === true ? ', ’s avonds' : ''}</small><small class="kans">🎯 Vangkans ${s.kans}%</small></div>`;
      }
    }
    h += `</div>`;
  }
  $('paneel-titel').textContent = titel;
  el.innerHTML = h;
  el.scrollTop = scroll;
}
function openPaneel(naam) {
  if (!gestart || F.state === 'toon' || F.state === 'beet' || F.state === 'inhalen' || F.state === 'werpen') return;
  if (F.state === 'wachten') haalIn();
  paneelOpen = naam;
  if (document.pointerLockElement) document.exitPointerLock();
  zetActie(false);
  $('paneel-inhoud').scrollTop = 0;
  tekenPaneel();
  $('paneel').classList.toggle('onder', naam === 'aquarium');
  $('paneel').classList.remove('hidden');
  Sound.tik();
}
function sluitPaneel() { paneelOpen = null; $('paneel').classList.add('hidden'); if (wilLock) vergrendel(); }
$('paneel-sluit').addEventListener('click', sluitPaneel);
$('paneel').addEventListener('click', e => { if (e.target === $('paneel')) sluitPaneel(); });
$('btn-boek').addEventListener('click', () => openPaneel('boek'));
$('btn-emmer').addEventListener('click', () => openPaneel('emmer'));
$('btn-mute').addEventListener('click', wisselGeluid);
$('btn-help').addEventListener('click', () => { if (F.state === 'rust' || F.state === 'wachten') toonStart(); });

$('paneel-inhoud').addEventListener('click', e => {
  const b = e.target.closest('button[data-actie]');
  if (!b || b.disabled) return;
  const i = +b.dataset.i, a = b.dataset.actie;
  if (a === 'verkoop' && save.emmer[i]) {
    save.geld += save.emmer[i].waarde; save.emmer.splice(i, 1); Sound.munt(); plop('geld-display');
  } else if (a === 'allesverkopen' && save.emmer.length) {
    const som = save.emmer.reduce((t, r) => t + r.waarde, 0);
    save.geld += som; save.emmer = []; Sound.munt(); setTimeout(() => Sound.munt(), 120); plop('geld-display');
    toast(`💰 Verkocht voor €${som}!`);
  } else if (a === 'koop') {
    const soort = b.dataset.soort, lijst = { hengel: HENGELS, lijn: LIJNEN, aas: AAS }[soort];
    const it = lijst && lijst[save[soort] + 1];
    if (!it || save.geld < it.prijs) { Sound.fout(); return; }
    save.geld -= it.prijs; save[soort]++; Sound.koop();
    toast(`🎉 Gekocht: ${it.naam}!`);
  } else if (a === 'weg' && save.emmer[i]) {
    save.emmer.splice(i, 1); Sound.plons(0.7);
  } else if (a === 'inaquarium' && save.emmer[i] && save.aquarium.length < AQUARIUM_MAX) {
    save.aquarium.push(save.emmer.splice(i, 1)[0]); Sound.plons(0.7); bouwAquarium();
  } else if (a === 'uitaquarium' && save.aquarium[i] && save.emmer.length < EMMER_MAX) {
    save.emmer.push(save.aquarium.splice(i, 1)[0]); Sound.tik(); bouwAquarium();
  } else return;
  bewaar(); hud(); tekenPaneel();
});

// ---------------------------------------------------------------- start en uitleg
function toonStart() {
  if (document.pointerLockElement) document.exitPointerLock();
  gestart = false;
  $('start-btn').textContent = save.uitleg ? '▶ Verder vissen!' : '▶ Start met vissen!';
  $('reset-btn').classList.toggle('hidden', !(save.vangsten > 0));
  $('reset-btn').textContent = 'Opnieuw beginnen (alles wissen)'; wisBevestig = false;
  $('start-screen').classList.remove('hidden');
}
function start() {
  Sound.unlock();
  $('start-screen').classList.add('hidden');
  gestart = true;
  vergrendel();
  if (!save.uitleg) { save.uitleg = true; bewaar(); toast('Welkom! Loop naar het water, kijk naar een plek en gooi je hengel uit. 🎣', 6); }
  Sound.tik();
}
let wisBevestig = false;
$('start-btn').addEventListener('click', start);
$('reset-btn').addEventListener('click', () => {
  if (!wisBevestig) { wisBevestig = true; $('reset-btn').textContent = 'Zeker weten? Klik nog een keer om ALLES te wissen.'; return; }
  save = nieuwSpel(); bewaar(); bouwAquarium(); hud(); toonStart();
});

// ---------------------------------------------------------------- spellus
let vogelT = 4;
function stap(dt) {
  tijd += dt;
  beweegSpeler(dt);
  world.update(tijd, dt);
  updateVissen(dt);
  updateAquarium(dt);
  updateHud();
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.add('hidden'); }
  vogelT -= dt;
  if (vogelT <= 0 && gestart) { vogelT = 5 + Math.random() * 9; if (world.eve > 0.6) Sound.krekel(); else Sound.vogel(); }
}
let vorige = performance.now();
function frame(nu) {
  const dt = Math.min(0.05, Math.max(0, (nu - vorige) / 1000));
  vorige = nu;
  stap(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

bouwAquarium();
hud();
toonStart();
requestAnimationFrame(frame);

// hulpje voor testen: open visvijver.html?debug
if (new URLSearchParams(location.search).has('debug')) {
  window.__vv = {
    F, speler, world, actie, richt, camera, scene, renderer,
    get save() { return save; },
    stap(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) stap(dt); renderer.render(scene, camera); },
    get zwemmer() { return zwemmer; }, zwemNu() { zwemT = 0; },
    zetActie, bewaar, hud, bouwAquarium, kanStaan, tijd: v => { tijd = v; },
  };
}
