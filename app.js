/* ─────────────────────────────────────────────────────────────
   All Out Games — Hero choreography
   Built against the GSAP skills:
     · gsap-core       (tweens, transform aliases, autoAlpha, matchMedia)
     · gsap-timeline   (sequenced reveals)
     · gsap-scrolltrigger (scroll-tied video scrub)
     · gsap-plugins    (SplitText for headline)

   Architecture: single ScrollTrigger-driven tl that runs entirely off
   user scroll. No auto-play on load — the page sits in its lockdown
   state until the user scrolls, then cascade → ignition → outro
   plays in lockstep with scrollY progress.
   ───────────────────────────────────────────────────────────── */

(() => {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     0.  Graceful degradation — show content without animation
         if GSAP or critical plugins fail to load.
     ────────────────────────────────────────────────────────── */
  function showContentWithoutAnimation() {
    const curtain = document.querySelector('[data-curtain]');
    if (curtain) curtain.style.display = 'none';

    const flash = document.querySelector('[data-flash]');
    if (flash) flash.style.display = 'none';

    const vignette = document.querySelector('[data-vignette]');
    if (vignette) vignette.style.opacity = '0.6';

    const prenote = document.querySelector('[data-prenote]');
    if (prenote) prenote.style.display = 'none';

    document.querySelectorAll('[data-reveal-sub], [data-reveal-ctas], [data-reveal-trust], [data-headline]').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.visibility = 'visible';
    });
    document.querySelectorAll('.hero-headline .line').forEach(el => {
      el.style.clipPath = 'none';
    });

    const nav = document.querySelector('[data-nav]');
    if (nav) {
      nav.style.opacity = '1';
      nav.style.transform = 'none';
      nav.setAttribute('data-revealed', 'true');
    }

    const hero = document.querySelector('[data-hero]');
    if (hero) hero.setAttribute('data-ignited', 'true');

    removeLoadingIndicator();
  }

  function removeLoadingIndicator() {
    const loadingEl = document.querySelector('[data-loading]');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
      setTimeout(() => loadingEl.remove(), 300);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     1.  Load detection — verify GSAP and critical plugins
     ────────────────────────────────────────────────────────── */
  if (typeof gsap === 'undefined') {
    console.error('[AllOutGames] GSAP failed to load. Showing content without animation.');
    showContentWithoutAnimation();
    return;
  }

  const hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
  const hasScrollToPlugin = typeof ScrollToPlugin !== 'undefined';
  const hasSplitText = typeof SplitText !== 'undefined';

  if (!hasScrollTrigger) {
    console.error('[AllOutGames] ScrollTrigger failed to load. Scroll animations disabled.');
    showContentWithoutAnimation();
    return;
  }

  const pluginsToRegister = [ScrollTrigger];
  if (hasScrollToPlugin) pluginsToRegister.push(ScrollToPlugin);
  if (hasSplitText) pluginsToRegister.push(SplitText);
  gsap.registerPlugin(...pluginsToRegister);

  if (!hasSplitText) {
    console.warn('[AllOutGames] SplitText not available. Headline will animate as a block.');
  }

  const prefersReduced = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────────────────────────────────────
     2.  Layout / split + safe-initial state
     ────────────────────────────────────────────────────────── */
  const hero       = document.querySelector('[data-hero]');
  const curtain    = document.querySelector('[data-curtain]');
  const flash      = document.querySelector('[data-flash]');
  const vignette   = document.querySelector('[data-vignette]');
  const navPill    = document.querySelector('[data-nav-pill]');
  const navEl      = document.querySelector('[data-nav]');
  const headline   = document.querySelector('[data-headline]');
  const heroSub    = document.querySelector('[data-reveal-sub]');
  const heroCtas   = document.querySelector('[data-reveal-ctas]');
  const heroTrust  = document.querySelector('[data-reveal-trust]');
  const scrollHint = document.querySelector('[data-reveal-scroll]');
  const prenote    = document.querySelector('[data-prenote]');
  const video         = document.querySelector('[data-hero-video]');
  const nextVideoEl   = document.querySelector('[data-next-video]');
  const aboutVideoEl  = document.querySelector('.about-bg-video');
  const aboutInnerEl  = document.querySelector('[data-about-inner]');
  const lastSectionEl = document.querySelector('[data-last]');
  const lastVideoEl   = document.querySelector('[data-last-video]');
  const lastInnerEl   = document.querySelector('[data-last-inner]');

  if (!hero || !video || !curtain || !flash || !vignette || !navPill || !headline) {
    console.error('[AllOutGames] Missing required hero nodes.');
    showContentWithoutAnimation();
    return;
  }
  if (!prenote) {
    console.warn('[AllOutGames] No [data-prenote] element — cascade choreography skipped.');
  }

  removeLoadingIndicator();

  // Initial lockdown (everything hidden, nav pointer-events off).
  // The scrub-tl starts at tl.time=0 (paused) which IS this lockdown
  // state. As the user scrolls, ScrollTrigger scrubs the tl forward and
  // each tween lifts its target out of the lockdown.
  gsap.set(curtain,     { autoAlpha: 1, scale: 1.02 });
  gsap.set(flash,       { autoAlpha: 0, scale: 1.1 });
  gsap.set(navEl,       { autoAlpha: 0, yPercent: -120, scale: 0.94 });
  gsap.set(heroSub,     { autoAlpha: 0, y: 24 });
  gsap.set(heroCtas,    { autoAlpha: 0, y: 22 });
  gsap.set(heroTrust,   { autoAlpha: 0, y: 16 });
  gsap.set(scrollHint,  { autoAlpha: 0.6, y: 0 });
  if (prenote) {
    gsap.set(prenote, { autoAlpha: 1 });
    /* W1 ("All out games.") starts visible-settled so the brand is
       on the page from the very first paint (user requested this).
       W2-W4 are parked at the same x/y (the cascade's left-middle
       anchor) but pre-blurred/off-stage so when their IN tween runs,
       they cross-dissolve INTO PLACE — no off-screen slide, just an
       opacity-ramp with a hint of scale + letter-spacing. The FROM
       values here MATCH the CASCADE table's FROM in initScrubTimeline
       so there is no flicker at the tween-start moment. */
    const w1 = prenote.querySelector('[data-prenote-word="all-out"]');
    if (w1) gsap.set(w1, {
      autoAlpha: 1, x: 0, y: 0, scale: 1, rotateY: 0,
      letterSpacing: '0.015em', filter: 'blur(0px)', force3D: true
    });
    prenote
      .querySelectorAll('[data-prenote-word]:not([data-prenote-word="all-out"])')
      .forEach(w => gsap.set(w, {
        autoAlpha: 0, x: 0, y: 0, scale: 0.92, rotateY: 0,
        letterSpacing: '0.06em', filter: 'blur(18px)', force3D: true
      }));
  }

  /* ─────────────────────────────────────────────────────────────
     3.  SplitText on the headline
     ────────────────────────────────────────────────────────── */
  let splitHeadline = null;
  if (hasSplitText) {
    try {
      splitHeadline = SplitText.create(headline.querySelectorAll('[data-hero-line]'), {
        type: 'chars, words',
        charsClass: 'hl-char',
        wordsClass: 'hl-word'
      });
    } catch (e) {
      console.warn('[AllOutGames] SplitText failed — animating as blocks.', e);
    }
  }

  if (splitHeadline) {
    gsap.set(splitHeadline.chars, {
      autoAlpha: 0,
      yPercent: 110,
      rotateX: -32,
      transformOrigin: '50% 100%'
    });
    gsap.set(splitHeadline.words, { autoAlpha: 1 });
  } else {
    gsap.set(headline, { autoAlpha: 0, y: 60 });
  }
  gsap.set('.hero-headline .line', { clipPath: 'inset(0% 100% 0% 0%)' });

  /* ─────────────────────────────────────────────────────────────
     4.  Single scroll-driven timeline
         scrub-tl contains every reveal (cascade + ignition + outro)
         so animation runs strictly in lockstep with user scroll.
         No auto-play on load: scrub-tl starts paused at tl.time = 0
         (the lockdown state). User must scroll to advance.
     ────────────────────────────────────────────────────────── */
  const IGNITION_TIME = 4.0;

  // Single source of truth for the hero pin-distance in pixels.
  // Used by BOTH the main hero scrub-tl `end` AND the next-video
  // rise ST's start/end (added below).
  // BUMPED 7.5 → 9.5 vh (floor 3000 → 3500) — paired with the per-tween
  // duration / stagger extension in Phase 2 below. Two compounding
  // slowdowns: tl.duration grew ≈7.0 → ≈11.0 s AND pinRange grew
  // ≈6000 → ≈7600 px on an 800 px-tall viewport. Each tl-second now
  // scrubs across FEWER pixels of scroll (≈ 690 px/s-tl vs ≈ 855 px/s-tl
  // previously) → individual tweens play out over more scroll → the
  // wall-clock pacing reads ~20-25% slower per scroll position.
  // Addresses the user's "hero elements fade in too fast" complaint
  // without re-introducing "hero stays too short" (next-video
  // RISE_BAND_PX stays 1.30 vh so the rise is still the last ~14% of
  // the pin range). On a 800 px tall viewport: heroPinRange ≈ 7600 px
  // (was 6000 px).
  const heroPinRange = () => {
    const mobile = window.innerWidth < 880;
    const mult = mobile ? 5.0 : 9.5;
    const floor = mobile ? 2000 : 3500;
    return Math.max(floor, Math.round(window.innerHeight * mult));
  };

  /* ─────────────────────────────────────────────────────────────
     4a. RATE-SCALED HERO PLAYBACK (replaces the old `currentTime`
          seek-scrub).

     Reads window.scrollY deltas, computes a velocity (px/ms), and
     writes `video.playbackRate = rate` each tick. The video plays
     continuously from the moment the user first scrolls; the only
     per-frame work the scroll handler does is set the playbackRate
     (a GPU-composited property, cheap). Playback never re-seeks to
     a new currentTime → no seek-decode lag → no choppiness.

    Mapping (signed — direction matters):
      vy >  3.0 px/ms  →  rate = 3.0           (hard cap)
      vy ∈ (0, 3.0]    →  rate = vy            (linear)
      vy ≤  0          →  rate = 0             (freeze)
    Forward scroll drives the video forward at proportional speed;
    backward scroll or standing still FREEZES the video at the
    current frame (no rewind — rewinding would re-introduce the
    seek-decode lag we just removed).
    At ~0.5 px/ms (slow continuous scroll) rate ≈ 0.5× (slow-mo
    playback). At ~1.0 px/ms (moderate scroll) rate ≈ 1.0×
    (real-time). At fast flick (3+ px/ms) rate caps at 3.0×.

    Smoothed via gsap.quickTo (180 ms ease-out) so the rate ramps
    in instead of jumping — keeps the playbackSpeed natural
    during micro-velocity jitter (touch wheels, trackpad inertia).

    Gating:
      · video.play() fires EXACTLY ONCE on the first non-zero
        |velocity| tick — never autoplays on load (muted+playsinline
        would let it, but we want frame-0 frozen until the user
        signals intent to scrub). |velocity| (not signed vy) is
        used for the play-gate so a first scroll-UP also counts as
        user intent — the video still gets the play()-kick (rate
        will be 0 anyway, so no frame advances).
      · End-of-video clamp: if the video hits its final 0.15 s,
        rate is forced to 0 and we pause(). The user can still
        scroll backward / re-enter the hero and the video stays
        frozen on last frame.
      · The loop ONLY runs in non-reduced-motion paths (it is
        called from build(), not from the prefers-reduced boot
        branch). For reduced-motion users, the video stays paused
        at currentTime=0 forever — no playback, no animation.
     ────────────────────────────────────────────────────────── */
  function setupHeroVelocityPlayback() {
    if (!video) return;
    try { video.pause(); video.currentTime = 0; } catch (_) {}

    let prevY = window.scrollY || window.pageYOffset || 0;
    let prevT = performance.now();
    let started = false;
    let lastRateWrite = 0;
    let pendingRate = 0;
    const RATE_MIN = 0.0625;
    const PLAY_GATE_VY = 0.05;
    const RATE_THROTTLE_MS = 32; // ~30fps cap on playbackRate writes
    // Mobile touch scrolling produces lower px/ms velocities than desktop
    // trackpad/mouse. Boost the mapped rate so the video keeps pace.
    const isMobile = () => window.innerWidth < 880;
    const RATE_CAP = () => isMobile() ? 5.0 : 3.0;
    const VY_MULT = () => isMobile() ? 3.0 : 1.0;

    function flushRate() {
      try { video.playbackRate = pendingRate; } catch (_) {}
      lastRateWrite = performance.now();
    }

    function tick() {
      const now = performance.now();
      const sy  = window.scrollY || window.pageYOffset || 0;
      const dt  = Math.max(now - prevT, 1);
      const vy  = (sy - prevY) / dt;
      prevY = sy; prevT = now;

      const absVy = Math.abs(vy);

      // When scrolled back to top, reset to first frame and freeze.
      if (sy < 10) {
        try { video.pause(); video.currentTime = 0; } catch (_) {}
        pendingRate = 0;
        flushRate();
        started = false;
        return;
      }

      // First user-scroll gate — kick off playback exactly once.
      if (!started && absVy > PLAY_GATE_VY) {
        started = true;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
      }

      // Forward scroll only — rate = velocity × multiplier, backward freezes.
      const boosted = vy * VY_MULT();
      const rawRate = (boosted > 0) ? Math.min(boosted, RATE_CAP()) : 0;
      pendingRate = (rawRate > 0 && rawRate < RATE_MIN) ? 0 : rawRate;

      // Throttle playbackRate writes — on mobile, each write forces the
      // decode pipeline to recalculate. Capping at ~30fps keeps the
      // visual smooth while cutting the decode thrash in half.
      if (now - lastRateWrite >= RATE_THROTTLE_MS) {
        flushRate();
      }
    }

    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', () => {
      prevY = window.scrollY || window.pageYOffset || 0;
      prevT = performance.now();
    }, { passive: true });
  }

  function initScrubTimeline(dur) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
    /* Scroll-end is 7.5×viewport-height (≈ 7500 px on a 1000 px tall
       screen, ≈ 6000 px on 800 px). This makes the scrub feel
       noticeably slower than the previous 6.0×viewport range and
       keeps the hero "staying" longer before the 2nd section's
       rise band begins. Floor of 3000 keeps very short viewports
       from collapsing into an unscrubbable animation. The user
       asked for "the hero doesn't stay long enough before the 2nd
       section comes in" → this end delivers ~25% more scroll-time
       per tl-second AND we tighten the next-video rise band (see
       updateRise(), RISE_BAND_PX 1.65→1.30vh below) so the hero gets
       ~42% more pure-hero scroll before the rise starts
       (4.35vh → 6.20vh of "hero fully present before transition"
       on a typical 800-px-tall viewport). */
        end: () => `+=${heroPinRange()}`,
        pin: hero,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.5,
        invalidateOnRefresh: true
      }
    });

    /* Phase 1 — Video playback is now RATE-SCALED by scroll velocity
       (NOT seek-scrubbed by `currentTime`). The setup happens in
       setupHeroVelocityPlayback() called from build() — this tl no
       longer writes video.currentTime per tick.

       Why the switch: every scrub tick used to set
       `video.currentTime = N` against a tl.time that ran 1:1 with
       scroll. At fast scroll the browser was asked to decode from
       arbitrary timestamps each tick → seek-decode lag that read
       as choppy playback ("video scroll play is a bit choppy").
       The rate-scaled model leaves the video playing continuously
       and only writes `video.playbackRate` (a cheap, GPU-friendly
       composited property) → no per-frame seek-decode, the video
       decodes frames continuously on its own decode thread.

       The scrub-tl structure is UNCHANGED — the cascade, ignition,
       and outro tweens all key off tl.time, which `scrub: 0.5` keeps
       in lockstep with scroll. Removing the Phase 1 currentTime
       tween does not affect a single one of them. */


    /* Phase 1.5 — Brand cascade (4 words, scroll-driven, non-overlapping).
       Each word fades IN from a different off-stage direction with a heavy
       3D snap (scale + rotateY + blur + wide letter-spacing collapse),
       holds for ~0.7 s of tl.time, then exits in an opposite-direction
       arc so the cascade feels directional and confident.

       Timing windows (so no two words share screen time):
         W1 ("All out games.") : IN 0.20→0.65 / OUT 1.40→1.80
         W2 ("Worlds.")        : IN 1.90→2.35 / OUT 3.10→3.50
         W3 ("Step inside.")   : IN 3.60→4.05 / OUT 4.40→4.80
         W4 ("The arena.")     : IN 5.20→5.65 / OUT 6.40→6.80
       Gaps of 0.10 s between consecutive OUT→IN. W3 lands exactly
       as the ignition (curtain lift) fires (4.0) and fades out as the
       headline splitText chars stagger in underneath. W4 lands during
       the post-ignition reveal tail (after sub/CTA/trust most-revealed)
       then fades into the outro. */

    if (prenote) {
      /* Cascade timing (tl.time units). Pure cross-dissolve in place:
         - W1 ("All out games.") is already visible-settled from the
           lockdown, so it has NO IN tween (only an OUT tween at 1.40).
           Adding an IN would flicker the word out then back in.
         - W2/W3 each have IN + OUT tweens, both fade IN PLACE
           (no x/y slide, only opacity/scale/blur/letterSpacing changes).
           User requested cross-dissolve "in the exact spot", not slide.
         - All tweens run at x:0, y:0, rotateY:0 so the words stay
           glued to the left-middle anchor (.hero-prenote grid).
         - 0.10 s gap between each word's OUT end and the next word's
           IN start keeps them sequentially crisp, never overlapping.

         Schedule (only 3 cascade words now — W4 ("The arena.") was
         removed by user request to keep the brand ladder tighter):
           W1 (already settled on load) : OUT 1.40 -> 1.80
           W2 ("Worlds.")                : IN  1.95 -> 2.45 / OUT 3.10 -> 3.50
           W3 ("Step inside.")           : IN  3.65 -> 4.15 / OUT 4.40 -> 4.80
         After W3 OUT ends at 4.80, the headline / sub / CTAs / trust
         stay visible for ~1.7 s of stable reading time before the
         outro fades chrome at tl.time ≈ 6.50.
      */
      /* TIGHTENED IN_DUR 0.65→0.40 / OUT_DUR 0.30→0.18. The user
         reported the cascade STEP INSIDE text's blur fade felt
         slow ("the effect takes too long"). The previous 0.65 of
         tl.time was visually a ~750 ms wall-clock ramp against
         a 9.5vh heroPinRange (~7600 px on 800-px-tall viewport);
         a snappier 0.40 (~470 ms) keeps the cross-dissolve
         character without dragging the eye through what reads
         as a glow-and-fade puff. */
      const CASCADE = [
        { key: 'all-out', outAt: 1.40 },
        { key: 'worlds',  inAt:  1.95, outAt: 3.35 },
        { key: 'step',    inAt:  3.65, outAt: 4.40 }
      ];
      const CASCADE_IN_DUR  = 0.40;
      const CASCADE_OUT_DUR = 0.18;

      for (const w of CASCADE) {
        const el = prenote.querySelector(`[data-prenote-word="${w.key}"]`);
        if (!el) continue;
        if (w.inAt !== undefined) {
          /* IN: subtle-blur-from same x/y to settled. The FROM state
             here MUST match the W2-W4 lockdown so there is no visual
             jump when the tween starts at scrub-tl.time === inAt. The
             settle value (scale 1, letterSpacing 0.015em) matches the
             static .hero-headline so W3 cross-dissolves cleanly into
             headline line 1 between 4.40 and 4.80. */
          /* ANTI-GLARE — peak blur amplitude 18px → 9px. The previous
             18 px start made the in-blur read as a heavy "puff"
             across the entire head — combined with the 48 px
             text-shadow halo baked into .prenote-word, the word
             looked more like a radiating flare than a cross-
             dissolving brand beat. Halving to 9 px keeps the
             "energy building" feel (still visibly fuzzy at the
             tween's start frame) but the resolved state at the
             settle point reads as crisp text rather than a
             glowing orb. Paired with the duration trim above
             (0.65 → 0.40) the cascade word doesn't sit on the
             user's eye long enough for the blur to feel slow. */
          tl.fromTo(el,
            { autoAlpha: 0, x: 0, y: 0, scale: 0.92,
              letterSpacing: '0.06em', filter: 'blur(9px)' },
            { autoAlpha: 1, x: 0, y: 0, scale: 1,
              letterSpacing: '0.015em', filter: 'blur(0px)',
              duration: CASCADE_IN_DUR, ease: 'expo.out', force3D: true },
            w.inAt
          );
        }
        /* OUT: fade out in place — slight expand + slight blur + a
           brush of letter-spacing on the way out. All motion at x:0,
           y:0 so the dissolve looks like the word losing energy
           while staying glued to the anchor point. */
        /* OUT peak blur amplitude 14px → 7px (matches the IN
           amplitude trim above). The OUT tween re-blurs as the
           word fades — same visual logic as the IN, just running
           in reverse. 7 px is enough to dissolve the letterforms
           without the previous 14 px reading as a heavy "glare
           puff" hanging on the user's eye for the full 0.30 of
           tl.time. */
        tl.to(el,
          { autoAlpha: 0, x: 0, y: 0, scale: 1.04,
            letterSpacing: '0.06em', filter: 'blur(7px)',
            duration: CASCADE_OUT_DUR, ease: 'expo.in', force3D: true },
          w.outAt
        );
      }
    }

    /* Phase 2 — Ignition reveal (fires at IGNITION_TIME, inside W3 hold).
       flash burst → curtain lift → nav drop → eyebrow pop → headline
       splitText + clipPath wipe → nav link stagger → sub lift → CTA
       parent reveal + per-button bouncy stagger + primary-CTA pulse →
       trust row parent reveal + per-item stagger.

       SLOWED (user-reported "all of the hero elements fade/animated
       in too fast"). Each per-tween duration is roughly DOUBLED and
       every stagger window is expanded; start times are pushed later
       so each element gets visible breathing room between its
       neighbours (no two reveals competing for the eye). The cascade
       now spans IGNITION_TIME → ≈7.6 of tl.time (was ≈5.7), and
       heroPinRange is bumped 7.5 → 9.5 vh so the same hero scroll
       distance scrubs across MORE tl.time → each fade is slower in
       wall-clock AND has more deliberate eased motion. outroStart
       floor is bumped IGN+2.5 → IGN+5.5 to give the longer cascade a
       generous post-reveal settled hold before the outro begins. */

    tl.to(flash, { autoAlpha: 0.85, scale: 1.2, duration: 0.30, ease: 'power2.out' }, IGNITION_TIME)
      .to(flash, { autoAlpha: 0, scale: 1.6, duration: 0.90, ease: 'expo.out' }, IGNITION_TIME + 0.30)
      .to(curtain, { autoAlpha: 0, scale: 1.04, duration: 1.10, ease: 'expo.out' }, IGNITION_TIME + 0.08)
      .to(vignette, { autoAlpha: 0.6, duration: 1.05, ease: 'power2.out' }, IGNITION_TIME + 0.14)
      .to(navEl, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 1.20, ease: 'expo.out' }, IGNITION_TIME + 0.22)

    /* TIGHTENED — STEP INSIDE char reveal. The user's complaint
       called out the headline "Step inside" line as a slow
       blur/glare (the chars lift-and-unblur one at a time inside
       a clipPath wipe). Per-char duration 1.50 → 0.85 (~43%
       faster) and stagger each 0.040 → 0.022 (~45% tighter)
       compresses the wall-clock reveal from ~1.86 of tl.time
       (9-char "Step inside" with the staggered ease-out tail)
       to ~1.04. Combined with the cascade trim above and the
       clipPath duration/stagger trim below, the total window
       "STEP INSIDE on screen" goes from ~3.45 of tl.time to
       ~1.95 (~44% shorter). Still readable, still directional,
       just no longer felt as "lingering". */
    if (splitHeadline) {
      tl.to(splitHeadline.chars, {
        autoAlpha: 1, yPercent: 0, rotateX: 0,
        duration: 0.85, ease: 'power4.out',
        stagger: { each: 0.022, from: 'start' }
      }, IGNITION_TIME + 1.10);
    } else {
      tl.to(headline, { autoAlpha: 1, y: 0, duration: 1.30, ease: 'power3.out' }, IGNITION_TIME + 1.10);
    }
    /* TIGHTENED — headline clipPath wipe. duration 1.30 → 0.75
       (~42% faster) and stagger 0.20 → 0.12 (~40% tighter).
       Each .hero-headline .line wipes its right-edge clipPath
       from 100% → 0% during the reveal; with two lines and the
       new 0.75 + 0.12 stagger the wipe completes at tl-time
       ≈ IGNITION_TIME + 1.10 + 0.75 + 0.12 = ~5.97, vs the
       previous ~6.50 (~530 ms sooner). The wipe remains a
       smooth expo.out — no character change, just pacing. */
    tl.to('.hero-headline .line', {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 0.75, ease: 'expo.out',
      stagger: 0.12
    }, IGNITION_TIME + 1.10);

    const navLinkItems = navEl.querySelectorAll('.nav-links a, .nav-cta');
    if (navLinkItems.length) {
      gsap.set(navLinkItems, { autoAlpha: 0, y: 6 });
      tl.to(navLinkItems, {
        autoAlpha: 1, y: 0,
        duration: 0.65, ease: 'power2.out',
        stagger: 0.10
      }, IGNITION_TIME + 0.78);
    }

    tl.to(heroSub, { autoAlpha: 1, y: 0, duration: 1.10, ease: 'power3.out' }, IGNITION_TIME + 1.55);

    /* CTAs: reveal the parent FIRST (the lockdown has heroCtas at
       autoAlpha:0), then per-button stagger inside so each pops in
       with a bouncy ease. The primary CTA also gets a one-shot
       attention pulse. */
    tl.to(heroCtas, { autoAlpha: 1, y: 0, duration: 0.65, ease: 'power2.out' }, IGNITION_TIME + 1.65);
    const ctaItems = heroCtas.querySelectorAll('.btn');
    if (ctaItems.length) {
      gsap.set(ctaItems, { autoAlpha: 0, y: 22, scale: 0.94 });
      tl.to(ctaItems, {
        autoAlpha: 1, y: 0, scale: 1,
        duration: 0.90, ease: 'back.out(1.5)',
        stagger: 0.18
      }, IGNITION_TIME + 1.72);

      const primaryCta = heroCtas.querySelector('.btn.primary');
      if (primaryCta) {
        tl.to(primaryCta, {
          scale: 1.07,
          duration: 0.55, yoyo: true, repeat: 1, ease: 'power2.inOut'
        }, IGNITION_TIME + 2.55);
      }
    }

    /* Trust row: reveal the parent FIRST, then per-item stagger. */
    tl.to(heroTrust, { autoAlpha: 1, y: 0, duration: 0.65, ease: 'power2.out' }, IGNITION_TIME + 1.85);
    const trustItems = heroTrust.querySelectorAll('li');
    if (trustItems.length) {
      gsap.set(trustItems, { autoAlpha: 0, y: 14, scale: 0.9 });
      tl.to(trustItems, {
        autoAlpha: 1, y: 0, scale: 1,
        duration: 0.90, ease: 'back.out(1.6)',
        stagger: 0.12
      }, IGNITION_TIME + 1.94);
    }

    /* Mark hero ignited AFTER both the nav pill has fully dropped in
       (navEl ends at IGNITION_TIME + 0.22 + 1.20 = +1.42) and the
       nav-link stagger tail has cleared (navLinkItems last item ends
       at IGNITION_TIME + 0.78 + 0.65 + (N-1)*0.10 ≈ +1.50–1.70).
       Pinning the flag at +1.70 keeps it strictly AFTER chrome has
       settled so any [data-ignited] CSS rule that lerps opacity /
       blur / scale — or any class hook listening for the flag —
       fires on a fully-stable nav, not mid-drop (which would read as
       a styling snap visible inside the nav-drop tail). The
       headline chars are still lifting in at +0.85→+2.35, which is
       fine — we want the flag to flip WHILE the headline is
       resolving, not wait for it. Use intro.call with explicit `null`
       scope so position lands in args[3], not as the contentious
       3rd arg interpreted as scope. */
    tl.call(() => {
      hero.setAttribute('data-ignited', 'true');
      navEl.setAttribute('data-revealed', 'true');
    }, [], null, IGNITION_TIME + 1.70);

    /* Phase 3 — Outro (chrome fade out near the end of the pin range).
       outroStart FLR BUMPED +2.5 → +5.5 so the slower Phase 2 cascade
       (now ending near tl.time ≈7.6) has a ≈1.8 s settled hold before
       the outro begins. dur−1.5 fallback still applies when the
       video is shorter than expected (≤ 6 s). */
    const outroStart = Math.max(IGNITION_TIME + 5.5, dur - 1.5);

    if (splitHeadline) {
      tl.to(splitHeadline.chars, { autoAlpha: 0, yPercent: -60, duration: 0.7, ease: 'power2.in', stagger: 0.012 }, outroStart);
    } else {
      tl.to(headline, { autoAlpha: 0, y: -40, duration: 0.7, ease: 'power2.in' }, outroStart);
    }
      tl.to(heroSub,    { autoAlpha: 0, y: -30, duration: 0.6, ease: 'power2.in' }, outroStart + 0.05)
      .to(heroCtas,   { autoAlpha: 0, y: -25, duration: 0.6, ease: 'power2.in' }, outroStart + 0.10)
      .to(heroTrust,  { autoAlpha: 0, y: -20, duration: 0.6, ease: 'power2.in' }, outroStart + 0.10)
      .to(navEl,      { autoAlpha: 0, yPercent: -120, duration: 0.75, ease: 'power2.inOut' }, outroStart)
      .to(scrollHint, { autoAlpha: 0, y: 20, duration: 0.6, ease: 'power2.in' }, outroStart);

    /* Phase 4 — implemented OUTSIDE this scrub-tl as a manual
       scroll-driven rise (see the `if (nextVideoEl)` block below,
       after the tl.time(0) park). Decoupled from the main tl so the
       portal video's currentTime scrub is never touched by the
       rise logic. */

    ScrollTrigger.refresh();

    /* Park scrub-tl at tl.time=0. That's the lockdown state — curtain up,
       video paused, content invisible. No on-load animation plays. User
       must scroll to advance the timeline. gsap.timeline() defaults to
       paused; the .time(0) alone locks us at the lockdown frame so ST
       doesn't sweep through tweens on its first update. */
    tl.time(0);

    /* ─────────────────────────────────────────────────────────────
       SEPARATE scrub-tl for the .next-video wipe-up rise.
       Bound to the SAME hero trigger but to the LAST RISE_PX of the
       pin range — so the rising video OVERLAPS the still-pinned hero
       chrome during its late outro, and visually REPLACES it on
       screen before the hero pin releases. Decoupling from the main
       hero scrub-tl means the portal video's currentTime scrub is
       never touched if this ST refreshes differently or scrubs at
       a different rate. The portal video scrub continues to run on
       the main tl; only the rise yPercent scrubs here.

       Playback (currentTime) is FULLY DECOUPLED from scroll — kicked
       off in section 9 the moment the browser has buffered enough
       (canplay / readyState≥3), at native rate, with `loop` not set
       so it plays once. By the time the rise begins the video is
       already mid-playback.
       ────────────────────────────────────────────────────────── */
    if (nextVideoEl) {
      // ─── Next-video wipe-up rise — DIRECT DOM, no GSAP in the loop ───
      //
      // Bypasses ScrollTrigger AND gsap.quickTo entirely for the rise.
      // Reads `window.pageYOffset` directly and writes `transform`
      // directly to the element's inline style. The math is
      // straight-forward: yPercent 100 → 0 across the LAST RISE_BAND_PX
      // of hero-pin scroll, overlapping the still-pinned hero chrome
      // during its late outro so the next-video visually REPLACES the
      // hero on the user's screen.
      //
      // Playback (currentTime) is FULLY DECOUPLED from scroll —
      // kicked off in section 9 on the canplay event so the video is
      // already mid-playback by the time the rise begins.

      // Rise-tied playback gate.
      let nextVideoStartedPlaying = false;

      function updateRise() {
        const pinDist = heroPinRange();
        // SHORTENED from 1.30vh → 0.90vh. The user said the 2nd section
        // rise is too slow and lingers at the end of the hero video.
        // A tighter band means the next-video pushes up over the hero
        // faster, reaching its settled position sooner.
        const RISE_BAND_PX = Math.round(window.innerHeight * 0.90);
        const sy = window.pageYOffset || document.documentElement.scrollTop || 0;
        const startSy = pinDist - RISE_BAND_PX;

        let yp;
        if (sy <= startSy) {
          yp = 100;
        } else if (sy >= pinDist) {
          yp = 0;
        } else {
          const t = (sy - startSy) / RISE_BAND_PX;
          yp = 100 * (1 - t);
        }

        // Direct DOM on .next-video. Uses the same `translate3d`
        // syntax GSAP writes. Inline style overrides the CSS
        // `transform: translateY(100%)` declared on .next-video.
        nextVideoEl.style.transform = `translate3d(0, ${yp}%, 0)`;

        // One-shot: start playback the moment the rise begins.
        if (!nextVideoStartedPlaying && sy >= startSy) {
          nextVideoStartedPlaying = true;
          try { nextVideoEl.currentTime = 0; } catch (_) {}
          const playPromise = nextVideoEl.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => {
              console.warn('[AllOutGames] next-video play() rejected:', err);
            });
          }
        }
      }

      // Coalesce scroll events to one read per RAF (mobile-friendly).
      let riseRafQueued = false;
      function scheduleRiseUpdate() {
        if (riseRafQueued) return;
        riseRafQueued = true;
        requestAnimationFrame(() => {
          riseRafQueued = false;
          updateRise();
        });
      }

      window.addEventListener('scroll', scheduleRiseUpdate, { passive: true });
      window.addEventListener('resize', updateRise, { passive: true });
      updateRise();  // initial sync (browser-restored scrollY, etc.)
    }

    // ─────────────────────────────────────────────────────────────
    //   NEW: About-inner wipe RIGHT→LEFT — runs WHILE the user
    //   scrolls through .next. aboutInnerEl is parked offscreen-right
    //   (translateX(100%) + position:fixed inline) while the user is
    //   above the rise-band, then animates right→left across the LAST
    //   RISE_BAND_PX of .next scroll (when the user is at the bottom
    //   of .next-inner / .next-worlds / .next-epk reading window),
    //   and UNSETS the inline fixed/transform once .next's bottom
    //   edge exits the viewport — so the about stage settles into
    //   normal flow inside .about (the user then keeps reading the
    //   about copy naturally).
    //
    //   This is the MIRROR of the existing .next-video bottom→top
    //   rise, rotated 90° to left. Same RISE_BAND_PX band, same
    //   direct-DOM pattern (window.pageYOffset → inline transform),
    //   same one-shot gates (video play + completion snap).
    // ─────────────────────────────────────────────────────────────
    const nextSectionEl = document.querySelector('.next');

    if (aboutInnerEl && nextSectionEl) {
      // Rise-tied playback gate + rise-completion snap (mirrors the
      // nextVideoEl pattern above, on the X axis and tied to .next's
      // bottom edge instead of the hero pin end).
      let aboutVideoStartedPlaying = false;
      let aboutInnerSettled        = false;

      function updateAboutRise() {
        const sy           = window.pageYOffset || document.documentElement.scrollTop || 0;
        const nextRect     = nextSectionEl.getBoundingClientRect();
        const nextBottomSy = nextRect.bottom + sy;
        const RISE_BAND_PX = Math.round(window.innerHeight * 1.50);
        const startSy      = nextBottomSy - RISE_BAND_PX;

        // ─── .next-video BLEED SUPPRESSION (runs every tick) ──────
        if (nextVideoEl) {
          const FADE_BAND_PX = Math.round(window.innerHeight * 0.30);
          let fadeT;
          if (sy <= startSy) {
            fadeT = 0;
          } else if (sy >= startSy + FADE_BAND_PX) {
            fadeT = 1;
          } else {
            fadeT = (sy - startSy) / FADE_BAND_PX;
          }
          nextVideoEl.style.opacity = String(1 - fadeT);
        }

        // ─── EARLY RETURN ───────────────────────────────────────
        // Reset settled flag when scrolling back up past the start
        // so the video wipe reverses (slides back off-screen right).
        if (aboutInnerSettled && sy < startSy) {
          aboutInnerSettled = false;
          aboutVideoStartedPlaying = false;
          aboutVideoEl.pause();
          try { aboutVideoEl.currentTime = 0; } catch (_) {}
        }
        if (aboutInnerSettled) return;

        let progress;
        if (sy <= startSy) {
          progress = 0;
        } else if (sy >= nextBottomSy) {
          progress = 1;
        } else {
          progress = (sy - startSy) / RISE_BAND_PX;
        }

        // ─── VIDEO: horizontal wipe right→left ──────────────────
        // The background video slides in from off-screen right.
        // translateX goes from +100% (fully off-screen) to 0% (in place).
        const videoTx = (1 - progress) * 100;
        aboutVideoEl.style.transform = `translate3d(${videoTx}%, 0, 0)`;

        // ─── COPY: bottom-up entrance ───────────────────────────
        // The copy panel rises from below, starting AFTER the video
        // wipe is ~40% done. This creates the sequence:
        //   video slides in from right → copy rises from bottom.
        const copyDelay = 0.35; // copy starts at 35% of total progress
        const copyProgress = Math.max(0, Math.min(1, (progress - copyDelay) / (1 - copyDelay)));
        const startOffset = 80;
        const ty = (1 - copyProgress) * startOffset;
        aboutInnerEl.style.transform = `translate3d(0, ${ty}px, 0)`;
        aboutInnerEl.style.opacity = String(Math.min(1, copyProgress * 2.5));

        // Rise-start gate: start video playback the moment the
        // about section begins entering.
        if (aboutVideoEl && !aboutVideoStartedPlaying && sy >= startSy) {
          aboutVideoStartedPlaying = true;
          try { aboutVideoEl.currentTime = 0; } catch (_) {}
          const playPromise = aboutVideoEl.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => {
              console.warn('[AllOutGames] about-video play() rejected:', err);
            });
          }
        }

        // Rise-completion snap
        if (!aboutInnerSettled && sy >= nextBottomSy) {
          aboutInnerSettled = true;
          aboutVideoEl.style.transform  = '';
          aboutInnerEl.style.transform = '';
          aboutInnerEl.style.opacity   = '';
          aboutInnerEl.style.position  = '';
          aboutInnerEl.style.top       = '';
          aboutInnerEl.style.left      = '';
          aboutInnerEl.style.height    = '';
        }
      }

      // Coalesce scroll events to one read per RAF (mobile-friendly).
      let aboutRiseRafQueued = false;
      function scheduleAboutRiseUpdate() {
        if (aboutRiseRafQueued) return;
        aboutRiseRafQueued = true;
        requestAnimationFrame(() => {
          aboutRiseRafQueued = false;
          updateAboutRise();
        });
      }

      window.addEventListener('scroll', scheduleAboutRiseUpdate, { passive: true });
      window.addEventListener('resize', updateAboutRise, { passive: true });
      // Initial sync (handles browser-restored scrollY, font load
      // reflow margin shifts, etc.).
      updateAboutRise();

      // No pre-paint park needed — .about-inner's CSS
      // (position: sticky; top: 0) handles pinning. The bottom-up
      // entrance is driven entirely by updateAboutRise()'s
      // translateY + opacity writes once the user scrolls into
      // the about section.
    }

    return tl;
  }

  /* ─────────────────────────────────────────────────────────────
     5.  Boot
     ────────────────────────────────────────────────────────── */
  if (prefersReduced()) {
    gsap.set([curtain, flash, navEl, heroSub, heroCtas, heroTrust, scrollHint,
             splitHeadline && splitHeadline.chars ? splitHeadline.chars : headline,
             headline].filter(Boolean), { clearProps: 'visibility' });
    gsap.set(navEl, { autoAlpha: 1, yPercent: 0, scale: 1 });
    gsap.set([heroSub, heroCtas, heroTrust, scrollHint], { autoAlpha: 1, y: 0 });
    if (prenote) {
      gsap.set(prenote, { autoAlpha: 0 });
      prenote.querySelectorAll('[data-prenote-word]').forEach(w => {
        gsap.set(w, { autoAlpha: 0, clearProps: 'transform,filter,letterSpacing' });
      });
    }
    if (splitHeadline) gsap.set(splitHeadline.chars, { autoAlpha: 1, yPercent: 0, rotateX: 0 });
    else gsap.set(headline, { autoAlpha: 1, y: 0 });
    gsap.set('.hero-headline .line', { clearProps: 'clipPath' });
    gsap.set(curtain, { autoAlpha: 0 });
    gsap.set(navEl.querySelectorAll('.nav-links a, .nav-cta'), { autoAlpha: 1, y: 0 });
    gsap.set(heroCtas.querySelectorAll('.btn'), { autoAlpha: 1, y: 0, scale: 1 });
    gsap.set(heroTrust.querySelectorAll('li'), { autoAlpha: 1, y: 0, scale: 1 });
    gsap.set(video, { currentTime: 0 });
    hero.setAttribute('data-ignited', 'true');
    navEl.setAttribute('data-revealed', 'true');

    /* Minimal scrub-tl so user scrolling is still wired up. End range
       matches the main scrub-tl so the slow-scroll feel is consistent
       regardless of prefers-reduced-motion preference. */
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => `+=${heroPinRange()}`,
        pin: hero, pinSpacing: true, scrub: 0.5, invalidateOnRefresh: true
      }
    });
    tl.time(0);
    setupNextScrollBeats();  // pins are scroll-progress controls, not animation
  } else {
    video.pause();
    video.currentTime = 0;

    let tempPin = null;
    let built = false;

    function build() {
      if (built) return;
      built = true;
      if (tempPin) { tempPin.kill(); tempPin = null; }
      const dur = (Number.isFinite(video.duration) && video.duration > 0) ? video.duration : 8;
      initScrubTimeline(dur);
      setupHeroVelocityPlayback();   // rate-scaled playback (replaces seek-scrub)
      setupNextScrollBeats();        // pins AFTER hero pin spacer exists
    }

    video.addEventListener('error', () => {
      console.warn('[AllOutGames] Video failed to load. Using fallback duration.');
      if (!built) build();
    }, { once: true });

    if (!video.src || video.src === window.location.href) {
      console.warn('[AllOutGames] Video source invalid. Using fallback duration.');
      if (!built) build();
    } else if (video.readyState >= 1) {
      build();
    } else {
      tempPin = ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: '+=3600',
        pin: true,
        pinSpacing: true
      });
      video.addEventListener('loadedmetadata', () => {
        build();
      }, { once: true });
      setTimeout(() => {
        if (!built) {
          console.warn('[AllOutGames] Video metadata timeout — using fallback duration.');
          build();
        }
      }, 4000);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     5b. Next-section scroll-beat pins — narrative dwell moments
     at the two anchors the user explicitly requested:
       · "REAL WORLDS. / FUELED BOLD." + the 3-stat ledger
       · the 3 world cards (RELIC RUN / STELLAR DRIFT / CONSTELLATION)
     Each anchor is wrapped in a ScrollTrigger pin so the user
     must ACTIVELY scroll through a band of viewport-height
     scroll before the section advances past the anchor. Pure
     min-height bumps + slow CSS transitions have already been
     pushed twice (380→500→700vh) and the user still reported
     "still way too fast" — the underlying problem is that even
     a 700vh band with 1.55-2.20 s transitions has no FORCED
     dwell at the beats; fast scrolling glides across them.
     ScrollTrigger.pin + pinSpacing:true adds a "must-scroll"
     spacer after the pinned element, so each beat consumes a
     known amount of additional scroll distance that the user
     cannot bypass. The pins compose with — not against — the
     existing CSS IntersectionObserver reveals:

       · .next-inner IO (threshold 0.01): fires at section-entry,
         i.e. BEFORE the pin engages. By the time the user scrolls
         into the headline pin zone, the CSS clip-path wipe +
         sub fade-up + accent dash + stats stagger have all
         PLAYED to completion. The pin then holds the STATIC,
         fully-revealed group in place while the eye absorbs.

       · .next-worlds IO (threshold 0.30): fires close enough to
         pin start ('top 35%') that the 2.20 s clip-path wipe +
         1.45 s stagger on the last card runs DURING the pin's
         first half. Cards visibly wipe IN as the user scrolls
         the pin band — a cinematic reveal pinned in place.

     Reduced-motion users still get the pins — they're scroll-
     progress controls, not animation. They give reduced-motion
     users the same deliberate dwell moments without the flashy
     CSS transitions competing for attention.
     ────────────────────────────────────────────────────────── */
  function setupNextScrollBeats() {
    const innerEl = document.querySelector('.next-inner');
    if (innerEl) {
      ScrollTrigger.create({
        trigger: innerEl,
        // PUSHED 'top 30%' → 'top top' (semantic ≡ 'top 0%'). The
        // user reported the previous engagement fired "too soon" —
        // by the time they'd scrolled the headline group up to
        // its natural reading position (eyebrow at viewport-top,
        // stats row below, headline centered, sub lower-third),
        // they'd already burned ~240 px of the old dwell band. The
        // pin was active BEFORE they reached the composed view.
        // 'top top' matches the screenshot exactly: pin engages
        // when .next-inner top reaches viewport-top = the same
        // scroll position as the user's screenshot. House style:
        // the hero scrub-tl (initScrubTimeline) also uses
        // 'top top' for the canonical viewport-aligned zero offset.
        // The .next-inner IO reveal (Qt §10) fires at section
        // entry, so the CSS clip-path wipe + per-line stagger +
        // accent-dash scale-in all settle into their static
        // "shown" state well before this pin engages.
        start: 'top top',
        // BUMPED 1.30 → 1.80 vh. With engagement pushed later in
        // scroll, the dwell needs more space to absorb the user.
        // ~1.44 s of forced dwell at 1000 px/s on 800 vp — enough
        // to read the eyebrow + 3 stats + headline + sub + accent
        // without rushing. Pin 1 + Pin 2 ≈ 5.00 vh pinned inside
        // .next's 700 vh min-height; ~695 vh residual for the
        // bottom epk pill + scroll-through.
        end: () => {
          const m = window.innerWidth < 880 ? 1.4 : 3.20;
          return '+=' + Math.round(window.innerHeight * m);
        },
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      });
    }

    const worldsEl = document.querySelector('.next-worlds-wrap');
    // Pin 2 disabled on mobile — GSAP's pin injects inline position:left
    // that breaks the CSS centering chain. Without the pin, cards scroll
    // naturally and the flex + margin:auto centering works correctly.
    if (worldsEl && window.innerWidth >= 880) {
      ScrollTrigger.create({
        trigger: worldsEl,
        start: 'top 20%',
        end: () => '+=' + Math.round(window.innerHeight * 1.80),
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      });
    }
  }

  /* ─────────────────────────────────────────────────────────────
     6.  Magnetic pull on the primary CTA
     ────────────────────────────────────────────────────────── */
  if (!prefersReduced()) {
    const primary = heroCtas && heroCtas.querySelector('.btn.primary');
    if (primary) {
      const xTo = gsap.quickTo(primary, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(primary, 'y', { duration: 0.6, ease: 'power3.out' });
      let rafActive = false;
      primary.addEventListener('mousemove', (e) => {
        if (rafActive) return;
        rafActive = true;
        requestAnimationFrame(() => {
          const r = primary.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.18);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.22);
          rafActive = false;
        });
      }, { passive: true });
      primary.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    }
  }

  /* ─────────────────────────────────────────────────────────────
     7.  Refresh after font load (positions depend on line wrapping).
     ────────────────────────────────────────────────────────── */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    }).catch(() => {});
  }

  /* ─────────────────────────────────────────────────────────────
     8.  Mobile nav drawer toggle
     ────────────────────────────────────────────────────────── */
  const navToggle  = document.querySelector('[data-nav-toggle]');
  const navDrawer  = document.querySelector('[data-nav-drawer]');
  let menuResumeTimer = null;
    if (navToggle && navDrawer) {
      const setOpen = (open) => {
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        navToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
        navDrawer.classList.toggle('is-open', open);
        // Pause hero video while menu is open and for a short beat
        // after closing so the scrub doesn't jump back in immediately.
        if (video) {
          try {
            if (open) {
              clearTimeout(menuResumeTimer);
              video.pause();
            } else {
              menuResumeTimer = setTimeout(() => {
                try { video.play().catch(() => {}); } catch (_) {}
              }, 800);
            }
          } catch (_) {}
        }
      };
      navToggle.addEventListener('click', () => {
        setOpen(navToggle.getAttribute('aria-expanded') !== 'true');
      });
      navDrawer.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => setOpen(false));
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
          setOpen(false);
          navToggle.focus();
        }
      });
    }  /* ─────────────────────────────────────────────────────────────
     9.  Next-section background video (her.mp4) — wipe-up reveal

     The .next-video is `position:fixed; inset:0` and starts hidden
     BELOW the viewport (yPercent 100). It rises UP over the hero
     during the LATE portion of the hero scrub-tl, OVERLAPPING the
     still-visible hero chrome on screen, visually REPLACING it as
     a bottom-up wipe.

     Playback is FULLY DECOUPLED from scroll. The video kicks off
     the moment the browser has buffered enough (canplay /
     readyState >= 3), at slow-mo 0.85× rate (cinematic), NO loop,
     NO currentTime scrub. Muted so autoplay is permitted
     everywhere. By the time the rise begins (tl.time ≈ 6.0), a
     fragment of her.mp4 has already played forward.

     Reduced-motion path: .next-video sits at yPercent 0 (visible)
     as a static .next background from page load. No rise
     animation; immediate autoplay.
     ────────────────────────────────────────────────────────── */
  if (nextVideoEl) {
    if (prefersReduced()) {
      gsap.set(nextVideoEl, { yPercent: 0, clearProps: 'transform' });
      nextVideoEl.muted = true;
      const playPromise = nextVideoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          console.warn('[AllOutGames] next-video autoplay rejected:', err);
        });
      }
    } else {
      gsap.set(nextVideoEl, { yPercent: 100 });
      nextVideoEl.muted = true;

      // Pause + currentTime=0 on init so the video is FROZEN at frame 0.
      // Playback is GATED to the rise-start moment inside updateRise()
      // (see the scroll listener at the end of section 4) — so the
      // user sees her.mp4 footage PLAY as it rises INTO view, not a
      // frozen final frame from spontaneous autoplay.
      nextVideoEl.pause();
      try { nextVideoEl.currentTime = 0; } catch (_) {}

      // Cinematic slow-mo (0.85×). The wipe-up rise takes ~1.375×vh
      // of scroll to complete — on rapid cursor-throw scrolls that's
      // < 2 s of visible-footage overlap at native rate. Slowing to
      // 0.85× stretches the played-back footage to ≈ 2.5–3 s of
      // overlap, giving the her.mp4 narrative room to breathe before
      // the user arrives at the .next section.
      nextVideoEl.playbackRate = 0.85;

      // Reset-to-0 + re-apply playbackRate on canplay as a safety.
      nextVideoEl.addEventListener('canplay', () => {
        try { nextVideoEl.currentTime = 0; } catch (_) {}
        nextVideoEl.playbackRate = 0.85;
      }, { once: true });
    }
  }

  // ─────────────────────────────────────────────────────────────
  //   About-section background video setup (3rd section).
  //
  //   woman.mp4 plays LOOPED muted autoplay. Playback is GATED
  //   to the about-wipe START moment via updateAboutRise() above
  //   (sy crosses nextBottomSy − RISE_BAND_PX → `.play()`), so the
  //   user sees the footage PLAY as the stage wipes in from the
  //   right, never a frozen frame.
  //
  //   Reduced-motion path: about-inner keeps its normal-flow
  //   position (no wipe), data-revealed flips immediately so the
  //   entrance CSS runs as a single state change, and the video
  //   autoplays on canplay so non-scroll users see the footage too.
  // ──────────────────────────────────────────────────────────
  if (aboutVideoEl) {
    aboutVideoEl.muted = true;
    aboutVideoEl.pause();
    try { aboutVideoEl.currentTime = 0; } catch (_) {}

    // Reset-to-0 on canplay safety (one-shot).
    aboutVideoEl.addEventListener('canplay', () => {
      try { aboutVideoEl.currentTime = 0; } catch (_) {}
    }, { once: true });
  }

  if (aboutInnerEl && prefersReduced()) {
    // Clear all inline styles set by the entrance animations
    // and let the static CSS rules take over immediately.
    gsap.set(aboutInnerEl, { clearProps: 'transform,opacity,position,top,left,width,height' });
    if (aboutVideoEl) aboutVideoEl.style.transform = '';
  }

  /* ─────────────────────────────────────────────────────────────
     10. Next-section copy reveal

     Adds `data-revealed="true"` to .next-inner the moment ANY part of
     the .next section intersects the viewport (i.e. when the rise is
     completing — scrollY ≈ pinDist). Once it fires, the observer is
     DISCONNECTED so the entrance animation plays exactly ONCE and the
     new headline/sub/accent stay visible throughout the rest of the
     .next scroll. This guarantees:
       • eyebrow fades up
       • "Real worlds." + "Fueled bold." clipPath-wipe left→right
       • sub copy fades up
       • cyan accent dash scales in centered, then settles into a
         very slow opacity breathe
     …and never "scrolls away again".

     prefers-reduced-motion: the CSS @media rule kills the breathe
     animation, and the entrance transitions remain (they read as a
     single state-change to "shown", not motion).
     ────────────────────────────────────────────────────────── */
  const nextInnerEl  = document.querySelector('[data-next-inner]');
  const nextSectionElForObserver = document.querySelector('.next');
  if (nextInnerEl && nextSectionElForObserver && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          nextInnerEl.setAttribute('data-revealed', 'true');
        } else {
          nextInnerEl.removeAttribute('data-revealed');
        }
      }
    }, {
      threshold: 0.01,
      rootMargin: '0px 0px -10% 0px'
    });
    revealObserver.observe(nextSectionElForObserver);
  } else if (nextInnerEl) {
    // No IO support (very old browser) — flip the flag immediately.
    nextInnerEl.setAttribute('data-revealed', 'true');
  }

  /* ─────────────────────────────────────────────────────────────
     10b. Next-section DEEPER layers — per-element IO reveal

     Each [data-next-reveal-deep] element (world list, EPK pill)
     sits OUTSIDE .next-inner in normal flow so the user scrolls
     them into view AFTER the headline has settled. We fire a FRESH
     IntersectionObserver per element so they reveal independently
     as the user continues scrolling deeper into the .next section.
     Each observer disconnects after firing once.
     ────────────────────────────────────────────────────────── */
  const deepEls = Array.from(document.querySelectorAll('[data-next-reveal-deep]'));
  if (deepEls.length) {
    if ('IntersectionObserver' in window) {
      deepEls.forEach((el) => {
        const observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.setAttribute('data-deep-revealed', 'true');
            } else {
              entry.target.removeAttribute('data-deep-revealed');
            }
          }
        }, {
          threshold: 0.01,
          rootMargin: '0px'
        });
        observer.observe(el);
      });
    } else {
      // No IO support — flip the flag immediately.
      deepEls.forEach((el) => el.setAttribute('data-deep-revealed', 'true'));
    }
  }

  /* ─────────────────────────────────────────────────────────────
     10c. (NEW) About-section copy & video-frame reveal

     No extra IntersectionObserver is needed — the reveal is driven
     internally from updateAboutRise() the moment sy crosses
     nextBottomSy (wipe completes). At that instant the inline
     position:fixed + transform are unset (so .about-inner returns
     to normal CSS flow inside .about) AND data-revealed="true"
     flips, which triggers the SAME sequenced CSS reveal as
     .next-inner: eyebrow fade-up → headline line 1 wipe →
     headline line 2 wipe → sub copy fade-up → meta list fade-up →
     video frame fade-up.

     prefers-reduced-motion: the aboutInnerEl branch in section 9
     sets data-revealed="true" right away so the entrance
     transitions read as a single state change.
     ────────────────────────────────────────────────────────── */

  /* ─────────────────────────────────────────────────────────────
     11.  LAST section — crossfade in OVER .about

     .last is position:fixed + visibility:hidden (zero DOM flow
     impact). A scroll listener checks when .about's bottom edge
     reaches the viewport top — at that point the crossfade runs:
     .about fades out while .last fades in (video + copy). No
     pinning, no extra scroll space.

     prefers-reduced-motion: show .last immediately.
     ────────────────────────────────────────────────────────── */
  if (lastSectionEl && lastVideoEl && lastInnerEl) {
    lastVideoEl.muted = true;

    if (prefersReduced()) {
      lastSectionEl.style.visibility = 'visible';
      gsap.set(lastVideoEl, { opacity: 1 });
      gsap.set(lastInnerEl, { opacity: 1, y: 0, clearProps: 'transform' });
      const playPromise = lastVideoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    } else {
      lastVideoEl.pause();
      try { lastVideoEl.currentTime = 0; } catch (_) {}

      const aboutEl = document.querySelector('.about');
      if (!aboutEl) return;

      let crossfaded = false;
      let reversed = false;
      const CROSSFADE_WINDOW = window.innerHeight * 0.4;

      function checkCrossfade() {
        const sy = window.pageYOffset || document.documentElement.scrollTop || 0;
        const aboutRect = aboutEl.getBoundingClientRect();
        const aboutBottom = aboutRect.bottom + sy;
        const triggerSy = aboutBottom - window.innerHeight;

        if (sy >= triggerSy && !crossfaded) {
          crossfaded = true;
          reversed = false;
          lastSectionEl.style.visibility = 'visible';
          try { lastVideoEl.currentTime = 0; } catch (_) {}
          lastVideoEl.play().catch(() => {});

          gsap.to(lastVideoEl, { opacity: 1, duration: 0.6, ease: 'power2.inOut' });
          gsap.to(aboutEl, { opacity: 0, duration: 0.6, ease: 'power2.inOut' });
          gsap.to(lastInnerEl, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.05 });
        }

        if (sy < triggerSy - CROSSFADE_WINDOW && crossfaded && !reversed) {
          reversed = true;
          crossfaded = false;
          gsap.to(lastInnerEl, { opacity: 0, y: 40, duration: 0.4, ease: 'power2.in' });
          gsap.to(lastVideoEl, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => {
            lastSectionEl.style.visibility = 'hidden';
            lastVideoEl.pause();
            try { lastVideoEl.currentTime = 0; } catch (_) {}
          }});
          gsap.to(aboutEl, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.1 });
        }
      }

      window.addEventListener('scroll', checkCrossfade, { passive: true });
    }
  }
})();
