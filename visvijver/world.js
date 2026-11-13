// Visvijver - de wereld: vijver, bos, steiger, kraampje, aquariumhut, lucht en spetters
import * as THREE from './vendor/three.module.min.js';
import { M } from './models.js?v=2';

export const WATER_Y = -0.12;
export const WERELD_R = 23;
export const pondR = a => 14 + 2 * Math.sin(2 * a + 1) + 1.2 * Math.sin(3 * a);
export const DOCK = { x0: -1.1, x1: 1.1, z0: 4.5, z1: 13.2, y: 0.28 };

const pol = (a, r) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });
export const RIET = [2.8, 3.3, 0.35, 0.8].map(a => ({ a, ...pol(a, pondR(a) - 1.6) }));
export const LELIES = [[4.45, 0.6], [5.3, 0.55], [2.4, 0.62]].map(([a, f]) => pol(a, pondR(a) * f));
export const STALL = pol(3.95, pondR(3.95) + 4.6);
export const HUT = pol(5.5, pondR(5.5) + 5);
export const OBST = [{ ...STALL, r: 2.5 }, { ...HUT, r: 3.3 }];

export function inPond(x, z, marge = 0) { return Math.hypot(x, z) < pondR(Math.atan2(z, x)) - marge; }
export function onDock(x, z, marge = 0) {
  return x > DOCK.x0 + marge && x < DOCK.x1 - marge && z > DOCK.z0 + marge && z < DOCK.z1 + 1;
}
export function zoneAt(x, z) {
  if (Math.abs(x) < 3.2 && z > 2.5 && z < 12) return 'steiger';
  for (const r of RIET) if (Math.hypot(x - r.x, z - r.z) < 3.3) return 'riet';
  for (const l of LELIES) if (Math.hypot(x - l.x, z - l.z) < 3.1) return 'lelies';
  if (Math.hypot(x, z) < 4.5) return 'diep';
  return 'open';
}

function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const dummy = new THREE.Object3D();
function inst(geo, mat, lijst) {
  const m = new THREE.InstancedMesh(geo, mat, lijst.length);
  const kleur = new THREE.Color();
  lijst.forEach((p, i) => {
    dummy.position.set(p.x, p.y || 0, p.z);
    dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    dummy.scale.set(p.sx ?? p.s ?? 1, p.sy ?? p.s ?? 1, p.sz ?? p.s ?? 1);
    dummy.updateMatrix();
    m.setMatrixAt(i, dummy.matrix);
    m.setColorAt(i, kleur.set(p.c ?? 0xffffff));
  });
  m.instanceMatrix.needsUpdate = true;
  return m;
}

function bord(tekst, bg = '#fff1b8', fg = '#7a3b12') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = fg; x.fillRect(0, 0, 512, 128);
  x.fillStyle = bg; x.fillRect(10, 10, 492, 108);
  x.fillStyle = fg; x.font = 'bold 64px "Segoe UI", Arial, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(tekst, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map: t });
}

function box(g, mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(BOX, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CIL = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const BOL = new THREE.SphereGeometry(0.5, 8, 6);

export function buildWorld(scene) {
  const R = rng(20261113);
  const W = { eve: 0 };

  // ---------- lucht en licht ----------
  scene.background = new THREE.Color(0xa9dcff);
  scene.fog = new THREE.Fog(0xa9dcff, 34, 90);
  const hemi = new THREE.HemisphereLight(0xdff3ff, 0x6a9a4a, 1.7);
  const zon = new THREE.DirectionalLight(0xfff2d6, 2.1);
  zon.position.set(36, 34, -31);          // dezelfde kant als de zon aan de hemel
  zon.castShadow = true;
  zon.shadow.mapSize.set(2048, 2048);
  Object.assign(zon.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 140 });
  zon.shadow.bias = -0.0006; zon.shadow.normalBias = 0.05;
  scene.add(hemi, zon);

  // hemelkoepel met verloop van horizon naar boven
  const koepelMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { boven: { value: new THREE.Color(0x3d94ea) }, horizon: { value: new THREE.Color(0xa9dcff) } },
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 boven; uniform vec3 horizon; varying vec3 vP;
      void main() { float h = max(0.0, normalize(vP).y); gl_FragColor = vec4(mix(horizon, boven, pow(h, 0.55)), 1.0);
      #include <colorspace_fragment>
      }`,
  });
  const koepel = new THREE.Mesh(new THREE.SphereGeometry(320, 24, 12), koepelMat);
  koepel.renderOrder = -10; scene.add(koepel);

  const gloedTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const halo = (kleur, maat) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gloedTex, color: kleur, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    sp.scale.setScalar(maat); scene.add(sp); return sp;
  };
  const zonHalo = halo(0xffe9a0, 60), maanHalo = halo(0xbfd0ff, 30);

  const zonBol = new THREE.Mesh(BOL, new THREE.MeshBasicMaterial({ color: 0xfff3a0, fog: false }));
  zonBol.scale.setScalar(9);
  const maanBol = new THREE.Mesh(BOL, new THREE.MeshBasicMaterial({ color: 0xf2f4ff, fog: false }));
  maanBol.scale.setScalar(6);
  scene.add(zonBol, maanBol);

  const sterPos = [];
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, h = 0.15 + R() * 0.85, r = Math.sqrt(1 - h * h);
    sterPos.push(Math.cos(a) * r * 150, h * 150, Math.sin(a) * r * 150);
  }
  const sterGeo = new THREE.BufferGeometry();
  sterGeo.setAttribute('position', new THREE.Float32BufferAttribute(sterPos, 3));
  const sterren = new THREE.Points(sterGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(sterren);

  const wolken = [];
  const wolkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });      // echt wit: geen groen licht van het gras
  const wolkOnder = new THREE.MeshBasicMaterial({ color: 0xe4ecf6, fog: false });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const b = new THREE.Mesh(BOL, wolkMat);
      b.position.set(j * 3 - 4.5 + R() * 1.5, R() * 1.2, R() * 2);
      b.scale.set(5 + R() * 3, 2.2 + R() * 1.5, 3.5 + R() * 2);
      g.add(b);
      const o = new THREE.Mesh(BOL, wolkOnder);        // lichtgrijze onderkant voor wat diepte
      o.position.copy(b.position); o.position.y -= 0.35; o.scale.copy(b.scale).multiplyScalar(0.96);
      g.add(o);
    }
    g.position.set(R() * 160 - 80, 26 + R() * 12, R() * 160 - 80);
    wolken.push(g); scene.add(g);
  }

  // ---------- grond met gat voor de vijver ----------
  const N = 72;
  const vorm = new THREE.Shape();
  vorm.absarc(0, 0, 95, 0, Math.PI * 2, false);
  const gat = new THREE.Path();
  for (let i = 0; i <= N; i++) {
    const a = -(i / N) * Math.PI * 2, r = pondR(a);          // andersom = gat
    const x = Math.cos(a) * r, y = -Math.sin(a) * r;
    if (i === 0) gat.moveTo(x, y); else gat.lineTo(x, y);
  }
  vorm.holes.push(gat);
  const grondGeo = new THREE.ShapeGeometry(vorm, 24);
  grondGeo.rotateX(-Math.PI / 2);
  const grasTex = (() => {
    const B = 512, c = document.createElement('canvas'); c.width = c.height = B;
    const x = c.getContext('2d');
    x.fillStyle = '#74b84a'; x.fillRect(0, 0, B, B);
    const rond = (px, py, r, kleur) => {       // tekenen met omloop, zodat de tegel naadloos aansluit
      x.fillStyle = kleur;
      for (const dx of [-B, 0, B]) for (const dy of [-B, 0, B]) { x.beginPath(); x.arc(px + dx, py + dy, r, 0, 6.3); x.fill(); }
    };
    for (let i = 0; i < 260; i++) rond(R() * B, R() * B, 14 + R() * 46, ['rgba(60,140,50,0.10)', 'rgba(150,210,90,0.10)', 'rgba(90,170,60,0.12)', 'rgba(200,220,110,0.06)'][(R() * 4) | 0]);
    for (let i = 0; i < 5000; i++) {
      x.strokeStyle = R() < 0.5 ? 'rgba(40,110,40,0.28)' : 'rgba(170,225,110,0.28)'; x.lineWidth = 1.2;
      const px = R() * B, py = R() * B; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 3, py - 3 - R() * 5); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 11, 1 / 11); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  })();
  const grond = new THREE.Mesh(grondGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, map: grasTex }));
  scene.add(grond);

  // verre heuvels achter het bos
  const heuvelMat = new THREE.MeshLambertMaterial({ color: 0x7fb39a, flatShading: true, fog: false });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + R() * 0.2, r = 150 + R() * 40, h = 28 + R() * 34;
    const m = new THREE.Mesh(new THREE.ConeGeometry(48 + R() * 30, h, 7), heuvelMat);
    m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); m.rotation.y = R() * 3; scene.add(m);
  }

  // schuine oever
  const oeverPos = [], oeverIdx = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, r = pondR(a);
    oeverPos.push(Math.cos(a) * (r + 0.02), 0.005, Math.sin(a) * (r + 0.02));
    oeverPos.push(Math.cos(a) * r * 0.88, -0.9, Math.sin(a) * r * 0.88);
    if (i < N) { const k = i * 2; oeverIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const oeverGeo = new THREE.BufferGeometry();
  oeverGeo.setAttribute('position', new THREE.Float32BufferAttribute(oeverPos, 3));
  oeverGeo.setIndex(oeverIdx); oeverGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(oeverGeo, new THREE.MeshLambertMaterial({ color: 0xd9c48a, side: THREE.DoubleSide, flatShading: true })));

  const bodemTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, '#0f4666'); g.addColorStop(0.55, '#1f6f8c'); g.addColorStop(0.85, '#4fb0b4'); g.addColorStop(1, '#8fd6c8');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bodem = new THREE.Mesh(new THREE.CircleGeometry(19, 40), new THREE.MeshLambertMaterial({ color: 0xffffff, map: bodemTex }));
  bodem.rotation.x = -Math.PI / 2; bodem.position.y = -1.7;
  scene.add(bodem);

  // ---------- water ----------
  const waterGeo = new THREE.PlaneGeometry(38, 38, 40, 40);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhongMaterial({ color: 0x3fa7dd, transparent: true, opacity: 0.74, flatShading: true, shininess: 140, specular: 0xd8f0ff });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = WATER_Y;
  scene.add(water);
  const wp = waterGeo.attributes.position;
  const wBasis = Float32Array.from(wp.array);

  // schuimrandje langs de oever
  const schuimPos = [], schuimIdx = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, r = pondR(a);
    schuimPos.push(Math.cos(a) * r * 0.995, 0, Math.sin(a) * r * 0.995, Math.cos(a) * r * 0.955, 0, Math.sin(a) * r * 0.955);
    if (i < N) { const k = i * 2; schuimIdx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const schuimGeo = new THREE.BufferGeometry();
  schuimGeo.setAttribute('position', new THREE.Float32BufferAttribute(schuimPos, 3)); schuimGeo.setIndex(schuimIdx);
  const schuimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
  const schuim = new THREE.Mesh(schuimGeo, schuimMat); schuim.position.y = WATER_Y + 0.05; scene.add(schuim);

  // waterplanten en keien op de bodem
  const wier = [], keien = [];
  for (let i = 0; i < 70; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * 11.5, h = 0.5 + R() * 0.9;
    wier.push({ x: Math.cos(a) * r, y: -1.7 + h / 2, z: Math.sin(a) * r, sx: 0.22, sy: h, sz: 0.22, c: [0x2f8f5a, 0x3fa86a, 0x257a4a][(R() * 3) | 0], rz: (R() - 0.5) * 0.3 });
  }
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.28, r = Math.sqrt(R()) * 11.5, k = 0.4 + R() * 0.8;
    keien.push({ x: Math.cos(a) * r, y: -1.62, z: Math.sin(a) * r, sx: k * 1.3, sy: k * 0.7, sz: k, ry: R() * 3, c: 0x6f8a94 });
  }
  const onderMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  scene.add(inst(new THREE.ConeGeometry(0.5, 1, 5), onderMat, wier), inst(new THREE.DodecahedronGeometry(0.5, 0), onderMat, keien));

  // schaduwen van vissen onder water
  const schimMat = new THREE.MeshBasicMaterial({ color: 0x123a52, transparent: true, opacity: 0.45, depthWrite: false });
  const schimmen = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(BOL, schimMat);
    m.scale.set(0.7 + R() * 0.6, 0.06, 0.22 + R() * 0.12);
    scene.add(m);
    schimmen.push({ m, a: R() * 6.28, r: 2 + R() * 6.5, v: (R() < 0.5 ? -1 : 1) * (0.12 + R() * 0.2), cx: R() * 3 - 1.5, cz: R() * 3 - 1.5 });
  }

  // ---------- bos ----------
  const stammen = [], kegels1 = [], kegels2 = [], kruinen = [], struiken = [];
  const groenen = [0x2f7d3a, 0x3a8f45, 0x276b33, 0x4a9a3c, 0x5aa84a];
  for (let i = 0; i < 170; i++) {
    const a = R() * Math.PI * 2, r = 25.5 + Math.pow(R(), 1.3) * 34;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.8 + R() * 0.9, c = groenen[(R() * groenen.length) | 0];
    if (R() < 0.62) {
      stammen.push({ x, y: 1.0 * s, z, sx: 0.5 * s, sy: 2 * s, sz: 0.5 * s, c: 0x7a5230 });
      kegels1.push({ x, y: 3.6 * s, z, sx: 3.6 * s, sy: 4 * s, sz: 3.6 * s, c, ry: R() * 3 });
      kegels2.push({ x, y: 6.0 * s, z, sx: 2.5 * s, sy: 3.4 * s, sz: 2.5 * s, c, ry: R() * 3 });
    } else {
      stammen.push({ x, y: 1.5 * s, z, sx: 0.55 * s, sy: 3 * s, sz: 0.55 * s, c: 0x6b4526 });
      kruinen.push({ x, y: 4.6 * s, z, sx: 4.4 * s, sy: 4 * s, sz: 4.4 * s, c, ry: R() * 3 });
    }
  }
  for (let i = 0; i < 26; i++) {
    const a = R() * Math.PI * 2, r = 23.6 + R() * 3;
    struiken.push({ x: Math.cos(a) * r, y: 0.5, z: Math.sin(a) * r, sx: 1.6 + R(), sy: 1.1 + R() * 0.6, sz: 1.6 + R(), c: groenen[(R() * 5) | 0] });
  }
  const wit = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  scene.add(
    inst(new THREE.CylinderGeometry(0.4, 0.5, 1, 6), wit, stammen),
    inst(new THREE.ConeGeometry(0.5, 1, 7), wit, kegels1),
    inst(new THREE.ConeGeometry(0.5, 1, 7), wit, kegels2),
    inst(new THREE.IcosahedronGeometry(0.5, 0), wit, kruinen),
    inst(new THREE.IcosahedronGeometry(0.5, 0), wit, struiken),
  );

  // stenen en bloemen op het gras
  const stenen = [], bloemen = [], stelen = [];
  const vrij = (x, z) => !inPond(x, z, -0.8) && Math.hypot(x, z) < 23 && !OBST.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.5) && !(Math.abs(x) < 1.6 && z > 10);
  for (let i = 0; i < 16; i++) {
    const a = R() * 6.28, r = pondR(a) + 0.3 + R() * 8, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!vrij(x, z) || Math.hypot(x - 3.6, z - 15.6) < 3.5) continue;
    const s = 0.35 + R() * 0.6;
    OBST.push({ x, z, r: s * 0.55 + 0.25 });
    stenen.push({ x, y: s * 0.25, z, sx: s * 1.3, sy: s * 0.8, sz: s, ry: R() * 3, c: R() < 0.5 ? 0x9a9a9a : 0xb0a898 });
  }
  const bloemKleur = [0xff6b9d, 0xffd633, 0xffffff, 0xc084ff, 0xff8a3c];
  for (let i = 0; i < 110; i++) {
    const a = R() * 6.28, r = pondR(a) + 1 + R() * 9.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!vrij(x, z)) continue;
    stelen.push({ x, y: 0.14, z, sx: 0.035, sy: 0.28, sz: 0.035, c: 0x3d8f3a });
    bloemen.push({ x, y: 0.31, z, s: 0.14, c: bloemKleur[(R() * 5) | 0] });
  }
  const pollen = [];
  for (let i = 0; i < 900; i++) {
    const a = R() * 6.28, r = pondR(a) + 0.4 + R() * 11, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x, z) > 25 || (Math.abs(x) < 1.6 && z > 10 && z < 15)) continue;
    const h = 0.1 + R() * 0.16;
    for (let j = 0; j < 3; j++) pollen.push({ x: x + (R() - 0.5) * 0.22, y: h / 2, z: z + (R() - 0.5) * 0.22, sx: 0.05, sy: h * (0.7 + R() * 0.5), sz: 0.05, rx: (R() - 0.5) * 0.5, rz: (R() - 0.5) * 0.5, c: [0x6cc04a, 0x7ccc54, 0x62b444, 0x92d862][(R() * 4) | 0] });
  }
  const polMesh = inst(new THREE.ConeGeometry(0.5, 1, 4), wit, pollen);
  polMesh.userData.geenSchaduw = true;
  scene.add(polMesh);
  scene.add(inst(new THREE.DodecahedronGeometry(0.5, 0), wit, stenen), inst(CIL, wit, stelen), inst(new THREE.IcosahedronGeometry(0.5, 0), wit, bloemen));

  // ---------- riet ----------
  const riet = [];
  for (const k of RIET) {
    const tx = -Math.sin(k.a), tz = Math.cos(k.a), rx = Math.cos(k.a), rz = Math.sin(k.a);
    for (let i = 0; i < 26; i++) {
      const langs = (R() - 0.5) * 5.4, dwars = 0.3 + R() * 1.6;
      riet.push({ x: k.x + tx * langs + rx * dwars, z: k.z + tz * langs + rz * dwars, h: 1.7 + R() * 1.1, f: R() * 6.28, ry: R() * 6.28 });
    }
  }
  const stengels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.035, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x7fae3c }), riet.length);
  const pluimen = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 6), new THREE.MeshLambertMaterial({ color: 0x6b4022 }), riet.length);
  scene.add(stengels, pluimen);

  // ---------- waterlelies ----------
  const lelies = [];
  const bladGeo = new THREE.CircleGeometry(0.5, 12, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2);
  const bladMat = [M(0x3f9c4a), M(0x55b05a)];
  for (const k of LELIES) {
    for (let i = 0; i < 9; i++) {
      const a = R() * 6.28, r = Math.sqrt(R()) * 2.6;
      const g = new THREE.Group();
      const blad = new THREE.Mesh(bladGeo, bladMat[i % 2]); blad.scale.setScalar(0.7 + R() * 0.7); blad.rotation.y = R() * 6.28;
      g.add(blad);
      if (i % 3 === 0) {
        const kleur = M(i % 2 ? 0xffffff : 0xff9ad0);
        for (let j = 0; j < 6; j++) {
          const p = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 4), kleur);
          const b = (j / 6) * 6.28;
          p.position.set(Math.cos(b) * 0.08, 0.1, Math.sin(b) * 0.08); p.rotation.set(Math.sin(b) * 0.6, 0, -Math.cos(b) * 0.6);
          g.add(p);
        }
        const hart = new THREE.Mesh(BOL, M(0xffd633)); hart.scale.setScalar(0.1); hart.position.y = 0.08; g.add(hart);
      }
      g.position.set(k.x + Math.cos(a) * r, WATER_Y + 0.05, k.z + Math.sin(a) * r);
      g.userData.f = R() * 6.28;
      lelies.push(g); scene.add(g);
    }
  }

  // ---------- steiger ----------
  const hout = M(0xb98a52), houtD = M(0x8a623a);
  const steiger = new THREE.Group();
  const lang = DOCK.z1 - DOCK.z0, nPlank = 18;
  for (let i = 0; i < nPlank; i++) {
    box(steiger, i % 2 ? hout : M(0xc79a62), 0, DOCK.y - 0.06, DOCK.z0 + (i + 0.5) * (lang / nPlank), 2.3, 0.1, lang / nPlank - 0.05);
  }
  for (const z of [DOCK.z0 + 0.3, DOCK.z0 + 3, DOCK.z0 + 5.8, 11.6]) for (const x of [-1.05, 1.05]) {
    const p = new THREE.Mesh(CIL, houtD); p.position.set(x, -0.35, z); p.scale.set(0.22, 1.9, 0.22); steiger.add(p);
  }
  box(steiger, houtD, 0, 0.05, DOCK.z1 + 0.5, 2.3, 0.1, 1.2).rotation.x = 0.22;   // oprit
  scene.add(steiger);

  // ---------- kraampje ----------
  const kraam = new THREE.Group();
  box(kraam, hout, 0, 0.55, 0.6, 3.4, 1.1, 0.9);
  box(kraam, houtD, 0, 1.13, 0.6, 3.6, 0.08, 1.1);
  for (const x of [-1.6, 1.6]) for (const z of [-0.9, 0.95]) { const p = new THREE.Mesh(CIL, houtD); p.position.set(x, 1.4, z); p.scale.set(0.14, 2.8, 0.14); kraam.add(p); }
  for (let i = 0; i < 8; i++) { const s = box(kraam, M(i % 2 ? 0xffffff : 0xe2443a), -1.58 + i * 0.45, 2.85, 0.1, 0.45, 0.06, 2.6); s.rotation.x = 0.22; }
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), bord('VIS & SPUL')); kb.position.set(0, 3.25, 1.35); kraam.add(kb);
  box(kraam, houtD, 0, 3.25, 1.32, 2.7, 0.75, 0.05);
  // verkoper
  const verkoper = new THREE.Group();
  const lijf = new THREE.Mesh(CIL, M(0x3a78c8)); lijf.position.y = 1.0; lijf.scale.set(0.7, 1.3, 0.5); verkoper.add(lijf);
  const hoofd = new THREE.Mesh(BOL, M(0xf2c9a0)); hoofd.position.y = 1.95; hoofd.scale.setScalar(0.55); verkoper.add(hoofd);
  const hoed = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.35, 10), M(0xe8c86a)); hoed.position.y = 2.3; verkoper.add(hoed);
  for (const k of [-1, 1]) { const o = new THREE.Mesh(BOL, M(0x222222)); o.position.set(k * 0.12, 2.0, 0.25); o.scale.setScalar(0.07); verkoper.add(o); }
  const snor = box(verkoper, M(0x5a3a22), 0, 1.86, 0.27, 0.24, 0.05, 0.05);
  verkoper.position.set(0, 0, -0.35); kraam.add(verkoper);
  // spulletjes op de toonbank
  box(kraam, M(0x9ad0ff), -1.1, 1.3, 0.6, 0.6, 0.25, 0.5); box(kraam, M(0xff8a3c), -1.1, 1.45, 0.6, 0.4, 0.08, 0.14);
  box(kraam, M(0x8a623a), 1.1, 1.3, 0.6, 0.5, 0.25, 0.5); box(kraam, M(0xffd633), 1.1, 1.46, 0.6, 0.3, 0.08, 0.3);
  kraam.position.set(STALL.x, 0, STALL.z); kraam.lookAt(0, 0, 0);
  scene.add(kraam);

  // ---------- aquariumhut ----------
  const hut = new THREE.Group();
  box(hut, M(0x9a9a9a), 0, 0.3, 0, 5.6, 0.6, 2.2);
  for (const x of [-2.9, 2.9]) for (const z of [-1.2, 1.2]) { const p = new THREE.Mesh(CIL, houtD); p.position.set(x, 1.9, z); p.scale.set(0.2, 3.8, 0.2); hut.add(p); }
  const dak = new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.6, 4), M(0xc2553a)); dak.position.y = 4.55; dak.rotation.y = Math.PI / 4; dak.scale.set(1, 1, 0.55); hut.add(dak);
  const ab = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), bord('AQUARIUM', '#d6f3ff', '#1a5a8a')); ab.position.set(0, 3.5, 1.3); hut.add(ab);
  box(hut, M(0xe8d9a0), 0, 0.66, 0, 5.1, 0.12, 1.7);    // zand
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7 + R() * 0.7, 5), M(i % 2 ? 0x3f9c4a : 0x2f7d5a));
    p.position.set(-2.2 + i * 0.85 + R() * 0.3, 1.0, -0.5 + R() * 0.3); hut.add(p);
  }
  const rots = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), M(0x8a8a8a)); rots.position.set(1.6, 0.85, -0.3); hut.add(rots);
  const tank = new THREE.Group(); hut.add(tank);     // hierin zwemmen de bewaarde vissen
  const tankWater = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: 0x4db4ff, transparent: true, opacity: 0.42, depthWrite: false }));
  tankWater.position.set(0, 1.65, 0); tankWater.scale.set(5.1, 2.0, 1.7); tankWater.renderOrder = 2; hut.add(tankWater);
  for (const x of [-2.57, 2.57]) for (const z of [-0.87, 0.87]) box(hut, M(0x444a55), x, 1.7, z, 0.08, 2.2, 0.08);
  box(hut, M(0x444a55), 0, 2.78, 0.87, 5.2, 0.08, 0.08); box(hut, M(0x444a55), 0, 2.78, -0.87, 5.2, 0.08, 0.08);
  hut.position.set(HUT.x, 0, HUT.z); hut.lookAt(0, 0, 0);
  scene.add(hut);

  // ---------- schaduwen: alles wat stevig is werpt en vangt schaduw ----------
  scene.traverse(o => {
    if (!o.isMesh || o === koepel || o === water || o === zonBol || o === maanBol) return;
    const m = o.material;
    if (!m.isMeshLambertMaterial || m.transparent || m === wolkMat || m === heuvelMat) return;
    o.receiveShadow = true;
    o.castShadow = !o.userData.geenSchaduw && o !== grond && o !== bodem;
  });

  // ---------- vuurvliegjes ----------
  const vvPos = new Float32Array(40 * 3), vv = [];
  for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = 8 + R() * 14; vv.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.6 + R() * 2, f: R() * 6.28 }); }
  const vvGeo = new THREE.BufferGeometry(); vvGeo.setAttribute('position', new THREE.BufferAttribute(vvPos, 3));
  const vliegjes = new THREE.Points(vvGeo, new THREE.PointsMaterial({ color: 0xf6ff8a, size: 0.09, transparent: true, opacity: 0, depthWrite: false }));
  scene.add(vliegjes);

  // ---------- spetters en rimpelingen ----------
  const druppels = [];
  const druppelMat = new THREE.MeshBasicMaterial({ color: 0xdff4ff });
  for (let i = 0; i < 48; i++) {
    const m = new THREE.Mesh(BOL, druppelMat); m.visible = false; scene.add(m);
    druppels.push({ m, vx: 0, vy: 0, vz: 0, actief: false });
  }
  const ringen = [];
  const ringGeo = new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2);
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; m.position.y = WATER_Y + 0.06; scene.add(m);
    ringen.push({ m, t: 0, duur: 1, max: 1, actief: false });
  }
  W.splash = (x, z, n = 10, kracht = 1) => {
    let k = 0;
    for (const d of druppels) {
      if (d.actief) continue;
      const a = Math.random() * 6.28, v = (0.6 + Math.random() * 1.6) * kracht;
      d.actief = true; d.m.visible = true; d.m.position.set(x, WATER_Y + 0.05, z);
      d.m.scale.setScalar(0.06 + Math.random() * 0.08);
      d.vx = Math.cos(a) * v; d.vz = Math.sin(a) * v; d.vy = (2.2 + Math.random() * 2.6) * kracht;
      if (++k >= n) break;
    }
  };
  W.ripple = (x, z, max = 1.2, duur = 1.2) => {
    const r = ringen.find(q => !q.actief); if (!r) return;
    r.actief = true; r.t = 0; r.max = max; r.duur = duur; r.m.visible = true; r.m.position.x = x; r.m.position.z = z;
  };
  W.tank = tank;

  // ---------- kleuren voor dag / zonsondergang / avond ----------
  const K = (h) => new THREE.Color(h);
  const dag = { lucht: K(0xa9dcff), boven: K(0x3d94ea), hemi: K(0xdff3ff), zon: K(0xfff2d6), water: K(0x3fa7dd) };
  const nacht = { lucht: K(0x2a3a7a), boven: K(0x0a1238), hemi: K(0x7f92d8), zon: K(0x9db4ff), water: K(0x1d4a8a) };
  const heuvelKleur = K(0x5f9a72);
  const gloed = K(0xff9a62);
  const tmp = new THREE.Color(), tmp2 = new THREE.Color();

  // ---------- regen: strepen die vallen, grijzere lucht en kringetjes op het water ----------
  const REGEN_N = 1300, regenPos = new Float32Array(REGEN_N * 6), regenD = [];
  for (let i = 0; i < REGEN_N; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 30; regenD.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: R() * 16, v: 16 + R() * 8 }); }
  const regenGeo = new THREE.BufferGeometry(); regenGeo.setAttribute('position', new THREE.BufferAttribute(regenPos, 3));
  const regenMat = new THREE.LineBasicMaterial({ color: 0xd6e8ff, transparent: true, opacity: 0, depthWrite: false });
  const regenLijnen = new THREE.LineSegments(regenGeo, regenMat);
  regenLijnen.frustumCulled = false; regenLijnen.visible = false; scene.add(regenLijnen);
  const grijs = { lucht: K(0x93a4b3), boven: K(0x6c7f93), wolk: K(0xaab4c0) };
  W.regen = 0;          // 0 = droog, 1 = volop regen (het spel zet dit)
  let springT = 6;

  W.update = (t, dt) => {
    // dag-avondcyclus van 5 minuten: 150 s dag, schemer, 80 s avond, schemer
    const c = t % 300;
    let e = 0;
    if (c > 150 && c < 180) e = (c - 150) / 30; else if (c >= 180 && c < 265) e = 1; else if (c >= 265 && c < 295) e = 1 - (c - 265) / 30;
    e = e * e * (3 - 2 * e);
    W.eve = e;
    const s = 4 * e * (1 - e), rg = W.regen, donker = 1 - 0.65 * e;
    tmp.copy(dag.lucht).lerp(nacht.lucht, e).lerp(gloed, s * 0.55).lerp(tmp2.copy(grijs.lucht).multiplyScalar(donker), rg * 0.75);
    scene.background.copy(tmp); scene.fog.color.copy(tmp);
    koepelMat.uniforms.horizon.value.copy(tmp);
    heuvelMat.color.copy(tmp).lerp(heuvelKleur, 0.45 - e * 0.2);
    koepelMat.uniforms.boven.value.copy(dag.boven).lerp(nacht.boven, e).lerp(gloed, s * 0.18);
    schuimMat.opacity = (0.3 + Math.sin(t * 1.3) * 0.1) * (1 - e * 0.5);
    hemi.color.copy(dag.hemi).lerp(nacht.hemi, e); hemi.intensity = 1.7 - 0.45 * e;
    zon.color.copy(dag.zon).lerp(nacht.zon, e).lerp(gloed, s * 0.6); zon.intensity = 2.1 - 1.1 * e;
    waterMat.color.copy(dag.water).lerp(nacht.water, e).lerp(gloed, s * 0.25);
    zonBol.position.set(70, 62 - e * 85, -60); zonBol.material.color.set(0xfff3a0).lerp(gloed, Math.min(1, e * 2));
    maanBol.position.set(-60, -25 + e * 80, -70);
    zonHalo.position.copy(zonBol.position); zonHalo.material.color.copy(zonBol.material.color); zonHalo.material.opacity = 0.9 * (1 - rg);
    maanHalo.position.copy(maanBol.position); maanHalo.material.opacity = e * 0.8;
    sterren.material.opacity = Math.max(0, e - 0.3) * 1.3;
    vliegjes.material.opacity = e * 0.95;
    wolkMat.color.set(0xffffff).lerp(nacht.lucht, e * 0.7).lerp(gloed, s * 0.5);
    wolkOnder.color.set(0xe4ecf6).lerp(nacht.lucht, e * 0.8).lerp(gloed, s * 0.6);
    if (rg > 0) {
      koepelMat.uniforms.boven.value.lerp(tmp2.copy(grijs.boven).multiplyScalar(donker), rg * 0.85);
      wolkMat.color.lerp(tmp2.copy(grijs.wolk).multiplyScalar(donker), rg * 0.8);
      wolkOnder.color.lerp(tmp2.copy(grijs.wolk).multiplyScalar(donker * 0.8), rg * 0.85);
      hemi.intensity *= 1 - 0.2 * rg; zon.intensity *= 1 - 0.55 * rg;
    }
    regenLijnen.visible = rg > 0.02;
    if (regenLijnen.visible) {
      regenMat.opacity = 0.5 * rg;
      for (let i = 0; i < REGEN_N; i++) {
        const d = regenD[i], k = i * 6;
        d.y -= d.v * dt; if (d.y < -0.2) d.y += 16;
        regenPos[k] = d.x; regenPos[k + 1] = d.y; regenPos[k + 2] = d.z;
        regenPos[k + 3] = d.x + 0.06; regenPos[k + 4] = d.y + 0.55; regenPos[k + 5] = d.z;
      }
      regenGeo.attributes.position.needsUpdate = true;
      if (Math.random() < rg * dt * 16 && ringen.filter(q => !q.actief).length > 8) {
        const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 13;
        W.ripple(Math.cos(a) * r, Math.sin(a) * r, 0.45, 0.6);
      }
    }

    // golfjes
    const arr = wp.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = wBasis[i], z = wBasis[i + 2];
      arr[i + 1] = Math.sin(x * 0.7 + t * 1.3) * 0.045 + Math.cos(z * 0.55 + t * 1.05) * 0.045 + Math.sin((x + z) * 1.3 + t * 2.1) * 0.015;
    }
    wp.needsUpdate = true;

    // riet wuift
    for (let i = 0; i < riet.length; i++) {
      const r = riet[i], zw = Math.sin(t * 1.4 + r.f) * 0.07 + Math.sin(t * 0.6 + r.f * 2) * 0.04;
      dummy.position.set(r.x, -0.5, r.z); dummy.rotation.set(zw, r.ry, zw * 0.8); dummy.scale.set(1, r.h + 0.5, 1); dummy.updateMatrix();
      stengels.setMatrixAt(i, dummy.matrix);
      dummy.position.set(r.x + zw * r.h * 0.8, -0.5 + (r.h + 0.5) * 0.93, r.z + zw * r.h); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      pluimen.setMatrixAt(i, dummy.matrix);
    }
    stengels.instanceMatrix.needsUpdate = true; pluimen.instanceMatrix.needsUpdate = true;

    for (const l of lelies) { l.position.y = WATER_Y + 0.05 + Math.sin(t * 1.2 + l.userData.f) * 0.03; l.rotation.z = Math.sin(t + l.userData.f) * 0.04; }
    for (const q of schimmen) {
      q.a += q.v * dt;
      q.m.position.set(q.cx + Math.cos(q.a) * q.r, -0.55, q.cz + Math.sin(q.a) * q.r * 0.8);
      q.m.rotation.y = -q.a - (q.v > 0 ? Math.PI / 2 : -Math.PI / 2);
      q.m.visible = inPond(q.m.position.x, q.m.position.z, 1.5);
    }
    for (const w of wolken) { w.position.x += dt * 0.7; if (w.position.x > 90) w.position.x = -90; }
    for (let i = 0; i < vv.length; i++) {
      const f = vv[i];
      vvPos[i * 3] = f.x + Math.sin(t * 0.5 + f.f) * 1.5; vvPos[i * 3 + 1] = f.y + Math.sin(t * 0.9 + f.f * 3) * 0.5; vvPos[i * 3 + 2] = f.z + Math.cos(t * 0.4 + f.f) * 1.5;
    }
    vvGeo.attributes.position.needsUpdate = true;

    for (const d of druppels) {
      if (!d.actief) continue;
      d.vy -= 9.5 * dt;
      d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
      if (d.m.position.y < WATER_Y - 0.05) { d.actief = false; d.m.visible = false; }
    }
    for (const r of ringen) {
      if (!r.actief) continue;
      r.t += dt / r.duur;
      if (r.t >= 1) { r.actief = false; r.m.visible = false; continue; }
      r.m.scale.setScalar(0.15 + r.t * r.max); r.m.material.opacity = (1 - r.t) * 0.7;
    }
    // af en toe springt er ergens een visje
    springT -= dt;
    if (springT <= 0) {
      springT = 5 + Math.random() * 9;
      const a = Math.random() * 6.28, r = Math.random() * 8;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!onDock(x, z, -0.5)) { W.splash(x, z, 4, 0.6); W.ripple(x, z, 1.4, 1.6); W.onSpring && W.onSpring(x, z); }
    }
    verkoper.rotation.y = Math.sin(t * 0.7) * 0.25; snor.rotation.z = Math.sin(t * 3) * 0.05;
  };
  return W;
}
