// The 3D hero: a floating voxel island with Ayoub, his family, and a treasure-hunt mini-game.
import * as THREE from "three";
import { C, mulberry32, makeCanvas } from "./textures.js";
import { buildCharacter, makeNameTag, canvasTex } from "./character.js";
import { AYOUB, FAMILY } from "./family.js";
import { Fireworks3D } from "./fireworks3d.js";

const R = 11;              // island radius
const GROUND = 0.5;        // top surface height
const GEMS = 11;

export function createWorld(canvas, { bubble, hooks = {} }) {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;
  const rand = mulberry32(1117);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const skyTex = canvasTex(makeCanvas(2, 256, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#3d7fe6"); g.addColorStop(0.55, "#8cc4ff"); g.addColorStop(1, "#e4f2ff");
    x.fillStyle = g; x.fillRect(0, 0, 2, 256);
  }));
  skyTex.magFilter = skyTex.minFilter = THREE.LinearFilter;
  scene.background = skyTex;
  scene.fog = new THREE.Fog("#cfe6ff", 38, 95);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 8, 20);

  scene.add(new THREE.HemisphereLight("#eaf4ff", "#6a8a4a", 1.5));
  const sun = new THREE.DirectionalLight("#fff3d6", 2.6);
  sun.position.set(14, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  /* ---------- blocks ---------- */
  const tx = Object.fromEntries(["grassTop", "grassSide", "dirt", "stone", "log", "logTop", "leaves", "gold", "planks"].map((k) => [k, canvasTex(C[k])]));
  const L = (map, extra = {}) => new THREE.MeshLambertMaterial({ map, ...extra });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mats = {
    grass: [L(tx.grassSide), L(tx.grassSide), L(tx.grassTop), L(tx.dirt), L(tx.grassSide), L(tx.grassSide)],
    dirt: L(tx.dirt),
    stone: L(tx.stone, { color: "#c9c9c9" }),
    log: [L(tx.log), L(tx.log), L(tx.logTop), L(tx.logTop), L(tx.log), L(tx.log)],
    leaves: L(tx.leaves),
    gold: L(tx.gold, { emissive: new THREE.Color("#5a3d00"), emissiveIntensity: 0.6 }),
  };
  const dummy = new THREE.Object3D();
  function instanced(mat, list, { cast = true, receive = true } = {}) {
    const m = new THREE.InstancedMesh(cube, mat, list.length);
    list.forEach(([x, y, z, s = 1], i) => { dummy.position.set(x, y, z); dummy.scale.setScalar(s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.castShadow = cast; m.receiveShadow = receive;
    scene.add(m);
    return m;
  }

  const island = new THREE.Group(); scene.add(island);
  const tops = [], dirts = [], stones = [];
  const edgeNoise = (x, z) => Math.sin(x * 0.9) * 0.6 + Math.cos(z * 1.1) * 0.5 + Math.sin((x + z) * 0.5) * 0.4;
  for (let x = -R - 1; x <= R + 1; x++) for (let z = -R - 1; z <= R + 1; z++) {
    const d = Math.hypot(x, z), edge = R + edgeNoise(x, z) * 0.6;
    if (d > edge) continue;
    tops.push([x, 0, z]);
    const depth = 1 + Math.floor((edge - d) * 0.85 + rand() * 1.6);
    for (let k = 1; k <= depth; k++) (k <= 2 ? dirts : stones).push([x, -k, z]);
  }
  instanced(mats.grass, tops, { cast: false });
  instanced(mats.dirt, dirts, { cast: false });
  instanced(mats.stone, stones, { cast: false });

  // trees
  const TREES = [[-8.5, -1], [8.5, -2.5], [-8.5, 5.5], [8.8, 4.5], [1, -9], [-6, -7.5], [6, -7]];
  const logs = [], leaves = [];
  TREES.forEach(([tx0, tz0], ti) => {
    const h = 4 + (ti % 2);
    for (let y = 1; y <= h; y++) logs.push([tx0, y, tz0]);
    for (let dy = h - 1; dy <= h + 2; dy++) {
      const r = dy >= h + 1 ? 1 : 2;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy < h + 1) continue;
        if (Math.abs(dx) === r && Math.abs(dz) === r && (rand() < 0.6 || dy === h + 2)) continue;
        if (dy === h + 2 && Math.abs(dx) + Math.abs(dz) > 1) continue;
        leaves.push([tx0 + dx, dy, tz0 + dz]);
      }
    }
  });
  const occluders = [instanced(mats.log, logs), instanced(mats.leaves, leaves)];
  const occRay = new THREE.Raycaster();
  const headPos = new THREE.Vector3(), camDir = new THREE.Vector3();
  const obstacles = TREES.map(([x, z]) => ({ x, z, r: 0.75 }));

  // flowers & grass tufts
  const flowerGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18), stemGeo = new THREE.BoxGeometry(0.06, 0.32, 0.06);
  const stemMat = new THREE.MeshLambertMaterial({ color: "#3c8526" });
  const petal = ["#ff4d4d", "#ffd23f", "#ffffff", "#ff8fc8", "#6fa8ff"].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2, r = 2 + rand() * (R - 3);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < 1.3)) continue;
    const s = new THREE.Mesh(stemGeo, stemMat); s.position.set(x, GROUND + 0.16, z);
    const f = new THREE.Mesh(flowerGeo, petal[i % petal.length]); f.position.set(x, GROUND + 0.38, z);
    scene.add(s, f);
  }

  /* ---------- golden 11 ---------- */
  const eleven = new THREE.Group();
  const ONE = [".X.", "XX.", ".X.", ".X.", "XXX"];
  const elevenBlocks = [];
  [-2, 2].forEach((ox) => ONE.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch === "X") elevenBlocks.push([ox + rx - 1, 4 - ry, 0]); })));
  const elevenMesh = new THREE.InstancedMesh(cube, mats.gold, elevenBlocks.length);
  elevenBlocks.forEach(([x, y, z], i) => { dummy.position.set(x * 0.9, y * 0.9, z); dummy.scale.setScalar(0.88); dummy.updateMatrix(); elevenMesh.setMatrixAt(i, dummy.matrix); });
  elevenMesh.castShadow = true;
  eleven.add(elevenMesh);
  eleven.position.set(0, 7.6, -12);
  scene.add(eleven);

  /* ---------- clouds ---------- */
  const cloudMat = new THREE.MeshLambertMaterial({ color: "#ffffff", emissive: "#dfeaff", emissiveIntensity: 0.35, transparent: true, opacity: 0.92 });
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(cube, cloudMat);
      m.scale.set(2.5 + rand() * 3, 0.9, 2 + rand() * 2.5);
      m.position.set(k * 2 - n, rand() * 0.4, (rand() - 0.5) * 2.5);
      g.add(m);
    }
    const a = (i / 12) * Math.PI * 2, r = 22 + rand() * 16;
    g.position.set(Math.cos(a) * r, 13 + rand() * 9, Math.sin(a) * r);
    clouds.add(g);
  }

  /* ---------- balloons ---------- */
  const balloons = [];
  const bCols = ["#ff4d4d", "#ffd23f", "#4ee8e0", "#b45cff", "#55dd55", "#ff8fc8", "#6f8bff", "#ff8a3d"];
  const stringMat = new THREE.MeshBasicMaterial({ color: "#eeeeee" });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), new THREE.MeshLambertMaterial({ color: bCols[i % bCols.length], emissive: bCols[i % bCols.length], emissiveIntensity: 0.12 }));
    m.castShadow = true;
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), m.material); knot.position.y = -0.62;
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.6, 0.04), stringMat); str.position.y = -1.95;
    g.add(m, knot, str);
    const a = Math.PI * (1.02 + (i / 9) * 0.96), r = R + 0.5 + rand() * 1.5;
    g.position.set(Math.cos(a) * r, 4 + rand() * 4, Math.sin(a) * r);
    g.userData = { base: g.position.y, ph: rand() * 6 };
    scene.add(g); balloons.push(g);
  }

  /* ---------- sparkles ---------- */
  const spN = 160, spPos = new Float32Array(spN * 3);
  for (let i = 0; i < spN; i++) { const a = rand() * 6.28, r = rand() * 16; spPos.set([Math.cos(a) * r, 1 + rand() * 12, Math.sin(a) * r], i * 3); }
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const sparkles = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: "#fff6b0", size: 0.12, transparent: true, opacity: 0.9, depthWrite: false }));
  scene.add(sparkles);

  /* ---------- characters ---------- */
  const home = new THREE.Vector3(0, GROUND, 2);
  const player = buildCharacter(AYOUB);
  player.root.position.copy(home);
  scene.add(player.root);
  const playerTag = makeNameTag("Ayoub", "#ffff55");
  playerTag.position.y = player.height + 0.55;
  player.root.add(playerTag);

  const npcs = FAMILY.map((f, i) => {
    const c = buildCharacter({ name: f.name, ...f.look });
    const a = (i - 2) * 0.62;
    c.root.position.set(Math.sin(a) * 5.6, GROUND, 2 - Math.cos(a) * 5.6);
    c.root.rotation.y = Math.atan2(home.x - c.root.position.x, home.z - c.root.position.z) * 0.6;
    c.baseYaw = c.root.rotation.y;
    const tag = makeNameTag(f.name, "#ffffff");
    tag.position.y = c.height + 0.5;
    c.root.add(tag);
    c.data = f; c.idx = i; c.lastTalk = -99; c.hop = 0; c.vy = 0;
    scene.add(c.root);
    obstacles.push({ x: c.root.position.x, z: c.root.position.z, r: 0.6 });
    return c;
  });

  /* ---------- collectibles ---------- */
  const glowTex = canvasTex(makeCanvas(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,220,.95)"); g.addColorStop(0.35, "rgba(255,240,160,.45)"); g.addColorStop(1, "rgba(255,240,160,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
  glowTex.magFilter = glowTex.minFilter = THREE.LinearFilter;
  const giftTex = canvasTex(makeCanvas(8, 8, (x) => { x.fillStyle = "#b45cff"; x.fillRect(0, 0, 8, 8); x.fillStyle = "#ffd23f"; x.fillRect(3, 0, 2, 8); x.fillStyle = "#8a3fd0"; x.fillRect(0, 7, 8, 1); }));
  const giftTopTex = canvasTex(makeCanvas(8, 8, (x) => { x.fillStyle = "#b45cff"; x.fillRect(0, 0, 8, 8); x.fillStyle = "#ffd23f"; x.fillRect(3, 0, 2, 8); x.fillRect(0, 3, 8, 2); }));
  const diamondMat = new THREE.MeshLambertMaterial({ color: "#4ee8e0", emissive: "#0d8f8a", emissiveIntensity: 0.9, flatShading: true });
  const heartMat = new THREE.MeshLambertMaterial({ color: "#ff3344", emissive: "#a0101c", emissiveIntensity: 0.7 });
  const goldMat = new THREE.MeshLambertMaterial({ color: "#ffd23f", emissive: "#a06a00", emissiveIntensity: 0.6 });
  function makeGem(kind) {
    const g = new THREE.Group();
    if (kind === 0) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), diamondMat); m.scale.y = 1.3; g.add(m);
    } else if (kind === 1) {
      const gm = L(giftTex), gt = L(giftTopTex);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), [gm, gm, gt, gm, gm, gm]); g.add(m);
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.14), goldMat); bow.position.y = 0.42; g.add(bow);
    } else if (kind === 2) {
      const H = [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."];
      const s = 0.17;
      H.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== "X") return; const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s * 1.4), heartMat); b.position.set((x - 2) * s, (2 - y) * s, 0); g.add(b); }));
    } else {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 12), goldMat); m.rotation.x = Math.PI / 2; g.add(m);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(1.8, 1.8, 1);
    g.add(glow);
    return g;
  }
  const gems = [];
  let guard = 0;
  while (gems.length < GEMS && guard++ < 2000) {
    const a = rand() * Math.PI * 2, r = 3 + rand() * (R - 4.2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < 2)) continue;
    if (gems.some((g) => Math.hypot(g.position.x - x, g.position.z - z) < 2.4)) continue;
    if (Math.hypot(x - home.x, z - home.z) < 2.5) continue;
    const g = makeGem(gems.length % 4);
    g.position.set(x, GROUND + 1.1, z);
    g.userData = { ph: rand() * 6, taken: false };
    scene.add(g); gems.push(g);
  }
  let collected = 0;

  const fw = new Fireworks3D(scene);
  fw.onBoom = () => hooks.onBoom && hooks.onBoom();

  // tap target marker
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.7), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 }));
  scene.add(marker);

  /* ---------- state ---------- */
  let mode = "hero";
  let yaw = 0, pitch = 0.42, heroYaw = 0;
  let target = null;
  const vel = new THREE.Vector3();
  let vy = 0, grounded = true, facing = 0;
  const keys = new Set();
  let celebrateUntil = -1, nextRocket = 0;
  const metSet = new Set();
  let t = 0;
  let say = null; // {obj, until}

  /* ---------- sizing ---------- */
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    applyViewOffset();
    camera.updateProjectionMatrix();
  }
  function applyViewOffset() {
    if (mode === "hero") {
      if (W / H > 1.15) camera.setViewOffset(W, H, -W * 0.17, 0, W, H);
      else camera.setViewOffset(W, H, 0, H * 0.1, W, H);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND);
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, drag: false }; if (mode === "play") canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!down || mode !== "play") return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.drag = true;
    if (down.drag) {
      yaw -= (e.clientX - down.lx) * 0.007;
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - down.ly) * 0.004, 0.15, 1.0);
    }
    down.lx = e.clientX; down.ly = e.clientY;
  });
  canvas.addEventListener("pointerup", (e) => { if (down && !down.drag) tap(e); down = null; });
  canvas.addEventListener("pointercancel", () => (down = null));

  function tap(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([...player.hitMeshes, ...npcs.flatMap((n) => n.hitMeshes)], false)[0];
    if (hit) {
      const who = hit.object.userData.owner;
      if (who === player) poke();
      else { const n = npcs.find((x) => x === who); if (n) talk(n, true); }
      return;
    }
    if (mode !== "play") return;
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, p) && Math.hypot(p.x, p.z) < R - 0.6) {
      target = p; marker.position.set(p.x, GROUND + 0.03, p.z); marker.material.opacity = 0.85; marker.scale.setScalar(1.4);
    }
  }
  const LINES = ["It's my birthday!!", "Level 11, here I come!", "Ilyes, wanna play?", "Thanks Uncle Fares!", "Diamonds!!", "Let's build something epic!", "Mama, I love you!", "Baba Deen, Mama Omi — hi!", "Wahoo!", "Who wants cake?"];
  let lineIdx = 0;
  function poke() {
    jump();
    showSay(player, LINES[lineIdx++ % LINES.length], 2200);
    hooks.onPoke && hooks.onPoke();
  }
  function jump() {
    if (!grounded) return;
    vy = 8.2; grounded = false;
    hooks.onJump && hooks.onJump();
  }
  function talk(n, tapped) {
    if (!tapped && t - n.lastTalk < 7) return;
    n.lastTalk = t;
    n.hop = 1;
    showSay(n, `${n.data.name}: ${n.data.talk}`, 3600);
    hooks.onTalk && hooks.onTalk();
    if (!metSet.has(n.idx)) { metSet.add(n.idx); hooks.onMeet && hooks.onMeet(metSet.size, npcs.length); }
  }
  function showSay(obj, text, ms) {
    say = { obj, until: performance.now() + ms };
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
  }
  const KEYMAP = { KeyW: "f", ArrowUp: "f", KeyZ: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", KeyQ: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  addEventListener("keydown", (e) => {
    if (mode !== "play") return;
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
    if (e.code === "Space") { jump(); e.preventDefault(); }
    if (e.code === "Escape") hooks.onExitRequest && hooks.onExitRequest();
  });
  addEventListener("keyup", (e) => KEYMAP[e.code] && keys.delete(KEYMAP[e.code]));
  addEventListener("blur", () => keys.clear());

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3(), camTarget = new THREE.Vector3(), lookAt = new THREE.Vector3(0, 2.6, 0), curLook = new THREE.Vector3(0, 2.6, 0);
  const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
  let visible = true, raf = 0;

  function step() {
    raf = 0;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const p = player.root.position;

    // movement
    let dir = tmpV.set(0, 0, 0);
    if (mode === "play" && keys.size) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      if (keys.has("f")) dir.x += fx, dir.z += fz;
      if (keys.has("b")) dir.x -= fx, dir.z -= fz;
      if (keys.has("r")) dir.x += rx, dir.z += rz;
      if (keys.has("l")) dir.x -= rx, dir.z -= rz;
      target = null;
    } else {
      const goal = mode === "hero" ? home : target;
      if (goal) { dir.set(goal.x - p.x, 0, goal.z - p.z); if (dir.length() < 0.15) { dir.set(0, 0, 0); if (mode === "play") target = null; } }
    }
    let walking = 0;
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const speed = mode === "hero" ? 3 : 5.2;
      p.x += dir.x * speed * dt; p.z += dir.z * speed * dt;
      facing = Math.atan2(dir.x, dir.z);
      walking = 1;
    } else if (mode === "hero") {
      facing = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
    }
    player.root.rotation.y = angLerp(player.root.rotation.y, facing, 1 - Math.exp(-dt * 12));
    for (const o of obstacles) {
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.45;
      if (d < min && d > 0.0001) { p.x = o.x + (dx / d) * min; p.z = o.z + (dz / d) * min; }
    }
    const dc = Math.hypot(p.x, p.z);
    if (dc > R - 0.8) { p.x *= (R - 0.8) / dc; p.z *= (R - 0.8) / dc; }
    vy -= 24 * dt; p.y += vy * dt;
    if (p.y <= GROUND) { p.y = GROUND; vy = 0; grounded = true; }

    const celebrating = t < celebrateUntil;
    const waving = mode === "hero" && !walking && (t % 7) < 2.2;
    player.update(dt, t, { walk: walking, wave: waving && !celebrating, cheer: celebrating });
    if (celebrating && grounded && Math.random() < 0.04) jump();

    // npcs
    npcs.forEach((n, i) => {
      const np = n.root.position;
      const d = Math.hypot(p.x - np.x, p.z - np.z);
      const look = d < 4.5 ? Math.atan2(p.x - np.x, p.z - np.z) : n.baseYaw;
      n.root.rotation.y = angLerp(n.root.rotation.y, look, 1 - Math.exp(-dt * 5));
      if (mode === "play" && d < 2.4) talk(n, false);
      if (n.hop > 0 && n.vy === 0 && np.y <= GROUND) n.vy = 6;
      n.hop = 0;
      if (celebrating && np.y <= GROUND && Math.random() < 0.03) n.vy = 6.5;
      n.vy -= 22 * dt; np.y += n.vy * dt;
      if (np.y <= GROUND) { np.y = GROUND; n.vy = 0; }
      n.update(dt, t + i, { cheer: celebrating, wave: !celebrating && mode === "hero" && ((t + i * 1.7) % 9) < 1.6 });
    });

    // gems
    gems.forEach((g) => {
      if (g.userData.taken) return;
      g.rotation.y += dt * 1.8;
      g.position.y = GROUND + 1.1 + Math.sin(t * 2.4 + g.userData.ph) * 0.18;
      if (mode === "play" && Math.hypot(p.x - g.position.x, p.z - g.position.z) < 1.15 && Math.abs(p.y + 1.1 - g.position.y) < 1.8) {
        g.userData.taken = true;
        collected++;
        fw.sparkle(g.position, "#fff6a8", 40);
        fw.burst(g.position, null, 40, 3.5);
        const start = performance.now();
        const fly = () => {
          const k = Math.min(1, (performance.now() - start) / 450);
          g.position.lerp(tmpV.set(p.x, p.y + player.height + 0.4, p.z), 0.25);
          g.scale.setScalar(1 - k * 0.9);
          if (k < 1) requestAnimationFrame(fly); else scene.remove(g);
        };
        fly();
        hooks.onCollect && hooks.onCollect(collected, GEMS);
        if (collected === GEMS) celebrate();
      }
    });

    // ambient
    eleven.rotation.y = celebrating ? eleven.rotation.y + dt * 4 : Math.sin(t * 0.5) * 0.35;
    eleven.position.y = 7.6 + Math.sin(t * 1.2) * 0.3;
    clouds.rotation.y += dt * 0.012;
    balloons.forEach((b) => { b.position.y = b.userData.base + Math.sin(t * 1.1 + b.userData.ph) * 0.35; b.rotation.z = Math.sin(t * 0.9 + b.userData.ph) * 0.08; });
    const sp = spGeo.attributes.position.array;
    for (let i = 1; i < sp.length; i += 3) { sp[i] += dt * 0.35; if (sp[i] > 13) sp[i] = 1; }
    spGeo.attributes.position.needsUpdate = true;
    sparkles.material.opacity = 0.6 + Math.sin(t * 3) * 0.3;
    if (marker.material.opacity > 0) { marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.2); marker.scale.setScalar(Math.max(0.5, marker.scale.x - dt)); }

    if (celebrating && t > nextRocket) {
      nextRocket = t + 0.32 + Math.random() * 0.3;
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 8;
      fw.launch(Math.cos(a) * r, 2, Math.sin(a) * r, 13);
    }
    fw.update(dt);

    // camera
    const k = 1 - Math.exp(-dt * (mode === "play" ? 6 : 2.2));
    if (mode === "hero") {
      heroYaw = RM ? 0.25 : Math.sin(t * 0.13) * 0.55;
      const portrait = W / H < 0.85;
      const D = portrait ? 19 : 13.5, Hc = portrait ? 7 : 5.2;
      camTarget.set(Math.sin(heroYaw) * D, Hc, home.z + Math.cos(heroYaw) * D);
      lookAt.set(0, portrait ? 3.2 : 2.6, home.z - 1.5);
    } else {
      const portrait = W / H < 0.85;
      const D = portrait ? 10.5 : 9;
      camTarget.set(p.x + Math.sin(yaw) * Math.cos(pitch) * D, p.y + 1.4 + Math.sin(pitch) * D, p.z + Math.cos(yaw) * Math.cos(pitch) * D);
      lookAt.set(p.x, p.y + 1.6, p.z);
      headPos.set(p.x, p.y + 1.8, p.z);
      camDir.copy(camTarget).sub(headPos);
      const cd = camDir.length(); camDir.normalize();
      occRay.set(headPos, camDir); occRay.far = cd;
      const oh = occRay.intersectObjects(occluders, false)[0];
      if (oh) camTarget.copy(headPos).addScaledVector(camDir, Math.max(2.6, oh.distance - 0.5));
    }
    camera.position.lerp(camTarget, k);
    curLook.lerp(lookAt, k);
    camera.lookAt(curLook);

    renderer.render(scene, camera);

    // speech bubble follows the speaker
    if (say) {
      if (performance.now() > say.until) { bubble.hidden = true; say = null; }
      else {
        const o = say.obj;
        tmpV.copy(o.root.position); tmpV.y += o.height + 1.15;
        tmpV.project(camera);
        const r = canvas.getBoundingClientRect();
        const sx = (tmpV.x * 0.5 + 0.5) * r.width, sy = (-tmpV.y * 0.5 + 0.5) * r.height;
        bubble.style.transform = `translate(${Math.round(Math.min(Math.max(sx, 90), r.width - 90))}px, ${Math.round(Math.max(sy, 70))}px) translate(-50%, -100%)`;
      }
    }

    if (visible && !document.hidden) raf = requestAnimationFrame(step);
  }
  const kick = () => { if (!raf && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(step); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener("visibilitychange", kick);

  function celebrate() {
    celebrateUntil = t + 9;
    nextRocket = t;
    hooks.onCelebrate && hooks.onCelebrate();
  }

  // first frame
  step();

  return {
    enterPlay() {
      mode = "play";
      yaw = heroYaw; pitch = 0.42;
      applyViewOffset();
      canvas.focus({ preventScroll: true });
      kick();
    },
    exitPlay() {
      mode = "hero"; keys.clear(); target = null;
      applyViewOffset();
      bubble.hidden = true; say = null;
      kick();
    },
    jump,
    celebrate() { celebrate(); kick(); },
    resize,
    get collected() { return collected; },
    _debug: { player: player.root, gems },
    total: GEMS,
  };
}
