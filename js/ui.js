// Shared DOM helpers: confetti canvas, achievements toasts, heart bursts.
import { animate } from "motion";
import { Sfx } from "./audio.js";
import { S } from "./sprites.js";

export const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 2D confetti / firework overlay ---------- */
export const FX = (() => {
  const cv = $("#fx"), cx = cv.getContext("2d");
  let W = 0, H = 0, parts = [], running = false;
  const resize = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0); };
  resize(); addEventListener("resize", resize);
  const COLORS = ["#ff5555", "#ffff55", "#55ff55", "#55ffff", "#5555ff", "#ff55ff", "#ffaa00", "#ffffff"];
  const loop = () => {
    cx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= 1;
      cx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
      cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s);
      return p.life > 0 && p.y < H + 20;
    });
    cx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(loop); else { running = false; cx.clearRect(0, 0, W, H); }
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
  const rc = () => COLORS[(Math.random() * COLORS.length) | 0];
  return {
    burst(x, y, n = 40, color) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 4;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0.06, life: 60 + Math.random() * 40, s: 4 + ((Math.random() * 3) | 0), c: color || rc() });
      }
      kick();
    },
    confetti(n = 120) {
      for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: Math.random() * 2 - 1, vy: 2 + Math.random() * 3, g: 0.03, life: 200 + Math.random() * 80, s: 6 + ((Math.random() * 5) | 0), c: rc() });
      kick();
    },
  };
})();

export function heartBurst(x, y, n = 8, src = S.heart) {
  for (let i = 0; i < n; i++) {
    const im = new Image(); im.src = src; im.alt = "";
    im.className = "particle px"; im.style.cssText = `left:${x}px;top:${y}px;width:22px;height:22px`;
    document.body.appendChild(im);
    const dx = (Math.random() - 0.5) * 220, dy = -80 - Math.random() * 140;
    animate(im, { x: [0, dx], y: [0, dy, dy + 60], opacity: [1, 1, 0], scale: [0.4, 1.2, 0.8] }, { duration: 1.1, ease: "easeOut" }).then(() => im.remove());
  }
}

/* ---------- Achievements ---------- */
export const ACH = {
  start: { t: "Entered Ayoub's World", i: S.star },
  poke: { t: "Poked the birthday boy", i: S.heart },
  gems: { t: "Treasure Hunter: 11 treasures!", i: S.diamond },
  squad: { t: "Talked to the whole family", i: S.heart },
  family: { t: "Collected all squad cards", i: S.emerald },
  miner: { t: "Master Miner", i: S.sword },
  coins: { t: "1-UP! 11 coins collected", i: S.coin },
  cake: { t: "Wish made!", i: S.cake },
  chest: { t: "Opened Uncle Fares' gift", i: S.gift },
};
const got = new Set();
let onAll = () => {};
export const onAllAchievements = (fn) => (onAll = fn);
export function initHud() {
  $("#achTotal").textContent = Object.keys(ACH).length;
  $("#hudTrophy").src = S.trophy;
}
export function toast(title, text, icon) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<img class="px" alt="" src="${icon}"><div><b></b><span></span></div>`;
  el.querySelector("b").textContent = title;
  el.querySelector("span").textContent = text;
  $("#toasts").appendChild(el);
  animate(el, { x: [340, 0], opacity: [0, 1] }, { type: "spring", stiffness: 260, damping: 24 });
  setTimeout(() => animate(el, { x: 340, opacity: 0 }, { duration: 0.3 }).then(() => el.remove()), 3600);
}
export function unlock(key) {
  if (got.has(key) || !ACH[key]) return;
  got.add(key);
  Sfx.ach();
  toast("Achievement Get!", ACH[key].t, ACH[key].i);
  $("#achCount").textContent = got.size;
  animate(".hud__ach", { scale: [1, 1.25, 1] }, { duration: 0.4 });
  if (got.size === Object.keys(ACH).length) setTimeout(() => { toast("100% Complete!", "You found everything. Happy Birthday, Ayoub!", S.trophy); onAll(); }, 1200);
}
