/* ==========================================================================
   Sign-up flow — app
   © 2026 cody999110 · Licensed under CC BY-NC-SA 4.0 (see LICENSE).
   Plain JS, no dependencies. Screens: signin → signup → picker → otp → palette
   → profile (and back to signin on sign-out).

   Everything that talks to a server is in `api` below — it is a local demo
   stub (localStorage). Replace those functions with real requests.
   ========================================================================== */
(() => {
  "use strict";

  const CASTS = window.CASTS, G = window.GLYPHS;
  const IMW = 1086, IMH = 1448;                       // cut-out design size (face coords live here)
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const px = (v) => `${v.toFixed(2)}px`;
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPRING = "cubic-bezier(.34, 1.56, .64, 1)";
  const EASE_OUT = "cubic-bezier(.2, .8, .2, 1)";
  const anim = (el, kf, opt) => (REDUCED ? null : el.animate(kf, opt));

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ------------------------------------------------------------ demo API
     Swap these for real calls. Never store passwords client-side in production —
     the hash here only keeps the demo from saving plain text. */
  const ACCOUNT_KEY = "signup-flow-demo-account";
  function hash(s) { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); }
  const api = {
    async signUp({ name, email, password }) {
      await sleep(800);
      const acc = { name, email: email.toLowerCase(), hash: hash(password), joined: Date.now() };
      store.set(ACCOUNT_KEY, acc);
      return acc;
    },
    async signIn(email, password) {
      await sleep(800);
      const acc = store.get(ACCOUNT_KEY);
      return acc && acc.email === email.toLowerCase() && acc.hash === hash(password) ? acc : null;
    },
    async sendCode(/* email */) { await sleep(150); return true; },
    async verifyCode(email, code) { await sleep(900); return /^\d{6}$/.test(code); },   // demo: any 6 digits
    async saveProfile(patch) { const acc = { ...(store.get(ACCOUNT_KEY) || {}), ...patch }; store.set(ACCOUNT_KEY, acc); return acc; },
  };

  /* ------------------------------------------------------------ config */
  const STEPS = ["Sign in", "Create account", "Pick an avatar", "Verify", "Make it yours", "Profile"];
  const SCREENS = {
    signin: { S: 300, step: 0, title: "Welcome back.", sub: () => "Sign in to continue." },
    signup: { S: 210, step: 1, title: "Create account.", sub: () => "It takes less than a minute." },
    picker: { S: 440, step: 2, title: "Pick an avatar.", sub: () => "Swipe to choose who you are." },
    otp: { S: 300, step: 3, title: "Check your inbox.", sub: () => (state.verified ? "Email verified — tap Continue." : `We sent a code to ${state.email || "your email"}`) },
    palette: { S: 330, step: 4, title: "Make it yours.", sub: () => "Tap a color. Change it anytime." },
  };
  const ARCS = { cast1: ["#F7B6C6", "#8EEAE7", "#F7D458"], cast2: ["#FFC2B4", "#A9BCFF", "#DDF38A"] };
  const ZEST = ["Sour", "Tart", "Zesty", "Fresh", "Squeezed!"];
  const TILE_GAP = 250, TILE_W = 230;

  /* ------------------------------------------------------------ svg bits */
  function lemonSVG(size) {
    let seg = "";
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; seg += `<line x1="${(5 * Math.cos(a)).toFixed(2)}" y1="${(5 * Math.sin(a)).toFixed(2)}" x2="${(37 * Math.cos(a)).toFixed(2)}" y2="${(37 * Math.sin(a)).toFixed(2)}"/>`; }
    return `<svg width="${size}" height="${size}" viewBox="-50 -50 100 100"><circle r="49" fill="#F2B705"/><circle r="44" fill="#FFF4C2"/><circle r="40" fill="#FFD43B"/><g stroke="#FFF4C2" stroke-width="3.2" stroke-linecap="round">${seg}</g><circle r="5" fill="#FFF4C2"/></svg>`;
  }
  const starSVG = (size, fill) => { let d = ""; for (let i = 0; i < 10; i++) { const r = i % 2 ? 19 : 46, a = -Math.PI / 2 + i * Math.PI / 5; d += (i ? "L" : "M") + (r * Math.cos(a)).toFixed(1) + " " + (r * Math.sin(a)).toFixed(1); } return `<svg width="${size}" height="${size}" viewBox="-50 -50 100 100"><path d="${d}Z" fill="${fill}" stroke="#151515" stroke-width="4" stroke-linejoin="round"/></svg>`; };
  const heartSVG = (size, fill) => `<svg width="${size}" height="${size}" viewBox="-50 -50 100 100"><path d="M0 38 C-52 4 -40 -40 -12 -34 C-4 -32 0 -24 0 -18 C0 -24 4 -32 12 -34 C40 -40 52 4 0 38Z" fill="${fill}" stroke="#151515" stroke-width="4" stroke-linejoin="round"/></svg>`;
  const sparkSVG = (size, fill) => `<svg width="${size}" height="${size}" viewBox="-50 -50 100 100"><path d="M0 -46 C6 -10 10 -6 46 0 C10 6 6 10 0 46 C-6 10 -10 6 -46 0 C-10 -6 -6 -10 0 -46Z" fill="${fill}" stroke="#151515" stroke-width="4" stroke-linejoin="round"/></svg>`;
  const glyphW = (ch, h) => (G[ch].b[2] - G[ch].b[0]) * h / 708 + 2;
  function glyphSVG(ch, h, fill, cls = "") {
    const b = G[ch].b, k = h / 708, w = glyphW(ch, h);
    return `<svg class="${cls}" width="${w.toFixed(1)}" height="${h + 2}" viewBox="0 0 ${w.toFixed(1)} ${h + 2}"><path d="${G[ch].d}" fill="${fill}" transform="translate(${(-b[0] * k + 1).toFixed(2)},${h + 1}) scale(${k.toFixed(4)},${(-k).toFixed(4)})"/></svg>`;
  }
  const imgSrc = (ch) => `assets/img/${state.castId}/${ch}.webp`;

  /* ------------------------------------------------------------ DOM */
  const root = document.documentElement;
  const card = $("#card"), heroTheme = $("#heroTheme"), heroPicker = $("#heroPicker"), strip = $("#strip");
  const popLayer = $("#pop"), sheet = $("#sheet"), sheetLine = $("#sheetLine");
  const titleEl = $("#title"), titleText = $(".title-text"), titleSr = $(".title-sr"), subEl = $("#sub");
  const profile = $("#profile");
  const SCR = Object.fromEntries($$(".screen").map((f) => [f.dataset.screen, f]));
  const bursts = $$(".bursts i");
  const dotsEl = $(".dots"), cellsEl = $(".cells"), swatchesEl = $(".swatches");
  const bars = $$(".bars b");

  /* ------------------------------------------------------------ state */
  const saved = store.get(ACCOUNT_KEY);
  const state = {
    castId: (saved && saved.castId) || "cast1",
    cast: null,
    screen: null,
    S: 300, Sv: 0, St: 300,              // sheet top (spring)
    heroCh: null, accent: null,
    me: null, theme: null,               // chosen avatar + theme colour (initials)
    pickX: 0, pickV: 0, pickT: 0, pickI: 0, dragging: false,
    email: "", name: "",
    profileOpen: false,
    verified: false, lastCode: "",       // OTP already passed (so stepping back doesn't force a new code)
    signedOut: false,                    // after sign-out, history can't lead back into the signed-in steps
  };
  let LAYERS = {}, TILES = [], CELLS = [], SWATCHES = [];

  /* ------------------------------------------------------------ fit to viewport */
  function fit() {
    const wide = innerWidth > 1000;
    const aw = innerWidth - (wide ? 32 + 2 * 200 : 24);
    const ah = innerHeight - (wide ? 90 : 100);
    root.style.setProperty("--k", clamp(Math.min(aw / 660, ah / 834), 0.35, 1.15).toFixed(4));
  }
  const K = () => parseFloat(getComputedStyle(root).getPropertyValue("--k")) || 1;

  /* ------------------------------------------------------------ cast */
  function buildCast(id) {
    state.castId = id;
    state.cast = CASTS[id];
    const C = state.cast.chars;
    heroTheme.innerHTML = ""; popLayer.innerHTML = ""; strip.innerHTML = ""; dotsEl.innerHTML = ""; swatchesEl.innerHTML = "";
    LAYERS = {};
    for (const ch of Object.keys(C)) {
      const el = document.createElement("div"); el.className = "hl";
      el.innerHTML = `<div class="bg ht" style="background-color:${C[ch].c}"></div><div class="wipe ht"></div>${glyphSVG(ch, 400, "rgba(255,255,255,.94)", "initial")}<img class="person" alt="" draggable="false" src="${imgSrc(ch)}">`;
      heroTheme.appendChild(el);
      const pim = document.createElement("img"); pim.alt = ""; pim.src = imgSrc(ch); popLayer.appendChild(pim);
      const initial = $(".initial", el);
      const side = state.cast.initial === "side";
      initial.style.left = px(330 + (side ? C[ch].ldx : 0) - glyphW(ch, 400) / 2);
      initial.style.top = side ? "26px" : "22px";
      LAYERS[ch] = { el, bg: $(".bg", el), wipe: $(".wipe", el), initial, person: $(".person", el), pim };
    }
    // picker tiles + dots + palette swatches all follow cast.pick
    TILES = state.cast.pick.map((ch, i) => {
      const t = document.createElement("div"); t.className = "tile"; t.id = `tile-${ch}`; t.setAttribute("role", "option"); t.dataset.i = i;
      t.setAttribute("aria-label", C[ch].name);
      const s = 0.36, f = C[ch].face;
      t.innerHTML = `<div class="tb ht" style="background-color:${C[ch].c}"></div><div class="tc"><img alt="" draggable="false" src="${imgSrc(ch)}" style="width:${px(IMW * s)};height:${px(IMH * s)};left:${px(115 - f[0] * s)};top:${px(118 - f[1] * s)}"></div><div class="tl">${glyphSVG(ch, 46, "#fff")}</div><div class="tw">${C[ch].name}</div>`;
      strip.appendChild(t);
      dotsEl.insertAdjacentHTML("beforeend", `<i style="background:${C[ch].c}"></i>`);
      const sw = document.createElement("button");
      sw.type = "button"; sw.className = "sw"; sw.dataset.ch = ch;
      sw.setAttribute("role", "radio"); sw.setAttribute("aria-checked", "false"); sw.setAttribute("aria-label", `${C[ch].name} ${C[ch].c}`);
      sw.innerHTML = `<span class="ring"></span><span class="c" style="background:${C[ch].c}"></span><span class="hx">${C[ch].c}</span>`;
      swatchesEl.appendChild(sw);
      return t;
    });
    SWATCHES = $$(".sw", swatchesEl);
    bars.forEach((b, i) => (b.style.background = C[state.cast.pick[i]].c));
    CELLS.forEach((c, k) => { const ch = C[state.cast.pick[[0, 1, 2, 3, 4, 2][k]]]; c.fill.style.background = ch.c; c.input.style.color = ch.ink; });
    bursts.forEach((b, i) => (b.style.borderColor = C[state.cast.pick[[1, 3, 4][i]]].c));
    ARCS[id].forEach((c, i) => root.style.setProperty(`--arc${i + 1}`, c));
    $$(".cast-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cast === id)));
    state.heroCh = null;
  }

  /* ------------------------------------------------------------ accent + hero */
  function setAccent(ch) {
    const c = state.cast.chars[ch];
    state.accent = ch;
    root.style.setProperty("--acc", c.c);
    root.style.setProperty("--acc-ink", c.ink);
  }
  function personBox(ch, S) {
    const s = lerp(0.45, 0.56, clamp((S - 210) / 90, 0, 1)), f = state.cast.chars[ch].face;
    return { w: IMW * s, h: IMH * s, left: 330 - f[0] * s, top: S * 0.52 + 24 - f[1] * s };
  }
  function setHero(ch, origin) {
    if (ch === state.heroCh) return;
    const prev = state.heroCh;
    state.heroCh = ch;
    const L = LAYERS[ch];
    for (const k in LAYERS) LAYERS[k].el.style.zIndex = k === ch ? 2 : 1;
    L.el.style.display = "block";
    L.bg.style.backgroundColor = state.cast.chars[ch].c;
    layout();
    const done = () => { if (state.heroCh === ch) for (const k in LAYERS) if (k !== ch) LAYERS[k].el.style.display = "none"; };
    if (!prev || REDUCED) return done();
    const [ox, oy] = origin || [330, state.S * 0.55];
    const a = L.el.animate([{ clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(820px at ${ox}px ${oy}px)` }], { duration: 380, easing: EASE_OUT });
    a.onfinish = done;
    for (const img of [L.person, L.pim]) img.animate([{ translate: "0 70px" }, { translate: "0 0" }], { duration: 650, easing: SPRING });
    L.initial.animate([{ scale: 1.08 }, { scale: 1 }], { duration: 500, easing: EASE_OUT });
  }
  // palette: recolour the chosen avatar's background with a wipe from the tapped swatch
  function recolor(ch, swatch) {
    const L = LAYERS[state.heroCh], c = state.cast.chars[ch].c;
    state.theme = ch;
    setAccent(ch);
    SWATCHES.forEach((s) => s.setAttribute("aria-checked", String(s.dataset.ch === ch)));
    if (REDUCED || !swatch) { L.bg.style.backgroundColor = c; return; }
    const i = state.cast.pick.indexOf(ch), ox = 114 + i * 92 + 32, oy = state.S + 190;
    L.wipe.style.display = "block"; L.wipe.style.backgroundColor = c;
    const a = L.wipe.animate([{ clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(900px at ${ox}px ${oy}px)` }], { duration: 450, easing: EASE_OUT });
    a.onfinish = () => { L.bg.style.backgroundColor = c; L.wipe.style.display = "none"; };
    swatch.querySelector(".c").animate([{ scale: 1.25 }, { scale: 1 }], { duration: 450, easing: SPRING });
    card.animate([{ scale: 1.008 }, { scale: 1 }], { duration: 300, easing: EASE_OUT });
  }

  /* ------------------------------------------------------------ layout (per frame while springs move) */
  function layout() {
    const S = state.S;
    sheet.style.top = px(S);
    sheetLine.style.top = px(S - 18);
    titleEl.style.top = px(S + 52);
    subEl.style.top = px(S + 118);
    for (const name in SCR) if (SCR[name].classList.contains("on")) SCR[name].style.transform = `translateY(${px(S - SCREENS[name].S)})`;

    const showPop = state.screen !== "picker" && !state.profileOpen;
    const side = state.cast.initial === "side";
    for (const ch in LAYERS) {
      const L = LAYERS[ch];
      if (L.el.style.display !== "block") { L.pim.style.display = "none"; continue; }
      const P = personBox(ch, S);
      Object.assign(L.person.style, { width: px(P.w), height: px(P.h), left: px(P.left), top: px(P.top) });
      L.initial.style.transform = side ? `scale(${clamp((S - 50) / 400, 0.4, 1).toFixed(4)})` : `translateY(${px(S - 300)})`;
      const above = -P.top;
      if (showPop && ch === state.heroCh && above > 0) {
        Object.assign(L.pim.style, { display: "block", width: px(P.w), height: px(P.h), left: px(P.left), top: px(70 + P.top), clipPath: `inset(0 0 ${px(P.h - above)} 0)` });
      } else L.pim.style.display = "none";
    }
    if (state.screen === "picker") layoutTiles();
  }
  function layoutTiles() {
    TILES.forEach((t, i) => {
      const d = i - state.pickX, ad = Math.min(Math.abs(d), 1.5);
      const sc = 1 - 0.14 * Math.min(ad, 1);
      t.style.transform = `translate(${px(330 + d * TILE_GAP - TILE_W / 2)}, 0) scale(${sc.toFixed(4)})`;
      t.style.opacity = (1 - 0.25 * Math.min(ad, 1)).toFixed(3);
      t.style.zIndex = String(10 - Math.round(ad * 2));
    });
  }

  /* ------------------------------------------------------------ springs */
  let raf = 0, lastT = 0;
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.032, lastT ? (now - lastT) / 1000 : 1 / 60);
    lastT = now;
    let moving = false;
    if (REDUCED) { state.S = state.St; state.Sv = 0; }
    else if (Math.abs(state.S - state.St) > 0.05 || Math.abs(state.Sv) > 0.05) {
      for (let i = 0; i < 2; i++) { const h = dt / 2; const a = -170 * (state.S - state.St) - 15 * state.Sv; state.Sv += a * h; state.S += state.Sv * h; }
      moving = true;
    } else { state.S = state.St; state.Sv = 0; }
    if (!state.dragging && state.pickT != null && state.screen === "picker") {
      if (REDUCED) { state.pickX = state.pickT; state.pickV = 0; }
      else if (Math.abs(state.pickX - state.pickT) > 0.001 || Math.abs(state.pickV) > 0.001) {
        for (let i = 0; i < 2; i++) { const h = dt / 2; const a = -220 * (state.pickX - state.pickT) - 18 * state.pickV; state.pickV += a * h; state.pickX += state.pickV * h; }
        moving = true;
      } else { state.pickX = state.pickT; state.pickV = 0; }
      pickTheme();
    }
    layout();
    if (moving) raf = requestAnimationFrame(tick); else lastT = 0;
  }

  /* ------------------------------------------------------------ text */
  const GL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz&?#%";
  function scramble(el, to, { from = el.textContent, dur = 700, sr } = {}) {
    if (sr) sr.textContent = to;
    if (REDUCED) { el.textContent = to; return; }
    const n = Math.max(from.length, to.length), t0 = performance.now(), id = (el._scr = (el._scr || 0) + 1);
    (function step(now) {
      if (el._scr !== id) return;
      const p = clamp((now - t0) / dur, 0, 1), f = Math.floor(now / 42);
      let s = "";
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 0.5, c = 0.5 + (i / n) * 0.5;
        if (p < a) s += from[i] ?? "";
        else if (p >= c) s += to[i] ?? "";
        else { const ch = to[i] ?? from[i]; s += ch === " " ? " " : GL[Math.floor(Math.abs(Math.sin(i * 12.99 + f * 78.23) * 43758.5) % 1 * GL.length)]; }
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function setSub(text, err = false) { subEl.textContent = text; subEl.classList.toggle("err", err); }

  /* ------------------------------------------------------------ step rail */
  function setStep(n) {
    const roll = $(".step-num"), label = String(n + 1).padStart(2, "0");
    const old = roll.querySelector("span:last-child");
    if (old && old.textContent === label) return;
    const neu = document.createElement("span"); neu.textContent = label; roll.appendChild(neu);
    if (old && !REDUCED) {
      old.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: 450, easing: EASE_OUT }).onfinish = () => old.remove();
      neu.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 550, easing: SPRING });
    } else if (old) old.remove();
    $(".step-name").textContent = STEPS[n];
    $(".mobile-step").textContent = `${label} / 06 — ${STEPS[n]}`;
    $$(".step-track li").forEach((li, i) => { li.classList.toggle("done", i < n); li.classList.toggle("cur", i === n); });
  }

  /* ------------------------------------------------------------ screens */
  function goTo(name, { focus = true, force = false, push = true } = {}) {
    const prev = state.screen, def = SCREENS[name];
    if (prev === name && !force) return;
    state.screen = name;
    if (push) pushNav(name);
    backBtn.classList.toggle("on", !!PREV[name]);
    backBtn.tabIndex = PREV[name] ? 0 : -1;
    if (prev && prev !== name) {
      const pe = SCR[prev];
      const out = anim(pe, [{ opacity: 1 }, { opacity: 0, transform: `translateY(${px(state.S - SCREENS[prev].S - 8)})` }], { duration: 160, easing: "ease-in" });
      if (out) out.onfinish = () => { if (state.screen !== prev) pe.classList.remove("on"); };
      else pe.classList.remove("on");
    }
    const ne = SCR[name];
    ne.classList.add("on");
    [...ne.children].forEach((c, j) => anim(c, [{ opacity: 0, translate: "0 18px", filter: "blur(4px)" }, { opacity: 1, translate: "0 0", filter: "blur(0)" }], { duration: 380, delay: 120 + j * 45, easing: EASE_OUT, fill: "backwards" }));
    heroPicker.classList.toggle("on", name === "picker");
    heroTheme.style.opacity = name === "picker" ? "0" : "1";
    state.St = def.S; kick();
    scramble(titleText, def.title, { from: prev ? titleText.textContent : "", dur: prev ? 650 : 1900, sr: titleSr });
    setSub(def.sub());
    setStep(def.step);
    ENTER[name] && ENTER[name](prev);
    if (focus) setTimeout(() => { const f = $("input, .strip, .sw", ne); if (f && state.screen === name) f.focus({ preventScroll: true }); }, 380);
  }
  const ENTER = {
    signin(prev) {
      if (!prev) return;                                   // first paint: the hook sequence owns the hero
      const ch = state.me || state.cast.hook[state.cast.hook.length - 1];
      setHero(ch); LAYERS[ch].bg.style.backgroundColor = state.cast.chars[state.theme || ch].c;
      setAccent(state.theme || ch);
    },
    signup() { const ch = state.cast.pick[0]; setHero(ch); LAYERS[ch].bg.style.backgroundColor = state.cast.chars[ch].c; setAccent(ch); },
    picker() { state.pickT = state.pickI = clamp(state.cast.pick.indexOf(state.me || state.cast.pick[0]), 0, 4); state.pickI = -1; TILES.forEach((t) => t.classList.remove("picked")); state.pickX = state.pickT; pickTheme(); layoutTiles(); },
    otp() {
      const btn = $(".btn", SCR.otp);
      btn.classList.remove("busy", "ok");
      setHero(state.me); LAYERS[state.me].bg.style.backgroundColor = state.cast.chars[state.me].c; setAccent(state.me);
      const code = state.verified ? state.lastCode : "";
      CELLS.forEach((c, k) => { c.input.value = code[k] || ""; c.el.classList.toggle("has", !!code[k]); });
      $(".lbl", btn).textContent = state.verified ? "Continue" : "Verify";
      if (!state.verified) { api.sendCode(state.email); startResend(); }
    },
    palette() {
      setHero(state.me); LAYERS[state.me].bg.style.backgroundColor = state.cast.chars[state.theme].c; setAccent(state.theme);
      SWATCHES.forEach((s) => s.setAttribute("aria-checked", String(s.dataset.ch === state.theme)));
    },
  };

  /* ------------------------------------------------------------ fields */
  function wireField(input) {
    const fld = input.closest(".fld");
    const sync = () => {
      fld.classList.toggle("lift", input.value.length > 0);
      fld.classList.remove("bad");
      if (subEl.classList.contains("err")) setSub(SCREENS[state.screen].sub());
      if (fld.classList.contains("fld-pass")) syncPass(fld, input);
    };
    input.addEventListener("input", sync);
    sync();
  }
  function syncPass(fld, input) {
    const n = input.value.length, sl = $(".slices", fld);
    fld.classList.toggle("has-val", n > 0);
    while (sl.children.length < n) { const s = document.createElement("span"); s.innerHTML = lemonSVG(19); sl.appendChild(s); }
    while (sl.children.length > n) sl.lastChild.remove();
    const zest = $(".zest", fld);
    if (zest) {
      const sc = strength(input.value);
      zest.textContent = sc ? ZEST[sc - 1] : "";
      bars.forEach((b, i) => b.classList.toggle("on", i < sc));
    }
  }
  function strength(pw) {
    if (!pw) return 0;
    let n = 0;
    if (pw.length >= 6) n++;
    if (pw.length >= 10) n++;
    if (/\d/.test(pw)) n++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) n++;
    if (/[^A-Za-z0-9]/.test(pw)) n++;
    return Math.max(1, n);
  }
  $$(".fld input").forEach(wireField);
  $$(".fld-pass").forEach((f) => f.classList.add("masked"));
  $$(".eye").forEach((b) => b.addEventListener("click", () => {
    const fld = b.closest(".fld"), input = $("input", fld), show = input.type === "password";
    input.type = show ? "text" : "password";
    fld.classList.toggle("reveal", show); fld.classList.toggle("masked", !show);
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    input.focus();
  }));
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function fail(msg, inputs) {
    setSub(msg, true);
    inputs.forEach((i) => { const f = i.closest(".fld") || i.closest(".cells"); f.classList.remove("bad"); void f.offsetWidth; f.classList.add("bad"); });
    if (inputs[0]) inputs[0].focus();
  }
  $$(".btn .spin").forEach((s) => (s.innerHTML = lemonSVG(44)));   // lemon-slice spinner
  async function busy(form, fn) {
    const btn = $(".btn", form);
    btn.classList.add("busy"); btn.disabled = true;
    try { return await fn(); } finally { btn.classList.remove("busy"); btn.disabled = false; }
  }

  /* sign in */
  SCR.signin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, email = f.email.value.trim(), pw = f.password.value;
    if (!EMAIL_RE.test(email)) return fail("Please enter a valid email.", [f.email]);
    if (pw.length < 6) return fail("Passwords are at least 6 characters.", [f.password]);
    const acc = await busy(f, () => api.signIn(email, pw));
    if (!acc) return fail("No account with those details — create one?", [f.email, f.password]);
    Object.assign(state, { email: acc.email, name: acc.name });
    if (acc.me && state.cast.chars[acc.me]) { state.me = acc.me; state.theme = acc.theme || acc.me; }
    else { state.me = state.heroCh; state.theme = state.me; }
    f.password.value = ""; syncPass(f.password.closest(".fld"), f.password); f.password.closest(".fld").classList.remove("lift");
    state.signedOut = false;
    showProfile();
  });
  /* sign up */
  SCR.signup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, name = f.name.value.trim(), email = f.email.value.trim(), pw = f.password.value;
    if (name.length < 2) return fail("What should we call you?", [f.name]);
    if (!EMAIL_RE.test(email)) return fail("Please enter a valid email.", [f.email]);
    if (pw.length < 6) return fail("Use at least 6 characters.", [f.password]);
    await busy(f, () => api.signUp({ name, email, password: pw }));
    if (email.toLowerCase() !== state.email) state.verified = false;     // new address → new code
    Object.assign(state, { name, email: email.toLowerCase(), signedOut: false });
    goTo("picker");
  });
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => {
    goTo(b.dataset.go);
  }));

  /* ------------------------------------------------------------ picker */
  function pickTheme() {
    const i = clamp(Math.round(state.pickX), 0, 4);
    if (i === state.pickI) return;
    state.pickI = i;
    setAccent(state.cast.pick[i]);
    [...dotsEl.children].forEach((d, k) => d.classList.toggle("on", k === i));
    TILES.forEach((t, k) => t.setAttribute("aria-selected", String(k === i)));
    strip.setAttribute("aria-activedescendant", TILES[i].id);
  }
  let drag = null;
  strip.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    strip.setPointerCapture(e.pointerId);
    state.dragging = true; strip.classList.add("dragging");
    drag = { x: e.clientX, x0: state.pickX, moved: false, samples: [[performance.now(), e.clientX]], tile: e.target.closest(".tile") };
  });
  strip.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) drag.moved = true;
    let x = drag.x0 - dx / (TILE_GAP * K());
    if (x < 0) x *= 0.35; else if (x > 4) x = 4 + (x - 4) * 0.35;      // rubber-band past the ends
    state.pickX = x;
    drag.samples.push([performance.now(), e.clientX]);
    if (drag.samples.length > 6) drag.samples.shift();
    pickTheme(); layoutTiles();
  });
  const endDrag = (e) => {
    if (!drag) return;
    state.dragging = false; strip.classList.remove("dragging");
    const [t0, x0] = drag.samples[0], [t1, x1] = drag.samples[drag.samples.length - 1];
    const v = t1 > t0 ? -((x1 - x0) / ((t1 - t0) / 1000)) / (TILE_GAP * K()) : 0;   // tiles per second
    if (!drag.moved && drag.tile) state.pickT = +drag.tile.dataset.i;
    else state.pickT = clamp(Math.round(state.pickX + v * 0.3), 0, 4);
    state.pickV = drag.moved ? v : 0;
    drag = null; kick();
  };
  strip.addEventListener("pointerup", endDrag);
  strip.addEventListener("pointercancel", endDrag);
  strip.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      state.pickT = clamp(Math.round(state.pickT ?? state.pickX) + (e.key === "ArrowRight" ? 1 : -1), 0, 4); kick();
    } else if (e.key === "Enter") { e.preventDefault(); SCR.picker.requestSubmit(); }
  });
  SCR.picker.addEventListener("submit", async (e) => {
    e.preventDefault();
    const i = clamp(Math.round(state.pickT ?? state.pickX), 0, 4), ch = state.cast.pick[i];
    state.pickT = i; kick();
    state.me = ch; state.theme = ch;
    api.saveProfile({ me: ch, theme: ch, castId: state.castId });
    TILES[i].classList.add("picked");
    if (!REDUCED) bursts.forEach((b, k) => b.animate([
      { width: "240px", height: "240px", left: "210px", top: "106px", opacity: 1 },
      { width: `${520 + k * 80}px`, height: `${520 + k * 80}px`, left: `${70 - k * 40}px`, top: `${-34 - k * 40}px`, opacity: 0 },
    ], { duration: 700, delay: k * 70, easing: EASE_OUT }));
    setHero(ch);
    await sleep(REDUCED ? 0 : 750);
    goTo("otp");
  });

  /* ------------------------------------------------------------ one-time code */
  CELLS = [0, 1, 2, 3, 4, 5].map((k) => {
    const el = document.createElement("div"); el.className = "cell";
    el.innerHTML = `<span class="fill"></span><input inputmode="numeric" pattern="[0-9]*" maxlength="1" aria-label="Digit ${k + 1}" ${k === 0 ? 'autocomplete="one-time-code"' : 'autocomplete="off"'}>`;
    cellsEl.appendChild(el);
    return { el, input: $("input", el), fill: $(".fill", el) };
  });
  cellsEl.insertAdjacentHTML("afterend", `<p class="mono" style="left:0;top:552px;width:660px;text-align:center;font-size:10.5px;color:#A39E92">Demo — any 6 digits works</p>`);
  const otpCode = () => CELLS.map((c) => c.input.value).join("");
  function fillFrom(k, digits) {
    for (const d of digits) {
      if (k > 5) break;
      const c = CELLS[k++];
      c.input.value = d;
      void c.el.offsetWidth;   // restart the drop when a digit is overwritten
      c.el.classList.add("has");
      anim(c.el, [{ scale: 1.15 }, { scale: 1 }], { duration: 450, easing: SPRING });   // cell punch as the digit lands
    }
    if (k <= 5) CELLS[k].input.focus(); else CELLS[5].input.blur();
    if (otpCode().length === 6) SCR.otp.requestSubmit();
  }
  CELLS.forEach((c, k) => {
    c.input.addEventListener("input", () => {
      const digits = c.input.value.replace(/\D/g, "");
      c.input.value = "";
      c.el.classList.remove("has");
      if (subEl.classList.contains("err")) setSub(SCREENS.otp.sub());
      if (digits) fillFrom(k, digits);
    });
    c.input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !c.input.value && k > 0) { e.preventDefault(); const p = CELLS[k - 1]; p.input.value = ""; p.el.classList.remove("has"); p.input.focus(); }
      else if (e.key === "ArrowLeft" && k > 0) CELLS[k - 1].input.focus();
      else if (e.key === "ArrowRight" && k < 5) CELLS[k + 1].input.focus();
    });
    c.input.addEventListener("paste", (e) => { const t = (e.clipboardData.getData("text") || "").replace(/\D/g, ""); if (t) { e.preventDefault(); fillFrom(k, t); } });
  });
  SCR.otp.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = otpCode(), btn = $(".btn", SCR.otp);
    if (code.length < 6) return fail("Enter all 6 digits.", [CELLS.find((c) => !c.input.value)?.input || CELLS[0].input]);
    if (btn.classList.contains("busy") || btn.classList.contains("ok")) return;
    if (state.verified && code === state.lastCode) return goTo("palette");
    const ok = await busy(SCR.otp, () => api.verifyCode(state.email, code));
    if (!ok) return fail("That code didn't work — try again.", [CELLS[0].input]);
    Object.assign(state, { verified: true, lastCode: code });
    btn.classList.add("ok");
    CELLS.forEach((c, i) => (c.el.style.animationDelay = `${i * 60}ms`));
    cellsEl.classList.remove("wave"); void cellsEl.offsetWidth; cellsEl.classList.add("wave");
    await sleep(REDUCED ? 0 : 1000);
    cellsEl.classList.remove("wave");
    goTo("palette");
  });
  let resendTimer = 0;
  function startResend() {
    const b = $("#resend"); let left = 30;
    clearInterval(resendTimer);
    b.disabled = true; b.textContent = "Resend in 0:30";
    resendTimer = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(resendTimer); b.disabled = false; b.textContent = "Resend"; }
      else b.textContent = `Resend in 0:${String(left).padStart(2, "0")}`;
    }, 1000);
  }
  $("#resend").addEventListener("click", () => { api.sendCode(state.email); setSub(`New code sent to ${state.email || "your email"}`); startResend(); });

  /* ------------------------------------------------------------ palette */
  swatchesEl.addEventListener("click", (e) => { const s = e.target.closest(".sw"); if (s) recolor(s.dataset.ch, s); });
  swatchesEl.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const i = clamp(state.cast.pick.indexOf(state.theme) + (e.key === "ArrowRight" ? 1 : -1), 0, 4), s = SWATCHES[i];
    s.focus(); recolor(s.dataset.ch, s);
  });
  SCR.palette.addEventListener("submit", (e) => { e.preventDefault(); api.saveProfile({ theme: state.theme, me: state.me, castId: state.castId }); showProfile(); });
  $("[data-skip]").addEventListener("click", () => showProfile());

  /* ------------------------------------------------------------ profile */
  const STK = [[() => lemonSVG(78), 470, 104, 18], [() => starSVG(70, "#FDD018"), 112, 300, -14], [() => heartSVG(66, "#FD7995"), 492, 330, 12], [() => sparkSVG(56, "#BAA6FB"), 150, 120, 0]];
  function fillProfile() {
    const C = state.cast.chars, me = C[state.me], th = C[state.theme] || me;
    profile.style.setProperty("--pf-ink", th.ink);
    $(".pf-bg", profile).style.backgroundColor = th.c;
    const side = state.cast.initial === "side", h = side ? 300 : 380;
    const let_ = $(".pf-let", profile);
    let_.innerHTML = glyphSVG(state.me, h, "rgba(255,255,255,.9)");
    let_.style.left = px(330 + (side ? me.ldx * 1.15 : 0) - glyphW(state.me, h) / 2);
    let_.style.top = side ? "70px" : "86px";
    const s = 0.5;
    $$(".pf-av img", profile).forEach((im) => { im.src = imgSrc(state.me); Object.assign(im.style, { width: px(IMW * s), height: px(IMH * s), left: px(330 - me.face[0] * s), top: px(262 - me.face[1] * s) }); });
    const name = state.name || "Sunny Lee";
    $(".pf-handle", profile).textContent = "@" + name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    const acc = store.get(ACCOUNT_KEY), joined = new Date((acc && acc.joined) || Date.now());
    $(".pf-meta", profile).textContent = `Joined ${joined.toLocaleString("en", { month: "short", year: "numeric" })} · Theme ${th.c}`;
    const stk = $(".stickers", profile);
    stk.innerHTML = STK.map(([svg, x, y, r]) => `<div class="stk" style="left:${x - 36}px;top:${y - 36}px;rotate:${r}deg">${svg()}</div>`).join("");
    return name;
  }
  async function showProfile({ push = true } = {}) {
    if (state.profileOpen) return;
    if (push) pushNav("profile");
    const name = fillProfile();
    state.profileOpen = true;
    layout();
    setStep(5);
    setAccent(state.theme || state.me);
    if (!REDUCED) await card.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }], { duration: 220, easing: "ease-in" }).finished;
    card.style.visibility = "hidden";
    profile.hidden = false;
    $(".pf-name-text", profile).textContent = "";
    scramble($(".pf-name-text", profile), name, { from: "", dur: 900, sr: $(".pf-name-sr", profile) });
    if (!REDUCED) {
      profile.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0)" }], { duration: 600, easing: SPRING });
      $(".pf-ring", profile).animate([{ scale: 0.6 }, { scale: 1 }], { duration: 550, easing: SPRING });
      $$(".pf-av img", profile).forEach((im) => im.animate([{ translate: "0 80px" }, { translate: "0 0", offset: 0.55 }, { translate: "0 -40px", scale: 1.08 }], { duration: 1100, easing: EASE_OUT, fill: "forwards" }));
      [".pf-bar", ".pf-handle", ".pf-tags", ".pf-meta", ".pf-actions"].forEach((s, i) => $(s, profile).animate([{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }], { duration: 400, delay: 250 + i * 110, easing: EASE_OUT, fill: "backwards" }));
      $$(".stk", profile).forEach((s, i) => s.animate([{ scale: 0, transform: "rotate(-70deg)" }, { scale: 1, transform: "rotate(0)" }], { duration: 500, delay: 550 + i * 270, easing: SPRING, fill: "backwards" }));
    } else $$(".pf-av img", profile).forEach((im) => (im.style.translate = "0 -40px"));
    $("[data-signout]", profile).focus({ preventScroll: true });
  }
  async function hideProfile(to, { push = true } = {}) {
    if (!state.profileOpen) return;
    state.profileOpen = false;
    if (!REDUCED) await profile.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(-90deg)" }], { duration: 220, easing: "ease-in" }).finished;
    profile.hidden = true;
    card.style.visibility = "visible";
    if (to === "signin") {
      setHero(state.me); LAYERS[state.me].bg.style.backgroundColor = state.cast.chars[state.theme || state.me].c;
      setAccent(state.theme || state.me);
      SCR.signin.email.value = state.email; SCR.signin.email.dispatchEvent(new Event("input"));
      SCR.signin.password.value = ""; SCR.signin.password.dispatchEvent(new Event("input"));
      goTo("signin", { focus: false, force: true, push });
      setTimeout(() => SCR.signin.password.focus({ preventScroll: true }), 400);
    } else {
      if (state.screen !== to) goTo(to, { focus: false, push });
      else { if (push) pushNav(to); ENTER[to] && ENTER[to](to); setStep(SCREENS[to].step); }
      $(".sw[aria-checked='true']", swatchesEl)?.focus({ preventScroll: true });
    }
    layout();
    if (!REDUCED) card.animate([{ transform: "rotateY(90deg)" }, { transform: "rotateY(0)" }], { duration: 520, easing: SPRING });
  }
  $$("[data-edit]", profile).forEach((b) => b.addEventListener("click", () => hideProfile("palette")));
  $("[data-signout]", profile).addEventListener("click", () => { state.signedOut = true; state.verified = false; hideProfile("signin"); });

  /* ------------------------------------------------------------ back navigation
     Every screen change is a history entry, so the in-card back button, the browser
     back button and the phone's back gesture all step back one screen at a time. */
  const backBtn = $("#back");
  // the card is a fixed canvas: focusing a field must never scroll its contents (older engines ignore overflow: clip)
  for (const el of [card, profile]) el.addEventListener("scroll", () => { el.scrollTop = 0; el.scrollLeft = 0; });
  const PREV = { signup: "signin", picker: "signup", otp: "picker", palette: "otp" };
  const GUARDED = new Set(["picker", "otp", "palette", "profile"]);   // need a signed-up / signed-in session
  let navDepth = 0;
  function pushNav(screen) { navDepth++; try { history.pushState({ screen, depth: navDepth }, ""); } catch { /* sandboxed */ } }
  function navigate(target) {
    if (state.signedOut && GUARDED.has(target)) target = "signin";
    if (target === "profile") return showProfile({ push: false });
    if (state.profileOpen) return hideProfile(target, { push: false });
    goTo(target, { push: false, force: target === "signin" && state.screen === "signin" });
  }
  addEventListener("popstate", (e) => {
    const s = e.state || { screen: "signin", depth: 0 };
    navDepth = s.depth || 0;
    navigate(s.screen);
  });
  backBtn.addEventListener("click", () => {
    if (navDepth > 0) history.back();
    else if (PREV[state.screen]) navigate(PREV[state.screen]);
  });

  /* ------------------------------------------------------------ cast switch */
  $$(".cast-switch button").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.cast;
    if (id === state.castId) return;
    const idx = (ch) => Math.max(0, state.cast.pick.indexOf(ch));
    const meI = idx(state.me), thI = idx(state.theme), heroI = idx(state.heroCh), accI = idx(state.accent);
    buildCast(id);
    const P = state.cast.pick;
    state.me = state.me ? P[meI] : null; state.theme = state.theme ? P[thI] : null;
    setHero(P[heroI]); setAccent(P[accI]);
    if (state.theme && state.screen !== "signup" && state.screen !== "picker") LAYERS[state.heroCh].bg.style.backgroundColor = state.cast.chars[state.theme].c;
    if (state.screen === "picker") { state.pickI = -1; pickTheme(); layoutTiles(); }
    if (state.screen === "palette") ENTER.palette();
    if (state.profileOpen) { fillProfile(); $(".pf-name-text", profile).textContent = state.name || "Sunny Lee"; setAccent(state.theme); }
    api.saveProfile({ castId: id, ...(state.me && { me: state.me, theme: state.theme }) });
    layout();
  }));

  /* ------------------------------------------------------------ boot */
  $(".step-track").innerHTML = STEPS.map(() => "<li></li>").join("");
  buildCast(CASTS[state.castId] ? state.castId : "cast1");
  fit(); addEventListener("resize", fit);
  setStep(0);
  try { history.replaceState({ screen: "signin", depth: 0 }, ""); } catch { /* sandboxed */ }
  if (saved && saved.email) {
    // returning visitor: their avatar + theme, email pre-filled
    Object.assign(state, { email: saved.email, name: saved.name || "" });
    state.me = state.cast.chars[saved.me] ? saved.me : null;
    state.theme = state.cast.chars[saved.theme] ? saved.theme : state.me;
    const ch = state.me || state.cast.hook[state.cast.hook.length - 1];
    setHero(ch); setAccent(state.theme || ch);
    if (state.theme) LAYERS[ch].bg.style.backgroundColor = state.cast.chars[state.theme].c;
    SCR.signin.email.value = saved.email; SCR.signin.email.dispatchEvent(new Event("input"));
    goTo("signin", { focus: false, push: false });
  } else {
    // first visit: one face per beat while the headline decodes
    const hook = state.cast.hook;
    setHero(hook[0]); setAccent(hook[0]);
    goTo("signin", { focus: false, push: false });
    if (!REDUCED) {
      let stop = false;
      const halt = () => { stop = true; };
      addEventListener("pointerdown", halt, { once: true }); addEventListener("keydown", halt, { once: true });
      (async () => {
        for (let i = 1; i < hook.length; i++) {
          await sleep(545);
          if (stop || state.screen !== "signin") return;
          setHero(hook[i]); setAccent(hook[i]);
        }
      })();
    } else { setHero(hook[hook.length - 1]); setAccent(hook[hook.length - 1]); }
  }
  layout();
})();
