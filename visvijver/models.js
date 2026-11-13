// Visvijver - low-poly modellen van alle vangsten, opgebouwd uit simpele vormen.
// Elk model is ongeveer 1 eenheid lang, met de kop naar +x.
import * as THREE from './vendor/three.module.min.js';

const mats = new Map();
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

const G = {
  bol: new THREE.SphereGeometry(0.5, 10, 7),
  bolGlad: new THREE.SphereGeometry(0.5, 12, 9),
  kegel4: new THREE.ConeGeometry(0.5, 1, 4),
  kegel: new THREE.ConeGeometry(0.5, 1, 8),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  doos: new THREE.BoxGeometry(1, 1, 1),
};

function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

function oog(g, x, y, z, r = 0.05, kleur = 0xffffff) {
  const kant = Math.sign(z) || 1;
  g.add(mesh(G.bolGlad, M(kleur), x, y, z, r * 2));
  g.add(mesh(G.bolGlad, M(0x111111), x + r * 0.25, y, z + kant * r * 0.55, r * 1.1));
}

function vis(o) {
  const g = new THREE.Group();
  const H = o.hoog || 0.2, W = o.dik || 0.1;
  const lijfL = o.snuit ? 0.66 : 0.76, cx = o.snuit ? 0.02 : 0.1;
  const lijfMat = M(o.kleur, { gloed: o.gloed });
  const vinMat = M(o.vin || o.kleur, { gloed: o.gloed });
  g.add(mesh(G.bol, lijfMat, cx, 0, 0, lijfL, H * 2, W * 2));
  if (o.buik) g.add(mesh(G.bol, M(o.buik), cx, -H * 0.3, 0, lijfL * 0.9, H * 1.5, W * 1.9));
  const dwars = x => Math.sqrt(Math.max(0, 1 - ((x - cx) / (lijfL / 2)) ** 2));

  if (o.snuit) {
    const s = mesh(G.kegel, lijfMat, cx + lijfL / 2 + 0.02, -H * 0.1, 0, H * 1.1, 0.3, W * 1.5);
    s.rotation.z = -Math.PI / 2; g.add(s);
  }
  // staart (draait om een scharnier zodat hij kan kwispelen)
  const staart = new THREE.Group();
  staart.position.set(cx - lijfL / 2 + 0.06, 0, 0);
  const st = mesh(G.kegel4, vinMat, -0.11, 0, 0, o.sluier ? H * 3.4 : H * 2.4, 0.26, 0.05);
  st.rotation.z = -Math.PI / 2; staart.add(st);
  g.add(staart); g.userData.staart = staart;
  // rugvin, buikvin, borstvinnen
  const rug = mesh(G.kegel4, vinMat, cx - 0.02, H * 0.95, 0, 0.26, H * (o.sluier ? 1.6 : 1.0), 0.04);
  rug.rotation.z = 0.45; g.add(rug);
  const buikvin = mesh(G.kegel4, vinMat, cx - 0.08, -H * 0.9, 0, 0.16, H * 0.7, 0.04);
  buikvin.rotation.z = Math.PI - 0.5; g.add(buikvin);
  for (const k of [-1, 1]) {
    const b = mesh(G.kegel4, vinMat, cx + 0.14, -H * 0.3, k * W * 0.95, 0.1, 0.14, 0.03);
    b.rotation.set(k * 0.9, 0, 1.9); g.add(b);
  }
  if (o.stekels) for (let i = 0; i < o.stekels; i++) {
    g.add(mesh(G.kegel4, M(0xe8e8e8), cx + 0.12 - i * 0.12, H * 1.15, 0, 0.04, 0.14, 0.04));
  }
  if (o.strepen) for (let i = 0; i < 4; i++) {
    const x = cx + 0.2 - i * 0.13, d = dwars(x);
    g.add(mesh(G.bol, M(o.strepen), x, H * 0.12, 0, 0.045, H * 1.85 * d, W * 2.06 * d));
  }
  if (o.regenboog) {
    const kl = [0xff4d4d, 0xff9a3c, 0xffe14d, 0x5bd65b, 0x4da6ff, 0xa45bff];
    kl.forEach((c, i) => {
      const x = cx + 0.26 - i * 0.1, d = dwars(x);
      g.add(mesh(G.bol, M(c), x, 0, 0, 0.09, H * 2.04 * d, W * 2.06 * d));
    });
  }
  if (o.stippen) {
    const n = o.stipGroot ? 5 : 8, r = o.stipGroot ? 0.1 : 0.045;
    for (let i = 0; i < n; i++) {
      const x = cx + 0.24 - (i / (n - 1)) * 0.44, d = dwars(x);
      const y = (i % 2 ? 0.35 : -0.15) * H;
      for (const k of [-1, 1]) g.add(mesh(G.bol, M(o.stippen), x, y, k * W * d * 0.93, r, r, 0.03));
    }
  }
  if (o.bek) {
    g.add(mesh(G.bol, M(0x3a1f2a), cx + lijfL / 2 - 0.03, -H * 0.25, 0, 0.1, H * 0.5, W * 1.7));
  }
  if (o.snor) for (const k of [-1, 1]) {
    const s = mesh(G.cil, M(o.vin || 0x333333), cx + lijfL / 2 + 0.02, -H * 0.3 - o.snor * 0.3, k * (W * 0.7 + o.snor * 0.3), 0.015, o.snor, 0.015);
    s.rotation.set(k * 0.9, 0, -0.5); g.add(s);
    if (o.snor > 0.15) {
      const s2 = mesh(G.cil, M(o.vin || 0x333333), cx + lijfL / 2 - 0.02, H * 0.2, k * (W * 0.8 + o.snor * 0.35), 0.012, o.snor * 0.9, 0.012);
      s2.rotation.set(k * 1.3, 0, -0.3); g.add(s2);
    }
  }
  const ox = cx + lijfL / 2 - (o.snuit ? 0.1 : 0.16), d = dwars(ox);
  const r = o.googly ? 0.075 : 0.045;
  for (const k of [-1, 1]) oog(g, ox, H * 0.3, k * W * d * (o.googly ? 1.1 : 0.95), r, o.oog || 0xffffff);
  return g;
}

function paling(o) {
  const g = new THREE.Group();
  const n = 11, mat = M(o.kleur);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = 0.11 - t * 0.07;
    g.add(mesh(G.bol, mat, 0.45 - t * 0.9, Math.sin(t * 7) * 0.05, 0, 0.16, r * 2, r * 1.7));
  }
  g.add(mesh(G.bol, M(0xc9c79a), 0.2, -0.03, 0, 0.5, 0.1, 0.1));
  for (const k of [-1, 1]) oog(g, 0.46, 0.035, k * 0.075, 0.03);
  g.userData.kronkel = true;
  return g;
}

function laars() {
  const g = new THREE.Group(), bruin = M(0x7a4a26), donker = M(0x3b2616);
  g.add(mesh(G.doos, bruin, 0.05, -0.2, 0, 0.6, 0.22, 0.26));
  g.add(mesh(G.doos, bruin, -0.12, 0.12, 0, 0.27, 0.55, 0.25));
  g.add(mesh(G.bol, bruin, 0.3, -0.19, 0, 0.26, 0.24, 0.26));
  g.add(mesh(G.doos, donker, 0.07, -0.33, 0, 0.68, 0.06, 0.29));
  g.add(mesh(G.doos, donker, -0.12, 0.41, 0, 0.3, 0.05, 0.28));
  g.add(mesh(G.doos, M(0xc24a3a), -0.1, 0.1, 0.13, 0.12, 0.12, 0.02));       // lapje
  g.add(mesh(G.bolGlad, M(0x4caf50), 0.2, -0.05, 0.05, 0.08));                // sliertje wier
  g.rotation.z = 0.15;
  return g;
}

function blikje() {
  const g = new THREE.Group();
  const b = mesh(G.cil, M(0xb5562b), 0, 0, 0, 0.36, 0.6, 0.36); b.rotation.z = Math.PI / 2; g.add(b);
  const band = mesh(G.cil, M(0xe9d9a8), 0, 0, 0, 0.37, 0.26, 0.37); band.rotation.z = Math.PI / 2; g.add(band);
  for (const k of [-1, 1]) { const d = mesh(G.cil, M(0x9a9a9a), k * 0.3, 0, 0, 0.38, 0.03, 0.38); d.rotation.z = Math.PI / 2; g.add(d); }
  g.add(mesh(G.doos, M(0x9a9a9a), 0.36, 0.14, 0, 0.1, 0.03, 0.12));
  g.rotation.set(0.2, 0.5, 0.25);
  return g;
}

function badeend() {
  const g = new THREE.Group(), geel = M(0xffd633);
  g.add(mesh(G.bol, geel, -0.05, -0.12, 0, 0.7, 0.42, 0.5));
  g.add(mesh(G.bol, geel, 0.2, 0.2, 0, 0.36));
  const st = mesh(G.kegel4, geel, -0.4, 0.02, 0, 0.2, 0.22, 0.2); st.rotation.z = 0.9; g.add(st);
  const sn = mesh(G.kegel, M(0xff8a1f), 0.42, 0.17, 0, 0.14, 0.18, 0.2); sn.rotation.z = -Math.PI / 2; g.add(sn);
  for (const k of [-1, 1]) {
    oog(g, 0.3, 0.27, k * 0.13, 0.035);
    g.add(mesh(G.bol, geel, -0.05, -0.08, k * 0.24, 0.36, 0.2, 0.08));
  }
  return g;
}

function fles() {
  const g = new THREE.Group(), glas = M(0x4fc38a, { doorzichtig: 0.55 });
  const rol = mesh(G.cil, M(0xfff6d8), -0.08, 0, 0, 0.11, 0.42, 0.11); rol.rotation.z = Math.PI / 2; g.add(rol);
  g.add(mesh(G.doos, M(0xd9482b), -0.08, 0, 0, 0.05, 0.125, 0.125));
  const buik = mesh(G.cil, glas, -0.1, 0, 0, 0.26, 0.62, 0.26); buik.rotation.z = Math.PI / 2; g.add(buik);
  const schouder = mesh(G.kegel, glas, 0.28, 0, 0, 0.26, 0.16, 0.26); schouder.rotation.z = -Math.PI / 2; g.add(schouder);
  const hals = mesh(G.cil, glas, 0.37, 0, 0, 0.09, 0.2, 0.09); hals.rotation.z = Math.PI / 2; g.add(hals);
  const kurk = mesh(G.cil, M(0xb98a52), 0.49, 0, 0, 0.085, 0.08, 0.085); kurk.rotation.z = Math.PI / 2; g.add(kurk);
  g.rotation.z = 0.3;
  return g;
}

function schatkist() {
  const g = new THREE.Group(), hout = M(0x8a5a2b), goud = M(0xffcf33, { gloed: 0x5a3a00 });
  g.add(mesh(G.doos, hout, 0, -0.14, 0, 0.8, 0.36, 0.5));
  const deksel = new THREE.Group(); deksel.position.set(0, 0.04, -0.25);
  const dg = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8, 1, false, 0, Math.PI);
  dg.rotateZ(Math.PI / 2);   // halve cilinder als bol deksel
  const d = new THREE.Mesh(dg, hout); d.position.set(0, 0, 0.25);
  deksel.add(d); deksel.rotation.x = -0.7; g.add(deksel);
  for (const x of [-0.3, 0.3]) g.add(mesh(G.doos, goud, x, -0.14, 0, 0.07, 0.38, 0.52));
  g.add(mesh(G.doos, goud, 0, -0.02, 0.26, 0.12, 0.14, 0.04));
  for (let i = 0; i < 9; i++) {
    g.add(mesh(G.bolGlad, goud, -0.28 + (i % 5) * 0.14, 0.06 + (i % 2) * 0.05, -0.1 + (i % 3) * 0.1, 0.13, 0.07, 0.13));
  }
  g.add(mesh(G.bolGlad, M(0xe0335a, { gloed: 0x400010 }), 0.05, 0.16, 0.05, 0.1));
  g.add(mesh(G.bolGlad, M(0x3aa0ff, { gloed: 0x001a40 }), -0.18, 0.14, 0.02, 0.08));
  g.userData.deksel = deksel;
  return g;
}

function blub() {
  const g = new THREE.Group(), groen = M(0x4fb86a), licht = M(0xb9eaa0), geel = M(0xffd84d);
  g.add(mesh(G.bol, groen, -0.08, -0.18, 0, 0.62, 0.36, 0.34));
  g.add(mesh(G.bol, licht, -0.06, -0.26, 0, 0.5, 0.24, 0.3));
  // nek
  [[0.2, -0.05, 0.2], [0.27, 0.1, 0.17], [0.31, 0.24, 0.15]].forEach(([x, y, s]) => g.add(mesh(G.bol, groen, x, y, 0, s)));
  // kop
  g.add(mesh(G.bol, groen, 0.38, 0.36, 0, 0.3, 0.2, 0.22));
  g.add(mesh(G.bol, licht, 0.46, 0.32, 0, 0.16, 0.1, 0.17));
  for (const k of [-1, 1]) {
    oog(g, 0.38, 0.47, k * 0.07, 0.055);
    g.add(mesh(G.bolGlad, M(0x222222), 0.52, 0.34, k * 0.04, 0.02));
    const flipper = mesh(G.bol, groen, 0.0, -0.3, k * 0.2, 0.22, 0.05, 0.14); flipper.rotation.x = k * 0.5; g.add(flipper);
  }
  // glimlach, stekels en staart
  g.add(mesh(G.doos, M(0x2a5a36), 0.5, 0.29, 0, 0.08, 0.012, 0.14));
  [[-0.25, 0.02], [-0.1, 0.04], [0.05, 0.02], [0.28, 0.2], [0.31, 0.33]].forEach(([x, y]) => g.add(mesh(G.kegel4, geel, x, y, 0, 0.07, 0.1, 0.05)));
  const staart = new THREE.Group(); staart.position.set(-0.34, -0.16, 0);
  const s = mesh(G.kegel, groen, -0.1, 0.02, 0, 0.16, 0.26, 0.12); s.rotation.z = Math.PI / 2 - 0.3; staart.add(s);
  g.add(staart); g.userData.staart = staart;
  return g;
}

function kriebelkraak() {
  const g = new THREE.Group(), paars = M(0xb45cd6), roze = M(0xff9ad0);
  g.add(mesh(G.bol, paars, 0, 0.2, 0, 0.5, 0.56, 0.46));
  g.add(mesh(G.bol, paars, 0, 0.0, 0, 0.4, 0.26, 0.38));
  const armen = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2, arm = new THREE.Group();
    arm.position.set(Math.cos(a) * 0.13, -0.08, Math.sin(a) * 0.13);
    for (let j = 0; j < 5; j++) {
      const r = 0.1 - j * 0.015, uit = 0.06 + j * 0.065;
      arm.add(mesh(G.bol, j % 2 ? roze : paars, Math.cos(a) * uit, -j * 0.065 + (j > 3 ? 0.04 : 0), Math.sin(a) * uit, r));
    }
    armen.push(arm); g.add(arm);
  }
  for (const k of [-1, 1]) {
    g.add(mesh(G.bolGlad, M(0xffffff), 0.17, 0.2, k * 0.12, 0.15));
    g.add(mesh(G.bolGlad, M(0x111111), 0.225, 0.19, k * 0.125, 0.075));
    g.add(mesh(G.bolGlad, roze, 0.17, 0.07, k * 0.17, 0.07, 0.04, 0.05));
  }
  g.add(mesh(G.doos, M(0x5a2a6e), 0.235, 0.07, 0, 0.02, 0.015, 0.09));
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

// laat een model een beetje leven (staart kwispelen, armen zwaaien)
export function animeerModel(g, t, kracht = 1) {
  const u = g.userData;
  if (u.staart) u.staart.rotation.y = Math.sin(t * 8) * 0.5 * kracht;
  if (u.kronkel) g.children.forEach((c, i) => { if (i < 11) c.position.z = Math.sin(t * 6 - i * 0.7) * 0.04 * kracht; });
  if (u.armen) u.armen.forEach((a, i) => { a.rotation.z = Math.sin(t * 3 + i) * 0.18 * kracht; a.rotation.x = Math.cos(t * 2.6 + i * 1.7) * 0.18 * kracht; });
  if (u.deksel) u.deksel.rotation.x = -0.7 + Math.sin(t * 2) * 0.12;
}
