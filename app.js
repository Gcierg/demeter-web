// Demeter site: language switch, scroll-driven sequence, video grid.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ---------------------------------------------------------------- language
  const LANGS = ['es', 'en', 'pt'];
  let lang = 'es';
  try { const q = new URLSearchParams(location.search).get('lang'), s = localStorage.getItem('demeter-lang'), n = (navigator.language || 'es').slice(0, 2); lang = [q, s, n].find(x => LANGS.includes(x)) || 'es'; } catch (e) {}
  function setLang(l) {
    lang = l; const D = window.I18N[l];
    document.documentElement.lang = l; document.title = D.title;
    $$('[data-i18n]').forEach(el => { const v = D[el.dataset.i18n]; if (v != null) el.textContent = v; });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    $$('.vcard').forEach(c => { c.querySelector('h3').textContent = D[c.dataset.title]; syncTracks(c.querySelector('video')); });
    try { localStorage.setItem('demeter-lang', l); } catch (e) {}
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

  // ---------------------------------------------------------------- videos (Spanish audio; EN / PT subtitles follow the page language)
  const VIDEOS = [['corporativo', 'v.corporativo', 'cover_corporativo'], ['aliados', 'v.aliados', 'cover_aliados'], ['del_suelo_a_tu_mesa', 'v.voxel', 'cover_voxel'],
    ['nanomix', 'v.nanomix', 'cover_nanomix'], ['nanoxtinger', 'v.nanoxtinger', 'cover_nanoxtinger'], ['nanosteel', 'v.nanosteel', 'cover_nanosteel']];
  const grid = $('#vgrid');
  VIDEOS.forEach(([file, key, cover]) => {
    const c = document.createElement('div'); c.className = 'vcard'; c.dataset.title = key;
    c.innerHTML = `<video controls playsinline preload="none" poster="assets/img/${cover}.jpg">
      <source src="assets/video/${file}.mp4" type="video/mp4">
      <track kind="subtitles" srclang="en" label="English" src="assets/subs/${file}.en.vtt">
      <track kind="subtitles" srclang="pt" label="Português" src="assets/subs/${file}.pt.vtt">
      <track kind="subtitles" srclang="es" label="Español" src="assets/subs/${file}.es.vtt">
    </video><h3></h3>`;
    const v = c.querySelector('video');
    v.addEventListener('play', () => { c.classList.add('playing'); $$('.vcard video').forEach(o => { if (o !== v) o.pause(); }); syncTracks(v); });
    v.addEventListener('pause', () => c.classList.remove('playing'));
    grid.appendChild(c);
  });
  // The films already carry Spanish text on screen, so Spanish shows no extra subtitles.
  function syncTracks(v) { for (const t of v.textTracks) t.mode = (lang !== 'es' && t.language === lang) ? 'showing' : 'disabled'; }

  // ---------------------------------------------------------------- nav and reveals
  const nav = $('#nav');
  const onNav = () => nav.classList.toggle('solid', scrollY > 40);
  $$('.wrap > h2, .wrap > .lead, .trio article, .benefits > div, .fgrid article, .pgrid article, .programs, .vcard, .cgrid article, .dgrid article').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // ---------------------------------------------------------------- hero: drifting spores
  const hc = $('#heroField'), hx = hc.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sizeCanvas(c) { const d = Math.min(2, devicePixelRatio || 1), r = c.getBoundingClientRect(); const w = Math.round(r.width * d), h = Math.round(r.height * d); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return [w, h, d]; }
  function drawHero(t) {
    const [w, h, d] = sizeCanvas(hc); hx.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const z = .3 + hash(i) * .7, x = (hash(i + 9) * w * 1.2 + t * 8 * z * d) % (w * 1.2) - w * .1, y = h * hash(i + 3) + Math.sin(t * .4 + i) * 14 * d, r = (3 + hash(i + 5) * 12) * z * d;
      const g = hx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
      const c = i % 5 === 0 ? '183,155,230' : '168,200,106';
      g.addColorStop(0, `rgba(${c},${.5 * z})`); g.addColorStop(1, `rgba(${c},0)`);
      hx.fillStyle = g; hx.beginPath(); hx.arc(x, y, r, 0, 6.283); hx.fill();
      hx.strokeStyle = `rgba(238,232,222,${.12 * z})`; hx.lineWidth = d; hx.beginPath(); hx.arc(x, y, r * 1.5, 0, 6.283); hx.stroke();
    }
  }

  // ---------------------------------------------------------------- journey: frames driven by scroll
  // If assets/seq/manifest.json exists ({"count": N, "ext": "jpg"}), the canvas plays those frames (f_0001.jpg ...).
  // Otherwise it draws a coded preview of the same seven stages.
  const sec = $('#journey'), cv = $('#seq'), cx = cv.getContext('2d'), bar = $('#jbar'), stages = $$('#stages li'), note = $('#seqnote');
  let frames = null, ready = 0, cuts = null, j3d = null;
  const cv3 = $('#seq3d'), flash = $('#flash');
  fetch('assets/seq/manifest.json').then(r => r.ok ? r.json() : null).then(m => {
    if (!m || !m.count) { start3D(); return; }
    frames = new Array(m.count); cuts = m.stages || null;
    const load = i => new Promise(res => { const im = new Image(); im.onload = () => { frames[i] = im; ready++; res(); draw(); }; im.onerror = res; im.src = `assets/seq/f_${String(i + 1).padStart(4, '0')}.${m.ext || 'jpg'}`; });
    (async () => { for (let i = 0; i < m.count; i += 6) await Promise.all([0, 1, 2, 3, 4, 5].map(k => i + k < m.count ? load(i + k) : 0)); })();
  }).catch(start3D);
  // the voxel 3D sequence; if WebGL is missing, the 2D preview stays
  function start3D() {
    import('./journey3d.js').then(m => { cv3.hidden = false; j3d = m.createJourney(cv3); cv.style.display = 'none'; draw(); }).catch(e => { console.warn('3D unavailable', e); cv3.hidden = true; j3d = null; });
  }

  const progress = () => { const r = sec.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); };
  function stageOf(p) { if (cuts) { let i = 0; while (i < cuts.length - 1 && p >= cuts[i + 1]) i++; return i; } return Math.min(6, Math.floor(p * 7)); }

  function cover(im, w, h) { const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s; cx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh); }
  function spore(x, y, r, rot, col = [168, 200, 106]) {
    const g = cx.createRadialGradient(x - r * .35, y - r * .35, r * .08, x, y, r);
    g.addColorStop(0, `rgb(${col.map(v => Math.min(255, v + 60)).join(',')})`); g.addColorStop(.6, `rgb(${col.join(',')})`); g.addColorStop(1, `rgb(${col.map(v => Math.round(v * .45)).join(',')})`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
    if (r > 14) for (let k = 0; k < 14; k++) { const a = rot + k * .449, rr = r * (.25 + hash(k) * .6); const px = x + Math.cos(a) * rr, py = y + Math.sin(a * 1.3) * rr * .8; cx.fillStyle = 'rgba(20,45,30,.28)'; cx.beginPath(); cx.arc(px, py, r * .07, 0, 6.283); cx.fill(); }
  }
  function gelBubble(x, y, r, a = 1) { cx.strokeStyle = `rgba(210,240,255,${.55 * a})`; cx.lineWidth = Math.max(1, r * .08); cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.stroke(); cx.fillStyle = `rgba(190,230,255,${.1 * a})`; cx.fill(); cx.fillStyle = `rgba(255,255,255,${.6 * a})`; cx.beginPath(); cx.arc(x - r * .35, y - r * .35, r * .16, 0, 6.283); cx.fill(); }
  function preview(p, w, h) {
    const s = p * 7, i = Math.min(6, Math.floor(s)), u = s - i, m = Math.min(w, h), X = w / 2, Y = h * .44;
    const bg = cx.createRadialGradient(X, Y, m * .05, X, Y, Math.max(w, h) * .8);
    const water = i >= 2 && i !== 3 && i < 5, sky = i === 3 || i >= 5;
    bg.addColorStop(0, sky ? '#8FB7A0' : water ? '#2E7B8C' : '#2F6B55'); bg.addColorStop(1, sky ? '#1E4136' : water ? '#0E2B36' : '#0D1F19');
    cx.fillStyle = bg; cx.fillRect(0, 0, w, h);
    if (i === 0) {                                    // one spore turning, wrapped in gel molecules
      const r = m * lerp(.2, .13, ease(u)); spore(X, Y, r, p * 40);
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283 + p * 18, d = r * (1.25 + .12 * Math.sin(k * 3 + p * 30)); gelBubble(X + Math.cos(a) * d, Y + Math.sin(a) * d * .9, r * .2, ease(clamp(u * 3 - k / 16, 0, 1))); }
    } else if (i === 1) {                             // the screen fills with stable gel: green and purple molecules, evenly spread
      for (let k = 0; k < 90; k++) { const gx = (k % 10 + .5 + (hash(k) - .5) * .5) / 10 * w, gy = (Math.floor(k / 10) + .5 + (hash(k + 7) - .5) * .5) / 9 * h, a = ease(clamp(u * 2.4 - hash(k + 2), 0, 1)), r = m * .022 * (.7 + hash(k + 4));
        if (a <= 0) continue; cx.globalAlpha = a; spore(gx + Math.sin(p * 30 + k) * 3, gy + Math.cos(p * 26 + k) * 3, r, p * 20 + k, k % 3 ? [168, 200, 106] : [183, 155, 230]); gelBubble(gx, gy, r * 1.7, a); cx.globalAlpha = 1; }
    } else if (i === 2) {                             // water rushes in
      for (let k = 0; k < 90; k++) { const gx = (k % 10 + .5) / 10 * w, gy = (Math.floor(k / 10) + .5) / 9 * h, r = m * .022 * (.7 + hash(k + 4)), push = ease(u) * w * .5 * (.4 + hash(k));
        spore(gx + push, gy + Math.sin(u * 9 + k) * 20 * u, r, p * 30 + k, k % 3 ? [168, 200, 106] : [183, 155, 230]); gelBubble(gx + push, gy, r * 1.7 * (1 + u), 1 - u); }
      for (let k = 0; k < 40; k++) { const y = hash(k) * h, x = (u * 1.6 - hash(k + 5)) * w * 1.3; cx.strokeStyle = 'rgba(220,245,255,.5)'; cx.lineWidth = 2 + hash(k + 1) * 5; cx.beginPath(); cx.moveTo(x - w * .25, y); cx.lineTo(x, y + 10); cx.stroke(); }
    } else if (i === 3) {                             // aerial view: the farmer stirs the tank
      const R = m * lerp(.5, .2, ease(clamp(u * 1.5, 0, 1)));
      cx.fillStyle = '#5B7F45'; cx.fillRect(0, 0, w, h); for (let k = 0; k < 24; k++) { cx.fillStyle = k % 2 ? '#6C9550' : '#55793F'; cx.fillRect(0, k * h / 24, w, h / 24 * .5); }
      cx.fillStyle = '#23323A'; cx.beginPath(); cx.arc(X, Y, R * 1.08, 0, 6.283); cx.fill();
      cx.fillStyle = '#2E7B8C'; cx.beginPath(); cx.arc(X, Y, R, 0, 6.283); cx.fill();
      for (let k = 0; k < 60; k++) { const a = k * .7 + p * 60, d = R * (.15 + (k / 60) * .8); cx.fillStyle = k % 3 ? 'rgba(168,200,106,.9)' : 'rgba(183,155,230,.9)'; cx.beginPath(); cx.arc(X + Math.cos(a) * d, Y + Math.sin(a) * d, R * .025, 0, 6.283); cx.fill(); }
      const fa = p * 60; cx.strokeStyle = '#C9B48A'; cx.lineWidth = R * .05; cx.beginPath(); cx.moveTo(X + R * 1.25, Y + R * .35); cx.lineTo(X + Math.cos(fa) * R * .45, Y + Math.sin(fa) * R * .45); cx.stroke();
      cx.fillStyle = '#EEE8DE'; cx.beginPath(); cx.arc(X + R * 1.3, Y + R * .38, R * .16, 0, 6.283); cx.fill(); cx.fillStyle = '#B5482F'; cx.beginPath(); cx.arc(X + R * 1.3, Y + R * .38, R * .1, 0, 6.283); cx.fill();
    } else if (i === 4) {                             // back inside: spores swirl through the water
      for (let k = 0; k < 220; k++) { if (hash(k + 9) > .35 + u * .65) continue; const a = hash(k) * 6.283 + p * 40 * (.5 + hash(k + 2)), d = m * (.05 + hash(k + 3) * .62); spore(X + Math.cos(a) * d * 1.3, Y + Math.sin(a) * d, m * .012 * (.6 + hash(k + 4)), a, k % 3 ? [168, 200, 106] : [183, 155, 230]); }
    } else if (i === 5) {                             // out of the nozzle, towards the rice field
      for (let k = 0; k < 16; k++) { cx.fillStyle = k % 2 ? '#7CA240' : '#6B9038'; cx.fillRect(0, h * .55 + k * h * .03, w, h * .03); }
      cx.fillStyle = '#23323A'; cx.fillRect(X - m * .03, 0, m * .06, h * .16);
      for (let k = 0; k < 260; k++) { const ph = (u * 2 + hash(k)) % 1, sp = (hash(k + 1) - .5) * 2; cx.fillStyle = k % 4 ? 'rgba(220,245,255,.75)' : (k % 8 ? 'rgba(168,200,106,.95)' : 'rgba(183,155,230,.95)'); cx.beginPath(); cx.arc(X + sp * ph * w * .5, h * .16 + ph * h * .62, 1.5 + ph * 4, 0, 6.283); cx.fill(); }
    } else {                                          // in the field, they multiply
      for (let k = 0; k < 18; k++) { cx.fillStyle = k % 2 ? '#7CA240' : '#6B9038'; cx.fillRect(0, h * .2 + k * h * .045, w, h * .045); }
      const n = Math.round(lerp(12, 420, ease(u)));
      for (let k = 0; k < n; k++) { const x = hash(k) * w, y = h * .2 + hash(k + 3) * h * .8; spore(x, y, m * .008 * (.7 + hash(k + 5)), k, k % 3 ? [200, 230, 140] : [205, 180, 245]); }
    }
  }
  function draw() {
    const [w, h] = sizeCanvas(cv), p = progress();
    if (frames && ready) { let f = Math.round(p * (frames.length - 1)), im = frames[f]; for (let k = 1; !im && k < frames.length; k++) im = frames[f - k] || frames[f + k]; if (im) cover(im, w, h); }
    else if (j3d) { flash.style.opacity = j3d.render(p, performance.now() / 1000).toFixed(3); }
    else preview(p, w, h);
    bar.style.width = (p * 100).toFixed(1) + '%';
    const si = stageOf(p); stages.forEach((li, k) => li.classList.toggle('on', k === si));
  }

  let ticking = false;
  const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; onNav(); draw(); }); };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll);
  let t0 = performance.now();
  (function loop(now) {
    if (!reduce && hc.getBoundingClientRect().bottom > 0) drawHero((now - t0) / 1000);
    if (j3d && !reduce) { const r = sec.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) draw(); }   // idle motion while the journey is on screen
    requestAnimationFrame(loop);
  })(t0);
  if (reduce) drawHero(3);

  setLang(lang); onNav(); draw();
})();
