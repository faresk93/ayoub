// Scroll sections below the 3D hero.
import { animate, inView, stagger } from "motion";
import { $, $$, RM, FX, heartBurst, unlock, sleep } from "./ui.js";
import { Sfx } from "./audio.js";
import { S, sprite, face, facePal } from "./sprites.js";
import { T, cssURL } from "./textures.js";
import { FAMILY } from "./family.js";

export function initReveal() {
  inView(".reveal", (a) => {
    const el = a instanceof Element ? a : a.target;
    if (RM) { el.style.opacity = 1; return; }
    animate(el, { opacity: [0, 1], y: [40, 0] }, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
  }, { amount: 0.2 });
}

/* ---------- Player profile ---------- */
export function initProfile() {
  const hearts = $("#hearts");
  for (let i = 0; i < 10; i++) { const im = new Image(); im.src = S.heart; im.alt = ""; im.className = "px"; hearts.appendChild(im); }
  const birth = new Date(2015, 10, 17);
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - birth) / 864e5);
  let shown = false;
  inView(".stats", () => {
    if (shown) return; shown = true;
    animate(0, days, { duration: RM ? 0 : 2.2, ease: "easeOut", onUpdate: (v) => ($("#days").textContent = Math.round(v).toLocaleString("en-US")) });
    animate(hearts.children, { scale: [0, 1.3, 1] }, { delay: stagger(0.06, { startDelay: 0.3 }), duration: 0.35 });
    const fill = $("#xpFill");
    animate(fill, { width: ["0%", "100%"] }, { duration: RM ? 0 : 1.8, delay: 0.5, ease: "easeIn" }).then(() => {
      $("#xpLvl").textContent = "11";
      $("#xpLabel").textContent = "LEVEL UP! Ayoub is now 11!";
      Sfx.level();
      animate("#xpLvl", { scale: [1, 1.8, 1] }, { duration: 0.6 });
      const r = $("#xpLvl").getBoundingClientRect();
      FX.burst(r.left + r.width / 2, r.top, 40, "#80ff20");
      animate(fill, { width: ["0%", "11%"] }, { duration: 0.8, delay: 0.4 });
    });
  }, { amount: 0.4 });

  // 3D tilt card for the portrait
  const stage = $("#avatarCard"), img = stage.querySelector("img");
  if (!RM) {
    animate(img, { y: [0, -8, 0] }, { duration: 3, repeat: Infinity, ease: "easeInOut" });
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -16, ry = ((e.clientX - r.left) / r.width - 0.5) * 20;
      stage.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      stage.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
      stage.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
    stage.addEventListener("pointerleave", () => (stage.style.transform = ""));
  }
  stage.addEventListener("click", () => {
    Sfx.ensure(); Sfx.pop();
    animate(img, { y: [0, -50, 0], rotate: [0, -6, 0] }, { duration: 0.55, ease: "easeOut" });
    const r = stage.getBoundingClientRect();
    heartBurst(r.left + r.width / 2, r.top + r.height * 0.35, 8);
  });
}

/* ---------- Portal compare slider ---------- */
export function initCompare() {
  const cmp = $("#compare"), range = $("#compareRange");
  range.addEventListener("input", () => cmp.style.setProperty("--p", range.value + "%"));
  let hinted = false;
  inView("#compare", () => {
    if (hinted || RM) return; hinted = true;
    animate(50, [50, 85, 15, 50], { duration: 2.4, delay: 0.6, ease: "easeInOut", onUpdate: (v) => { cmp.style.setProperty("--p", v + "%"); range.value = v; } });
  }, { amount: 0.5 });
}

/* ---------- Squad cards ---------- */
export function initCards() {
  const wrap = $("#cards"), met = new Set();
  FAMILY.forEach((p, idx) => {
    const l = p.look;
    const b = document.createElement("button");
    b.className = "card";
    if (!RM) b.style.opacity = 0;
    b.setAttribute("aria-label", `${p.name}, ${p.role}. Tap to reveal message`);
    const hearts = `<img class="px" alt="" src="${S.heart}">`.repeat(5);
    b.innerHTML = `
      <span class="card__inner">
        <span class="card__face card__face--front panel" style="background:${p.bg}">
          <img class="card__head px" alt="" src="${sprite(face({ style: l.style, glasses: l.glasses, mustache: l.mustache }), facePal(l.skin, l.hair))}">
          <span class="card__name"></span><span class="card__role"></span><span class="card__tag"></span>
          <span class="card__hearts">${hearts}</span>
        </span>
        <span class="card__face card__face--back">
          <span class="card__tag"></span><p class="card__msg"></p><span class="card__hearts">${hearts}</span>
        </span>
      </span>`;
    b.querySelector(".card__name").textContent = p.name;
    b.querySelector(".card__role").textContent = p.role;
    $$(".card__tag", b).forEach((e) => (e.textContent = p.tag));
    b.querySelector(".card__msg").textContent = p.msg;
    const inner = b.querySelector(".card__inner");
    let flipped = false;
    b.addEventListener("click", () => {
      flipped = !flipped;
      Sfx.ensure(); Sfx.pop();
      animate(inner, { rotateY: flipped ? 180 : 0 }, { type: "spring", stiffness: 160, damping: 16 });
      if (!flipped) return;
      const r = b.getBoundingClientRect();
      heartBurst(r.left + r.width / 2, r.top + r.height / 3, 6);
      met.add(idx);
      $("#squadStatus").textContent = `${met.size} / ${FAMILY.length} squad cards collected`;
      if (met.size === FAMILY.length) unlock("family");
    });
    b.addEventListener("pointermove", (e) => {
      if (RM || e.pointerType !== "mouse") return;
      const r = b.getBoundingClientRect();
      b.style.transform = `rotateX(${((e.clientY - r.top) / r.height - 0.5) * -12}deg) rotateY(${((e.clientX - r.left) / r.width - 0.5) * 12}deg) translateZ(10px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
    wrap.appendChild(b);
  });
  inView("#cards", () => {
    if (RM) return;
    animate(".card", { opacity: [0, 1], y: [80, 0], rotateX: [40, 0] }, { delay: stagger(0.1), type: "spring", stiffness: 160, damping: 18 });
  }, { amount: 0.15 });
}

/* ---------- Mining with CSS-3D cubes ---------- */
const LOOT = [
  { tex: "oreDiamond", item: S.diamond, name: "Diamond", wish: "May your 11th year be as rare and shiny as a diamond!" },
  { tex: "grassSide", top: "grassTop", item: S.apple, name: "Apple", wish: "Stay healthy and strong, little explorer." },
  { tex: "oreEmerald", item: S.emerald, name: "Emerald", wish: "Trade every worry for a big smile — best deal ever." },
  { tex: "log", top: "logTop", item: S.book, name: "Book", wish: "6th grade? Easy mode for a genius like you. Every book is a new world!" },
  { tex: "oreGold", item: S.coin, name: "Gold Coin", wish: "Coins for every level you clear this year!" },
  { tex: "oreRed", item: S.heart, name: "Heart", wish: "+∞ hearts: your whole family loves you so much." },
  { tex: "dirt", item: S.pad, name: "Controller", wish: "New high scores and epic co-op sessions with Ilyes!" },
  { tex: "oreLapis", item: S.star, name: "Super Star", wish: "Super star power: you are unstoppable!" },
  { tex: "planks", item: S.cake, name: "Cake", wish: "Cake for breakfast? Only today. Probably." },
  { tex: "stone", item: S.sword, name: "Diamond Sword", wish: "Brave, kind and clever — the real hero of the story." },
  { tex: "leaves", item: S.gift, name: "Gift", wish: "A special surprise waits in the chest at the bottom of this world..." },
  { tex: "lucky", item: S.trophy, name: "Trophy", wish: "Achievement: Most Awesome 11-Year-Old in the Universe!" },
];
export function initMine() {
  const grid = $("#mineGrid"), hotbar = $("#hotbar"), chat = $("#chat");
  const slots = LOOT.map(() => { const s = document.createElement("div"); s.className = "slot"; hotbar.appendChild(s); return s; });
  let mined = 0;
  const say = (who, text) => {
    const p = document.createElement("p");
    const w = document.createElement("span"); w.className = "chat__who"; w.textContent = `<${who}> `;
    p.append(w, text);
    chat.appendChild(p); chat.scrollTop = chat.scrollHeight;
    animate(p, { opacity: [0, 1], x: [-12, 0] }, { duration: 0.3 });
  };
  const cubes = [];
  LOOT.forEach((l, i) => {
    const cell = document.createElement("div"); cell.className = "cell";
    const b = document.createElement("button");
    b.className = "cube";
    b.style.setProperty("--t", cssURL(T[l.tex]));
    b.style.setProperty("--tt", cssURL(T[l.top || l.tex]));
    b.setAttribute("aria-label", `Mine block ${i + 1} of ${LOOT.length}`);
    b.innerHTML = `<span class="cube__rot">${["front", "back", "right", "left", "top", "bottom"].map((f) => `<i class="f f--${f}"></i>`).join("")}</span>`;
    const rot = b.firstElementChild;
    let hp = 3;
    b.addEventListener("click", () => {
      Sfx.ensure();
      hp--;
      if (hp > 0) {
        Sfx.hit();
        b.style.setProperty("--crack", cssURL(T.crack[3 - hp]));
        animate(rot, { scale: [1, 0.86, 1] }, { duration: 0.18 });
        return;
      }
      Sfx.brk();
      const r = b.getBoundingClientRect();
      for (let k = 0; k < 12; k++) {
        const p = document.createElement("i");
        p.className = "particle";
        p.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background-image:${cssURL(T[l.tex])};background-position:${Math.random() * 100}% ${Math.random() * 100}%`;
        document.body.appendChild(p);
        const dx = (Math.random() - 0.5) * 180, up = -40 - Math.random() * 80;
        animate(p, { x: [0, dx * 0.6, dx], y: [0, up, up + 170], opacity: [1, 1, 0], rotate: [0, 270] }, { duration: 0.85, ease: "easeOut" }).then(() => p.remove());
      }
      b.remove();
      cell.classList.add("cell--air");
      const it = new Image(); it.src = l.item; it.alt = l.name; it.className = "item px";
      cell.appendChild(it);
      animate(it, { y: [0, -24, 0], scale: [0.3, 1.2, 1], rotateY: [0, 360] }, { duration: 0.6, ease: "easeOut" });
      say("Uncle Fares", l.wish);
      setTimeout(() => flyTo(it, slots[mined++], l), 650);
    });
    cell.appendChild(b); grid.appendChild(cell); cubes.push(rot);
  });
  if (!RM) cubes.forEach((c, i) => animate(c, { y: [0, -6, 0], rotateX: [-26, -26, -26], rotateY: [-38, -30, -38] }, { duration: 2.6, repeat: Infinity, delay: (i % 6) * 0.18, ease: "easeInOut" }));
  inView("#mineGrid", () => { if (!RM) animate(".cell", { opacity: [0, 1], scale: [0.4, 1] }, { delay: stagger(0.04), type: "spring", stiffness: 260, damping: 18 }); }, { amount: 0.2 });

  function flyTo(it, slot, l) {
    const a = it.getBoundingClientRect(), z = slot.getBoundingClientRect();
    const ghost = it.cloneNode();
    ghost.className = "particle px";
    ghost.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
    document.body.appendChild(ghost);
    it.style.opacity = 0.25;
    animate(ghost, { x: [0, z.left - a.left + (z.width - a.width) / 2], y: [0, -60, z.top - a.top + (z.height - a.height) / 2], scale: [1, 1.2, (z.width / a.width) * 0.7] }, { duration: RM ? 0.01 : 0.7, ease: "easeInOut" }).then(() => {
      ghost.remove();
      const im = new Image(); im.src = l.item; im.alt = l.name; im.className = "px";
      slot.appendChild(im);
      Sfx.pickup();
      animate(slot, { scale: [1, 1.25, 1] }, { duration: 0.3 });
      if (mined === LOOT.length) { say("Server", "Ayoub has made the advancement [Master Miner]"); unlock("miner"); FX.burst(z.left, z.top, 60); }
    });
  }
}

/* ---------- ? blocks ---------- */
export function initBonus() {
  $("#coinIcon").src = S.coin;
  const row = $("#qrow");
  let coins = 0;
  for (let i = 0; i < 4; i++) {
    const q = document.createElement("button");
    q.className = "qblock"; q.textContent = "?"; q.setAttribute("aria-label", "Question block: hit for a coin");
    q.addEventListener("click", () => {
      Sfx.ensure();
      if (coins >= 11) { Sfx.bump(); animate(q, { y: [0, -10, 0] }, { duration: 0.2 }); return; }
      coins++;
      Sfx.coin();
      animate(q, { y: [0, -22, 0], rotateX: [0, -20, 0] }, { duration: 0.22, ease: "easeOut" });
      const c = new Image(); c.src = S.coin; c.alt = ""; c.className = "coin-pop px";
      q.appendChild(c);
      animate(c, { y: [0, -120, -80], opacity: [1, 1, 0], rotateY: [0, 1080] }, { duration: 0.7, ease: "easeOut" }).then(() => c.remove());
      $("#coinNum").textContent = String(coins).padStart(2, "0");
      animate("#coinNum", { scale: [1, 1.4, 1] }, { duration: 0.25 });
      if (coins === 11) setTimeout(() => {
        Sfx.oneup();
        $$(".qblock").forEach((b) => { b.textContent = ""; b.classList.add("qblock--used"); });
        const r = row.getBoundingClientRect();
        const t = document.createElement("div"); t.className = "oneup"; t.textContent = "1-UP · LEVEL 11!";
        row.appendChild(t);
        animate(t, { y: [20, -10], opacity: [0, 1], scale: [0.6, 1] }, { type: "spring", stiffness: 300, damping: 14 });
        FX.burst(r.left + r.width / 2, r.top, 70);
        unlock("coins");
      }, 400);
    });
    row.appendChild(q);
  }
}

/* ---------- Chest & letter ---------- */
const LETTER = [
  "Happy 11th birthday, champion! Eleven years ago today, the world spawned its best new player — and every single day since, you've made all of us proud.",
  "You've grown into such a smart, kind and funny boy: a 6th grade hero, a master builder, a gamer with serious skills, and an amazing brother to Ilyes.",
  "Your mom Maha loves you more than all the diamonds in every world, and Baba Deen and Mama Omi light up every time you walk in the room.",
  "Keep building, keep exploring, keep asking questions and keep laughing. Whatever level comes next, real or blocky, your family always has your back.",
  "Level 11 unlocked. I love you so much!",
];
export function initChest() {
  let open = false;
  const chest = $("#chest");
  if (!RM) animate(chest, { y: [0, -10, 0], rotateX: [-16, -16, -16], rotateY: [-14, -30, -14] }, { duration: 3, repeat: Infinity, ease: "easeInOut" });
  chest.addEventListener("click", async () => {
    if (open) return; open = true;
    Sfx.ensure(); Sfx.chest();
    chest.setAttribute("aria-label", "Gift chest opened");
    await animate(chest, { x: [0, -6, 6, -6, 6, 0] }, { duration: 0.4 }).finished;
    animate("#chestLid", { rotateX: [0, 110] }, { type: "spring", stiffness: 120, damping: 12 });
    animate("#rays", { opacity: [0, 1], scale: [0.4, 1] }, { duration: 0.8 });
    if (!RM) animate("#rays", { rotate: [0, 360] }, { duration: 24, repeat: Infinity, ease: "linear" });
    const r = chest.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + 20, 90);
    [S.diamond, S.heart, S.star, S.coin, S.emerald, S.cake].forEach((src, i) => setTimeout(() => heartBurst(r.left + r.width / 2, r.top + 30, 2, src), i * 120));
    unlock("chest");
    await sleep(700);
    const letter = $("#letter");
    letter.hidden = false;
    animate(letter, { opacity: [0, 1], y: [80, 0], rotateX: [30, 0] }, { type: "spring", stiffness: 160, damping: 18 });
    letter.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    const body = $("#letterBody");
    body.innerHTML = "";
    for (const para of LETTER) {
      const p = document.createElement("p"); body.appendChild(p);
      if (RM) { p.textContent = para; continue; }
      for (let i = 0; i < para.length; i += 2) { p.textContent = para.slice(0, i + 2); await sleep(18); }
      await sleep(160);
    }
    FX.confetti(140);
  });
  $("#replayBtn").addEventListener("click", () => { Sfx.birthday(); FX.confetti(160); $("#top").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); });
}
