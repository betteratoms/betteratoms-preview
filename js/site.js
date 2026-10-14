/* Better Atoms preview — site script (no tracking, no cookies, no storage) */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* Announcement bar */
  var annClose = doc.querySelector('.announce-close');
  if (annClose) annClose.addEventListener('click', function () {
    var bar = doc.querySelector('.announce'); if (bar) bar.remove(); window.dispatchEvent(new Event('scroll'));
    var h = doc.querySelector('.logo'); if (h) h.focus();
  });

  /* Tab visibility */
  doc.addEventListener('visibilitychange', function () { root.classList.toggle('page-hidden', doc.hidden); });

  /* Header: transparent over the hero, solid after it */
  var header = doc.querySelector('.site-header');
  var heroEl = doc.querySelector('[data-hero]');
  function updateHeader() {
    if (!header) return;
    var limit = heroEl ? heroEl.getBoundingClientRect().bottom - header.offsetHeight : -1;
    header.classList.toggle('is-solid', !heroEl || limit <= 0);
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();

  /* Phone menu with focus trap */
  var menuBtn = doc.querySelector('.menu-btn'), menu = doc.getElementById('menu');
  if (menuBtn && menu) {
    var closeBtn = menu.querySelector('.menu-close');
    var focusables = function () { return Array.prototype.slice.call(menu.querySelectorAll('a[href],button')); };
    var openMenu = function () {
      menu.hidden = false; root.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    };
    var closeMenu = function () {
      menu.hidden = true; root.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.focus();
    };
    menuBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) { menu.hidden = true; root.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); } });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* Tilt frames */
  if (!reduced && finePointer) {
    doc.querySelectorAll('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* Pause ambient guides off-screen */
  if ('IntersectionObserver' in window) {
    var gio = new IntersectionObserver(function (es) { es.forEach(function (en) { en.target.classList.toggle('is-offscreen', !en.isIntersecting); }); });
    doc.querySelectorAll('.guide,.guide-drift').forEach(function (g) { gio.observe(g); });
  }

  /* Chapter lightbox */
  var lb = doc.getElementById('lightbox');
  if (lb && typeof lb.showModal === 'function') {
    var items = Array.prototype.slice.call(doc.querySelectorAll('.chapter button'));
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption'), idx = 0, opener = null;
    var show = function (i) {
      idx = (i + items.length) % items.length;
      var src = items[idx].querySelector('img');
      lbImg.src = src.getAttribute('src'); lbImg.alt = src.alt;
      lbCap.innerHTML = items[idx].parentNode.querySelector('.cap').innerHTML;
    };
    items.forEach(function (b, i) { b.addEventListener('click', function () { opener = b; show(i); lb.showModal(); }); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.querySelector('.lb-close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ---------- Home hero ---------- */
  var hero = doc.querySelector('.hero');
  if (!hero) return;
  var media = hero.querySelector('.hero-media'), video = hero.querySelector('.hero-video'),
      canvas = hero.querySelector('.hero-sparkles'), copy = hero.querySelector('.hero-copy'),
      pauseBtn = hero.querySelector('.hero-pause'), hint = hero.querySelector('.scroll-hint');
  var portraitMQ = window.matchMedia('(max-aspect-ratio: 4/5)');
  var portrait = portraitMQ.matches;

  function holeOnScreen(box, portrait) {
    var vw = portrait ? 720 : 1920, vh = portrait ? 1280 : 1080;
    var fx = portrait ? 0.50 : 0.635, fy = portrait ? 0.33 : 0.47;
    var px = portrait ? 0.50 : 0.70, py = portrait ? 0.35 : 0.50;
    var s = Math.max(box.width / vw, box.height / vh);
    var dw = vw * s, dh = vh * s;
    var left = (box.width - dw) * px, top = (box.height - dh) * py;
    return { x: left + fx * dw, y: top + fy * dh, shadow: (portrait ? 107 : 158) * s };
  }

  if (reduced) return; // poster only: no video, canvas, dive, parallax

  /* Video */
  function loadVideo() {
    var base = 'assets/home/blackhole-loop-' + (portrait ? 'mobile' : 'desktop');
    video.poster = 'assets/home/blackhole-poster-' + (portrait ? 'mobile' : 'desktop') + '.webp';
    video.innerHTML = '';
    [['.webm', 'video/webm'], ['.mp4', 'video/mp4']].forEach(function (s) {
      var el = doc.createElement('source'); el.src = base + s[0]; el.type = s[1]; video.appendChild(el);
    });
    video.muted = true; video.load();
    var p = video.play(); if (p && p.catch) p.catch(function () {});
  }
  video.addEventListener('playing', function () { video.classList.add('is-on'); });
  loadVideo();

  /* Geometry */
  var ctx = canvas.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, hole = { x: 0, y: 0, shadow: 1 }, sparks = [], stars = [];
  var COLORS = ['#FFD27A', '#4FE3FF', '#C8F07A', '#FFFFFF'];
  // pre-rendered glowing dots (cheaper than shadowBlur on every frame)
  var SPRITES = {};
  COLORS.forEach(function (c) {
    var cv = doc.createElement('canvas'); cv.width = cv.height = 32;
    var g = cv.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(0.18, c); grd.addColorStop(0.4, c + '55'); grd.addColorStop(1, c + '00');
    g.fillStyle = grd; g.fillRect(0, 0, 32, 32); SPRITES[c] = cv;
  });
  function rand(a, b) { return a + Math.random() * (b - a); }
  function spawn(p, initial) {
    p.r = hole.shadow * (initial ? rand(1.3, 6) : rand(2.5, 6));
    p.a = rand(0, Math.PI * 2); p.size = rand(1, 2.5);
    p.c = COLORS[(Math.random() * COLORS.length) | 0]; p.k = rand(0.8, 1.2);
    return p;
  }
  function copyBox() {
    var b = copy.getBoundingClientRect(), m = media.getBoundingClientRect();
    return { l: b.left - m.left - 20, t: b.top - m.top - 20, r: b.right - m.left + 20, b: b.bottom - m.top + 20 };
  }
  function makeStars() {
    stars = []; var cb = copyBox(), tries = 0;
    while (stars.length < 60 && tries++ < 2000) {
      var x = Math.random() * W, y = Math.random() * H;
      if (x > cb.l && x < cb.r && y > cb.t && y < cb.b) continue;
      stars.push({ x: x, y: y, ph: Math.random() * Math.PI * 2, per: rand(2, 5), s: rand(0.6, 1.4) });
    }
  }
  function layout() {
    portrait = portraitMQ.matches;
    var box = media.getBoundingClientRect();
    // the box is scaled by the dive; measure unscaled size from the stage
    var stage = hero.querySelector('.hero-stage').getBoundingClientRect();
    W = stage.width; H = stage.height;
    hole = holeOnScreen({ width: W, height: H }, portrait);
    media.style.setProperty('--hole-x', hole.x.toFixed(1) + 'px');
    media.style.setProperty('--hole-y', hole.y.toFixed(1) + 'px');
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var n = portrait ? 70 : 140;
    sparks = []; for (var i = 0; i < n; i++) sparks.push(spawn({}, true));
    makeStars();
  }
  var lastPortrait = portrait;
  window.addEventListener('resize', function () {
    layout();
    if (portrait !== lastPortrait) { lastPortrait = portrait; loadVideo(); }
  });

  /* Parallax */
  var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  if (finePointer) hero.addEventListener('pointermove', function (e) {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* Dive */
  var dive = 0, scrollQueued = false;
  function readDive() {
    scrollQueued = false;
    var dist = 0.9 * (hero.offsetHeight - window.innerHeight);
    var top = hero.getBoundingClientRect().top + window.scrollY;
    dive = Math.min(1, Math.max(0, (window.scrollY - top) / dist));
    hero.style.setProperty('--dive', dive.toFixed(4));
    hint.classList.toggle('is-hidden', dive > 0.05);
    var ann = doc.querySelector('.announce');
    hero.style.setProperty('--ann', (ann ? Math.max(0, ann.getBoundingClientRect().bottom) : 0) + 'px');
    updateHeader();
  }
  window.addEventListener('scroll', function () { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(readDive); } }, { passive: true });

  /* Loop control */
  var userPaused = false, onScreen = true, running = false, last = 0, t = 0;
  function shouldRun() { return !userPaused && onScreen && !doc.hidden && dive < 1; }
  function draw(now) {
    if (!shouldRun()) { running = false; return; }
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; t += dt;
    // parallax easing
    cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08;
    if (finePointer) {
      copy.style.setProperty('--px', (-cur.x * 10).toFixed(2) + 'px');
      copy.style.setProperty('--py', (-cur.y * 10).toFixed(2) + 'px');
      canvas.style.transform = 'translate(' + (cur.x * 6).toFixed(2) + 'px,' + (cur.y * 6).toFixed(2) + 'px)';
      video.style.transform = 'translate(' + (cur.x * 8).toFixed(2) + 'px,' + (cur.y * 8).toFixed(2) + 'px) scale(1.03)';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    // twinkling stars
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i], o = 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(st.ph + t * Math.PI * 2 / st.per));
      ctx.globalAlpha = o; ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    // spiralling sparkles (anticlockwise on screen: near side moves left to right)
    var S = hole.shadow;
    for (var j = 0; j < sparks.length; j++) {
      var p = sparks[j], rn = p.r / S;
      var w = 0.9 * p.k * Math.pow(rn, -1.5);       // angular speed ∝ r^-1.5
      p.a -= w * dt;
      p.r -= p.r * 0.06 * p.k * dt * (1 + 1.5 / rn); // radius shrinks a little each frame
      if (p.r <= 1.1 * S) { spawn(p, false); continue; }
      var x = hole.x + Math.cos(p.a) * p.r, y = hole.y + Math.sin(p.a) * p.r * 0.42;
      var fadeIn = Math.min(1, (6 - rn) / 0.8), fadeOut = Math.min(1, (rn - 1.1) / 0.9);
      ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut)) * 0.95;
      var spr = SPRITES[p.c], d = p.size * 6;
      ctx.drawImage(spr, x - d / 2, y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  function kick() {
    if (shouldRun() && !running) { running = true; last = 0; requestAnimationFrame(draw); }
    if (userPaused || !onScreen || doc.hidden || dive >= 1) { if (!video.paused) video.pause(); }
    else if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  }
  pauseBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.textContent = userPaused ? 'Play animation' : 'Pause animation';
    kick();
  });
  doc.addEventListener('visibilitychange', kick);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; kick(); }).observe(hero.querySelector('.hero-stage'));
  }
  window.addEventListener('scroll', function () { requestAnimationFrame(kick); }, { passive: true });

  layout(); readDive(); kick();
})();
