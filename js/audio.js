// Tiny WebAudio chiptune engine — no audio files needed.
export const Sfx = (() => {
  let ctx = null, master = null, muted = false;
  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  const tone = (freq, dur = 0.15, type = "square", vol = 0.5, when = 0) => {
    if (muted || !ensure()) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  const noise = (dur = 0.12, vol = 0.5, freq = 900, when = 0) => {
    if (muted || !ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(ctx.currentTime + when);
  };
  const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G6: 1568 };
  let songUntil = 0;
  const birthday = () => {
    const seq = [
      ["G4", .3], ["G4", .15], ["A4", .45], ["G4", .45], ["C5", .45], ["B4", .9],
      ["G4", .3], ["G4", .15], ["A4", .45], ["G4", .45], ["D5", .45], ["C5", .9],
      ["G4", .3], ["G4", .15], ["G5", .45], ["E5", .45], ["C5", .45], ["B4", .45], ["A4", .9],
      ["F5", .3], ["F5", .15], ["E5", .45], ["C5", .45], ["D5", .45], ["C5", 1.1],
    ];
    const total = seq.reduce((a, [, d]) => a + d, 0);
    if (!ensure() || ctx.currentTime < songUntil) return total; // don't overlap the song
    let t = 0;
    seq.forEach(([n, d]) => { tone(N[n], d * 0.95, "square", 0.3, t); tone(N[n] / 2, d * 0.9, "triangle", 0.3, t); t += d; });
    songUntil = ctx.currentTime + total;
    return total;
  };
  return {
    ensure,
    get muted() { return muted; },
    toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.22; return muted; },
    pop: () => tone(660 + Math.random() * 300, 0.08, "square", 0.3),
    hit: () => noise(0.07, 0.6, 1200),
    brk: () => { noise(0.22, 0.8, 700); tone(140, 0.12, "square", 0.25); },
    pickup: () => { tone(N.E5, 0.08, "square", 0.3); tone(N.A5, 0.12, "square", 0.3, 0.07); },
    gem: () => [N.C6, N.E6, N.G6].forEach((f, i) => tone(f, 0.12, "square", 0.22, i * 0.06)),
    coin: () => { tone(N.B5, 0.08, "square", 0.32); tone(N.E6, 0.35, "square", 0.32, 0.08); },
    bump: () => tone(180, 0.08, "square", 0.35),
    jump: () => { if (muted || !ensure()) return; const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.15); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2); },
    oneup: () => [N.E5, N.G5, N.E6, N.C6, N.D6, N.G6].forEach((f, i) => tone(f, 0.12, "square", 0.28, i * 0.11)),
    level: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.18, "square", 0.28, i * 0.1)),
    ach: () => [N.G5, N.C6, N.E6].forEach((f, i) => tone(f, 0.15, "triangle", 0.4, i * 0.09)),
    bark: () => { if (muted || !ensure()) return; [0, 0.16].forEach((w) => { const t = ctx.currentTime + w; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "square"; o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.1); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.13); }); noise(0.08, 0.25, 1500); noise(0.08, 0.25, 1500, 0.16); },
    night: () => [N.C5, N.G4, N.E5, N.C6].forEach((f, i) => tone(f, 0.3, "triangle", 0.25, i * 0.14)),
    talk: () => [0, 1, 2].forEach((i) => tone(300 + Math.random() * 200, 0.05, "square", 0.15, i * 0.06)),
    blow: () => noise(0.35, 0.35, 2500),
    boom: () => noise(0.45, 0.7, 380),
    chest: () => { tone(220, 0.15, "sawtooth", 0.2); tone(330, 0.2, "square", 0.2, 0.12); tone(N.C6, 0.4, "triangle", 0.35, 0.3); },
    birthday,
  };
})();
