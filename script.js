/* =============================================================
   SS Industries — scroll-driven 450-frame cinematic sequence
   Vanilla JS: batched preloading → sticky canvas → site UI
   ============================================================= */

(function () {
    'use strict';

    /* ------------------------------ Config ------------------------------ */

    var TOTAL_FRAMES = 450;
    var CRITICAL_SPAN = 40;   // frames 1..40 always preloaded before reveal
    var CRITICAL_STEP = 30;   // + every 30th frame as a scroll safety net
    var CONCURRENCY = 6;      // parallel image requests

    var STATE = { QUEUED: 0, LOADING: 1, READY: 2, FAILED: 3 };

    var store = new Array(TOTAL_FRAMES + 1);
    var images = new Array(TOTAL_FRAMES + 1);
    for (var s = 0; s <= TOTAL_FRAMES; s++) { store[s] = STATE.QUEUED; images[s] = null; }

    var phase = 'critical';            // 'critical' -> 'background' -> 'done'
    var priorityFrame = 1;             // loader prioritises frames near this index

    /* ------------------------------ Helpers ----------------------------- */

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    function pad4(n) {
        n = String(n);
        while (n.length < 4) { n = '0' + n; }
        return n;
    }

    function frameSrc(i) { return 'CED_frames/frame_' + pad4(i) + '.png'; }

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

    /* --------------------------- DOM references ------------------------- */

    var preloader = $('#preloader');
    var loadPct = $('#loadPct');
    var loadBar = $('#loadBar');
    var loadStatus = $('#loadStatus');
    var assetChip = $('#assetChip');
    var assetPct = $('#assetPct');

    var stage = $('#stage');
    var sticky = $('.stage__sticky');
    var canvas = $('#seqCanvas');
    var ctx = canvas.getContext('2d', { alpha: false });

    var heroEl = $('#hero');
    var railFill = $('#railFill');
    var chapterLabel = $('#chapterLabel');

    var chapters = $$('.chapter').map(function (el) {
        var r = (el.dataset.range || '0,1').split(',');
        return { el: el, from: parseFloat(r[0]), to: parseFloat(r[1]), label: el.dataset.label || '' };
    });

    /* =========================== Image loading =========================== */

    function loadImage(i, done) {
        if (store[i] !== STATE.QUEUED) { done(); return; }
        store[i] = STATE.LOADING;
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () { store[i] = STATE.READY; images[i] = img; done(true); };
        img.onerror = function () { store[i] = STATE.FAILED; done(false); };
        img.src = frameSrc(i);
    }

    /* Runs a fixed-size queue with live progress callbacks. */
    function runQueue(queue, onProgress, onComplete) {
        var idx = 0, active = 0, finished = 0;
        var total = queue.length;
        if (!total) { onComplete(); return; }

        function pump() {
            while (active < CONCURRENCY && idx < queue.length) {
                (function (item) {
                    active++;
                    loadImage(item, function () {
                        active--;
                        finished++;
                        onProgress(finished / total, item);
                        if (finished >= total) { onComplete(); }
                        else { pump(); }
                    });
                })(queue[idx++]);
            }
        }
        pump();
    }

    function buildCriticalSet() {
        var set = [], i;
        for (i = 1; i <= CRITICAL_SPAN; i++) { set.push(i); }
        for (i = CRITICAL_SPAN + CRITICAL_STEP; i <= TOTAL_FRAMES; i += CRITICAL_STEP) { set.push(i); }
        if (set[set.length - 1] !== TOTAL_FRAMES) { set.push(TOTAL_FRAMES); }
        return set;
    }

    /* ------------------- Phase 1: blocking critical load ---------------- */

    function startCriticalLoading() {
        runQueue(buildCriticalSet(), function (ratio) {
            var pct = Math.round(ratio * 100);
            loadPct.textContent = pct;
            loadBar.style.width = pct + '%';
            if (pct > 62) { loadStatus.textContent = 'Compiling materials…'; }
            else if (pct > 26) { loadStatus.textContent = 'Building geometry…'; }
        }, function () {
            loadPct.textContent = '100';
            loadBar.style.width = '100%';
            loadStatus.textContent = 'Ready.';
            window.setTimeout(revealSite, 450);
        });
    }
    /* ------------------- Phase 2: background smart fill ------------------ */

    function countQueued() {
        var n = 0;
        for (var i = 1; i <= TOTAL_FRAMES; i++) { if (store[i] === STATE.QUEUED) { n++; } }
        return n;
    }

    /* Nearest not-yet-loaded frame to `from` (loader priority). */
    function pickNearest(from) {
        var best = -1, bestD = Infinity;
        for (var i = 1; i <= TOTAL_FRAMES; i++) {
            if (store[i] !== STATE.QUEUED) { continue; }
            var d = Math.abs(i - from);
            if (d < bestD) { bestD = d; best = i; }
        }
        return best;
    }

    /* Nearest successfully decoded frame to `i` (renderer fallback). */
    function nearestReady(i) {
        if (store[i] === STATE.READY) { return i; }
        for (var d = 1; d <= TOTAL_FRAMES; d++) {
            if (i - d >= 1 && store[i - d] === STATE.READY) { return i - d; }
            if (i + d <= TOTAL_FRAMES && store[i + d] === STATE.READY) { return i + d; }
        }
        return -1;
    }

    function startBackgroundLoading() {
        phase = 'background';
        var active = 0, doneCount = 0;
        var totalQueued = countQueued();
        if (!totalQueued) { finishBackground(); return; }

        function pump() {
            if (phase !== 'background') { return; }
            while (active < CONCURRENCY) {
                var next = pickNearest(priorityFrame);
                if (next === -1) {
                    if (active === 0) { finishBackground(); }
                    return;
                }
                (function (i) {
                    active++;
                    loadImage(i, function () {
                        active--;
                        doneCount++;
                        var pct = clamp(Math.round((doneCount / totalQueued) * 100), 0, 100);
                        assetPct.textContent = pct;
                        if (doneCount >= totalQueued) { finishBackground(); }
                        else { pump(); }
                    });
                })(next);
            }
        }
        pump();
    }

    function finishBackground() {
        if (phase === 'done') { return; }
        phase = 'done';
        assetPct.textContent = '100';
        assetChip.classList.add('is-done');
        window.setTimeout(function () { assetChip.hidden = true; }, 900);
    }

    /* ============================= Reveal =============================== */

    function revealSite() {
        document.body.classList.remove('is-loading');
        preloader.classList.add('is-done');
        assetChip.hidden = false;
        resizeCanvas();
        /* Draw whatever frame matches the current scroll position (handles
           restored scroll positions on reload), not blindly frame 1. */
        drawRequested(1 + Math.round(stageProgress() * (TOTAL_FRAMES - 1)), true);
        startBackgroundLoading();
        window.requestAnimationFrame(tick);
        window.setTimeout(function () { preloader.style.display = 'none'; }, 1100);
    }

    /* ============================ Canvas ================================= */

    var cw = 0, ch = 0, dpr = 1;
    var lastRequested = -1, lastDrawn = -1;

    function resizeCanvas() {
        var rect = sticky.getBoundingClientRect();
        cw = Math.max(1, Math.round(rect.width));
        ch = Math.max(1, Math.round(rect.height));
        dpr = Math.min(window.devicePixelRatio || 1, 2);   // retina, capped at 2x
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastRequested = -1;
        lastDrawn = -1;
    }

    /* Cover-fit draw with a bottom-biased anchor (keeps the plant in frame). */
    function drawRequested(requested, force) {
        var ready = nearestReady(requested);
        if (ready === -1) { return; }
        if (!force && requested === lastRequested && ready === lastDrawn) { return; }

        var img = images[ready];
        var iw = img.naturalWidth, ih = img.naturalHeight;
        if (!iw || !ih) { return; }

        var scale = Math.max(cw / iw, ch / ih);
        var w = iw * scale, h = ih * scale;
        var x = (cw - w) / 2;
        var y = (ch - h) * 0.62;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, x, y, w, h);

        lastRequested = requested;
        lastDrawn = ready;
    }
    /* =========================== Scroll -> frame ========================== */

    function stageProgress() {
        var rect = stage.getBoundingClientRect();
        var span = stage.offsetHeight - window.innerHeight;
        if (span <= 0) { return 0; }
        return clamp(-rect.top / span, 0, 1);
    }

    /* ============================== Main loop ============================= */

    var display = 1;       // eased current frame
    var ui = { rail: -1, label: null, heroOp: -1 };

    function tick() {
        var p = stageProgress();
        var target = 1 + Math.round(p * (TOTAL_FRAMES - 1));

        display += (target - display) * 0.2;
        if (Math.abs(target - display) < 0.6) { display = target; }

        var requested = clamp(Math.round(display), 1, TOTAL_FRAMES);
        priorityFrame = requested;
        drawRequested(requested, false);
        updateHUD(p);

        window.requestAnimationFrame(tick);
    }

    function updateHUD(p) {
        /* Progress rail */
        var pct = Math.round(p * 100);
        if (pct !== ui.rail) {
            ui.rail = pct;
            railFill.style.height = pct + '%';
        }

        /* Hero: fades + drifts out over the first 5% of the sequence */
        var heroOp = clamp(1 - p / 0.05, 0, 1);
        if (Math.abs(heroOp - ui.heroOp) > 0.005) {
            ui.heroOp = heroOp;
            heroEl.style.opacity = heroOp;
            heroEl.style.transform = 'translateY(' + (-p * 1400).toFixed(1) + 'px)';
            heroEl.style.pointerEvents = heroOp < 0.05 ? 'none' : '';
        }

        /* Chapter label + active caption */
        var active = null, i;
        for (i = 0; i < chapters.length; i++) {
            if (p >= chapters[i].from && p < chapters[i].to) { active = chapters[i]; }
        }
        for (i = 0; i < chapters.length; i++) {
            chapters[i].el.classList.toggle('is-active', chapters[i] === active);
        }

        var label = active ? active.label : 'SS Industries — Showreel';
        if (label !== ui.label) {
            ui.label = label;
            chapterLabel.textContent = label;
        }
        chapterLabel.classList.toggle('is-hidden', !active);
    }

    /* ------------------------------ Resize ------------------------------- */

    var resizeTimer = null;
    function onResize() {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resizeCanvas, 130);
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) {
        new window.ResizeObserver(onResize).observe(sticky);
    }
    /* ============================== Navigation ============================ */

    var nav = $('#nav');
    var burger = $('#navBurger');
    var lastY = window.scrollY;

    function onScroll() {
        var y = window.scrollY;
        nav.classList.toggle('is-solid', y > 60);
        if (y > 300 && y > lastY + 6) { nav.classList.add('is-hidden'); }
        else if (y < lastY - 6 || y < 140) { nav.classList.remove('is-hidden'); }
        lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    burger.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    $$('#navMenu a').forEach(function (a) {
        a.addEventListener('click', function () {
            nav.classList.remove('is-open');
            burger.setAttribute('aria-expanded', 'false');
        });
    });

    /* Active link based on the section in view */
    if (window.IntersectionObserver) {
        var linkFor = {};
        $$('#navMenu a[href^="#"]').forEach(function (a) {
            linkFor[a.getAttribute('href').slice(1)] = a;
        });

        var sectionIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var link = linkFor[e.target.id];
                if (!link) { return; }
                if (e.isIntersecting) {
                    Object.keys(linkFor).forEach(function (k) {
                        linkFor[k].classList.remove('is-active');
                    });
                    link.classList.add('is-active');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

        ['stage', 'about', 'capabilities', 'gallery', 'team', 'testimonials', 'location', 'contact'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) { sectionIO.observe(el); }
        });
    }

    /* ======================== Reveal-on-scroll + stats ==================== */

    function animateCounters(root) {
        $$('b[data-count]', root).forEach(function (b) {
            var end = parseInt(b.dataset.count, 10) || 0;
            var suffix = b.dataset.suffix || '';
            var dur = 1700;
            var t0 = performance.now();
            function step(t) {
                var k = clamp((t - t0) / dur, 0, 1);
                var eased = 1 - Math.pow(1 - k, 3);
                b.textContent = Math.round(end * eased) + suffix;
                if (k < 1) { window.requestAnimationFrame(step); }
            }
            window.requestAnimationFrame(step);
        });
    }

    if (window.IntersectionObserver) {
        var revealIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) { return; }
                e.target.classList.add('in');
                if (e.target.classList.contains('stats')) { animateCounters(e.target); }
                revealIO.unobserve(e.target);
            });
        }, { threshold: 0.16 });

        $$('.reveal').forEach(function (el) { revealIO.observe(el); });
    } else {
        $$('.reveal').forEach(function (el) { el.classList.add('in'); });
        $$('.stats').forEach(animateCounters);
    }
    /* ============================== Lightbox ============================== */

    var items = $$('.gal__item');
    var lightbox = $('#lightbox');
    var lbImg = $('#lbImg');
    var lbCap = $('#lbCap');
    var lbIndex = 0;

    function openLightbox(i) {
        lbIndex = (i + items.length) % items.length;
        var it = items[lbIndex];
        var img = it.querySelector('img');
        lbImg.src = it.dataset.full || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = it.dataset.cap || '';
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    items.forEach(function (it, i) {
        it.setAttribute('tabindex', '0');
        it.addEventListener('click', function () { openLightbox(i); });
        it.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openLightbox(i); }
        });
    });

    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', function () { openLightbox(lbIndex - 1); });
    $('#lbNext').addEventListener('click', function () { openLightbox(lbIndex + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) { closeLightbox(); } });

    document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('is-open')) { return; }
        if (e.key === 'Escape') { closeLightbox(); }
        else if (e.key === 'ArrowRight') { openLightbox(lbIndex + 1); }
        else if (e.key === 'ArrowLeft') { openLightbox(lbIndex - 1); }
    });

    /* ======================= Service modals (Read More) ==================== */

    var svcOpener = null;

    function openSvcModal(modal) {
        svcOpener = document.activeElement;
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        var x = modal.querySelector('.svc-modal__close');
        if (x) { x.focus(); }
    }

    function closeSvcModal(modal) {
        if (!modal || !modal.classList.contains('is-open')) { return; }
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
        if (svcOpener && typeof svcOpener.focus === 'function') { svcOpener.focus(); }
    }

    /* Read More buttons open their modal via data-modal-open="<modal id>" */
    $$('[data-modal-open]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var modal = document.getElementById(btn.getAttribute('data-modal-open'));
            if (modal) { openSvcModal(modal); }
        });
    });

    /* Wire every service modal: X, Close, backdrop and Start a Project */
    $$('.svc-modal').forEach(function (modal) {
        var closeBtn = modal.querySelector('.svc-modal__close');
        if (closeBtn) { closeBtn.addEventListener('click', function () { closeSvcModal(modal); }); }

        var dismissBtn = modal.querySelector('.svc-modal__actions button');
        if (dismissBtn) { dismissBtn.addEventListener('click', function () { closeSvcModal(modal); }); }

        modal.addEventListener('click', function (e) { if (e.target === modal) { closeSvcModal(modal); } });

        var startBtn = modal.querySelector('.svc-modal__actions a[href="#contact"]');
        if (startBtn) {
            startBtn.addEventListener('click', function (e) {
                e.preventDefault();
                closeSvcModal(modal);
                var contact = $('#contact');
                if (contact) { contact.scrollIntoView({ behavior: 'smooth' }); }
            });
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') { return; }
        $$('.svc-modal.is-open').forEach(function (m) { closeSvcModal(m); });
    });

    /* ==================== Get your quote greeting video =================== */

    var ctaQuote = $('.cap--cta');
    var ctaGreetVideo = ctaQuote ? ctaQuote.querySelector('.cta-greet video') : null;

    function ctaGreetPlay() {
        if (!ctaGreetVideo) { return; }
        try { ctaGreetVideo.currentTime = 0; } catch (err) { }
        var p = ctaGreetVideo.play();
        if (p && typeof p.catch === 'function') { p.catch(function () { }); }
    }

    function ctaGreetStop() {
        if (!ctaGreetVideo) { return; }
        ctaGreetVideo.pause();
    }

    /* Desktop: cursor enter starts the greeting from the top, leave pauses */
    if (ctaQuote && ctaGreetVideo) {
        ctaQuote.addEventListener('mouseenter', ctaGreetPlay);
        ctaQuote.addEventListener('mouseleave', ctaGreetStop);
    }

    /* Touch devices have no cursor: the first tap greets (and holds the
       link), a later tap dials, and tapping anywhere else hides it. */
    if (ctaQuote && window.matchMedia('(hover: none)').matches) {
        ctaQuote.addEventListener('click', function (e) {
            if (!ctaQuote.classList.contains('is-greeting')) {
                e.preventDefault();
                ctaQuote.classList.add('is-greeting');
                ctaGreetPlay();
            }
        });
        document.addEventListener('click', function (e) {
            if (!ctaQuote.contains(e.target)) {
                ctaQuote.classList.remove('is-greeting');
                ctaGreetStop();
            }
        });
    }

    /* ============================ Contact form ============================ */

    var form = $('#contactForm');
    var note = $('#formNote');

    /* >>> YOUR WHATSAPP NUMBERS <<<
       International format, digits only, no '+' or spaces.
       Example for +91 88091 50097 -> '918809150097'
       The FIRST valid (10+ digit) number in this list is used for wa.me links. */
    var WHATSAPP_NUMBERS = [
        '918809150097',        /* main number */
        '919102190759'          /* second WhatsApp number */
    ];

    var WHATSAPP_NUMBER = (function () {
        for (var i = 0; i < WHATSAPP_NUMBERS.length; i++) {
            var digits = String(WHATSAPP_NUMBERS[i]).replace(/\D/g, '');
            if (digits.length >= 10) { return digits; }
        }
        return '';
    })();

    /* ---------------------- Step 1: email (primary) --------------------- */

    /* FormSubmit.co AJAX endpoint — sends the enquiry to your inbox with no
       backend of our own. NOTE: the very first submission triggers a one-time
       activation email to the address below — click its link once, then every
       following submission is accepted and delivered immediately. */
    var ENQUIRY_ENDPOINT = 'https://formsubmit.co/ajax/sahidkhan.official82@gmail.com';

    var waOpt = $('#waOpt');
    var celebrate = $('#celebrate');
    var confettiCanvas = $('#confettiCanvas');
    var submitBtn = form.querySelector('button[type="submit"]');
    var pendingEnquiry = null;   /* captured values survive form.reset() */
    var celebrateTimer = null;
    var stopConfetti = null;

    /* The same clean text format the WhatsApp flow has always used. */
    function buildEnquiryMessage(d) {
        return 'New Enquiry from the SS Industries website\n' +
            '----------------------------------------\n' +
            'Name: ' + d.name + '\n' +
            'Company: ' + (d.company || '—') + '\n' +
            'Email: ' + d.email + '\n' +
            'Project:\n' + d.project;
    }

    /* Resolves ONLY when the email service accepts the submission; any network
       failure, timeout or rejected response rejects the promise. */
    function sendEnquiryEmail(d) {
        var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, 20000) : null;

        function clearTimer() { if (timer !== null) { window.clearTimeout(timer); } }

        return fetch(ENQUIRY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: 'New website enquiry — ' + d.name,
                _template: 'table',
                _captcha: 'false',
                Name: d.name,
                Company: d.company || '—',
                Email: d.email,
                Project: d.project
            }),
            signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                clearTimer();
                if (!res.ok || !(data.success === true || data.success === 'true')) {
                    if (window.console && console.warn) { console.warn('FormSubmit response:', data); }
                    throw new Error(data.message || 'email service rejected the submission');
                }
            });
        }, function (err) {
            clearTimer();
            throw err;
        });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        /* 1. Collect & validate Name, Company, Email, Project. */
        var data = {
            name: $('#fName').value.trim(),
            email: $('#fEmail').value.trim(),
            company: $('#fCompany').value.trim(),
            project: $('#fMsg').value.trim()
        };

        if (!data.name || !data.email || !data.project || !form.checkValidity()) {
            note.textContent = 'Please fill in your Name, Email and Project details before sending.';
            form.reportValidity();
            return;
        }

        /* 2. PRIMARY submission: the email. WhatsApp and the success state
              only proceed once this request is successfully accepted. */
        if (submitBtn) { submitBtn.disabled = true; }
        note.textContent = 'Sending your enquiry…';

        sendEnquiryEmail(data).then(function () {
            if (submitBtn) { submitBtn.disabled = false; }
            note.textContent = '';
            pendingEnquiry = data;
            waOpt.classList.add('is-open');
        }).catch(function (err) {
            if (window.console && console.warn) { console.warn('Enquiry email failed:', (err && err.message) || err); }
            /* Email failed → NO WhatsApp popup and NO Congratulations. */
            if (submitBtn) { submitBtn.disabled = false; }
            note.textContent = 'Sorry — your enquiry could not be emailed right now. Please try again in a moment.';
        });
    });

    /* ---------------- Step 2: optional WhatsApp popup ------------------- */

    function dismissWaOpt() {
        if (!waOpt || !waOpt.classList.contains('is-open')) { return; }
        waOpt.classList.remove('is-open');
        finishSuccess();   /* every dismissal path (A / B / C) → Step 3 */
    }

    $('#waOptSend').addEventListener('click', function () {
        var data = pendingEnquiry;
        /* Pre-filled chat only — the visitor must press Send in WhatsApp. */
        if (WHATSAPP_NUMBER && data) {
            var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(buildEnquiryMessage(data));
            window.open(url, '_blank', 'noopener');
        }
        dismissWaOpt();
    });
    $('#waOptNo').addEventListener('click', dismissWaOpt);
    $('#waOptClose').addEventListener('click', dismissWaOpt);
    waOpt.addEventListener('click', function (e) { if (e.target === waOpt) { dismissWaOpt(); } });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { dismissWaOpt(); }
    });

    /* ------------- Step 3: congratulations + celebration ---------------- */

    function finishSuccess() {
        form.reset();
        pendingEnquiry = null;
        note.textContent = '';
        if (!celebrate) { return; }
        celebrate.classList.add('is-open');
        celebrate.setAttribute('aria-hidden', 'false');
        runConfetti();
        if (celebrateTimer !== null) { window.clearTimeout(celebrateTimer); }
        celebrateTimer = window.setTimeout(function () {
            celebrate.classList.remove('is-open');
            celebrate.setAttribute('aria-hidden', 'true');
            celebrateTimer = null;
        }, 4400);
    }

    /* Slim gold ribbons + soft dots: two side cannons and a light top rain,
       ~2.7 s, gentle fade — understated, then it removes itself. */
    function runConfetti() {
        if (!confettiCanvas || typeof confettiCanvas.getContext !== 'function') { return; }
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
        if (stopConfetti) { stopConfetti(); }

        var ctx = confettiCanvas.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = Math.max(1, Math.round(window.innerWidth * dpr));
        var H = Math.max(1, Math.round(window.innerHeight * dpr));
        confettiCanvas.width = W;
        confettiCanvas.height = H;
        confettiCanvas.classList.add('is-active');

        var palette = ['#ffc413', '#ffe9a8', '#f0b73f', '#ffffff', '#d9d4c7'];
        var parts = [];
        var start = null;
        var last = null;
        var EMIT_MS = 1100;
        var LIFE_MS = 2700;
        var FADE_FROM = LIFE_MS * 0.6;
        var finished = false;

        function stop() {
            finished = true;
            stopConfetti = null;
            ctx.clearRect(0, 0, W, H);
            confettiCanvas.classList.remove('is-active');
        }
        stopConfetti = stop;

        function spawn(x, y, angle, spread, speed) {
            var a = angle + (Math.random() - 0.5) * spread;
            var v = speed * (0.55 + Math.random() * 0.7) * dpr;
            parts.push({
                x: x, y: y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v,
                w: (2.5 + Math.random() * 2) * dpr,
                h: (8 + Math.random() * 6) * dpr,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.16,
                dot: Math.random() < 0.3,
                color: palette[Math.floor(Math.random() * palette.length)]
            });
        }

        function step(now) {
            if (finished) { return; }
            if (start === null) { start = now; last = now; }
            var elapsed = now - start;
            var dt = Math.min((now - last) / 16.7, 2.4);
            last = now;

            if (elapsed < EMIT_MS) {
                spawn(-4, H + 4, -Math.PI / 3.4, 0.5, 11.5);                     /* left cannon  */
                spawn(W + 4, H + 4, -(Math.PI - Math.PI / 3.4), 0.5, 11.5);      /* right cannon */
                if (Math.random() < 0.45) {
                    spawn(W * (0.12 + Math.random() * 0.76), -6, Math.PI / 2, 0.6, 2.4); /* light top rain */
                }
            }

            ctx.clearRect(0, 0, W, H);
            for (var i = parts.length - 1; i >= 0; i--) {
                var p = parts[i];
                p.vy += 0.13 * dpr * dt;
                p.vx *= 0.995;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.vr * dt;

                var alpha = elapsed < FADE_FROM ? 1 : Math.max(0, 1 - (elapsed - FADE_FROM) / (LIFE_MS - FADE_FROM));
                if (alpha <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }

                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                if (p.dot) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.w * 0.85, 0, 6.2832);
                    ctx.fill();
                } else {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rot);
                    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    ctx.restore();
                }
            }
            ctx.globalAlpha = 1;

            if (elapsed >= LIFE_MS) { stop(); return; }
            window.requestAnimationFrame(step);
        }

        window.requestAnimationFrame(step);
    }

    /* ============================== Misc ================================== */

    $('#toTop').addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ======================= Day / Night theme =========================== */

    var THEME_KEY = 'ssi-theme';
    var themeBtn = $('#themeToggle');

    function themeNow() {
        return document.documentElement.getAttribute('data-theme') === 'day' ? 'day' : 'night';
    }

    /* Keeps aria-label/title describing the ACTION ("Switch to ... Mode"). */
    function syncThemeBtn(theme) {
        if (!themeBtn) { return; }
        var label = (theme === 'day') ? 'Switch to Night Mode' : 'Switch to Day Mode';
        themeBtn.setAttribute('aria-label', label);
        themeBtn.setAttribute('title', label);
    }

    function setTheme(theme) {
        var root = document.documentElement;
        if (theme === 'day') { root.setAttribute('data-theme', 'day'); }
        else { root.removeAttribute('data-theme'); }
        try { window.localStorage.setItem(THEME_KEY, theme); } catch (err) { /* private mode */ }
        syncThemeBtn(theme);
    }

    if (themeBtn) {
        syncThemeBtn(themeNow());
        themeBtn.addEventListener('click', function () {
            var next = (themeNow() === 'day') ? 'night' : 'day';
            /* Smooth cross-fade: open the .theme-anim transition window, flip
               the attribute one frame later, retire the window afterwards. */
            var root = document.documentElement;
            root.classList.add('theme-anim');
            window.requestAnimationFrame(function () {
                window.requestAnimationFrame(function () { setTheme(next); });
            });
            window.setTimeout(function () { root.classList.remove('theme-anim'); }, 700);
        });
    }

    /* ============================ SS Assist ============================== */
    /* Premium floating AI widget wired to the existing website_ai backend.
       Hidden while #stage (hero + 3D/CED flythrough) is in view; revealed
       with a subtle fade/slide only once that section has left the screen. */

    var ssaRoot = $('#ssa');

    if (ssaRoot) {
        var ssaBtn = $('#ssaBtn');
        var ssaPanel = $('#ssaPanel');
        var ssaClose = $('#ssaClose');
        var ssaForm = $('#ssaForm');
        var ssaInput = $('#ssaInput');
        var ssaLog = $('#ssaLog');
        var ssaQuick = $('#ssaQuick');
        var ssaSendBtn = ssaForm ? ssaForm.querySelector('button[type="submit"]') : null;
        var ssaFooter = $('.footer');
        var ssaIsOpen = false;
        var ssaBusy = false;

        /* ALWAYS call the LOCAL SS Assist server (website_ai.py --server).
           Absolute URL so the site works identically from VS Code Live
           Server (any port), file://, or the local server itself -
           never an external host, no other server involved. */
        var CHAT_API = 'http://127.0.0.1:8765/chat';

        var SSA_OFFLINE_MSG =
            'SS Assist local service is not running. Please start website_ai.py with the server command.';

        function ssaSetOpen(open) {
            ssaIsOpen = open;
            ssaRoot.classList.toggle('is-open', open);
            if (ssaBtn) { ssaBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
            if (ssaPanel) { ssaPanel.setAttribute('aria-hidden', open ? 'false' : 'true'); }

            if (open) {
                window.setTimeout(function () {
                    if (ssaInput) { ssaInput.focus({ preventScroll: true }); }
                    ssaLog.scrollTop = ssaLog.scrollHeight;
                }, 260);
            } else if (ssaPanel && ssaPanel.contains(document.activeElement) && ssaBtn) {
                ssaBtn.focus({ preventScroll: true });
            }
        }

        function ssaSetVisible(show) {
            ssaRoot.classList.toggle('is-visible', show);
            if (!show && ssaIsOpen) { ssaSetOpen(false); }
        }

        function ssaBubble(kind, text) {
            var wrap = document.createElement('div');
            wrap.className = 'ssa__msg ssa__msg--' + kind;
            var p = document.createElement('p');
            p.textContent = text;
            wrap.appendChild(p);
            ssaLog.appendChild(wrap);
            ssaLog.scrollTop = ssaLog.scrollHeight;
            return wrap;
        }

        function ssaTyping(on) {
            var el = ssaLog.querySelector('.ssa__typing');
            if (on && !el) {
                el = document.createElement('div');
                el.className = 'ssa__msg ssa__msg--ai ssa__typing';
                el.innerHTML = '<p><span></span><span></span><span></span></p>';
                ssaLog.appendChild(el);
                ssaLog.scrollTop = ssaLog.scrollHeight;
            } else if (!on && el) {
                el.parentNode.removeChild(el);
            }
        }

        function ssaSend(text) {
            text = (text || '').trim();
            if (!text || ssaBusy) { return; }

            ssaBubble('user', text);
            ssaInput.value = '';
            ssaBusy = true;
            if (ssaSendBtn) { ssaSendBtn.disabled = true; }
            ssaTyping(true);

            console.info('[SS Assist] POST ' + CHAT_API + ' | Q: ' + text);
            window.fetch(CHAT_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            }).then(function (res) {
                if (!res.ok) { throw new Error('HTTP ' + res.status); }
                return res.json();
            }).then(function (data) {
                ssaTyping(false);
                var result = (data && data.result) || {};
                console.info('[SS Assist] OK ' + CHAT_API + ' 200 | A: ' +
                             String(result.answer || '').slice(0, 80) + '...');
                var bubble = ssaBubble('ai', result.answer || SSA_OFFLINE_MSG);

                /* Surface the backend's GET_QUOTE action as a real link */
                if (result.type === 'action' && result.action === 'GET_QUOTE') {
                    var cta = document.createElement('a');
                    cta.className = 'ssa__cta';
                    cta.href = '#contact';
                    cta.textContent = 'Get your quote →';
                    cta.addEventListener('click', function () { ssaSetOpen(false); });
                    bubble.appendChild(cta);
                }
            }).catch(function (err) {
                ssaTyping(false);
                /* TypeError = fetch itself failed (service not running);
                   anything else = the server answered with an error.
                   Both are printed to the console - nothing is hidden. */
                if (err && err.name === 'TypeError') {
                    console.error('[SS Assist] FAILED ' + CHAT_API +
                                  ' not reachable (is website_ai.py --server running?)', err);
                    ssaBubble('ai', SSA_OFFLINE_MSG);
                } else {
                    console.error('[SS Assist] FAILED ' + CHAT_API +
                                  ' -> ' + (err && err.message), err);
                    ssaBubble('ai',
                        'SS Assist service error: ' + (err && err.message) +
                        ' from ' + CHAT_API +
                        '. Please check the website_ai.py --server console.');
                }
            }).then(function () {
                ssaBusy = false;
                if (ssaSendBtn) { ssaSendBtn.disabled = false; }
            });
        }

        /* ---- Visibility: observe the real #stage element (hero + 3D) ---- */

        if (window.IntersectionObserver && stage) {
            new window.IntersectionObserver(function (entries) {
                /* Hidden while ANY part of the stage (hero overlay, CED
                   frames, 3D flythrough chapters) is on screen. */
                ssaSetVisible(!entries[0].isIntersecting);
            }, { threshold: 0 }).observe(stage);

            /* Lift the widget so it never covers the footer's Back-to-top */
            if (ssaFooter) {
                new window.IntersectionObserver(function (entries) {
                    ssaRoot.classList.toggle('is-above-footer', entries[0].isIntersecting);
                }, { threshold: 0 }).observe(ssaFooter);
            }
        } else {
            /* Legacy fallback — same rule: stage fully out of view */
            var ssaCheck = function () {
                ssaSetVisible(stage.getBoundingClientRect().bottom <= 0);
            };
            window.addEventListener('scroll', ssaCheck, { passive: true });
            window.addEventListener('resize', ssaCheck);
            ssaCheck();
        }

        /* ---- Wiring (opens only on visitor action — never automatically) ---- */

        if (ssaBtn) {
            ssaBtn.addEventListener('click', function () { ssaSetOpen(!ssaIsOpen); });
        }

        if (ssaClose) {
            ssaClose.addEventListener('click', function () { ssaSetOpen(false); });
        }

        if (ssaForm) {
            ssaForm.addEventListener('submit', function (e) {
                e.preventDefault();
                ssaSend(ssaInput.value);
            });
        }

        if (ssaQuick) {
            ssaQuick.addEventListener('click', function (e) {
                var chip = e.target && e.target.closest ? e.target.closest('.ssa__chip') : null;
                if (chip) { ssaSend(chip.textContent); }
            });
        }

        document.addEventListener('keydown', function (e) {
            if ((e.key === 'Escape' || e.key === 'Esc') && ssaIsOpen) {
                ssaSetOpen(false);
            }
        });
    }

    /* =============================== Boot ================================= */

    startCriticalLoading();

})();
