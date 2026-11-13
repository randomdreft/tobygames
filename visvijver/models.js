// Visvijver - modellen van alle vangsten.
// Elk model is ongeveer 1 eenheid lang, met de kop naar +x.
// Regel: elk onderdeel steekt met zijn voet IN een ander onderdeel, zodat er nooit iets los zweeft.
import * as THREE from './vendor/three.module.min.js';

// ---------------------------------------------------------------- materialen
const mats = new Map();
// vlak, low-poly materiaal (voor de wereld)
export function M(kleur, o = {}) {
  const key = kleur + '|' + (o.gloed || 0) + '|' + (o.doorzichtig || 1);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshLambertMaterial({
      color: kleur, flatShading: true,
      emissive: o.gloed || 0x000000,
      transparent: !!o.doorzichtig, opacity: o.doorzichtig || 1,
    }));
  }
  return mats.get(key);
}

// glad, glanzend materiaal (voor de vangsten)
const pmats = new Map();
function P(kleur, o = {}) {
  const key = [kleur, o.gloed || 0, o.doorzichtig || 1, o.glans ?? 45, o.spec ?? 0x444444, o.dubbel ? 1 : 0, o.map ? o.map.uuid : '', o.vk ? 1 : 0].join('|');
  if (!pmats.has(key)) {
    pmats.set(key, new THREE.MeshPhongMaterial({
      color: kleur, emissive: o.gloed || 0x000000,
      shininess: o.glans ?? 45, specular: o.spec ?? 0x444444,
      transparent: !!o.doorzichtig, opacity: o.doorzichtig || 1,
      side: o.dubbel ? THREE.DoubleSide : THREE.FrontSide,
      map: o.map || null, vertexColors: !!o.vk,
    }));
  }
  return pmats.get(key);
}

const G = {
  bol: new THREE.SphereGeometry(0.5, 28, 18),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 28),
  doos: new THREE.BoxGeometry(1, 1, 1),
  punt: new THREE.ConeGeometry(0.5, 1, 14).translate(0, 0.5, 0),   // voet in de oorsprong
};
const OP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const glad = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const css = k => '#' + k.getHexString();
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
// cilinder met de as langs x
function cilX(mat, x, y, z, r, len) {
  const m = mesh(G.cil, mat, x, y, z, r * 2, len, r * 2); m.rotation.z = Math.PI / 2; return m;
}
// kegel met zijn voet op `voet`, wijzend naar `richting`
function punt(mat, voet, richting, r, h) {
  const m = mesh(G.punt, mat, voet.x, voet.y, voet.z, r * 2, h, r * 2);
  m.quaternion.setFromUnitVectors(OP, richting.clone().normalize());
  return m;
}
// punt op (f=1) of net onder (f<1) het oppervlak van een ellipsoïde, in de gegeven richting
function opEllips(c, half, dir, f = 1) {
  const d = V(dir[0] * half[0], dir[1] * half[1], dir[2] * half[2]);
  const n = Math.hypot(d.x / half[0], d.y / half[1], d.z / half[2]) || 1;
  return V(c[0] + d.x / n * f, c[1] + d.y / n * f, c[2] + d.z / n * f);
}
// oog: oogbol, pupil en glimmertje, steeds half in elkaar verzonken
function oog(g, c, n, r, kleur = 0xffffff) {
  n = n.clone().normalize();
  g.add(mesh(G.bol, P(kleur, { glans: 120, spec: 0xffffff }), c.x, c.y, c.z, r * 2));
  const p = c.clone().addScaledVector(n, r * 0.52);
  g.add(mesh(G.bol, P(0x10131a, { glans: 140, spec: 0xffffff }), p.x, p.y, p.z, r * 1.16));
  const h = p.clone().addScaledVector(n.clone().add(V(0.25, 0.8, 0)).normalize(), r * 0.5);
  g.add(mesh(G.bol, P(0xffffff, { gloed: 0x888888 }), h.x, h.y, h.z, r * 0.4));
}
// buis langs een kromme die dunner wordt; begint altijd IN het lijf waar hij aan vastzit
function buis(punten, r0, r1, o = {}) {
  const kromme = new THREE.CatmullRomCurve3(punten.map(p => V(...p)));
  const seg = o.seg || 18, rad = o.rad || 10;
  const geo = new THREE.TubeGeometry(kromme, seg, 1, rad, false);
  const pos = geo.attributes.position, c = new THREE.Vector3();
  const kleur = o.kleuren ? new Float32Array(pos.count * 3) : null;
  const k = new THREE.Color();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, r = r0 + (r1 - r0) * t;
    kromme.getPointAt(t, c);
    for (let j = 0; j <= rad; j++) {
      const n = i * (rad + 1) + j;
      pos.setXYZ(n, c.x + (pos.getX(n) - c.x) * r, c.y + (pos.getY(n) - c.y) * r, c.z + (pos.getZ(n) - c.z) * r);
      if (kleur) { k.copy(o.kleuren[0]).lerp(o.kleuren[1], o.band ? (Math.floor(t * o.band) % 2 ? 0.75 : t * 0.3) : t); kleur.set([k.r, k.g, k.b], n * 3); }
    }
  }
  if (kleur) geo.setAttribute('color', new THREE.BufferAttribute(kleur, 3));
  geo.userData.eind = kromme.getPointAt(1);
  return geo;
}

// ---------------------------------------------------------------- texturen
let straalTex, houtTex;
function vinTextuur() {
  if (straalTex) return straalTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 64, 0, 0);
  gr.addColorStop(0, '#c9c9c9'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#ffffff');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  x.fillStyle = 'rgba(0,0,0,0.2)';
  for (const px of [6, 38]) x.fillRect(px, 0, 5, 64);
  x.fillStyle = 'rgba(255,255,255,0.5)';
  for (const px of [22, 54]) x.fillRect(px, 0, 4, 64);
  straalTex = new THREE.CanvasTexture(c);
  straalTex.wrapS = straalTex.wrapT = THREE.RepeatWrapping;
  straalTex.colorSpace = THREE.SRGBColorSpace;
  return straalTex;
}
function houtTextuur() {
  if (houtTex) return houtTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const x = c.getContext('2d'), R = rng(7);
  x.fillStyle = '#9a6634'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(${R() < 0.5 ? '60,30,10' : '210,160,100'},${0.08 + R() * 0.12})`;
    x.fillRect(0, R() * 128, 128, 1 + R() * 2);
  }
  x.fillStyle = 'rgba(40,20,8,0.55)';
  for (let y = 0; y < 128; y += 32) x.fillRect(0, y, 128, 3);
  houtTex = new THREE.CanvasTexture(c);
  houtTex.wrapS = houtTex.wrapT = THREE.RepeatWrapping;
  houtTex.colorSpace = THREE.SRGBColorSpace;
  return houtTex;
}

// De huid van een vis: canvas van staart (links) naar kop (rechts), rug boven, buik onder.
// Strepen, stippen, schubben en de bek zitten in deze textuur en kunnen dus niet loszweven.
function visTextuur(o) {
  const B = 512, Hh = 256;
  const c = document.createElement('canvas'); c.width = B; c.height = Hh;
  const x = c.getContext('2d'), R = rng(o.kleur);
  const basis = new THREE.Color(o.kleur);
  const rug = basis.clone().multiplyScalar(0.5);
  const buik = o.buik ? new THREE.Color(o.buik) : basis.clone().lerp(new THREE.Color(0xffffff), 0.62);

  const gr = x.createLinearGradient(0, 0, 0, Hh);
  gr.addColorStop(0, css(rug)); gr.addColorStop(0.3, css(basis)); gr.addColorStop(0.6, css(basis));
  gr.addColorStop(0.84, css(buik)); gr.addColorStop(1, css(buik));
  x.fillStyle = gr; x.fillRect(0, 0, B, Hh);

  if (o.regenboog) {
    const rb = x.createLinearGradient(B * 0.08, 0, B * 0.82, 0);
    ['#a45bff', '#4da6ff', '#5bd65b', '#ffe14d', '#ff9a3c', '#ff4d4d'].forEach((k, i) => rb.addColorStop(i / 5, k));
    x.globalAlpha = 0.9; x.fillStyle = rb; x.fillRect(B * 0.04, 0, B * 0.8, Hh * 0.86); x.globalAlpha = 1;
    const wit = x.createLinearGradient(0, Hh * 0.62, 0, Hh);
    wit.addColorStop(0, 'rgba(255,255,255,0)'); wit.addColorStop(1, 'rgba(255,255,255,0.75)');
    x.fillStyle = wit; x.fillRect(0, Hh * 0.62, B, Hh * 0.38);
  }
  if (o.strepen) {
    x.fillStyle = css(new THREE.Color(o.strepen)); x.globalAlpha = 0.85;
    for (let i = 0; i < 6; i++) {
      const px = B * (0.16 + i * 0.105), w = 15 - i * 0.6;
      x.beginPath(); x.moveTo(px - w, 0); x.lineTo(px + w, 0);
      x.quadraticCurveTo(px + w * 0.6, Hh * 0.4, px - 5, Hh * (0.6 + (i % 2) * 0.06));
      x.quadraticCurveTo(px - w * 0.8, Hh * 0.4, px - w, 0); x.fill();
    }
    x.globalAlpha = 1;
  }
  if (o.stippen) {
    x.fillStyle = css(new THREE.Color(o.stippen));
    if (o.stipGroot) {
      for (let i = 0; i < 8; i++) {
        const px = B * (0.1 + R() * 0.78), py = Hh * (R() * 0.62), r = 20 + R() * 22;
        for (let j = 0; j < 3; j++) { x.beginPath(); x.ellipse(px + (R() - 0.5) * r, py + (R() - 0.5) * r * 0.8, r * (0.6 + R() * 0.5), r * (0.45 + R() * 0.4), R() * 3, 0, 6.3); x.fill(); }
      }
    } else {
      x.globalAlpha = 0.92;
      for (let i = 0; i < 54; i++) {
        x.beginPath(); x.arc(B * (0.08 + R() * 0.7), Hh * (0.1 + R() * 0.58), 3.5 + R() * 3.5, 0, 6.3); x.fill();
      }
      x.globalAlpha = 1;
    }
  }
  // schubben (alleen op het lijf, niet op de kop)
  x.lineWidth = 1.6;
  for (let rij = 0; rij < 24; rij++) for (let px = B * 0.05 + (rij % 2) * 7; px < B * 0.76; px += 14) {
    const py = rij * 11 + 4;
    x.strokeStyle = 'rgba(0,0,0,0.13)';
    x.beginPath(); x.arc(px, py, 8, Math.PI * 0.5, Math.PI * 1.5); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.13)';
    x.beginPath(); x.arc(px + 1.6, py, 8, Math.PI * 0.6, Math.PI * 1.4); x.stroke();
  }
  // zijlijn, kieuwdeksel en bek
  x.strokeStyle = 'rgba(255,255,255,0.16)'; x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(B * 0.06, Hh * 0.5); x.quadraticCurveTo(B * 0.4, Hh * 0.45, B * 0.76, Hh * 0.5); x.stroke();
  x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 3.5; x.lineCap = 'round';
  const kx = o.snuit ? 0.8 : 0.875;
  x.beginPath(); x.arc(B * kx, Hh * 0.52, Hh * 0.33, Math.PI * 0.66, Math.PI * 1.34); x.stroke();
  if (!o.bek) {
    x.strokeStyle = 'rgba(45,15,20,0.8)'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(B * 0.998, Hh * 0.55);
    x.quadraticCurveTo(B * 0.96, Hh * 0.58, B * (o.snuit ? 0.87 : 0.925), Hh * 0.655); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- vis
// De vorm van het lijf als functie: daarmee rekenen we uit waar het oppervlak zit,
// zodat vinnen, ogen en snorharen er precies op (en een stukje in) geplaatst worden.
function visVorm(o) {
  const H = o.hoog || 0.2, W = o.dik || 0.1;
  const xT = -0.25, xN = 0.48, L = xN - xT;
  const um = o.snuit ? 0.5 : 0.6, e1 = o.snuit ? 1.5 : 2, e2 = o.snuit ? 0.85 : 0.62;
  const vorm = (u, p) => u < um
    ? p + (1 - p) * Math.pow(Math.sin(Math.PI / 2 * u / um), 1.25)
    : Math.pow(Math.max(0, 1 - Math.pow((u - um) / (1 - um), e1)), e2);
  const v = {
    H, W, xT, xN, L,
    x: u => xT + u * L,
    u: x => clamp((x - xT) / L, 0, 1),
    hh: u => H * vorm(u, 0.26),
    ww: u => W * vorm(u, 0.22),
    top: x => v.hh(v.u(x)),
    // th = hoek rond het lijf: 0 = flank (+z), pi/2 = rug, -pi/2 = buik; f<1 = naar binnen
    punt: (u, th, f = 1) => V(xT + u * L, v.hh(u) * Math.sin(th) * f, v.ww(u) * Math.cos(th) * f),
  };
  return v;
}
const kant = (th, k) => (k > 0 ? th : Math.PI - th);

function lijfGeo(v) {
  const nU = 46, nV = 24, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nU; i++) {
    const u = 1 - Math.pow(1 - i / nU, 1.8);          // dichter bij de neus = ronder
    for (let j = 0; j <= nV; j++) {
      const th = -Math.PI / 2 + (j / nV) * Math.PI * 2;
      const p = v.punt(u, th);
      pos.push(p.x, p.y, p.z); uv.push(u, (Math.sin(th) + 1) / 2);
    }
  }
  for (let i = 0; i < nU; i++) for (let j = 0; j < nV; j++) {
    const a = i * (nV + 1) + j, b = a + nV + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const c = pos.length / 3; pos.push(v.xT, 0, 0); uv.push(0, 0.5);
  for (let j = 0; j < nV; j++) idx.push(c, j, j + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  naadGlad(geo, nU, nV);
  const n = geo.attributes.normal;
  for (let j = 0; j <= nV; j++) n.setXYZ(nU * (nV + 1) + j, 1, 0, 0);
  return geo;
}
// de naad (eerste en laatste punt van elke ring) dezelfde normaal geven
function naadGlad(geo, nU, nV) {
  const n = geo.attributes.normal, a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i <= nU; i++) {
    const p = i * (nV + 1), q = p + nV;
    a.fromBufferAttribute(n, p); b.fromBufferAttribute(n, q); a.add(b).normalize();
    n.setXYZ(p, a.x, a.y, a.z); n.setXYZ(q, a.x, a.y, a.z);
  }
}

// platte vin uit een omtrek; `straal` is de richting van de vinstralen
function vinGeo(teken, straal) {
  const s = new THREE.Shape(); teken(s);
  const geo = new THREE.ShapeGeometry(s, 10);
  const p = geo.attributes.position, uv = geo.attributes.uv, [dx, dy] = straal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    uv.setXY(i, (x * -dy + y * dx) * 20, (x * dx + y * dy) * 3);
  }
  return geo;
}
const blad = (l, b) => vinGeo(s => {
  s.moveTo(0.035, b * 0.3);
  s.quadraticCurveTo(-l * 0.45, b * 1.25, -l, b * 0.35);
  s.quadraticCurveTo(-l * 0.7, -b * 0.9, 0.035, -b * 0.4);
}, [-1, 0]);

function bouwVis(o) {
  const g = new THREE.Group(), v = visVorm(o), { H, W } = v;
  const gloed = o.gloed || 0;
  const vinGloed = gloed ? new THREE.Color(gloed).multiplyScalar(0.6).getHex() : 0;
  const lijfMat = P(0xffffff, { map: visTextuur(o), gloed, glans: 70, spec: 0x666666 });
  const vinMat = P(o.vin || o.kleur, { map: vinTextuur(), dubbel: true, gloed: vinGloed, glans: 30 });
  g.add(new THREE.Mesh(lijfGeo(v), lijfMat));

  // staart: hangt aan een scharnier dat IN het lijf zit, zodat hij kan kwispelen
  const xp = v.xT + 0.06, tl = xp + 0.5;
  const r = v.top(xp) * 0.6, th = clamp(H * (o.sluier ? 1.9 : 1.3), 0.13, 0.36);
  const staart = new THREE.Group(); staart.name = 'staart'; staart.position.set(xp, 0, 0);
  staart.add(new THREE.Mesh(vinGeo(s => {
    s.moveTo(0.03, r);
    s.quadraticCurveTo(-tl * 0.5, th * 0.4, -tl, th);
    s.quadraticCurveTo(-tl * (o.sluier ? 0.95 : 0.8), th * 0.35, -tl * (o.sluier ? 0.7 : 0.6), 0);
    s.quadraticCurveTo(-tl * (o.sluier ? 0.95 : 0.8), -th * 0.35, -tl, -th);
    s.quadraticCurveTo(-tl * 0.5, -th * 0.4, 0.03, -r);
  }, [-1, 0]), vinMat));
  g.add(staart);

  // rugvin en aarsvin: de onderrand volgt de rug en ligt een stuk IN het lijf
  const hf = clamp(H * (o.sluier ? 0.95 : 0.6), 0.06, o.sluier ? 0.2 : 0.13);
  const xa = v.x(o.stekels ? 0.44 : 0.66), xb = v.x(o.stekels ? 0.16 : 0.24), len = xa - xb;
  const sleep = o.sluier ? 0.09 : 0.03;
  g.add(new THREE.Mesh(vinGeo(s => {
    s.moveTo(xb, v.top(xb) * 0.5);
    for (let i = 1; i <= 6; i++) { const x = xb + len * i / 6; s.lineTo(x, v.top(x) * 0.6); }
    s.quadraticCurveTo(xa - len * 0.05, v.top(xa) + hf * 0.8, xa - len * 0.3, v.top(xa - len * 0.3) + hf);
    s.quadraticCurveTo(xb + len * 0.25, v.top(xb) + hf * 0.75, xb - sleep, v.top(xb) + hf * 0.35);
  }, [-0.35, 1]), vinMat));
  const ya = v.x(0.4), yb = v.x(0.14), alen = ya - yb, af = hf * 0.75;
  g.add(new THREE.Mesh(vinGeo(s => {
    s.moveTo(yb, -v.top(yb) * 0.5);
    for (let i = 1; i <= 5; i++) { const x = yb + alen * i / 5; s.lineTo(x, -v.top(x) * 0.6); }
    s.quadraticCurveTo(ya - alen * 0.1, -v.top(ya) - af * 0.8, ya - alen * 0.45, -v.top(ya - alen * 0.45) - af);
    s.quadraticCurveTo(yb + alen * 0.1, -v.top(yb) - af * 0.7, yb - sleep, -v.top(yb) - af * 0.3);
  }, [-0.35, -1]), vinMat));

  // borst- en buikvinnen: de wortel zit binnen het lijf
  const maat = (0.55 + H * 2.2) * (o.sluier ? 1.35 : 1);
  for (const k of [-1, 1]) {
    const borst = new THREE.Group(); borst.name = 'vin';
    borst.position.copy(v.punt(o.snuit ? 0.62 : 0.68, kant(-0.55, k), 0.82));
    borst.rotation.order = 'YXZ';
    borst.userData = { ry: k * 0.75, k };
    borst.rotation.set(k * 0.5, k * 0.75, 0.3);
    borst.add(new THREE.Mesh(blad(0.15 * maat, 0.05 * maat), vinMat));
    g.add(borst);
    const buikvin = new THREE.Group();
    buikvin.position.copy(v.punt(0.5, kant(-Math.PI / 2 + 0.5, k), 0.8));
    buikvin.rotation.order = 'YXZ';
    buikvin.rotation.set(0, k * 0.45, 0.75);
    buikvin.add(new THREE.Mesh(blad(0.1 * maat, 0.035 * maat), vinMat));
    g.add(buikvin);
  }

  if (o.stekels) for (let i = 0; i < o.stekels; i++) {
    const x = v.x(0.72 - i * 0.1);
    g.add(punt(P(0xeeeeee, { glans: 90 }), V(x, v.top(x) - 0.012, 0), V(-0.4, 1, 0), 0.016, 0.1 + (i === 1 ? 0.02 : 0)));
  }
  if (o.bek) {
    const x = v.xN - 0.045;
    g.add(mesh(G.bol, P(0x3a1f2a, { glans: 20 }), x, -H * 0.24, 0, 0.13, H * 0.44, v.ww(v.u(x)) * 2.3));
  }
  if (o.snor) for (const k of [-1, 1]) {
    const s = o.snor, a = v.punt(0.93, kant(-0.6, k), 0.6);
    const mat = P(o.vin || 0x333333, { glans: 30 });
    const g1 = buis([[a.x, a.y, a.z], [a.x + 0.04, a.y - s * 0.4, a.z + k * s * 0.5], [a.x - 0.01, a.y - s * 0.95, a.z + k * s * 0.8]], 0.013, 0.004, { seg: 10, rad: 6 });
    g.add(new THREE.Mesh(g1, mat));
    if (s > 0.15) {
      const b = v.punt(0.9, kant(0.35, k), 0.6);
      g.add(new THREE.Mesh(buis([[b.x, b.y, b.z], [b.x + 0.03, b.y + s * 0.25, b.z + k * s * 0.6], [b.x - 0.1, b.y + s * 0.15, b.z + k * s * 1.05]], 0.012, 0.004, { seg: 10, rad: 6 }), mat));
    }
  }
  const ue = o.snuit ? 0.8 : 0.85, re = o.googly ? 0.072 : clamp(H * 0.24, 0.036, 0.05);
  for (const k of [-1, 1]) oog(g, v.punt(ue, kant(o.googly ? 0.75 : 0.45, k), 0.9), V(0.3, o.googly ? 0.7 : 0.3, k), re, o.oog || 0xffffff);
  return g;
}

// vissen van dezelfde soort delen hun vorm en huid
const visProto = new Map();
function vis(o) {
  const key = JSON.stringify(o);
  if (!visProto.has(key)) visProto.set(key, bouwVis(o));
  const g = visProto.get(key).clone();
  g.userData.staart = g.getObjectByName('staart');
  g.userData.vinnen = g.children.filter(c => c.name === 'vin');
  return g;
}

// ---------------------------------------------------------------- paling
function paling(o) {
  const g = new THREE.Group();
  const n = 54, nV = 14, X0 = 0.48, LEN = 0.97;
  const rug = new THREE.Color(o.kleur), buik = new THREE.Color(0xd9d6a2), k = new THREE.Color();
  const cy = s => Math.sin(s * 7) * 0.04 * Math.min(1, s * 3);
  const rad = s => 0.064 * (1 - 0.68 * Math.pow(s, 1.4))
    * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(1, s / 0.07), 2)))
    * Math.sqrt(Math.min(1, (1 - s) / 0.06));
  const pos = [], kl = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, r = rad(s);
    for (let j = 0; j <= nV; j++) {
      const th = -Math.PI / 2 + (j / nV) * Math.PI * 2;
      pos.push(X0 - s * LEN, cy(s) + r * Math.sin(th), r * 0.85 * Math.cos(th));
      k.copy(buik).lerp(rug, glad(0.25, 0.6, (Math.sin(th) + 1) / 2));
      kl.push(k.r, k.g, k.b);
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < nV; j++) {
    const a = i * (nV + 1) + j, b = a + nV + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const lijf = new THREE.BufferGeometry();
  lijf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  lijf.setAttribute('color', new THREE.Float32BufferAttribute(kl, 3));
  lijf.setIndex(idx); lijf.computeVertexNormals(); naadGlad(lijf, n, nV);
  g.add(new THREE.Mesh(lijf, P(0xffffff, { vk: true, glans: 90, spec: 0x777777 })));

  // vinzoom over rug en buik; de binnenrand ligt in het lijf
  const zoom = (s0, teken) => {
    const m = 30, p = [], ix = [];
    for (let i = 0; i <= m; i++) {
      const s = s0 + (1 - s0) * i / m, r = rad(s), x = X0 - s * LEN;
      const fh = 0.042 * glad(s0, s0 + 0.2, s) * (1 - 0.55 * glad(0.9, 1, s));
      p.push(x, cy(s) + teken * r * 0.4, 0, x, cy(s) + teken * (r + fh), 0);
      if (i < m) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(ix); geo.computeVertexNormals();
    return geo;
  };
  const vinMat = P(rug.clone().multiplyScalar(0.7).getHex(), { dubbel: true, glans: 30 });
  const zomen = [zoom(0.25, 1), zoom(0.5, -1)];
  for (const z of zomen) g.add(new THREE.Mesh(z, vinMat));

  const r0 = rad(0.05), x0 = X0 - 0.05 * LEN;
  for (const kz of [-1, 1]) {
    oog(g, V(x0, cy(0.05) + r0 * 0.5, kz * r0 * 0.62), V(0.25, 0.45, kz), 0.021);
    const vin = new THREE.Group();
    vin.position.set(X0 - 0.17 * LEN, cy(0.17) - 0.012, kz * rad(0.17) * 0.6);
    vin.rotation.order = 'YXZ'; vin.rotation.set(kz * 0.4, kz * 0.7, 0.3);
    vin.add(new THREE.Mesh(blad(0.075, 0.026), vinMat));
    g.add(vin);
  }
  // kronkelen: alle punten van lijf en vinzoom schuiven samen opzij, de kop blijft stil
  const delen = [lijf, ...zomen].map(geo => ({ geo, z0: Float32Array.from(geo.attributes.position.array) }));
  g.userData.kronkel = (t, kracht) => {
    for (const d of delen) {
      const a = d.geo.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const s = (X0 - a[i]) / LEN;
        a[i + 2] = d.z0[i + 2] + Math.sin(t * 6 - s * 9) * 0.05 * kracht * glad(0.2, 0.6, s);
      }
      d.geo.attributes.position.needsUpdate = true;
    }
  };
  return g;
}

// ---------------------------------------------------------------- rare dingen
function laars() {
  const g = new THREE.Group(), leer = P(0x7a4a26, { glans: 25 }), donker = P(0x3b2616, { glans: 15 });
  g.add(mesh(G.cil, leer, -0.12, 0.12, 0, 0.26, 0.5, 0.26));                 // schacht
  g.add(mesh(G.bol, leer, -0.12, -0.18, 0, 0.3, 0.3, 0.27));                 // hiel
  g.add(mesh(G.bol, leer, 0.1, -0.2, 0, 0.56, 0.26, 0.27));                  // voet
  g.add(mesh(G.bol, leer, 0.3, -0.2, 0, 0.26, 0.25, 0.275));                 // neus
  g.add(mesh(G.doos, donker, 0.08, -0.325, 0, 0.74, 0.05, 0.29));            // zool
  g.add(mesh(G.doos, donker, -0.14, -0.35, 0, 0.2, 0.06, 0.27));             // hak
  g.add(mesh(G.cil, donker, -0.12, 0.38, 0, 0.285, 0.06, 0.285));            // rand
  g.add(mesh(G.cil, P(0x1c120a, { glans: 5 }), -0.12, 0.405, 0, 0.23, 0.02, 0.23));
  g.add(mesh(G.doos, P(0xc24a3a, { glans: 10 }), -0.1, 0.1, 0.122, 0.12, 0.12, 0.03));   // lapje
  const wier = buis([[-0.12, 0.36, 0.04], [-0.06, 0.44, 0.1], [-0.01, 0.36, 0.16], [0.02, 0.2, 0.15], [0, 0.08, 0.145]], 0.02, 0.013, { seg: 16, rad: 8 });
  const groen = P(0x4caf50, { glans: 60 });
  g.add(new THREE.Mesh(wier, groen));
  g.add(mesh(G.bol, groen, 0, 0.06, 0.145, 0.07, 0.1, 0.035));
  g.rotation.z = 0.15;
  return g;
}

function blikje() {
  const g = new THREE.Group();
  const zilver = P(0xbfc4cc, { glans: 130, spec: 0xbbbbbb });
  g.add(cilX(P(0xb5562b, { glans: 70 }), 0, 0, 0, 0.18, 0.6));
  g.add(cilX(P(0xefe0b0, { glans: 30 }), 0, 0, 0, 0.184, 0.27));
  g.add(cilX(P(0xd9482b, { glans: 30 }), 0, 0, 0, 0.187, 0.07));
  for (const k of [-1, 1]) g.add(cilX(zilver, k * 0.3, 0, 0, 0.19, 0.035));
  g.add(cilX(P(0x2a1c18, { glans: 5 }), 0.3, 0, 0, 0.165, 0.04));           // donker gat
  g.rotation.set(0.2, 0.5, 0.25);
  return g;
}

function badeend() {
  const g = new THREE.Group(), geel = P(0xffd633, { glans: 100, spec: 0x777777 });
  const lijfC = [-0.05, -0.12, 0], lijfH = [0.35, 0.21, 0.25];
  g.add(mesh(G.bol, geel, ...lijfC, 0.7, 0.42, 0.5));
  g.add(mesh(G.bol, geel, 0.12, 0.03, 0, 0.3));                              // borst/nek
  g.add(mesh(G.bol, geel, 0.18, 0.19, 0, 0.36));                             // kop
  g.add(mesh(G.bol, P(0xff8a1f, { glans: 80 }), 0.36, 0.15, 0, 0.2, 0.07, 0.2));   // snavel
  g.add(punt(geel, opEllips(lijfC, lijfH, [-1, 0.3, 0], 0.85), V(-0.6, 0.8, 0), 0.075, 0.17));   // staartje
  for (const k of [-1, 1]) {
    const n = V(0.6, 0.35, k * 0.72).normalize();
    oog(g, V(0.18, 0.19, 0).addScaledVector(n, 0.18 * 0.93), n, 0.034);
    const vleugel = mesh(G.bol, geel, -0.06, -0.08, k * 0.215, 0.38, 0.22, 0.1);
    vleugel.rotation.z = -0.2; g.add(vleugel);
  }
  return g;
}

function fles() {
  const g = new THREE.Group();
  const glas = P(0x4fc38a, { doorzichtig: 0.45, glans: 160, spec: 0xffffff });
  const profiel = [[0, -0.31], [0.11, -0.31], [0.13, -0.29], [0.13, 0.08], [0.115, 0.16], [0.06, 0.24], [0.045, 0.27], [0.045, 0.37], [0.056, 0.375], [0.056, 0.395], [0, 0.395]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  // het briefje ligt tegen de binnenkant van het glas
  g.add(cilX(P(0xfff6d8, { glans: 10 }), -0.08, -0.084, 0, 0.05, 0.34));
  g.add(cilX(P(0xd9482b, { glans: 20 }), -0.08, -0.084, 0, 0.054, 0.04));
  g.add(cilX(P(0xb98a52, { glans: 10 }), 0.39, 0, 0, 0.041, 0.11));          // kurk
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profiel, 28).rotateZ(-Math.PI / 2), glas));
  g.rotation.z = 0.3;
  return g;
}

function schatkist() {
  const g = new THREE.Group();
  const hout = P(0xffffff, { map: houtTextuur(), glans: 20 });
  const goud = P(0xffcf33, { gloed: 0x5a3a00, glans: 140, spec: 0xfff0a0 });
  const halveSchijf = (r, diepte) => {
    const s = new THREE.Shape(); s.moveTo(-r, 0); s.absarc(0, 0, r, Math.PI, 0, true);
    return new THREE.ExtrudeGeometry(s, { depth: diepte, bevelEnabled: false, curveSegments: 14 }).translate(0, 0, -diepte / 2).rotateY(Math.PI / 2);
  };
  g.add(mesh(G.doos, hout, 0, -0.14, 0, 0.8, 0.36, 0.5));
  for (const x of [-0.3, 0.3]) g.add(mesh(G.doos, goud, x, -0.14, 0, 0.07, 0.38, 0.52));
  g.add(mesh(G.doos, goud, 0, -0.02, 0.26, 0.12, 0.14, 0.04));               // slot
  g.add(mesh(G.bol, P(0x2a1c10), 0, -0.035, 0.28, 0.03, 0.045, 0.02));
  // deksel: dichte halve cilinder, het scharnier ligt net IN de kist
  const deksel = new THREE.Group(); deksel.position.set(0, 0.03, -0.24);
  const d = new THREE.Mesh(halveSchijf(0.25, 0.8), hout); d.position.z = 0.25; deksel.add(d);
  for (const x of [-0.3, 0.3]) { const b = new THREE.Mesh(halveSchijf(0.258, 0.07), goud); b.position.set(x, 0, 0.25); deksel.add(b); }
  deksel.rotation.x = -0.7; g.add(deksel);
  // berg goud met munten en edelstenen die er half in liggen
  const bergC = [0, 0.03, 0.02], bergH = [0.34, 0.09, 0.19], R = rng(11);
  g.add(mesh(G.bol, goud, ...bergC, bergH[0] * 2, bergH[1] * 2, bergH[2] * 2));
  for (let i = 0; i < 14; i++) {
    const p = opEllips(bergC, bergH, [R() * 2 - 1, 0.25 + R() * 0.9, R() * 2 - 1], 0.96);
    const munt = mesh(G.cil, goud, p.x, p.y, p.z, 0.11, 0.022, 0.11);
    munt.rotation.set((R() - 0.5) * 1.2, R() * 3, (R() - 0.5) * 1.2); g.add(munt);
  }
  [[0xe0335a, 0x400010, [0.3, 1, 0.4], 0.09], [0x3aa0ff, 0x001a40, [-0.6, 1, 0.1], 0.075], [0x4ade80, 0x003a10, [-0.1, 1, -0.5], 0.065]].forEach(([kleur, gloed, dir, s]) => {
    const p = opEllips(bergC, bergH, dir, 1);
    const steen = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshPhongMaterial({ color: kleur, emissive: gloed, flatShading: true, shininess: 160, specular: 0xffffff }));
    steen.position.copy(p); steen.scale.setScalar(s); steen.rotation.set(0.4, R() * 3, 0.3); g.add(steen);
  });
  g.userData.deksel = deksel;
  return g;
}

// ---------------------------------------------------------------- monsters
function blub() {
  const g = new THREE.Group();
  const groen = P(0x4fb86a, { glans: 80, spec: 0x666666 }), licht = P(0xbdeea4, { glans: 60 }), geel = P(0xffd84d, { glans: 80 });
  const lijfC = [-0.08, -0.18, 0], lijfH = [0.31, 0.18, 0.17];
  g.add(mesh(G.bol, groen, ...lijfC, 0.62, 0.36, 0.34));
  g.add(mesh(G.bol, licht, -0.06, -0.24, 0, 0.5, 0.26, 0.3));
  // nek: begint in het lijf, eindigt in de kop
  const nekPunten = [[0.1, -0.13, 0], [0.24, 0.04, 0], [0.31, 0.2, 0], [0.34, 0.33, 0]];
  g.add(new THREE.Mesh(buis(nekPunten, 0.1, 0.072, { seg: 20, rad: 14 }), groen));
  const kopC = [0.38, 0.36, 0], kopH = [0.15, 0.1, 0.11];
  g.add(mesh(G.bol, groen, ...kopC, 0.3, 0.2, 0.22));
  const snuitC = [0.46, 0.33, 0], snuitH = [0.085, 0.055, 0.085];
  g.add(mesh(G.bol, licht, ...snuitC, 0.17, 0.11, 0.17));
  for (const k of [-1, 1]) {
    oog(g, opEllips(kopC, kopH, [0, 0.9, k * 0.65], 0.95), V(0.35, 0.6, k * 0.7), 0.05);
    const neus = opEllips(snuitC, snuitH, [0.8, 0.5, k * 0.3], 0.98);
    g.add(mesh(G.bol, P(0x1e3a26), neus.x, neus.y, neus.z, 0.024));
    const voor = mesh(G.bol, groen, 0.05, -0.3, k * 0.13, 0.24, 0.05, 0.15); voor.rotation.x = k * 0.5; g.add(voor);
    const achter = mesh(G.bol, groen, -0.25, -0.28, k * 0.1, 0.18, 0.045, 0.12); achter.rotation.x = k * 0.5; g.add(achter);
  }
  // glimlach: buisje dat over de snuit loopt
  const lach = [-1, -0.5, 0, 0.5, 1].map(a => { const p = opEllips(snuitC, snuitH, [Math.cos(a * 0.9), -0.3 - (1 - Math.abs(a)) * 0.12, Math.sin(a * 0.9)], 0.98); return [p.x, p.y, p.z]; });
  g.add(new THREE.Mesh(buis(lach, 0.008, 0.008, { seg: 14, rad: 6 }), P(0x24502f)));
  // stekels op rug, nek en kop: voet verzonken
  for (const x of [-0.29, -0.17, -0.05, 0.06]) g.add(punt(geel, opEllips(lijfC, lijfH, [(x - lijfC[0]) / lijfH[0], 1, 0], 0.93), V(-0.15, 1, 0), 0.04, 0.1));
  const nek = new THREE.CatmullRomCurve3(nekPunten.map(p => V(...p)));
  for (const t of [0.42, 0.66, 0.9]) {
    const p = nek.getPointAt(t), tg = nek.getTangentAt(t), n = V(-tg.y, tg.x, 0).normalize();
    g.add(punt(geel, p.clone().addScaledVector(n, (0.1 - 0.028 * t) * 0.7), n, 0.034, 0.085));
  }
  g.add(punt(geel, opEllips(kopC, kopH, [-0.45, 1, 0], 0.9), V(-0.3, 1, 0), 0.03, 0.07));
  // staart aan een scharnier in het lijf
  const staart = new THREE.Group(); staart.position.set(-0.32, -0.18, 0);
  const sg = buis([[0, 0, 0], [-0.1, 0.005, 0], [-0.18, 0.05, 0], [-0.22, 0.13, 0]], 0.08, 0.014, { seg: 16, rad: 12 });
  staart.add(new THREE.Mesh(sg, groen));
  staart.add(mesh(G.bol, groen, -0.22, 0.13, 0, 0.034));
  g.add(staart); g.userData.staart = staart;
  return g;
}

function kriebelkraak() {
  const g = new THREE.Group();
  const paars = P(0xb45cd6, { glans: 90, spec: 0x777777 }), roze = P(0xff9ad0, { glans: 60 });
  const kopC = [0, 0.2, 0], kopH = [0.25, 0.28, 0.23], onderC = [0, 0, 0], onderH = [0.21, 0.14, 0.2];
  g.add(mesh(G.bol, paars, ...kopC, 0.5, 0.56, 0.46));
  g.add(mesh(G.bol, paars, ...onderC, 0.42, 0.28, 0.4));
  // bobbeltjes op de kop
  [[-0.5, 0.8, 0.5], [0.1, 1, -0.3], [-0.6, 0.6, -0.5], [0.3, 0.9, 0.45], [-0.15, 0.95, 0.1]].forEach((d, i) => {
    const p = opEllips(kopC, kopH, d, 0.95);
    g.add(mesh(G.bol, roze, p.x, p.y, p.z, 0.075 - i * 0.006));
  });
  // armen: elke arm begint diep in het lijf en draait om dat punt
  const armen = [], kleuren = [new THREE.Color(0xb45cd6), new THREE.Color(0xff9ad0)];
  const armMat = P(0xffffff, { vk: true, glans: 80, spec: 0x666666 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2, c = Math.cos(a), s = Math.sin(a), arm = new THREE.Group();
    arm.position.set(c * 0.1, -0.03, s * 0.1);
    const lang = 1 + (i % 2) * 0.12;
    const pts = [[0, 0, 0], [0.11, -0.08, 0], [0.2, -0.2, 0], [0.27, -0.29, 0], [0.33, -0.27, 0], [0.345, -0.22, 0]]
      .map(([u, y]) => [c * u * lang, y * lang, s * u * lang]);
    const geo = buis(pts, 0.052, 0.013, { seg: 26, rad: 10, kleuren, band: 9 });
    arm.add(new THREE.Mesh(geo, armMat));
    const e = geo.userData.eind; arm.add(mesh(G.bol, roze, e.x, e.y, e.z, 0.03));
    armen.push(arm); g.add(arm);
  }
  for (const k of [-1, 1]) {
    oog(g, opEllips(kopC, kopH, [0.85, 0.05, k * 0.52], 0.93), V(1, 0.1, k * 0.35), 0.075);
    const w = opEllips(onderC, onderH, [0.8, 0.3, k * 0.62], 0.94);
    g.add(mesh(G.bol, roze, w.x, w.y, w.z, 0.07, 0.045, 0.06));
  }
  const m = opEllips(onderC, onderH, [1, -0.1, 0], 0.97);
  g.add(mesh(G.bol, P(0x5a2a6e), m.x, m.y, m.z, 0.03, 0.035, 0.08));
  g.userData.armen = armen;
  return g;
}

const BOUWERS = { vis, paling, laars, blikje, badeend, fles, schatkist, blub, kriebelkraak };

export function buildModel(soort) {
  const o = soort.model;
  const g = (BOUWERS[o.type] || vis)(o);
  g.userData.soort = soort.id;
  return g;
}

// laat een model een beetje leven (staart kwispelen, vinnen wuiven, armen zwaaien)
export function animeerModel(g, t, kracht = 1) {
  const u = g.userData;
  if (u.staart) u.staart.rotation.y = Math.sin(t * 8) * 0.45 * kracht;
  if (u.vinnen) for (const v of u.vinnen) v.rotation.y = v.userData.ry + Math.sin(t * 5) * 0.22 * kracht * v.userData.k;
  if (u.kronkel) u.kronkel(t, kracht);
  if (u.armen) u.armen.forEach((a, i) => { a.rotation.z = Math.sin(t * 3 + i) * 0.18 * kracht; a.rotation.x = Math.cos(t * 2.6 + i * 1.7) * 0.18 * kracht; });
  if (u.deksel) u.deksel.rotation.x = -0.7 + Math.sin(t * 2) * 0.12;
}
