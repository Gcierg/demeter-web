// Ambient soundtrack for "the journey of a spore": relaxed, futuristic beats made live with the Web Audio API.
// No audio file. Off by default (browsers only allow sound after a click); the button in the journey turns it on and off.
// It fades out when the journey leaves the screen or a video plays, and sounds "underwater" in the water stages.
(() => {
  const btn = document.getElementById('sndBtn'), sec = document.getElementById('journey');
  if (!btn || !sec || !(window.AudioContext || window.webkitAudioContext)) { if (btn) btn.hidden = true; return; }
  let ctx = null, master, tone, delay, an, on = false, timer = null, step = 0, nextT = 0, wanted = 0;
  const BPM = 78, S16 = 60 / BPM / 4;                                 // one sixteenth note
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  // Am9 → Fmaj9 → Cmaj9 → G6: open and calm; one chord per bar
  const CH = [[45, 52, 59, 60, 64], [41, 48, 55, 57, 60], [48, 55, 59, 62, 64], [43, 50, 55, 59, 62]];
  const SCALE = [69, 72, 74, 76, 79, 81, 84, 86];                     // A minor pentatonic for the "bits"
  const rnd = n => { const x = Math.sin(n * 91.7 + 13.3) * 43758.5453; return x - Math.floor(x); };

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 7000; tone.Q.value = .4;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    an = ctx.createAnalyser(); an.fftSize = 512;
    delay = ctx.createDelay(1.5); delay.delayTime.value = S16 * 3;       // dotted-eighth echo
    const fb = ctx.createGain(); fb.gain.value = .42; const wet = ctx.createGain(); wet.gain.value = .35;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2600;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(wet); wet.connect(tone);
    tone.connect(comp); comp.connect(master); master.connect(an); an.connect(ctx.destination);
  }
  function env(g, t, a, d, peak) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
  function pad(notes, t, len) {                                       // a soft, slowly opening chord
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(1500, t + len * .6); f.frequency.linearRampToValueAtTime(500, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + len * .35); g.gain.linearRampToValueAtTime(0, t + len + .6);
    f.connect(g); g.connect(tone);
    for (const m of notes) for (const d of [-7, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + len + .7); }
  }
  function bit(m, t, vol) {                                           // a glassy pluck with echo
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = hz(m); o2.frequency.value = hz(m + 12);
    env(g, t, .004, .32, vol); o.connect(g); o2.connect(g); g.connect(tone); g.connect(delay); o.start(t); o2.start(t); o.stop(t + .5); o2.stop(t + .5);
  }
  function sub(m, t, len) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = hz(m); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + len); o.connect(g); g.connect(tone); o.start(t); o.stop(t + len + .05); }
  function kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + .12); env(g, t, .002, .28, .32); o.connect(g); g.connect(tone); o.start(t); o.stop(t + .4); }
  let noiseBuf = null;
  function hat(t, vol) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * .2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000; env(g, t, .001, .05, vol); s.connect(f); f.connect(g); g.connect(tone); s.start(t); s.stop(t + .1);
  }
  function schedule() {
    while (nextT < ctx.currentTime + .25) {
      const bar = Math.floor(step / 16), s = step % 16, c = CH[bar % 4], t = nextT;
      if (s === 0) { pad(c.slice(1), t, S16 * 16); sub(c[0] - 12, t, S16 * 7); }
      if (s === 10) sub(c[0] - 12, t, S16 * 4);
      if (s === 0 || s === 8) kick(t);
      if (s % 4 === 2) hat(t, .05); if (s === 15 && bar % 2) hat(t, .03);
      // the "bits": a sparse pattern that changes every bar but repeats every eight
      if (rnd((bar % 8) * 16 + s) < (s % 2 ? .28 : .5)) bit(SCALE[Math.floor(rnd((bar % 8) * 31 + s * 7) * SCALE.length)] + (c[0] === 41 ? -4 + 4 : 0), t, .07 + rnd(step) * .05);
      step++; nextT += S16;
    }
  }
  function setOn(v) {
    on = v; btn.setAttribute('aria-pressed', String(v)); btn.classList.toggle('on', v);
    if (v) { if (!ctx) build(); ctx.resume(); if (!timer) { nextT = ctx.currentTime + .08; timer = setInterval(schedule, 60); } update(); }
    else if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, .15); wanted = 0; setTimeout(() => { if (!on && timer) { clearInterval(timer); timer = null; ctx.suspend(); } }, 900); }
    try { localStorage.setItem('demeter-sound', v ? '1' : '0'); } catch (e) {}
  }
  // follow the scroll: full volume inside the journey, silence outside; muffled in the water and tank stages
  function update() {
    if (!on || !ctx) return;
    const r = sec.getBoundingClientRect(), inside = r.top < innerHeight * .6 && r.bottom > innerHeight * .4;
    const p = Math.min(.99999, Math.max(0, -r.top / (r.height - innerHeight))), n = Math.floor(p * 9);
    const videoPlaying = [...document.querySelectorAll('video')].some(v => !v.paused);
    const vol = inside && !videoPlaying && !document.hidden ? .8 : 0;
    if (vol !== wanted) { wanted = vol; master.gain.setTargetAtTime(vol, ctx.currentTime, vol ? .5 : .25); }
    tone.frequency.setTargetAtTime(n === 2 || n === 4 ? 650 : n === 3 ? 2400 : 7000, ctx.currentTime, .4);
  }
  btn.addEventListener('click', () => setOn(!on));
  addEventListener('scroll', update, { passive: true }); document.addEventListener('visibilitychange', update);
  document.addEventListener('play', update, true); document.addEventListener('pause', update, true);
  // for checks: the current output level (0..1) and state
  window.__snd = { level: () => { if (!an) return 0; const d = new Uint8Array(an.fftSize); an.getByteTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v - 128)); return m / 128; }, state: () => ctx ? ctx.state : 'none', on: () => on };
})();
