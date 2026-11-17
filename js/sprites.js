// 8x8 pixel-art sprites (items, hearts) and block-style faces.
import { makeCanvas } from "./textures.js";

export function spriteCanvas(rows, pal) {
  return makeCanvas(rows[0].length, rows.length, (x) => {
    rows.forEach((row, y) => [...row].forEach((ch, i) => {
      if (!pal[ch]) return;
      x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1);
    }));
  });
}
export const sprite = (rows, pal) => spriteCanvas(rows, pal).toDataURL();

export const S = {
  heart: sprite(["..........".slice(0, 8), ".dd.dd..", "drrdrrd.", "drwrrrd.", "drrrrrd.", ".drrrd..", "..drd...", "...d...."], { d: "#5a0a0e", r: "#e3262e", w: "#ffb3b3" }),
  diamond: sprite(["........", "..aaaa..", ".abccba.", "abcbbbba", ".abbbba.", "..abba..", "...aa...", "........"], { a: "#0b5f63", b: "#4ee8e0", c: "#e2fffe" }),
  emerald: sprite(["...aa...", "..abba..", ".abcbba.", ".abbbba.", ".abbbba.", ".aabbaa.", "..abba..", "...aa..."], { a: "#06512a", b: "#17dd62", c: "#c8ffd9" }),
  coin: sprite(["..oooo..", ".oyyyyo.", "oyywyyyo", "oyywyyyo", "oyywyyyo", "oyyyyyyo", ".oyyyyo.", "..oooo.."], { o: "#8a5a00", y: "#ffd23f", w: "#fff6c8" }),
  star: sprite(["...oo...", "...yy...", "..oyyo..", "oyyyyyyo", ".oykkyo.", "..oyyo..", ".oy..yo.", "oo....oo"], { o: "#b06a00", y: "#ffd23f", k: "#222" }),
  cake: sprite(["...r....", "...y....", "pppppppp", "pwpwpwpp", "cccccccc", "wwwwwwww", "cccccccc", "gggggggg"], { r: "#ff7a00", y: "#ffe27a", p: "#ff8fc8", w: "#ffffff", c: "#7a4321", g: "#9a9a9a" }),
  book: sprite([".rrrrrr.", "rrrrrrwk", "rryyrrwk", "rrrrrrwk", "rryyrrwk", "rrrrrrwk", ".kkkkkkk", "........"], { r: "#2e66d6", y: "#ffd23f", w: "#f5ecd2", k: "#16316b" }),
  pad: sprite(["........", ".kkkkkk.", "kggggggk", "gwggrrgg", "wwwgggbg", "gwgggggg", "gggkkggg", ".gg..gg."], { k: "#222", g: "#4a4a4a", w: "#fff", r: "#e3262e", b: "#2e66d6" }),
  gift: sprite(["..r..r..", "...rr...", "pppyyppp", "pppyyppp", "ppayyapp", "pppyyppp", "pppyyppp", "aaayyaaa"], { r: "#e3262e", y: "#ffd23f", p: "#b45cff", a: "#7a2fc4" }),
  apple: sprite(["....g...", "...b....", ".rr.rr..", "rwrrrrr.", "rwrrrrr.", "rrrrrrr.", ".rrrrr..", "..r.r..."], { g: "#3c8526", b: "#5a3d22", r: "#e3262e", w: "#ffb3b3" }),
  sword: sprite(["......cc", ".....cwc", "....cwc.", "...cwc..", "b.cwc...", ".bbc....", ".hb.....", "h.b....."], { c: "#2aa6a0", w: "#bff9f6", b: "#6b4a2a", h: "#4a3820" }),
  trophy: sprite(["oyyyyyyo", "y.yyyy.y", "y.ywyy.y", ".oyyyyo.", "..oyyo..", "...yy...", "..oyyo..", ".oooooo."], { o: "#b06a00", y: "#ffd23f", w: "#fff6c8" }),
};

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* 8x8 block-style face. Keys: s skin, h hair, w eye white, e iris, k glasses, n nose/shadow, m mouth, t teeth, b mustache */
export function face({ style = "short", glasses = false, mustache = false }) {
  const g = [...Array(8)].map(() => Array(8).fill("s"));
  for (let x = 0; x < 8; x++) { g[0][x] = "h"; g[1][x] = "h"; }
  if (style === "short") { g[2][0] = g[2][7] = "h"; }
  if (style === "curly") { g[2][0] = g[2][1] = g[2][6] = g[2][7] = "h"; g[2][3] = g[2][4] = "h"; g[3][0] = g[3][7] = "h"; }
  if (style === "long") { for (let y = 2; y < 8; y++) g[y][0] = g[y][7] = "h"; g[2][1] = g[2][6] = "h"; }
  if (style === "bun") { g[2][0] = g[2][7] = "h"; g[3][0] = g[3][7] = "h"; g[4][0] = g[4][7] = "h"; }
  if (style === "receding") { g[1][2] = g[1][3] = g[1][4] = g[1][5] = "s"; g[2][0] = g[2][7] = "h"; g[3][0] = g[3][7] = "h"; }
  g[3][1] = "w"; g[3][2] = "e"; g[3][5] = "e"; g[3][6] = "w";
  if (glasses) [[2, 1], [2, 2], [2, 5], [2, 6], [4, 1], [4, 2], [4, 5], [4, 6], [3, 3], [3, 4]].forEach(([y, x]) => (g[y][x] = "k"));
  g[4][3] = g[4][4] = "n";
  g[6][2] = "m"; g[6][3] = "t"; g[6][4] = "t"; g[6][5] = "m";
  if (mustache) g[5][2] = g[5][3] = g[5][4] = g[5][5] = "b";
  return g.map((r) => r.join(""));
}
export const facePal = (skin, hair, eye = "#3b2414") => ({ s: skin, h: hair, w: "#fff", e: eye, k: "#111", n: shade(skin, -22), m: "#8a3b3b", t: "#fff", b: hair });
