import { animate, stagger } from "motion";
import { applyCssTextures } from "./textures.js";
import { $, $$, RM, FX, unlock, initHud, onAllAchievements, toast, sleep } from "./ui.js";
import { Sfx } from "./audio.js";
import { S } from "./sprites.js";
import { initReveal, initProfile, initCompare, initCards, initMine, initBonus, initChest } from "./sections.js";

applyCssTextures();
initHud();
$("#footHeart").src = S.heart;
$("#gemIcon").src = S.diamond;
$("#famIcon").src = S.heart;
$("#coinIcon3d").src = S.coin;

const fill = $("#loaderFill"), hint = $("#loaderHint");
const progress = (p, text) => { hint.textContent = text; fill.style.width = `${p}%`; return sleep(RM ? 10 : 220); };

let world = null, cake = null;

async function boot() {
  await progress(15, "Placing blocks…");
  try { await Promise.race([document.fonts.load('16px "Press Start 2P"'), sleep(1800)]); } catch {}
  await progress(35, "Growing trees…");
  try {
    const [{ createWorld }, { createCake }] = await Promise.all([import("./world.js"), import("./cake3d.js")]);
    await progress(60, "Spawning Ayoub & family…");
    world = createWorld($("#world"), { bubble: $("#bubble3d"), hooks: worldHooks });
    if (location.search.includes("debug")) window.__w = world;
    await progress(80, "Baking the cake…");
    cake = createCake($("#cakeCanvas"), cakeHooks);
  } catch (err) {
    console.error(err);
    document.body.classList.add("no-webgl");
  }
  await progress(100, "Wrapping gifts…");
  initReveal(); initProfile(); initCompare(); initCards(); initMine(); initBonus(); initChest();
  const ld = $("#loader");
  ld.style.transition = "opacity .45s"; ld.style.opacity = 0;
  await sleep(460);
  ld.remove();
  introTitle();
}

/* ---------- title overlay ---------- */
function introTitle() {
  if (RM) return;
  const letters = $$(".logo__l");
  const els = [$(".logo__sub"), $("#splash"), ...$$(".hero__menu .mc-btn"), $(".hero__foot")];
  els.forEach((e) => (e.style.opacity = 0));
  animate(letters, { y: [-300, 0], rotateX: [-90, 0], rotateZ: [-20, 0], opacity: [0, 1] }, { delay: stagger(0.1), type: "spring", stiffness: 260, damping: 14 });
  animate(".logo__sub", { opacity: [0, 1], y: [10, 0] }, { delay: 0.7, duration: 0.5 });
  animate(".hero__menu .mc-btn", { opacity: [0, 1], y: [24, 0] }, { delay: stagger(0.08, { startDelay: 0.9 }), duration: 0.45 });
  animate(".hero__foot", { opacity: [0, 1] }, { delay: 1.3, duration: 0.5 });
  animate("#splash", { opacity: [0, 1] }, { duration: 0.3, delay: 0.9 });
  animate("#splash", { scale: [1, 1.1, 1], rotate: [-10, -10, -10] }, { duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 1 });
  letters.forEach((l, i) => animate(l, { y: [0, -8, 0], rotateY: [0, 12, 0] }, { duration: 2.6, repeat: Infinity, delay: 2 + i * 0.15, ease: "easeInOut" }));
}
const splashes = ["Happy 11th Birthday!", "Level 11 unlocked!", "Now in 3D!", "Ilyes approved!", "100% awesome!", "Diamonds inside!", "6th grade legend!", "Made by Uncle Fares!", "Joyeux anniversaire!", "Tap Ayoub!"];
let si = 0;
setInterval(() => { si = (si + 1) % splashes.length; $("#splash").textContent = splashes[si]; }, 3200);

/* ---------- 3D world hooks ---------- */
let pokes = 0, coins3d = 0, barks = 0;
const worldHooks = {
  onPoke() { Sfx.ensure(); Sfx.pop(); if (++pokes >= 3) unlock("poke"); },
  onJump() { Sfx.jump(); },
  onTalk() { Sfx.talk(); },
  onMeet(n, total) {
    $("#famCount").textContent = `${n}/${total}`;
    animate(".gstat--fam", { scale: [1, 1.3, 1] }, { duration: 0.3 });
    if (n === total) unlock("squad");
  },
  onCollect(n, total) {
    Sfx.gem();
    $("#gemCount").textContent = `${n}/${total}`;
    animate(".gstat--gem", { scale: [1, 1.35, 1] }, { duration: 0.3 });
  },
  onCelebrate() {
    unlock("gems");
    Sfx.birthday();
    const win = $("#gameWin");
    win.hidden = false;
    animate(win, { opacity: [0, 1], scale: [0.6, 1] }, { type: "spring", stiffness: 220, damping: 14 });
    animate("#gameWin .win__title span", { y: [-60, 0], opacity: [0, 1] }, { delay: stagger(0.05), type: "spring", stiffness: 380, damping: 12 });
  },
  onBoom() { Sfx.boom(); },
  onCoin() { Sfx.coin(); coins3d++; $("#coin3d").textContent = coins3d; animate(".gstat--coin", { scale: [1, 1.3, 1] }, { duration: 0.25 }); },
  onBark() { Sfx.bark(); if (++barks >= 3) unlock("pixel"); },
  onEleven() { Sfx.level(); },
  onExitRequest() { exitPlay(); },
};

/* ---------- play mode ---------- */
function enterPlay() {
  if (!world) return;
  Sfx.ensure(); Sfx.level();
  unlock("start");
  document.body.classList.add("playing");
  $("#top").scrollIntoView({ behavior: "auto" });
  world.enterPlay();
  const ui = $("#gameUI");
  ui.hidden = false;
  animate("#heroUI", { opacity: 0 }, { duration: 0.3 }).then(() => ($("#heroUI").hidden = true));
  animate(ui, { opacity: [0, 1] }, { duration: 0.4 });
  const h = $("#gameHint");
  h.hidden = false;
  animate(h, { opacity: [0, 1], y: [20, 0] }, { duration: 0.4 });
  clearTimeout(h._t);
  h._t = setTimeout(() => animate(h, { opacity: 0 }, { duration: 0.5 }).then(() => (h.hidden = true)), 6500);
}
function exitPlay() {
  if (!world) return;
  world.exitPlay();
  document.body.classList.remove("playing");
  $("#gameUI").hidden = true;
  $("#gameWin").hidden = true;
  const hero = $("#heroUI");
  hero.hidden = false;
  animate(hero, { opacity: [0, 1] }, { duration: 0.4 });
}
$("#playBtn").addEventListener("click", enterPlay);
$("#exitBtn").addEventListener("click", exitPlay);
$("#jumpBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); world && world.jump(); });
$("#winContinue").addEventListener("click", () => { $("#gameWin").hidden = true; });
$("#winScroll").addEventListener("click", () => { exitPlay(); $("#player").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); });
$("#scrollBtn").addEventListener("click", () => { Sfx.ensure(); unlock("start"); FX.confetti(120); $("#player").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); });

/* ---------- cake hooks ---------- */
const cakeHooks = {
  onBlow(n, total) { Sfx.ensure(); Sfx.blow(); $("#candleCount").textContent = `${total - n} candles left`; },
  onAllOut() { celebrateCake(); },
  onBoom() { Sfx.boom(); },
};
$("#blowBtn").addEventListener("click", () => {
  Sfx.ensure();
  if (!cake) return;
  if (cake.out === 11) { cake.relight(); $("#candleCount").textContent = "11 candles left"; $("#blowBtn").textContent = "Blow all candles"; $("#hbBig").innerHTML = ""; return; }
  cake.blowAll();
});
function celebrateCake() {
  unlock("cake");
  Sfx.birthday();
  $("#blowBtn").textContent = "Light the candles again";
  $("#candleCount").textContent = "Wish saved!";
  const hb = $("#hbBig");
  hb.innerHTML = "";
  "HAPPY BIRTHDAY AYOUB!".split(" ").forEach((w, wi, arr) => {
    const word = document.createElement("span");
    [...w].forEach((ch) => { const s = document.createElement("span"); s.textContent = ch; word.appendChild(s); });
    hb.appendChild(word);
    if (wi < arr.length - 1) hb.append(" ");
  });
  animate("#hbBig span span", { y: [-80, 0], opacity: [0, 1], scale: [2, 1], rotateX: [90, 0] }, { delay: stagger(0.06), type: "spring", stiffness: 380, damping: 12 });
  FX.confetti(100);
}

/* ---------- day / night ---------- */
$("#nightBtn").addEventListener("click", (e) => {
  const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
  e.currentTarget.setAttribute("aria-pressed", String(on));
  e.currentTarget.setAttribute("aria-label", on ? "Switch to day" : "Switch to night");
  document.body.classList.toggle("night", on);
  Sfx.ensure(); Sfx.night();
  world && world.setNight(on);
  if (on) { unlock("night"); if ($("#top").getBoundingClientRect().bottom < 80) $("#top").scrollIntoView({ behavior: RM ? "auto" : "smooth" }); }
});

/* ---------- mute ---------- */
$("#muteBtn").addEventListener("click", (e) => {
  const m = Sfx.toggle();
  e.currentTarget.setAttribute("aria-pressed", String(m));
  e.currentTarget.setAttribute("aria-label", m ? "Unmute sound" : "Mute sound");
});

onAllAchievements(() => { FX.confetti(220); world && world.celebrate(); });

boot();
