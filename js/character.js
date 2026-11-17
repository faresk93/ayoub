// Voxel character builder (Minecraft-like proportions, 1 pixel = 1/16 block).
import * as THREE from "three";
import { makeCanvas } from "./textures.js";
import { face, facePal, shade } from "./sprites.js";

const PX = 1 / 16;

export function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function rowsTex(rows, pal) {
  return canvasTex(makeCanvas(rows[0].length, rows.length, (x) => {
    rows.forEach((r, y) => [...r].forEach((ch, i) => {
      const col = pal[ch];
      if (!col) return;
      x.fillStyle = col; x.fillRect(i, y, 1, 1);
      // subtle fabric/skin noise for a hand-painted look
      const n = Math.random();
      if (n < 0.18) { x.fillStyle = "rgba(0,0,0,.07)"; x.fillRect(i, y, 1, 1); }
      else if (n > 0.9) { x.fillStyle = "rgba(255,255,255,.08)"; x.fillRect(i, y, 1, 1); }
    }));
  }));
}
const lam = (map) => new THREE.MeshLambertMaterial({ map });
const solid = (color) => new THREE.MeshLambertMaterial({ color });

function box(w, h, d, mats) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mats);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ---------- outfits ---------- */
function hoodieOutfit(skin) {
  const pal = { W: "#efefef", G: "#6f7d3c", K: "#1f1f1f", R: "#e2471f", Z: "#0c0c0c", L: "#111", H: skin, P: "#3b3f4a", S: "#e8e8e8", O: "#9a9a9a" };
  const front = ["WRRRRRRW", "WWRRRRWW", "WWWRRWWW", "WWWZWLLW", "WWWZWWWW", "GGGZGGGG", "GGGZGGGG", "GGGZGGGG", "GGGZGGGG", "KKKZKKKK", "KKKZKKKK", "KKKKKKKK"];
  const back = ["RRRRRRRR", "WRRRRRRW", "WWRRRRWW", "WWWWWWWW", "WWWWWWWW", "GGGGGGGG", "GGGGGGGG", "GGGGGGGG", "GGGGGGGG", "KKKKKKKK", "KKKKKKKK", "KKKKKKKK"];
  const arm = ["WWWW", "WWWW", "WWWW", "GGGG", "GGGG", "GGGG", "GGGG", "KKKK", "KKKK", "HHHH", "HHHH", "HHHH"];
  const leg = ["PPPP", "PPPP", "PPPP", "PPPP", "PPPP", "PPPP", "PPPP", "PPPP", "PPPP", "SSSS", "SSSS", "OOOO"];
  return { pal, front, back, arm, leg, top: "#e2471f", bottom: "#1f1f1f", armTop: "#efefef", legBottom: "#9a9a9a" };
}
function genericOutfit(o, skin) {
  const pal = { T: o.top, A: o.accent, P: o.pants, S: o.shoes, H: skin, D: shade(o.top, -30), B: shade(o.accent, -40) };
  const front = [], back = [];
  for (let y = 0; y < 12; y++) {
    let r = "TTTTTTTT";
    if (y === 0) r = "TTTAATTT";
    if (o.open && y > 0) r = y % 3 === 1 ? "TTTBATTT" : "TTTAATTT";
    if (o.stripe && (y === 5 || y === 6)) r = "AAAAAAAA";
    if (y === 11 && !o.dress) r = "DDDDDDDD";
    front.push(r);
    back.push(o.stripe && (y === 5 || y === 6) ? "AAAAAAAA" : y === 11 && !o.dress ? "DDDDDDDD" : "TTTTTTTT");
  }
  const arm = [];
  for (let y = 0; y < 12; y++) arm.push(o.sleeve === "short" ? (y < 4 ? "TTTT" : "HHHH") : (y < 10 ? (y === 9 ? "DDDD" : "TTTT") : "HHHH"));
  const leg = [];
  for (let y = 0; y < 12; y++) leg.push(o.dress ? (y < 7 ? "TTTT" : y < 10 ? "HHHH" : "SSSS") : (y < 10 ? "PPPP" : "SSSS"));
  return { pal, front, back, arm, leg, top: o.top, bottom: o.dress ? o.top : o.pants, armTop: o.top, legBottom: o.shoes };
}

/* ---------- name tag ---------- */
export function makeNameTag(text, color = "#ffffff") {
  const c = makeCanvas(512, 112, (x, w, h) => {
    x.font = '40px "Press Start 2P", monospace';
    const tw = Math.min(w - 8, x.measureText(text).width + 48);
    x.fillStyle = "rgba(0,0,0,.55)";
    x.fillRect((w - tw) / 2, 12, tw, h - 24);
    x.fillStyle = color;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2 + 4);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(2.8, 0.62, 1);
  s.renderOrder = 10;
  return s;
}

/* ---------- character ---------- */
export function buildCharacter(spec) {
  const { skin, hair } = spec;
  const style = spec.style || "short";
  const root = new THREE.Group();
  root.name = spec.name;

  // Head textures
  const fp = facePal(skin, hair);
  const front = rowsTex(face({ style, glasses: spec.glasses, mustache: spec.mustache }), fp);
  const sideRows = [], backRows = [];
  const hairDepth = style === "long" ? 8 : style === "curly" ? 4 : style === "receding" ? 2 : 3;
  for (let y = 0; y < 8; y++) {
    let r = "";
    for (let x = 0; x < 8; x++) r += y < hairDepth ? "h" : (y === 4 && (x === 3 || x === 4) ? "n" : "s");
    sideRows.push(r);
    backRows.push((style === "long" || y < (style === "receding" ? 5 : 6)) ? "hhhhhhhh" : "ssssssss");
  }
  const side = rowsTex(sideRows, fp), back = rowsTex(backRows, fp);
  const hairTop = rowsTex([...Array(8)].map(() => "hhhhhhhh"), fp);
  const headMats = [lam(side), lam(side), lam(hairTop), solid(skin), lam(front), lam(back)];

  const head = new THREE.Group();
  head.position.y = 24 * PX;
  const headMesh = box(8, 8, 8, headMats);
  headMesh.position.y = 4 * PX;
  head.add(headMesh);

  // Hair volume
  const hairShades = [hair, shade(hair, -18), shade(hair, 14), shade(hair, -30)];
  const hm = hairShades.map((c) => solid(c));
  const tuft = (w, h, d, x, y, z, i) => { const b = box(w, h, d, hm[i % hm.length]); b.position.set(x * PX, y * PX, z * PX); head.add(b); };
  if (style === "curly") {
    for (let i = 0; i < 26; i++) {
      const s = 2 + (i % 2);
      tuft(s, s, s, -4 + Math.random() * 8, 8 + Math.random() * 1.6, -4 + Math.random() * 8, i);
    }
    for (let i = 0; i < 14; i++) {
      const sideX = i % 2 ? 4.3 : -4.3;
      tuft(1.6, 2, 2, sideX, 5.5 + Math.random() * 2.5, -4 + Math.random() * 7, i + 1);
    }
    for (let i = 0; i < 10; i++) tuft(2, 2, 1.6, -4 + Math.random() * 8, 4 + Math.random() * 4, -4.3, i + 2);
    for (let i = 0; i < 5; i++) tuft(2, 1.6, 1.4, -3 + i * 1.6, 7.6, 4.2, i); // fringe
  } else if (style === "long") {
    tuft(8.6, 12, 1.2, 0, 1.5, -4.4, 0);
    tuft(1.2, 9, 3, -4.4, 2.5, -2, 1); tuft(1.2, 9, 3, 4.4, 2.5, -2, 1);
    tuft(8.6, 1.4, 8.6, 0, 8.3, 0, 2);
  } else if (style === "bun") {
    tuft(4, 4, 4, 0, 9, -2.5, 0);
    tuft(8.6, 1.2, 8.6, 0, 8.2, 0, 1);
  } else if (style === "short") {
    tuft(8.6, 1.4, 8.6, 0, 8.3, 0, 0);
    tuft(8.4, 1.4, 1.2, 0, 7.4, 4.1, 1);
  } else if (style === "receding") {
    tuft(1.2, 3, 7, -4.3, 5, -0.5, 0); tuft(1.2, 3, 7, 4.3, 5, -0.5, 0);
    tuft(8.4, 4, 1.2, 0, 5, -4.3, 1);
  }
  if (spec.glasses) {
    const k = solid("#111");
    const fr = (w, h, x, y) => { const b = box(w, h, 0.6, k); b.position.set(x * PX, y * PX, 4.3 * PX); head.add(b); };
    fr(3.2, 0.5, -2, 5.6); fr(3.2, 0.5, 2, 5.6); fr(3.2, 0.5, -2, 3.4); fr(3.2, 0.5, 2, 3.4);
    fr(0.5, 2.6, -3.5, 4.5); fr(0.5, 2.6, -0.5, 4.5); fr(0.5, 2.6, 0.5, 4.5); fr(0.5, 2.6, 3.5, 4.5);
    const arm = (x) => { const b = box(0.5, 0.5, 6, k); b.position.set(x * PX, 5.4 * PX, 1.2 * PX); head.add(b); };
    arm(-4.25); arm(4.25);
  }

  // Body / limbs
  const of = spec.custom === "hoodie" ? hoodieOutfit(skin) : genericOutfit(spec.outfit, skin);
  const bodyFront = rowsTex(of.front, of.pal), bodyBack = rowsTex(of.back, of.pal);
  const bodySide = rowsTex(of.front.map((r) => r[0].repeat(4)), of.pal);
  const body = box(8, 12, 4, [lam(bodySide), lam(bodySide), solid(of.top), solid(of.bottom), lam(bodyFront), lam(bodyBack)]);
  body.position.y = 18 * PX;
  const extras = [];
  if (spec.custom === "hoodie") {
    // the red hood bunched around the neck
    const hood = box(9, 2, 5, solid("#e2471f"));
    hood.position.set(0, 24.2 * PX, -0.5 * PX);
    extras.push(hood);
  }

  const armTex = rowsTex(of.arm, of.pal);
  const armMats = [lam(armTex), lam(armTex), solid(of.armTop), solid(skin), lam(armTex), lam(armTex)];
  const limb = (tex, mats, x, y) => {
    const g = new THREE.Group(); g.position.set(x * PX, y * PX, 0);
    const m = box(4, 12, 4, mats); m.position.y = -6 * PX; g.add(m);
    return g;
  };
  const armL = limb(armTex, armMats, -6, 24);
  const armR = limb(armTex, armMats, 6, 24);
  const legTex = rowsTex(of.leg, of.pal);
  const legMats = [lam(legTex), lam(legTex), solid(of.bottom), solid(of.legBottom), lam(legTex), lam(legTex)];
  const legL = limb(legTex, legMats, -2, 12);
  const legR = limb(legTex, legMats, 2, 12);

  const model = new THREE.Group();
  model.add(head, body, armL, armR, legL, legR, ...extras);
  root.add(model);
  model.scale.setScalar(spec.scale || 1);

  const height = 2 * (spec.scale || 1);
  let phase = Math.random() * 10;
  const api = {
    root, model, head, armL, armR, legL, legR, height,
    hitMeshes: [],
    update(dt, t, st = {}) {
      const walk = st.walk || 0;
      phase += dt * (6 + walk * 6);
      const sw = Math.sin(phase) * 0.75 * walk;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.9; armR.rotation.x = sw * 0.9;
      armL.rotation.z = -0.05 - Math.sin(t * 1.6) * 0.03;
      armR.rotation.z = 0.05 + Math.sin(t * 1.6) * 0.03;
      if (st.wave) { armR.rotation.z = 2.5 + Math.sin(t * 9) * 0.35; armR.rotation.x = 0; }
      if (st.cheer) { armL.rotation.z = -2.7 - Math.sin(t * 10) * 0.2; armR.rotation.z = 2.7 + Math.sin(t * 10) * 0.2; armL.rotation.x = armR.rotation.x = 0; }
      head.rotation.y = st.lookYaw ?? Math.sin(t * 0.7 + phase * 0.01) * 0.18;
      head.rotation.x = Math.sin(t * 1.3) * 0.04;
      model.position.y = walk ? Math.abs(Math.sin(phase)) * 0.06 : Math.sin(t * 2) * 0.015;
    },
  };
  root.traverse((o) => { if (o.isMesh) { api.hitMeshes.push(o); o.userData.owner = api; } });
  return api;
}
