// Extra fun for the 3D world: Pixel the pet dog, head-bump ? blocks, and a day/night cycle with torches & stars.
import * as THREE from "three";
import { C, makeCanvas } from "./textures.js";
import { canvasTex, makeNameTag } from "./character.js";

const lerp = (a, b, k) => a + (b - a) * k;

function glowTexture(inner, outer) {
  const t = canvasTex(makeCanvas(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner); g.addColorStop(0.4, outer); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }));
  t.magFilter = t.minFilter = THREE.LinearFilter;
  return t;
}

export function createExtras(scene, { GROUND, R, fw, hooks, hemi, sun, skyTex }) {
  const L = (o) => new THREE.MeshLambertMaterial(o);
  const hitMeshes = [];

  /* ================= Pixel the dog ================= */
  const dog = new THREE.Group();
  const M = { white: L({ color: "#f3efe6" }), tan: L({ color: "#c98b4a" }), dark: L({ color: "#1c1c1c" }), pink: L({ color: "#ff7f9a" }), red: L({ color: "#e3262e" }), gold: L({ color: "#ffd23f", emissive: "#6a4a00" }) };
  const part = (parent, w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; parent.add(b); b.userData.dog = true; hitMeshes.push(b); return b; };
  part(dog, 0.5, 0.42, 0.85, M.white, 0, 0.58, 0);
  part(dog, 0.52, 0.1, 0.42, M.tan, 0, 0.8, -0.12);
  const head = new THREE.Group(); head.position.set(0, 0.9, 0.48); dog.add(head);
  part(head, 0.46, 0.42, 0.42, M.white, 0, 0, 0);
  part(head, 0.48, 0.07, 0.44, M.red, 0, -0.24, -0.02);
  part(head, 0.1, 0.1, 0.04, M.gold, 0, -0.3, 0.2);
  part(head, 0.28, 0.2, 0.2, M.tan, 0, -0.08, 0.29);
  part(head, 0.12, 0.08, 0.06, M.dark, 0, -0.01, 0.4);
  part(head, 0.08, 0.08, 0.02, M.dark, -0.12, 0.07, 0.215);
  part(head, 0.08, 0.08, 0.02, M.dark, 0.12, 0.07, 0.215);
  part(head, 0.13, 0.2, 0.1, M.tan, -0.18, 0.26, -0.06);
  part(head, 0.13, 0.2, 0.1, M.tan, 0.18, 0.26, -0.06);
  const tongue = part(head, 0.09, 0.03, 0.12, M.pink, 0, -0.2, 0.33);
  const legs = [[-0.15, 0.27], [0.15, 0.27], [-0.15, -0.27], [0.15, -0.27]].map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0.4, z); dog.add(g);
    part(g, 0.14, 0.4, 0.14, M.white, 0, -0.2, 0);
    return g;
  });
  const tail = new THREE.Group(); tail.position.set(0, 0.74, -0.42); tail.rotation.x = -0.7; dog.add(tail);
  part(tail, 0.09, 0.09, 0.38, M.white, 0, 0, -0.17);
  const dogTag = makeNameTag("Pixel", "#ffd23f"); dogTag.scale.set(2, 0.45, 1); dogTag.position.y = 1.6; dog.add(dogTag);
  dog.scale.setScalar(1.15);
  dog.position.set(1.6, GROUND, 3.2);
  scene.add(dog);
  let dogVy = 0, dogPhase = 0, dogHappy = 0;

  function bark() {
    if (dog.position.y <= GROUND + 0.01) dogVy = 5.5;
    dogHappy = 1.5;
    const p = dog.position.clone(); p.y += 1.2;
    fw.sparkle(p, "#ff6f8f", 26);
    hooks.onBark && hooks.onBark();
  }

  /* ================= ? blocks ================= */
  const qTex = canvasTex(C.lucky);
  const qMat = L({ map: qTex, emissive: new THREE.Color("#6a4a00"), emissiveIntensity: 0.35 });
  const coinMat = L({ color: "#ffd23f", emissive: "#8a5a00", emissiveIntensity: 0.7 });
  const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10);
  const qblocks = [[-5.6, 4.3, 4.6], [5.4, 4.3, 5.2], [-2.6, 4.5, 8.6]].map(([x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), qMat);
    m.position.set(x, y, z); m.castShadow = true;
    m.userData = { q: true, base: y, bump: 0 };
    scene.add(m); hitMeshes.push(m);
    return m;
  });
  const coins = [];
  function hitQ(q) {
    if (q.userData.bump > 0.2) return;
    q.userData.bump = 1;
    const c = new THREE.Mesh(coinGeo, coinMat);
    c.rotation.x = Math.PI / 2;
    c.position.copy(q.position); c.position.y += 0.6;
    c.userData = { life: 0.6, vy: 6 };
    scene.add(c); coins.push(c);
    fw.sparkle(q.position.clone().setY(q.position.y + 0.7), "#ffe066", 18);
    hooks.onCoin && hooks.onCoin();
  }
  function checkHead(p, height) {
    const top = p.y + height;
    for (const q of qblocks) {
      const bottom = q.position.y - 0.5;
      if (Math.abs(p.x - q.position.x) < 0.8 && Math.abs(p.z - q.position.z) < 0.8 && top >= bottom - 0.05 && top < q.position.y) {
        p.y = bottom - height - 0.02;
        hitQ(q);
        return true;
      }
    }
    return false;
  }

  /* ================= Night ================= */
  const nightTex = canvasTex(makeCanvas(2, 256, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#03061a"); g.addColorStop(0.6, "#0e1b46"); g.addColorStop(1, "#2a2f6a");
    x.fillStyle = g; x.fillRect(0, 0, 2, 256);
  }));
  nightTex.magFilter = nightTex.minFilter = THREE.LinearFilter;
  const starN = 500, starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const u = Math.random() * 0.9 + 0.08, th = Math.random() * Math.PI * 2, r = 85;
    const s = Math.sqrt(1 - u * u);
    starPos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3);
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#ffffff", size: 1.3, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  const moon = new THREE.Group();
  const moonMat = new THREE.MeshBasicMaterial({ color: "#f4f1d0", fog: false, transparent: true, opacity: 0 });
  moon.add(new THREE.Mesh(new THREE.BoxGeometry(7, 7, 1), moonMat));
  const craterMat = new THREE.MeshBasicMaterial({ color: "#cfcaa6", fog: false, transparent: true, opacity: 0 });
  [[-1.5, 1.2, 1.4], [1.8, -0.8, 1.8], [0.4, 2, 1]].forEach(([x, y, s]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, 1.1), craterMat); c.position.set(x, y, 0.05); moon.add(c); });
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,250,210,.6)", "rgba(180,200,255,.15)"), transparent: true, depthWrite: false, opacity: 0, fog: false, blending: THREE.AdditiveBlending }));
  moonGlow.scale.set(26, 26, 1); moon.add(moonGlow);
  moon.position.set(-38, 40, -60); moon.lookAt(0, 0, 0);
  scene.add(moon);

  const torchGlowTex = glowTexture("rgba(255,220,130,.95)", "rgba(255,150,40,.35)");
  const torches = [[-7, 1.5], [7, 1.5], [-3.5, -6.8], [3.5, -6.8], [3.2, 9]].map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, GROUND, z);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), L({ color: "#6b4a2a" })); stick.position.y = 0.55; stick.castShadow = true; g.add(stick);
    const flameMat = new THREE.MeshBasicMaterial({ color: "#ffcf4a" });
    const flame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), flameMat); flame.position.y = 1.22; g.add(flame);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: torchGlowTex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
    glow.scale.set(2.4, 2.4, 1); glow.position.y = 1.25; g.add(glow);
    const light = new THREE.PointLight("#ffb347", 0, 10, 1.6); light.position.y = 1.5; g.add(light);
    g.userData = { flame, glow, light, ph: Math.random() * 6 };
    scene.add(g);
    return g;
  });

  let night = 0, nightTarget = 0;
  const fogDay = new THREE.Color("#cfe6ff"), fogNight = new THREE.Color("#0b1433");
  const sunDay = new THREE.Color("#fff3d6"), sunNight = new THREE.Color("#8fa8ff");

  /* ================= update ================= */
  const tmp = new THREE.Vector3();
  function update(dt, t, p, facing, playerMoving) {
    // dog follows Ayoub, staying a little behind-left
    const bx = p.x - Math.sin(facing) * 1.7 + Math.cos(facing) * 1.0;
    const bz = p.z - Math.cos(facing) * 1.7 - Math.sin(facing) * 1.0;
    tmp.set(bx - dog.position.x, 0, bz - dog.position.z);
    const d = tmp.length();
    let moving = 0;
    if (d > 0.35) {
      tmp.normalize();
      const sp = Math.min(7.5, d * 2.6);
      dog.position.x += tmp.x * sp * dt; dog.position.z += tmp.z * sp * dt;
      dog.rotation.y = Math.atan2(tmp.x, tmp.z);
      moving = Math.min(1, sp / 4);
    } else {
      dog.rotation.y = Math.atan2(p.x - dog.position.x, p.z - dog.position.z);
    }
    const dc = Math.hypot(dog.position.x, dog.position.z);
    if (dc > R - 0.9) { dog.position.x *= (R - 0.9) / dc; dog.position.z *= (R - 0.9) / dc; }
    if (p.y > GROUND + 0.6 && dog.position.y <= GROUND && Math.random() < 0.02) dogVy = 4.5;
    dogVy -= 20 * dt; dog.position.y += dogVy * dt;
    if (dog.position.y <= GROUND) { dog.position.y = GROUND; dogVy = 0; }
    dogPhase += dt * (4 + moving * 12);
    legs.forEach((l, i) => (l.rotation.x = Math.sin(dogPhase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * moving));
    dogHappy = Math.max(0, dogHappy - dt);
    tail.rotation.y = Math.sin(t * (dogHappy ? 26 : 12)) * (dogHappy ? 0.9 : 0.5);
    head.rotation.z = Math.sin(t * 2) * 0.08 + (dogHappy ? Math.sin(t * 16) * 0.12 : 0);
    tongue.visible = moving > 0.3 || dogHappy > 0 || (t % 4) < 2;

    // ? blocks
    qblocks.forEach((q, i) => {
      const u = q.userData;
      u.bump = Math.max(0, u.bump - dt * 5);
      q.position.y = u.base + Math.sin(u.bump * Math.PI) * 0.35 + Math.sin(t * 1.5 + i) * 0.05;
    });
    qMat.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.12 + night * 0.5;
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i]; c.userData.life -= dt;
      c.userData.vy -= 14 * dt; c.position.y += c.userData.vy * dt; c.rotation.z += dt * 20;
      if (c.userData.life <= 0) { scene.remove(c); coins.splice(i, 1); }
    }

    // night blend
    night = lerp(night, nightTarget, 1 - Math.exp(-dt * 2.5));
    scene.background = night > 0.5 ? nightTex : skyTex;
    scene.fog.color.copy(fogDay).lerp(fogNight, night);
    hemi.intensity = lerp(1.5, 0.3, night);
    sun.intensity = lerp(2.6, 0.45, night);
    sun.color.copy(sunDay).lerp(sunNight, night);
    stars.material.opacity = night;
    moonMat.opacity = craterMat.opacity = night; moonGlow.material.opacity = night;
    moon.visible = night > 0.02;
    torches.forEach((tc) => {
      const f = 0.85 + Math.sin(t * 13 + tc.userData.ph) * 0.1 + Math.random() * 0.05;
      tc.userData.light.intensity = night * 9 * f;
      tc.userData.glow.material.opacity = 0.25 + night * 0.75 * f;
      tc.userData.flame.scale.y = f;
    });
  }

  return {
    hitMeshes,
    isDog: (o) => !!o.userData.dog,
    qOf: (o) => (o.userData.q ? o : null),
    bark, hitQ, checkHead, update,
    setNight(on) { nightTarget = on ? 1 : 0; },
    get night() { return nightTarget === 1; },
  };
}
