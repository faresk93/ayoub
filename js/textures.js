// Procedural 16x16 pixel textures shared by the 2D page (CSS) and the 3D scenes (three.js).
export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20151117);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

export function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}

const PAL = {
  grass: ["#5d9e33", "#6bb33c", "#4f8a2a", "#79c046", "#5d9e33"],
  dirt: ["#866043", "#6c4b33", "#966c4a", "#5e402c", "#866043"],
  stone: ["#7d7d7d", "#8f8f8f", "#6e6e6e", "#858585", "#7d7d7d"],
  bedrock: ["#2b2b2b", "#555", "#111", "#3d3d3d", "#6a6a6a"],
  leaves: ["#2f6b1d", "#3c8526", "#24561a", "#4a9a2e", "#3c8526"],
};
const noise = (x, pal, w = 16, h = 16, y0 = 0) => {
  for (let i = 0; i < w; i++) for (let j = y0; j < h; j++) { x.fillStyle = pick(pal); x.fillRect(i, j, 1, 1); }
};
const planks = (base) => makeCanvas(16, 16, (x) => {
  noise(x, base);
  x.fillStyle = "rgba(0,0,0,.35)";
  for (let r = 3; r < 16; r += 4) x.fillRect(0, r, 16, 1);
  [[4, 0], [12, 4], [2, 8], [9, 12]].forEach(([cx, cy]) => x.fillRect(cx, cy, 1, 3));
});
const ore = (cols) => makeCanvas(16, 16, (x) => {
  noise(x, PAL.stone);
  for (let k = 0; k < 5; k++) {
    const cx = 2 + Math.floor(rng() * 12), cy = 2 + Math.floor(rng() * 12);
    for (let p = 0; p < 4; p++) { x.fillStyle = pick(cols); x.fillRect(cx + Math.floor(rng() * 3) - 1, cy + Math.floor(rng() * 3) - 1, 1, 1); }
  }
});

export const C = {};
C.grassTop = makeCanvas(16, 16, (x) => noise(x, PAL.grass));
C.dirt = makeCanvas(16, 16, (x) => noise(x, PAL.dirt));
C.stone = makeCanvas(16, 16, (x) => {
  noise(x, PAL.stone);
  x.fillStyle = "#5f5f5f";
  for (let k = 0; k < 7; k++) x.fillRect(Math.floor(rng() * 15), Math.floor(rng() * 16), 2, 1);
});
C.grassSide = makeCanvas(16, 16, (x) => {
  noise(x, PAL.dirt);
  for (let i = 0; i < 16; i++) {
    const h = 3 + (rng() < 0.5 ? 1 : 0) + (rng() < 0.25 ? 1 : 0);
    for (let j = 0; j < h; j++) { x.fillStyle = pick(PAL.grass); x.fillRect(i, j, 1, 1); }
  }
});
C.bedrock = makeCanvas(16, 16, (x) => noise(x, PAL.bedrock));
C.leaves = makeCanvas(16, 16, (x) => {
  noise(x, PAL.leaves);
  x.fillStyle = "#1c4512";
  for (let k = 0; k < 18; k++) x.fillRect(Math.floor(rng() * 16), Math.floor(rng() * 16), 1, 1);
});
C.planks = planks(["#a2824e", "#b8945f", "#9a7a46", "#ad8b55"]);
C.planksD = planks(["#5a3d22", "#6b4a2a", "#4e3420", "#62442a"]);
C.log = makeCanvas(16, 16, (x) => {
  for (let i = 0; i < 16; i++) {
    const c = pick(["#6b5132", "#5a4429", "#7a5e3b"]);
    for (let j = 0; j < 16; j++) { x.fillStyle = rng() < 0.8 ? c : pick(["#4a3820", "#7a5e3b"]); x.fillRect(i, j, 1, 1); }
  }
});
C.logTop = makeCanvas(16, 16, (x) => {
  noise(x, ["#6b5132", "#5a4429"]);
  x.fillStyle = "#b8945f"; x.fillRect(2, 2, 12, 12);
  x.fillStyle = "#9a7a46"; x.fillRect(4, 4, 8, 8);
  x.fillStyle = "#b8945f"; x.fillRect(6, 6, 4, 4);
});
C.brick = makeCanvas(16, 16, (x) => {
  x.fillStyle = "#c84c0c"; x.fillRect(0, 0, 16, 16);
  x.fillStyle = "#000";
  [0, 8].forEach((r) => x.fillRect(0, r + 7, 16, 1));
  x.fillRect(7, 0, 1, 7); x.fillRect(15, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7);
  x.fillStyle = "#fcbcb0"; x.fillRect(0, 0, 7, 1); x.fillRect(8, 0, 7, 1); x.fillRect(0, 8, 3, 1); x.fillRect(4, 8, 7, 1); x.fillRect(12, 8, 4, 1);
});
C.oreDiamond = ore(["#4ee8e0", "#d6fffd", "#1aa6a0"]);
C.oreEmerald = ore(["#17dd62", "#a9ffc8", "#0a8c3a"]);
C.oreGold = ore(["#fcee4b", "#fff9b0", "#d4a20e"]);
C.oreRed = ore(["#ff2020", "#ff8a8a", "#a00000"]);
C.oreLapis = ore(["#2552d6", "#6f95ff", "#183a9e"]);
C.gold = makeCanvas(16, 16, (x) => {
  noise(x, ["#f5d33b", "#fcee4b", "#f0c52a"]);
  x.fillStyle = "#c88a00"; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
  x.fillStyle = "#fff9b0"; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
});
C.lucky = makeCanvas(16, 16, (x) => {
  x.drawImage(C.gold, 0, 0);
  x.fillStyle = "#7a4200";
  [[6, 3], [7, 3], [8, 3], [9, 3], [5, 4], [10, 4], [10, 5], [9, 6], [8, 7], [7, 8], [7, 9], [7, 11], [7, 12]].forEach(([a, b]) => x.fillRect(a, b, 2, 1));
});

const crack = (stage) => makeCanvas(16, 16, (x) => {
  const r = mulberry32(99);
  x.fillStyle = "rgba(0,0,0,.75)";
  for (let w = 0; w < stage * 3; w++) {
    let px = 8, py = 8;
    for (let s = 0; s < 3 + stage * 2; s++) {
      x.fillRect(px, py, 1, 1);
      px = Math.max(0, Math.min(15, px + Math.round(r() * 2 - 1)));
      py = Math.max(0, Math.min(15, py + Math.round(r() * 2 - 1)));
    }
  }
});
C.crack = [null, crack(1), crack(2), crack(3)];

// data-URL versions for CSS
export const T = {};
for (const [k, v] of Object.entries(C)) T[k] = Array.isArray(v) ? v.map((c) => c && c.toDataURL()) : v.toDataURL();

export const cssURL = (u) => `url("${u}")`;
export function applyCssTextures() {
  const s = document.documentElement.style;
  const map = { "grass-top": "grassTop", "grass-side": "grassSide", dirt: "dirt", stone: "stone", planks: "planks", "planks-d": "planksD", bedrock: "bedrock", brick: "brick", leaves: "leaves" };
  for (const [css, key] of Object.entries(map)) s.setProperty(`--tex-${css}`, cssURL(T[key]));
}
