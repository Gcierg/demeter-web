// "The journey of a spore": a voxel-art 3D sequence driven by scroll.
// Two voxel worlds: MICRO (spores, gel, water) and FARM (tank, farmer, rice paddies). render(p, t): p = scroll progress 0..1.
import * as THREE from './vendor/three.module.min.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u, seg = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, eo = u => 1 - Math.pow(1 - u, 3);
const hash = (x, y = 0, z = 0) => { let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function createJourney(canvas) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.toneMapping = THREE.NeutralToneMapping;
  const cam = new THREE.PerspectiveCamera(38, 1, 1, 900);
  // one cube, with a soft dark edge so every voxel reads
  const tc = document.createElement('canvas'); tc.width = tc.height = 32; const tg = tc.getContext('2d'); tg.fillStyle = '#fff'; tg.fillRect(0, 0, 32, 32); tg.strokeStyle = 'rgba(0,0,0,.24)'; tg.lineWidth = 3; tg.strokeRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const BOX = new THREE.BoxGeometry(1, 1, 1), col = new THREE.Color();
  const solid = () => new THREE.MeshStandardMaterial({ map: tex, roughness: .8, metalness: 0 });
  const glass = (c, o) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: o, roughness: .15, metalness: 0, depthWrite: false });
  const glow = () => new THREE.MeshBasicMaterial({ map: tex });
  function inst(mat, n, shadow = true) { const m = new THREE.InstancedMesh(BOX, mat, n); m.frustumCulled = false; m.castShadow = m.receiveShadow = shadow; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; }
  const tint = (hex, i, amt = .1) => { col.set(hex); const n = 1 + (hash(i, 7) - .5) * amt; col.r *= n; col.g *= n; col.b *= n; return col; };
  // write a scaled, optionally rotated cube: m = array, o = offset
  function put(m, i, x, y, z, s, r) { const o = i * 16; if (r) { m[o] = r[0] * s; m[o + 1] = r[1] * s; m[o + 2] = r[2] * s; m[o + 4] = r[3] * s; m[o + 5] = r[4] * s; m[o + 6] = r[5] * s; m[o + 8] = r[6] * s; m[o + 9] = r[7] * s; m[o + 10] = r[8] * s; } else { m[o] = s; m[o + 1] = 0; m[o + 2] = 0; m[o + 4] = 0; m[o + 5] = s; m[o + 6] = 0; m[o + 8] = 0; m[o + 9] = 0; m[o + 10] = s; } m[o + 3] = 0; m[o + 7] = 0; m[o + 11] = 0; m[o + 12] = x; m[o + 13] = y; m[o + 14] = z; m[o + 15] = 1; }
  const rotYX = (a, b) => { const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b); return [ca, 0, -sa, sa * sb, cb, ca * sb, sa * cb, -sb, ca * cb]; };
  const rot = (r, v) => [r[0] * v[0] + r[3] * v[1] + r[6] * v[2], r[1] * v[0] + r[4] * v[1] + r[7] * v[2], r[2] * v[0] + r[5] * v[1] + r[8] * v[2]];

  // ================================================================== MICRO world
  const micro = new THREE.Scene(); micro.fog = new THREE.Fog('#0f3a34', 70, 330);
  const mSun = new THREE.DirectionalLight('#fff4dc', 2.6); mSun.position.set(-40, 70, 60); micro.add(mSun, new THREE.HemisphereLight('#c8f0ff', '#12332a', 1.5));
  // the hero spore: a textured voxel sphere with pores and ridges
  const BIG = []; { const r = 12; for (let x = -r - 1; x <= r + 1; x++) for (let y = -r - 1; y <= r + 1; y++) for (let z = -r - 1; z <= r + 1; z++) { const d = Math.hypot(x, y, z), bump = Math.sin(x * .9) * Math.sin(y * .8 + 1) * Math.sin(z * .85 + 2) * 1.1; if (d <= r + bump && d > r - 1.6 + bump) BIG.push([x, y, z, d]); } }
  const bigM = inst(solid(), BIG.length, false); micro.add(bigM);
  BIG.forEach((v, i) => { const n = Math.sin(v[0] * .9) * Math.sin(v[1] * .8 + 1) * Math.sin(v[2] * .85 + 2), pore = hash(v[0] >> 1, v[1] >> 1, v[2] >> 1) < .07; bigM.setColorAt(i, tint(pore ? '#2f5a2a' : n > .35 ? '#b9dc74' : n < -.35 ? '#5f8f38' : '#86b84a', i, .12)); });
  // gel molecules that wrap it
  const SHELL = []; for (let i = 0; i < 230; i++) { const a = Math.acos(1 - 2 * (i + .5) / 230), b = i * 2.39996; SHELL.push([Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)]); }
  // the suspension: many small spores, each in its own gel coat, with green and violet molecules between them
  const SM = []; { const r = 3; for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) { const d = Math.hypot(x, y, z); if (d <= r + .3 && d > r - 1.3) SM.push([x, y, z]); } }
  const NS = 84, SP = []; for (let i = 0; i < NS; i++) { let p; for (let k = 0; k < 30; k++) { p = [(hash(i, k, 1) - .5) * 210, (hash(i, k, 2) - .5) * 250, (hash(i, k, 3) - .5) * 170 - 20]; if (Math.hypot(...p) > 34 && SP.every(q => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) > 24)) break; } SP.push(p); }
  const smM = inst(solid(), NS * SM.length, false); micro.add(smM);
  for (let s = 0; s < NS; s++) for (let k = 0; k < SM.length; k++) { const v = SM[k], violet = s % 4 === 0, top = v[1] > 1; smM.setColorAt(s * SM.length + k, tint(violet ? (top ? '#d6c0f5' : '#a98ae0') : (top ? '#b9dc74' : '#7da843'), s * 97 + k, .12)); }
  const COAT = [[1, 1, 1], [-1, 1, 1], [1, -1, 1], [-1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, -1, -1], [-1, -1, -1], [1.5, 0, 0], [-1.5, 0, 0], [0, 1.5, 0], [0, -1.5, 0], [0, 0, 1.5], [0, 0, -1.5]];
  const gelM = inst(glass('#d8f6ff', .34), SHELL.length + NS * COAT.length, false); micro.add(gelM);
  const NM = 520, molM = inst(glow(), NM, false); micro.add(molM);
  for (let i = 0; i < NM; i++) molM.setColorAt(i, col.set(i % 3 === 0 ? '#c9a8ff' : i % 3 === 1 ? '#9be36a' : '#6fd0a8'));
  const NW = 900, watM = inst(glass('#9fdcff', .6), NW, false); micro.add(watM);

  // ================================================================== FARM world
  const farm = new THREE.Scene(); farm.fog = new THREE.Fog('#cfe7dc', 150, 520);
  const sun = new THREE.DirectionalLight('#fff0d2', 2.9); sun.position.set(-50, 90, 40); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 10, far: 300 }); sun.shadow.bias = -.0006; sun.shadow.normalBias = .05;
  farm.add(sun, sun.target, new THREE.HemisphereLight('#dff3ff', '#4a5a38', 1.35));
  const FV = []; const add = (x, y, z, hex) => FV.push([x, y, z, hex]);
  const pick = (a, x, y, z) => a[Math.floor(hash(x, y, z) * a.length)];
  const GR = ['#7CA240', '#86AC48', '#739838'], DI = ['#7A5230', '#6E4A2A', '#85593A'], WA = ['#4A9DD0', '#3F92C6', '#57A8D8'];
  const inPaddy = (x, z) => (x >= -40 && x <= -6 && z >= -34 && z <= 30) || (x >= 6 && x <= 40 && z >= -34 && z <= 8);
  const RICE = [];                                              // rice plants, kept apart so they can sway and take spores
  for (let x = -48; x <= 48; x++) for (let z = -44; z <= 44; z++) {
    const edge = Math.abs(x) === 48 || Math.abs(z) === 44, pad = inPaddy(x, z), dike = !pad && (inPaddy(x + 1, z) || inPaddy(x - 1, z) || inPaddy(x, z + 1) || inPaddy(x, z - 1));
    if (pad) { add(x, -.35, z, pick(WA, x, 0, z)); if (((x + 60) % 2 === 0) && ((z + 60) % 3 === 0)) RICE.push([x, z, 3 + Math.floor(hash(x, z, 5) * 3)]); }
    else add(x, dike ? .4 : 0, z, dike ? pick(DI, x, 1, z) : (Math.abs(x) <= 2 ? (hash(x, z) < .5 ? '#CDB78C' : '#BFA87D') : pick(GR, x, 0, z)));
    if (edge) for (let y = 1; y <= 5; y++) add(x, -y, z, pick(y < 3 ? DI : ['#6B6F72', '#5E6265'], x, y, z));
  }
  const box = (x0, x1, y0, y1, z0, z1, hex) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1) add(x, y, z, typeof hex === 'function' ? hex(x, y, z) : hex); };
  // the mixing tank: a blue drum on a small slab
  const TK = [22, 26]; box(TK[0] - 7, TK[0] + 7, 1, 1, TK[1] - 7, TK[1] + 7, '#9A9C96');
  for (let y = 2; y <= 9; y++) for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) { const d = Math.hypot(x, z); if (d <= 6.3 && d > 5.2) add(TK[0] + x, y, TK[1] + z, y === 9 || y === 5 ? '#1E5F96' : '#2F7FC0'); }
  // shed, trees, palms, hills, fence: the things that make it a place
  box(8, 20, 1, 6, 12, 20, (x, y, z) => (y < 2 ? '#B9B1A0' : '#E8DFCC')); for (let k = 0; k <= 5; k++) box(7 + k, 21 - k, 7 + k, 7 + k, 11, 21, '#B5482F'); box(13, 15, 1, 4, 20, 20, '#6E4A2A');
  const tree = (x, z, h, c) => { for (let y = 1; y <= h; y++) add(x, y, z, '#6E4A2A'); for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dx, dy * 1.2, dz) <= 3.3 && hash(x + dx, dy, z + dz) < .86) add(x + dx, h + 2 + dy, z + dz, pick(c, dx, dy, dz)); };
  [[-44, 38, 7], [-36, 40, 9], [45, -40, 9], [-45, -40, 8], [40, 40, 7]].forEach(([x, z, h]) => tree(x, z, h, ['#2F6B3A', '#3A7D45', '#27603A']));
  const palm = (x, z, h) => { for (let y = 1; y <= h; y++) add(x + Math.round(y * .12), y, z, y % 2 ? '#8A6240' : '#7A5230'); for (let a = 0; a < 6; a++) for (let k = 1; k <= 5; k++) add(x + 1 + Math.round(Math.cos(a * 1.047) * k), h + 1 - Math.floor(k * k * .1), z + Math.round(Math.sin(a * 1.047) * k), k % 2 ? '#5FAE4A' : '#4E9A3D'); };
  palm(30, 38, 11); palm(-46, 4, 12); palm(46, 30, 10);
  const hillH = (x, z) => { if (x < -48 || x > 48 || z < -62 || z > -46) return 0; const d = (-46 - z) / 16, ridge = Math.sin(d * Math.PI); return Math.max(0, Math.round((8 + 7 * Math.sin(x * .09 + 1) + 4 * Math.sin(x * .23)) * ridge)); };
  for (let x = -48; x <= 48; x++) for (let z = -62; z <= -46; z++) { const h = hillH(x, z), low = Math.min(hillH(x + 1, z), hillH(x - 1, z), hillH(x, z + 1), hillH(x, z - 1)); for (let y = 1; y <= h; y++) if (y > low - 1 || y === h) add(x, y, z, y > 11 ? '#2D5A48' : pick(['#4F7F36', '#5A8C3C', '#477531'], x, y, z)); }
  for (let x = -47; x <= 47; x += 4) { add(x, 1, 43, '#8A6240'); add(x, 2, 43, '#8A6240'); } for (let x = -47; x <= 47; x++) add(x, 2, 43, '#A07850');
  // a drip-irrigated bed along the front: two rows, a black pipe on each
  for (let x = -41; x <= -7; x++) for (const z of [35, 36, 38, 39]) add(x, .5, z, pick(['#5a3a22', '#63402a'], x, 2, z));
  for (let x = -42; x <= -6; x++) { add(x, 1.5, 37, '#1c1c1c'); if ((x + 60) % 3 === 0) add(x, 1.5, 36, '#2a2a2a'), add(x, 1.5, 38, '#2a2a2a'); }
  for (let y = 1; y <= 4; y++) add(-6, y, 37, '#1c1c1c'); add(-6, 5, 37, '#2F7FC0'); add(-5, 5, 37, '#2F7FC0');
  for (let x = -40; x <= -8; x += 3) for (const z of [35, 39]) { const h = 2 + Math.floor(hash(x, z, 9) * 2); for (let y = 1; y <= h; y++) add(x, y + .5, z, y === h ? '#5FAE4A' : '#4E9A3D'); add(x + 1, h + .5, z, '#5FAE4A'); if (hash(x, z, 4) < .6) add(x, h - .5, z + (z < 37 ? -1 : 1), '#E2402F'); }
  const farmM = inst(solid(), FV.length); farm.add(farmM);
  FV.forEach((v, i) => { put(farmM.instanceMatrix.array, i, v[0], v[1], v[2], 1); farmM.setColorAt(i, tint(v[3], i, .08)); }); farmM.instanceMatrix.needsUpdate = true;
  // rice
  const RN = RICE.reduce((a, r) => a + r[2], 0), riceM = inst(solid(), RN); farm.add(riceM);
  { let i = 0; for (const [x, z, h] of RICE) for (let y = 0; y < h; y++) riceM.setColorAt(i++, tint(y === h - 1 ? '#C9DF7A' : y === 0 ? '#5F9838' : '#84BE4C', i, .1)); }
  // the tank's water and the spores swirling in it
  const tankW = inst(glass('#58b6e6', .7), 113, false); farm.add(tankW);
  { let i = 0; for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) if (Math.hypot(x, z) <= 5.3 && i < 113) put(tankW.instanceMatrix.array, i++, TK[0] + x, 8, TK[1] + z, 1); tankW.count = i; tankW.instanceMatrix.needsUpdate = true; }
  const swirlM = inst(glow(), 90, false); farm.add(swirlM); for (let i = 0; i < 90; i++) swirlM.setColorAt(i, col.set(i % 3 ? '#b6f07a' : '#d3b4ff'));
  // the farmer: boots, trousers, shirt, gloves, straw hat; a paddle at the tank, a spray lance in the field
  const man = new THREE.Group(); farm.add(man);
  const MAN = []; const ma = (x, y, z, hex) => MAN.push([x, y, z, hex]);
  for (const sx of [-1, 1]) { for (let y = 0; y <= 1; y++) ma(sx, y, 0, '#3A2A1E'); for (let y = 2; y <= 5; y++) ma(sx, y, 0, '#3F5878'); }
  for (let y = 6; y <= 10; y++) for (let x = -2; x <= 2; x++) for (let z = -1; z <= 0; z++) ma(x, y, z, y === 6 ? '#6E4A2A' : (x + y) % 3 === 0 ? '#C94B3A' : '#D9604C');
  for (let y = 11; y <= 13; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 0; z++) ma(x, y, z, '#C98F62'); ma(-1, 12, 1, '#2A1C14'); ma(1, 12, 1, '#2A1C14');
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 3; z++) if (Math.hypot(x, z + .5) <= 4.4) ma(x, 14, z, (x + z) % 2 ? '#E3C878' : '#D6B966'); for (let x = -2; x <= 2; x++) for (let z = -2; z <= 1; z++) { ma(x, 15, z, '#E3C878'); if (Math.abs(x) < 2) ma(x, 16, z, '#D6B966'); }
  const manM = inst(solid(), MAN.length); man.add(manM); MAN.forEach((v, i) => { put(manM.instanceMatrix.array, i, v[0], v[1] + .5, v[2], 1); manM.setColorAt(i, tint(v[3], i, .06)); }); manM.instanceMatrix.needsUpdate = true;
  const arm = (side) => { const g = new THREE.Group(); g.position.set(side * 3, 10, 0); const m = inst(solid(), 6); for (let k = 0; k < 6; k++) { put(m.instanceMatrix.array, k, 0, -k, 0, 1); m.setColorAt(k, col.set(k > 4 ? '#F2E9D8' : k > 3 ? '#C98F62' : '#D9604C')); } m.instanceMatrix.needsUpdate = true; g.add(m); man.add(g); return g; };
  const armL = arm(-1), armR = arm(1);
  const stick = new THREE.Group(); farm.add(stick); { const m = inst(solid(), 22); for (let k = 0; k < 22; k++) { put(m.instanceMatrix.array, k, 0, k, 0, k < 4 ? 1.6 : .8); m.setColorAt(k, col.set(k < 4 ? '#B79868' : '#8A6240')); } m.instanceMatrix.needsUpdate = true; stick.add(m); }
  const lance = new THREE.Group(); man.add(lance); { const m = inst(solid(), 14); for (let k = 0; k < 14; k++) { put(m.instanceMatrix.array, k, 0, 0, k, k === 13 ? 1.3 : .7); m.setColorAt(k, col.set(k === 13 ? '#E2B84A' : '#30363A')); } m.instanceMatrix.needsUpdate = true; lance.add(m); lance.position.set(3, 8, 1); lance.rotation.x = .2; }
  const packM = inst(solid(), 27); man.add(packM); { let i = 0; for (let x = -1; x <= 1; x++) for (let y = 6; y <= 10; y += 2) for (let z = -3; z <= -1; z++) { put(packM.instanceMatrix.array, i, x * 1.2, y + .5, z, 1.2); packM.setColorAt(i++, col.set(y === 10 ? '#1E5F96' : '#2F7FC0')); } packM.count = i; packM.instanceMatrix.needsUpdate = true; }
  function rig(list) { const m = inst(solid(), list.length); list.forEach((v, i) => { put(m.instanceMatrix.array, i, v[0], v[1], v[2], v[4] || 1); m.setColorAt(i, tint(v[3], i, .06)); }); m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; return m; }
  // the tractor with a spray boom
  const tractor = new THREE.Group(); farm.add(tractor);
  { const L = [], a = (x, y, z, c, s) => L.push([x, y, z, c, s]);
    for (const sx of [-4, -5, 4, 5]) { for (let dy = -3; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) if (Math.hypot(dy, dz) <= 3.3) a(sx, 3 + dy, 3 + dz, dy === 0 && dz === 0 ? '#E2B84A' : Math.hypot(dy, dz) > 2.3 ? '#1c1c1c' : '#3a3a3a');
      if (Math.abs(sx) === 4) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) if (Math.hypot(dy, dz) <= 2.3) a(sx, 2 + dy, -5 + dz, dy === 0 && dz === 0 ? '#E2B84A' : '#1c1c1c'); }
    for (let x = -3; x <= 3; x++) for (let z = -7; z <= 5; z++) for (let y = 3; y <= 4; y++) a(x, y, z, '#3E8948');
    for (let x = -2; x <= 2; x++) for (let z = -7; z <= -1; z++) for (let y = 5; y <= 6; y++) a(x, y, z, z === -7 ? '#23323A' : '#4E9A3D');
    for (let x = -3; x <= 3; x++) for (let z = 0; z <= 5; z++) for (let y = 5; y <= 10; y++) { const frame = (Math.abs(x) === 3 && (z === 0 || z === 5)) || y === 5; if (y === 10) a(x, y, z, '#EEE8DE'); else if (frame) a(x, y, z, '#3E8948'); else if (Math.abs(x) === 3 || z === 0 || z === 5) a(x, y, z, '#9FD8EE'); }
    for (let y = 7; y <= 9; y++) a(2, y, -5, '#6B6F72');
    for (let x = -3; x <= 3; x++) for (let z = 6; z <= 9; z++) for (let y = 5; y <= 8; y++) if (Math.abs(x) === 3 || z === 6 || z === 9 || y === 5 || y === 8) a(x, y, z, y === 8 ? '#1E5F96' : '#2F7FC0');
    for (let x = -24; x <= 0; x++) { a(x, 8, 10, '#8A9096'); if (x % 4 === 0) a(x, 7, 10, '#E2B84A'); } for (let y = 5; y <= 8; y++) a(0, y, 10, '#8A9096');
    tractor.add(rig(L)); }
  // the drone that becomes a plane
  const drone = new THREE.Group(); farm.add(drone);
  const dBody = new THREE.Group(), dArms = new THREE.Group(), dWings = new THREE.Group(), rotors = [];
  { const L = [], a = (x, y, z, c) => L.push([x, y, z, c]);
    for (let x = -1; x <= 1; x++) for (let z = -3; z <= 3; z++) for (let y = 0; y <= 1; y++) a(x, y, z, y === 1 && Math.abs(z) < 2 ? '#7CA240' : '#EEE8DE'); a(0, 1, -4, '#30363A'); a(0, 0, -4, '#EEE8DE');
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) a(x, -1.5, z, '#2F7FC0'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) a(sx, -2.6, sz, '#30363A');
    dBody.add(rig(L)); }
  { const L = [], a = (x, y, z, c) => L.push([x, y, z, c]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { for (let k = 2; k <= 4; k++) a(sx * k, .5, sz * k, '#30363A'); a(sx * 5, 1.2, sz * 5, '#E2B84A');
      const g = new THREE.Group(); g.position.set(sx * 5, 2.1, sz * 5); const P = []; for (let k = -2; k <= 2; k++) { P.push([k, 0, 0, '#C9CCC4', .9]); if (k) P.push([0, 0, k, '#C9CCC4', .9]); } g.add(rig(P)); dArms.add(g); rotors.push(g); }
    dArms.add(rig(L)); }
  { const L = [], a = (x, y, z, c) => L.push([x, y, z, c]);
    for (let x = -11; x <= 11; x++) for (let z = -1; z <= 1; z++) if (Math.abs(x) > 1 && !(Math.abs(x) > 9 && z === -1)) a(x, .5, z, Math.abs(x) > 8 ? '#7CA240' : '#EEE8DE');
    for (let x = -4; x <= 4; x++) if (Math.abs(x) > 1) a(x, .5, 4, '#EEE8DE'); for (let y = 2; y <= 4; y++) a(0, y, 4 - (y > 3 ? 0 : 0), '#7CA240'); a(0, 2, 3, '#7CA240');
    for (let k = -2; k <= 2; k++) if (k) a(k, .5, -5, '#30363A');
    dWings.add(rig(L)); }
  drone.add(dBody, dArms, dWings);
  // harvest crates by the path
  const crates = new THREE.Group(); farm.add(crates);
  { const L = [], a = (x, y, z, c) => L.push([x, y, z, c]); const fill = ['#E3C04B', '#E2402F', '#8CC152'];
    [[0, 0], [5, 1], [2.5, 5]].forEach(([ox, oz], n) => { for (let x = 0; x <= 3; x++) for (let z = 0; z <= 3; z++) for (let y = 0; y <= 2; y++) if (x === 0 || x === 3 || z === 0 || z === 3 || y === 0) a(ox + x, y, oz + z, (x + z + y) % 2 ? '#B79868' : '#A58450');
      for (let x = 0; x <= 3; x++) for (let z = 0; z <= 3; z++) if (hash(x, z, n) < .85) a(ox + x, 3 - (hash(x, z, n + 3) < .3 ? .4 : 0), oz + z, fill[n]); });
    crates.add(rig(L)); crates.position.set(5, 1, 35); }
  const NDRIP = 66, dripM = inst(glass('#9fdcff', .85), NDRIP, false); farm.add(dripM);
  const NLIFE = 420, lifeM = inst(glow(), NLIFE, false); farm.add(lifeM); for (let i = 0; i < NLIFE; i++) lifeM.setColorAt(i, col.set(i % 5 === 0 ? '#ffb3d0' : i % 5 === 1 ? '#d9bdff' : i % 5 === 2 ? '#ffe27a' : '#b6f07a')); lifeM.instanceColor.needsUpdate = true;
  const NSPR = 520, sprayM = inst(glass('#dff6ff', .75), NSPR, false); farm.add(sprayM);
  const NF = 1400, fieldM = inst(glow(), NF, false); farm.add(fieldM); for (let i = 0; i < NF; i++) fieldM.setColorAt(i, col.set(i % 4 === 0 ? '#d9bdff' : i % 4 === 1 ? '#eaffb0' : '#b6f07a'));
  for (const m of [bigM, smM, molM, riceM, swirlM, fieldM, sprayM]) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  // ================================================================== timeline: seven stages, each 1/7 of the scroll
  const bgA = new THREE.Color(), bgB = new THREE.Color();
  const V = (x, y, z) => new THREE.Vector3(x, y, z), tmpP = V(0, 0, 0), tmpT = V(0, 0, 0);
  function camPath(keys, u) { const n = keys.length - 1, f = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), k = ease(f - i); tmpP.lerpVectors(keys[i][0], keys[i + 1][0], k); tmpT.lerpVectors(keys[i][1], keys[i + 1][1], k); cam.position.copy(tmpP); cam.lookAt(tmpT); }
  const FIELD = V(-23, 0, -2);                                     // centre of the big paddy
  const KEY = {
    tank: [[V(22, 150, 60), V(22, 6, 26)], [V(40, 64, 62), V(22, 8, 26)], [V(30, 30, 44), V(22, 8, 26)], [V(22, 17, 28.5), V(22, 7, 26)]],
    spray: [[V(40, 30, 66), V(-8, 6, 24)], [V(36, 30, 50), V(-14, 4, 8)], [V(28, 30, 38), V(-22, 3, -6)]],
    field: [[V(-2, 26, 46), V(-22, 3, -2)], [V(4, 15, 26), V(-25, 3, -10)], [V(30, 46, 70), V(-12, 2, -6)]],
    close: [[V(30, 46, 70), V(-12, 2, -6)], [V(-24, 9, 66), V(-24, 0, 40)], [V(20, 13, 58), V(10, 4, 36)], [V(70, 120, 150), V(-4, 0, -6)]],
  };

  function microFrame(p, t, s, u) {
    // s: 0 spore, 1 gel, 2 water, 4 swirl
    const swirl = s === 4, pull = s === 0 ? 0 : s === 1 ? ease(u) : 1, flow = s === 2 ? u : 0;
    const A = smM.instanceMatrix.array, G = gelM.instanceMatrix.array, M = molM.instanceMatrix.array, Wt = watM.instanceMatrix.array;
    // hero spore turns with the scroll and a little on its own
    const rb = rotYX(p * 26 + t * .25, .35 + Math.sin(t * .3) * .08), B = bigM.instanceMatrix.array, bs = swirl ? 0 : 1, drift = flow * flow * 150;
    for (let i = 0; i < BIG.length; i++) { const v = rot(rb, BIG[i]); put(B, i, v[0] + drift, v[1] + Math.sin(flow * 5) * 10 * flow, v[2], bs, rb); }
    bigM.instanceMatrix.needsUpdate = true;
    // its gel shell assembles molecule by molecule, then washes away with the water
    const form = s === 0 ? u : 1;
    for (let i = 0; i < SHELL.length; i++) { const a = ease(seg(form, i / SHELL.length * .75, i / SHELL.length * .75 + .25)), d = lerp(46 + hash(i, 4) * 40, 15.5 + Math.sin(t * 1.3 + i) * .35, a), q = rot(rb, SHELL[i]), w = seg(flow, hash(i, 9) * .5, hash(i, 9) * .5 + .3);
      put(G, i, q[0] * d + drift + w * 80, q[1] * d + w * (hash(i, 5) - .5) * 60, q[2] * d, swirl ? 0 : (2.1 * a + .0001) * (1 - w), rb); }
    // the suspension: small spores, evenly spread, each in its coat
    for (let k = 0; k < NS; k++) {
      let [x, y, z] = SP[k]; const r = rotYX(t * .2 + k, p * 9 + k * 1.7); let sc = 1, coat = 1;
      if (swirl) { const a = k * 2.4 + t * .5 + p * 30, d = 18 + (k % 9) * 9, h = ((k * 37) % 120) - 60 + Math.sin(t * .7 + k) * 6; x = Math.cos(a) * d; z = Math.sin(a) * d - 10; y = h; coat = 0; sc = k / NS < .25 + u * .75 ? 1 : 0; }
      else { x += Math.sin(t * .5 + k) * 1.2; y += Math.cos(t * .4 + k * 2) * 1.2; const w = seg(flow, .12 + hash(k, 3) * .4, .5 + hash(k, 3) * .5); x += w * w * 190; y += Math.sin(w * 6 + k) * 16 * w; coat = 1 - seg(flow, hash(k, 6) * .4, hash(k, 6) * .4 + .25); sc = lerp(.0001, 1, seg(pull + (s > 0 ? 1 : .35), 0, .3)); }
      for (let j = 0; j < SM.length; j++) { const v = rot(r, SM[j]); put(A, k * SM.length + j, x + v[0], y + v[1], z + v[2], sc, r); }
      for (let j = 0; j < COAT.length; j++) { const v = rot(r, COAT[j]), e = 4.2 + coat * 0 + (1 - coat) * 30; put(G, SHELL.length + k * COAT.length + j, x + v[0] * e, y + v[1] * e, z + v[2] * e, 2.4 * coat * sc + .0001, r); }
    }
    smM.instanceMatrix.needsUpdate = true; gelM.instanceMatrix.needsUpdate = true;
    // green and violet molecules: a calm, even lattice in the gel; a spiral in the tank
    for (let i = 0; i < NM; i++) {
      let x = ((i % 8) - 3.5) * 30 + (hash(i, 1) - .5) * 14, y = ((Math.floor(i / 8) % 9) - 4) * 30 + (hash(i, 2) - .5) * 14, z = (Math.floor(i / 72) - 3.5) * 26 + (hash(i, 3) - .5) * 14 - 20, sc = 1.1;
      if (swirl) { const a = i * .61 + t * .9 + p * 40, d = 6 + (i % 23) * 4.2; x = Math.cos(a) * d; z = Math.sin(a) * d - 10; y = ((i * 53) % 140) - 70; sc = i / NM < .2 + u * .8 ? 1.3 : 0; }
      else { const w = seg(flow, hash(i, 4) * .6, hash(i, 4) * .6 + .4); x += w * w * 220 + Math.sin(t + i) * .8; y += Math.sin(w * 7 + i) * 12 * w + Math.cos(t * .8 + i) * .8; sc = Math.hypot(x, y, z) < 22 ? 0 : 1.1 * seg(pull + (s > 0 ? 1 : 0), .1, .5); }
      put(M, i, x, y, z, sc + .0001);
    }
    molM.instanceMatrix.needsUpdate = true;
    // the water: a wall of blue voxels that sweeps in from the left
    for (let i = 0; i < NW; i++) { const lane = hash(i, 1), front = -230 + flow * 520 - lane * 150, x = Math.min(front, 260) - hash(i, 2) * 26, on = s === 2 && flow > .02 ? 1 : 0;
      put(Wt, i, x, (hash(i, 3) - .5) * 280 + Math.sin(t * 2 + i) * 3, (hash(i, 4) - .5) * 200 - 10, on * (2 + hash(i, 5) * 5)); }
    watM.instanceMatrix.needsUpdate = true;
    // camera: an orbit that pulls back, gets pushed by the water, then sits inside the vortex
    const az = swirl ? t * .12 + p * 8 : -.5 + p * 4.5, rad = swirl ? lerp(150, 105, ease(u)) : lerp(52, 215, pull) + flow * 40, el = swirl ? .25 : .18 + pull * .12 + flow * .3;
    cam.position.set(Math.sin(az) * Math.cos(el) * rad + flow * 60, Math.sin(el) * rad, Math.cos(az) * Math.cos(el) * rad); cam.lookAt(flow * 60, 0, swirl ? -10 : 0);
    bgA.set('#0f3a34'); bgB.set('#17607a'); micro.background = bgA.clone().lerp(bgB, swirl ? 1 : flow); micro.fog.color.copy(micro.background);
    return micro;
  }

  const Pc = V(0, 0, 0), Tc = V(0, 0, 0), Pa = V(0, 0, 0), Ta = V(0, 0, 0), dPos = V(0, 0, 0), QW = new THREE.Quaternion();
  function farmFrame(p, t, s, u) {
    // s: 3 tank, 5 backpack sprayer at dawn, 7 any equipment, 6 field, 8 closing
    const atTank = s === 3, walk = s === 5 ? ease(u) : 0, close = s === 8, equip = s === 7;
    // rice sways; in the closing it grows taller and fuller (vigour)
    const vig = close ? ease(seg(u, .08, .6)) : 0, Rm = riceM.instanceMatrix.array; let i = 0;
    for (const [x, z, h] of RICE) { const sw = Math.sin(t * 1.6 + x * .3 + z * .2) * .35; for (let y = 0; y < h; y++) put(Rm, i++, x + sw * y / h, y * (1 + vig * .45) + .2, z, (y === h - 1 ? .7 : .55) + vig * .3); }
    riceM.instanceMatrix.needsUpdate = true;
    // the farmer: stirring at the tank, spraying with the backpack, then standing by
    if (atTank) { man.position.set(TK[0] - 10, 1, TK[1] + 1); man.rotation.y = Math.PI / 2; const a = t * 2.2 + p * 60; stick.visible = true; stick.position.set(TK[0] + Math.cos(a) * 2.6, 5, TK[1] + Math.sin(a) * 2.6); stick.rotation.set(Math.sin(a) * .22, 0, -.5 - Math.cos(a) * .12); armL.rotation.set(-1.1 + Math.sin(a) * .25, 0, .2); armR.rotation.set(-1.25 + Math.cos(a) * .25, 0, -.2); lance.visible = false; packM.visible = false; }
    else if (s === 5) { man.position.set(lerp(-1, -4, walk), 1 + Math.abs(Math.sin(t * 5)) * .25, lerp(34, 6, walk)); man.rotation.y = Math.PI + .95 + Math.sin(t * 1.4) * .3; stick.visible = false; lance.visible = true; packM.visible = true; armL.rotation.set(-.4, 0, .1); armR.rotation.set(-1.2, 0, -.1); }
    else { man.position.set(close ? 17 : 2, 1, close ? 33 : 30); man.rotation.y = close ? .35 : -Math.PI / 2; stick.visible = false; lance.visible = false; packM.visible = !close; const wave = close ? Math.sin(t * 5) * .5 : 0; armL.rotation.set(0, 0, .12); armR.rotation.set(0, 0, close ? -2.6 + wave : -.12); }
    man.updateMatrixWorld(true);
    const Sw = swirlM.instanceMatrix.array; for (let k = 0; k < 90; k++) { const a = k * .7 + t * 1.8 + p * 50, d = .6 + (k / 90) * 4.2; put(Sw, k, TK[0] + Math.cos(a) * d, 8.6, TK[1] + Math.sin(a) * d, atTank ? .5 : 0); } swirlM.instanceMatrix.needsUpdate = true;
    // equipment: tractor with boom (a), drip line (b), drone that turns into a plane (c)
    const ua = seg(u, 0, .32), uc = seg(u, .62, 1), morph = equip ? ease(seg(uc, .5, .68)) : 0, fly = equip ? seg(uc, .66, 1) : 0;
    const tz = lerp(10, -30, ua); tractor.visible = equip || s === 6 || close; tractor.position.set(43, 1, equip ? tz : -30);
    drone.visible = equip && u > .5; dPos.set(lerp(-40, -14, ease(seg(uc, 0, .6))) + fly * fly * 150, 16 + Math.sin(t * 2) * .4 + fly * fly * 70, -2 - fly * 10); drone.position.copy(dPos); drone.rotation.set(0, -Math.PI / 2, -fly * .35);
    dArms.scale.setScalar(Math.max(.001, 1 - morph)); dWings.scale.set(Math.max(.001, morph), Math.max(.001, morph), Math.max(.001, morph)); for (const r of rotors) r.rotation.y = t * 31;
    // spray: from the lance, the boom nozzles or the drone
    const Sp = sprayM.instanceMatrix.array;
    if (s === 5) { const tip = lance.localToWorld(V(0, 0, 13.5)), dir = V(0, 0, 1).applyQuaternion(lance.getWorldQuaternion(QW)), on = seg(u, .06, .2), sx = dir.z, sz = -dir.x;
      for (let k = 0; k < NSPR; k++) { const ph = (t * .9 + hash(k, 1)) % 1, sp = (hash(k, 2) - .5) * 2, reach = ph * 26; put(Sp, k, tip.x + dir.x * reach + sx * sp * ph * 15, Math.max(1.2, tip.y + 1.5 * ph - ph * ph * 7 + hash(k, 3) * 2.5 * ph), tip.z + dir.z * reach + sz * sp * ph * 15, on * (ph < .96 ? .5 + ph * .8 : 0)); } }
    else if (equip && u < .4) { for (let k = 0; k < NSPR; k++) { const ph = (t * 1.3 + hash(k, 1)) % 1, n = k % 7; put(Sp, k, 43 - n * 4 + (hash(k, 2) - .5) * 3 * ph, 8 - ph * 7, tz + 10 + (hash(k, 3) - .5) * 3 * ph + ph * 2.5, (1 - seg(u, .3, .38)) * (.35 + ph * .5)); } }
    else if (equip && u > .56) { const on = 1 - morph; for (let k = 0; k < NSPR; k++) { const ph = (t * 1.2 + hash(k, 1)) % 1, a = hash(k, 2) * 6.283, r = ph * 7 * hash(k, 3); put(Sp, k, dPos.x + Math.cos(a) * r - ph * 3, dPos.y - 3 - ph * 12, dPos.z + Math.sin(a) * r, on * seg(uc, .04, .14) * (.35 + ph * .5)); } }
    else for (let k = 0; k < NSPR; k++) put(Sp, k, 0, -50, 0, 0);
    sprayM.instanceMatrix.needsUpdate = true;
    // drip line: drops fall from every emitter
    const Dm = dripM.instanceMatrix.array, don = equip ? seg(u, .3, .4) * (1 - seg(u, .62, .7)) : 0;
    for (let k = 0; k < NDRIP; k++) { const e = k % 12, row = k % 2 ? 36 : 38, ph = (t * 1.6 + hash(k, 1)) % 1; put(Dm, k, -39 + e * 3, 1.2 - ph * .9, row + (row < 37 ? -.4 : .4) * ph, don * (ph < .85 ? .38 : .7)); }
    dripM.instanceMatrix.needsUpdate = true;
    // in the field, the spores land and multiply outward from where the spray fell
    const F = fieldM.instanceMatrix.array, grow = s === 5 ? seg(u, .35, 1) * .14 : equip ? .14 + u * .2 : s === 6 ? .34 + ease(seg(u, 0, .85)) * .66 : close ? 1 : 0;
    for (let k = 0; k < NF; k++) { const born = k / NF, a = hash(k, 1) * 6.283, d = Math.sqrt(born) * 40, x = clamp(FIELD.x - 6 + Math.cos(a) * d * .55, -40, -6), z = clamp(FIELD.z + 6 + Math.sin(a) * d, -34, 30), alive = grow > born ? eo(seg(grow, born, born + .08)) : 0;
      put(F, k, x + Math.sin(t + k) * .3, 1 + hash(k, 4) * 5 + Math.sin(t * 1.3 + k) * .4, z, alive * (.34 + .12 * Math.sin(t * 3 + k))); }
    fieldM.instanceMatrix.needsUpdate = true;
    // soil life and symbiosis: microbes glow in the soil; little lights travel between root and plant
    const Lm = lifeM.instanceMatrix.array, lon = close ? ease(seg(u, .12, .45)) : 0, don2 = equip ? don : 0;
    for (let k = 0; k < NLIFE; k++) {
      if (k < 60) { const e = k % 12; put(Lm, k, -39 + e * 3 + (hash(k, 1) - .5) * 2.4, .9 + hash(k, 2) * .6, (k % 2 ? 35.2 : 38.8) + (hash(k, 3) - .5) * 1.6, Math.max(don2, lon) * (.22 + .12 * Math.sin(t * 4 + k))); }
      else if (k < 300) put(Lm, k, -47 + hash(k, 1) * 94, -.6 - hash(k, 2) * 4.2, 44.62, lon * (.3 + .2 * Math.sin(t * 3 + k * 1.7)));
      else { const ph = (t * .35 + hash(k, 1)) % 1, x = -38 + hash(k, 2) * 30, z = 12 + hash(k, 3) * 17; put(Lm, k, x + Math.sin(ph * 6 + k) * .5, ph * 7, z, lon * Math.sin(ph * Math.PI) * .5); }
    }
    lifeM.instanceMatrix.needsUpdate = true;
    crates.visible = close; const pop = close ? eo(seg(u, .5, .66)) : 0; crates.scale.setScalar(Math.max(.001, pop)); crates.position.y = 1 + (1 - pop) * 6;
    // camera
    if (equip) {
      const shot = (n) => { if (n === 0) { Pc.set(66, 24, tz + 32); Tc.set(32, 4, tz + 2); } else if (n === 1) { const v = seg(u, .34, .6); Pc.set(-36 + v * 22, 12, 58); Tc.set(-32 + v * 22, 1, 37); } else { Pc.set(-2 + uc * 14, 24, 40); Tc.set(Math.min(dPos.x, 40), Math.min(dPos.y, 40) - 3, dPos.z); } };
      if (u < .3) shot(0); else if (u < .36) { shot(0); Pa.copy(Pc); Ta.copy(Tc); shot(1); const k = ease(seg(u, .3, .36)); Pc.lerpVectors(Pa, Pc, k); Tc.lerpVectors(Ta, Tc, k); }
      else if (u < .58) shot(1); else if (u < .64) { shot(1); Pa.copy(Pc); Ta.copy(Tc); shot(2); const k = ease(seg(u, .58, .64)); Pc.lerpVectors(Pa, Pc, k); Tc.lerpVectors(Ta, Tc, k); } else shot(2);
      cam.position.copy(Pc); cam.lookAt(Tc);
    } else camPath(s === 3 ? KEY.tank : s === 5 ? KEY.spray : close ? KEY.close : KEY.field, u);
    // light: a warm, low sun for the early application; soft daylight otherwise
    const dawn = s === 5 ? 1 : equip ? 1 - seg(u, 0, .25) : 0;
    farm.background = bgA.set('#cfe7dc').lerp(bgB.set('#f7d9b4'), dawn); farm.fog.color.copy(farm.background);
    sun.color.set('#fff0d2').lerp(col.set('#ffb070'), dawn); sun.intensity = 2.9 - dawn * .5; sun.position.set(lerp(-50, -90, dawn), lerp(90, 42, dawn), lerp(40, 30, dawn));
    return farm;
  }

  let W = 0, H = 0;
  function size() { const r = canvas.getBoundingClientRect(), d = Math.min(1.75, devicePixelRatio || 1); if (r.width !== W || r.height !== H) { W = r.width; H = r.height; R.setPixelRatio(d); R.setSize(W, H, false); cam.aspect = W / H; cam.fov = W < H ? 52 : 38; cam.updateProjectionMatrix(); } }
  // returns the flash amount (0..1): how much the page should veil the cut between the two worlds
  function render(p, t) {
    size();
    // nine stages: spore, gel, water, tank, swirl, backpack, equipment, field, closing
    const x = clamp(p, 0, .99999) * 9, n = Math.floor(x), u = x - n, s = [0, 1, 2, 3, 4, 5, 7, 6, 8][n];
    const scene = (n === 3 || n >= 5) ? farmFrame(p, t, s, u) : microFrame(p, t, s, u);
    R.render(scene, cam);
    const cuts = [3, 4, 5]; let f = 0; for (const c of cuts) f = Math.max(f, 1 - Math.min(1, Math.abs(x - c) / .09));
    return f;
  }
  return { render, dispose: () => R.dispose() };
}
