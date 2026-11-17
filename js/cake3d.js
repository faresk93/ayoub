// A voxel birthday cake with 11 candles you can blow out (tap/click each flame).
import * as THREE from "three";
import { makeCanvas } from "./textures.js";
import { canvasTex } from "./character.js";
import { Fireworks3D } from "./fireworks3d.js";

const N_CANDLES = 11;

export function createCake(canvas, hooks = {}) {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight("#ffe9d6", "#2a1a10", 1.2));
  const key = new THREE.DirectionalLight("#ffffff", 1.6);
  key.position.set(6, 12, 8); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(key);
  const candleLight = new THREE.PointLight("#ffb347", 18, 14, 1.6);
  candleLight.position.set(0, 6.2, 0);
  scene.add(candleLight);

  const px = (w, h, draw) => canvasTex(makeCanvas(w, h, draw));
  const sponge = px(16, 16, (x) => {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = ["#7a4321", "#6a3a1c", "#86502a"][(Math.random() * 3) | 0]; x.fillRect(i, j, 1, 1); }
    x.fillStyle = "#fff5e8"; x.fillRect(0, 7, 16, 2);
    x.fillStyle = "#e3262e"; for (let i = 1; i < 16; i += 4) x.fillRect(i, 7, 2, 1);
  });
  const frostSide = px(16, 8, (x) => {
    x.fillStyle = "#ff8fc8"; x.fillRect(0, 0, 16, 3);
    for (let i = 0; i < 16; i++) { const d = 3 + ((Math.sin(i * 1.7) + 1) * 2.4) | 0; x.fillRect(i, 0, 1, d); }
    x.fillStyle = "#ffc0e0"; x.fillRect(0, 0, 16, 1);
  });
  const frostTop = px(16, 16, (x) => {
    x.fillStyle = "#ff8fc8"; x.fillRect(0, 0, 16, 16);
    const cols = ["#ffd23f", "#55a0ff", "#55ff55", "#ffffff", "#b45cff"];
    for (let k = 0; k < 22; k++) { x.fillStyle = cols[k % cols.length]; x.fillRect((Math.random() * 16) | 0, (Math.random() * 16) | 0, 1, 1); }
  });
  const L = (o) => new THREE.MeshLambertMaterial(o);
  const sideMat = L({ map: sponge });
  const frostSideMat = L({ map: frostSide, transparent: true, alphaTest: 0.5 });
  const frostTopMat = L({ map: frostTop });
  const pink = L({ color: "#ff8fc8" });

  const cake = new THREE.Group(); scene.add(cake);
  const add = (geo, mat, y, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = cast; m.receiveShadow = true; cake.add(m); return m; };
  add(new THREE.BoxGeometry(7.4, 0.3, 7.4), L({ color: "#d9d9d9" }), 0.15);
  add(new THREE.BoxGeometry(7.6, 0.12, 7.6), L({ color: "#ffd23f" }), 0.04, false);
  add(new THREE.BoxGeometry(6, 2.2, 6), [sideMat, sideMat, pink, sideMat, sideMat, sideMat], 1.4);
  add(new THREE.BoxGeometry(6.16, 0.9, 6.16), [frostSideMat, frostSideMat, frostTopMat, pink, frostSideMat, frostSideMat], 2.1);
  add(new THREE.BoxGeometry(4, 1.6, 4), [sideMat, sideMat, pink, sideMat, sideMat, sideMat], 3.3);
  add(new THREE.BoxGeometry(4.16, 0.8, 4.16), [frostSideMat, frostSideMat, frostTopMat, pink, frostSideMat, frostSideMat], 3.75);
  // strawberries around the lower tier
  const berry = L({ color: "#e3262e" }), leaf = L({ color: "#3c8526" });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = add(new THREE.BoxGeometry(0.42, 0.42, 0.42), berry, 2.75); b.position.x = Math.cos(a) * 2.55; b.position.z = Math.sin(a) * 2.55;
    const l = add(new THREE.BoxGeometry(0.3, 0.12, 0.3), leaf, 3.0, false); l.position.x = b.position.x; l.position.z = b.position.z;
  }

  // candles
  const COLS = ["#5ab0ff", "#ff6fa8", "#55dd55", "#ffd23f", "#b77dff", "#ff8a3d"];
  const candles = [];
  const flameGeo = new THREE.BoxGeometry(0.26, 0.44, 0.26), coreGeo = new THREE.BoxGeometry(0.13, 0.22, 0.13);
  const glowTex = canvasTex(makeCanvas(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,220,120,.9)'); g.addColorStop(0.4, 'rgba(255,160,40,.35)'); g.addColorStop(1, 'rgba(255,160,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
  glowTex.magFilter = glowTex.minFilter = THREE.LinearFilter;
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < N_CANDLES; i++) {
    const g = new THREE.Group();
    const a = (i / N_CANDLES) * Math.PI * 2;
    const r = i === N_CANDLES - 1 ? 0 : 1.35;
    const ang = i === N_CANDLES - 1 ? 0 : (i / (N_CANDLES - 1)) * Math.PI * 2;
    g.position.set(Math.cos(ang) * r, 4.15, Math.sin(ang) * r);
    const stripe = px(4, 16, (x) => { for (let y = 0; y < 16; y++) { x.fillStyle = (y >> 1) % 2 ? "#ffffff" : COLS[i % COLS.length]; x.fillRect(0, y, 4, 1); } });
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.1, 0.24), L({ map: stripe }));
    stick.position.y = 0.55; stick.castShadow = true; g.add(stick);
    const wick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), L({ color: "#222" })); wick.position.y = 1.16; g.add(wick);
    const flame = new THREE.Group(); flame.position.y = 1.38;
    flame.add(new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: "#ffb020" })));
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: "#fff6c0" })); core.position.y = -0.04; flame.add(core);
    const glow = new THREE.Sprite(glowMat); glow.scale.set(1.1, 1.1, 1); flame.add(glow);
    g.add(flame);
    g.userData = { flame, lit: true, ph: Math.random() * 6, idx: i };
    g.traverse((o) => { if (o.isMesh) o.userData.candle = g; });
    cake.add(g); candles.push(g);
  }

  // smoke puffs
  const smokeMat = new THREE.MeshBasicMaterial({ color: "#cfcfcf", transparent: true, opacity: 0.8, depthWrite: false });
  const puffs = [];
  function smoke(g) {
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), smokeMat.clone());
      g.localToWorld(m.position.set(0, 1.4, 0));
      m.userData = { life: 1.2 + k * 0.12, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4) };
      scene.add(m); puffs.push(m);
    }
  }

  const fw = new Fireworks3D(scene, 1600, 0.22);
  fw.onBoom = () => hooks.onBoom && hooks.onBoom();

  /* sizing */
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const portrait = W / H < 0.9;
    camera.position.set(0, portrait ? 10 : 8.4, portrait ? 16 : 12);
    camera.lookAt(0, portrait ? 2.8 : 2.4, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* input: drag to spin, tap a flame to blow */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, spin = 0, spinV = RM ? 0 : 0.25;
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, lx: e.clientX, drag: false }; });
  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    if (Math.abs(e.clientX - down.x) > 8) down.drag = true;
    if (down.drag) { spin += (e.clientX - down.lx) * 0.01; spinV = 0; }
    down.lx = e.clientX;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (down && !down.drag) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      ray.params.Points = { threshold: 0 };
      const hits = ray.intersectObjects(candles, true);
      // generous hit-test: nearest lit candle to the ray if none hit directly
      let c = hits.find((h) => h.object.userData.candle?.userData.lit)?.object.userData.candle;
      if (!c) {
        let best = 0.55; const wp = new THREE.Vector3();
        candles.forEach((g) => { if (!g.userData.lit) return; g.userData.flame.getWorldPosition(wp); const d = ray.ray.distanceToPoint(wp); if (d < best) { best = d; c = g; } });
      }
      if (c) blow(c.userData.idx);
    }
    if (down && down.drag) spinV = RM ? 0 : 0.25;
    down = null;
  });

  let out = 0, party = -1;
  function blow(i) {
    const g = candles[i];
    if (!g || !g.userData.lit) return;
    g.userData.lit = false;
    g.userData.flame.visible = false;
    smoke(g);
    out++;
    hooks.onBlow && hooks.onBlow(out, N_CANDLES);
    if (out === N_CANDLES) { party = 9; hooks.onAllOut && hooks.onAllOut(); }
    kick();
  }

  const clock = new THREE.Clock();
  let t = 0, raf = 0, visible = false, nextRocket = 0;
  function step() {
    raf = 0;
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    spin += spinV * dt;
    cake.rotation.y = spin;
    let lit = 0;
    candles.forEach((g) => {
      if (!g.userData.lit) return; lit++;
      const f = g.userData.flame;
      const s = 1 + Math.sin(t * 18 + g.userData.ph) * 0.12 + Math.sin(t * 31 + g.userData.ph) * 0.06;
      f.scale.set(1, s, 1);
      f.rotation.y = Math.sin(t * 7 + g.userData.ph) * 0.3;
    });
    candleLight.intensity = lit ? (8 + lit * 1.2) * (0.92 + Math.random() * 0.08) : Math.max(0, candleLight.intensity - dt * 30);
    for (let i = puffs.length - 1; i >= 0; i--) {
      const m = puffs[i]; m.userData.life -= dt;
      m.position.addScaledVector(m.userData.v, dt); m.scale.multiplyScalar(1 + dt * 0.8);
      m.material.opacity = Math.max(0, m.userData.life * 0.6);
      if (m.userData.life <= 0) { scene.remove(m); puffs.splice(i, 1); }
    }
    if (party > 0) {
      party -= dt;
      if (t > nextRocket) { nextRocket = t + 0.35; const a = Math.random() * 6.28; fw.launch(Math.cos(a) * 4, 0.5, Math.sin(a) * 4 - 2, 11); }
      cake.position.y = Math.abs(Math.sin(t * 6)) * 0.15;
    } else cake.position.y *= 0.9;
    fw.update(dt);
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(step);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(step); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener("visibilitychange", kick);
  step();

  return {
    blowAll() { candles.forEach((g, i) => setTimeout(() => blow(i), i * 110)); },
    relight() { candles.forEach((g) => { g.userData.lit = true; g.userData.flame.visible = true; }); out = 0; kick(); },
    get out() { return out; },
  };
}
