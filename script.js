"use strict";

(() => {
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const desktopQuery = window.matchMedia("(min-width: 851px)");
  const pages = [...document.querySelectorAll(".portfolio-page")];
  let resizeScheduled = false;

  // Scale every section against the browser's actual content width.
  // Width-only scaling is intentional: using window.innerHeight would
  // leave undesired margins or change the composition on shorter monitors.
  function updateArtboardScale() {
    resizeScheduled = false;
    const availableWidth = document.documentElement.clientWidth || window.innerWidth;
    const scale = availableWidth / DESIGN_WIDTH;
    document.documentElement.style.setProperty("--artboard-scale", String(scale));

    pages.forEach((page) => {
      // Optional: <section ... data-design-height="3000"> for taller Figma frames.
      const customHeight = Number(page.dataset.designHeight);
      const designHeight = Number.isFinite(customHeight) && customHeight > 0
        ? customHeight : DESIGN_HEIGHT;
      page.style.setProperty("--design-height", `${designHeight}px`);
      page.style.setProperty("--scaled-height", `${designHeight * scale}px`);
    });
  }

  function requestArtboardScale() {
    if (resizeScheduled) return;
    resizeScheduled = true;
    window.requestAnimationFrame(updateArtboardScale);
  }

  updateArtboardScale();
  window.addEventListener("resize", requestArtboardScale, { passive: true });
  window.addEventListener("orientationchange", requestArtboardScale, { passive: true });

  // PAGE 02: Hover on desktop, click / keyboard / touch on all devices.
  const panels = [...document.querySelectorAll(".info-panel")];
  function closePanels(except = null) {
    panels.forEach((panel) => {
      if (panel === except) return;
      panel.classList.remove("is-open");
      panel.querySelector(".panel-bar")?.setAttribute("aria-expanded", "false");
    });
  }

  panels.forEach((panel) => {
    const button = panel.querySelector(".panel-bar");
    button?.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !panel.classList.contains("is-open");
      closePanels(panel);
      panel.classList.toggle("is-open", willOpen);
      button.setAttribute("aria-expanded", String(willOpen));
    });
    // Desktop hover is handled by CSS. ARIA state remains synchronized.
    panel.addEventListener("mouseenter", () => {
      if (desktopQuery.matches) {
        button?.setAttribute("aria-expanded", "true");
      }
    });
    panel.addEventListener("mouseleave", () => {
      if (desktopQuery.matches && !panel.classList.contains("is-open")) {
        button?.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".info-panel")) closePanels();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanels();
      document.activeElement?.blur?.();
    }
  });

  // Avoid displaying a browser's broken-image icon when a Figma asset
  // has not yet been exported to the local assets/ folder.
  document.querySelectorAll(".preview-image, .figma-image").forEach((image) => {
    function markMissing() {
      image.classList.add("is-missing");
      const section = image.closest(".work-page");
      if (section) section.setAttribute("data-missing-assets", "true");
    }
    image.addEventListener("error", markMissing, { once: true });
    if (image.complete && !image.naturalWidth) markMissing();
  });

  // Pause long-running project motion while each page is off-screen.
  if ("IntersectionObserver" in window) {
    const workObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-in-view", entry.isIntersecting);
      }
    }, { threshold: 0.12 });
    document.querySelectorAll(".work-page").forEach((section) => workObserver.observe(section));
  } else {
    document.querySelectorAll(".work-page").forEach((s) => s.classList.add("is-in-view"));
  }
})();


/* Additional project scenes: start their motion only when scrolled into view. */
(() => {
  const scenes = [...document.querySelectorAll('.project-extra')];
  if ('IntersectionObserver' in window) {
    const viewObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
    }, { threshold: .12 });
    scenes.forEach(scene => viewObserver.observe(scene));
  } else { scenes.forEach(scene => scene.classList.add('is-in-view')); }

  // Missing asset files are hidden without broken-image indicators.
  scenes.forEach(scene => scene.querySelectorAll('img.figma-image').forEach(img => {
    const missing = () => img.classList.add('is-missing');
    img.addEventListener('error', missing, { once: true });
    if (img.complete && !img.naturalWidth) missing();
  }));
})();

/* Background media: play muted videos only while their page is visible. */
(() => {
  const scenes = Array.from(document.querySelectorAll('.portfolio-extension'));
  const videos = Array.from(document.querySelectorAll('.portfolio-extension video[data-portfolio-video], .page-46 video[data-portfolio-video]'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mediaObserver = ('IntersectionObserver' in window)
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const vid = entry.target;
          if (!entry.isIntersecting || reduceMotion.matches) {
            vid.pause();
          } else {
            vid.play().catch(() => {}); // Some browsers restrict autoplay.
          }
        });
      }, { threshold: 0.10 }) : null;
  videos.forEach(v => {
    v.muted = true; v.playsInline = true;
    v.addEventListener('error', () => v.closest('.portfolio-extension, .page-46')?.setAttribute('data-media-unavailable','true'));
    v.addEventListener('canplay', () => v.closest('.portfolio-extension, .page-46')?.removeAttribute('data-media-unavailable'));
    if (mediaObserver) mediaObserver.observe(v);
  });
  scenes.forEach(section => {
    if (section.hasAttribute('data-media-only') || section.id === 'page-60') {
      section.querySelectorAll('.scene-media-cover:not(video)').forEach(img => {
        let formats = (img.dataset.fallbackFormats || '').split(',').filter(Boolean);
        img.addEventListener('error', () => {
          if (formats.length) {
            const next = formats.shift();
            img.src = img.src.replace(/\.[a-z0-9]+(?:\?.*)?$/i, '.'+next);
          } else section.setAttribute('data-media-unavailable', 'true');
        });
        img.addEventListener('load', () => section.removeAttribute('data-media-unavailable'));
      });
    }
  });
})();

/* ===== 2026-11-18 / GIF sequencing and background media loader ===== */
(() => {
  'use strict';
  const isVisible = (section) => {
    if (!section) return false;
    const r = section.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };
  const watchSection = (section, fn) => {
    if (!section) return;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => fn(entry.isIntersecting));
      }, { threshold: 0.04 });
      observer.observe(section);
    } else fn(true);
  };
  const playSafe = (v) => {
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  /* PAGE 32 — one COMPLETE GIF cycle per character, then next character.
     Browsers do not emit an `ended` event for GIF images. Parse the real GIF
     Graphic Control Extension delays rather than using a nominal 3-second
     cutoff. A failed timing read MUST NOT advance prematurely. */
  function gifDurationMs(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 13 || ![71, 73, 70].every((v, i) => bytes[i] === v)) return null;
    let offset = 13;
    if (bytes[10] & 0x80) offset += 3 * (1 << ((bytes[10] & 7) + 1));
    let lastDelay = 100;
    let total = 0;
    let frames = 0;
    const skipSubBlocks = () => {
      while (offset < bytes.length) {
        const size = bytes[offset++];
        if (!size) return true;
        offset += size;
        if (offset > bytes.length) return false;
      }
      return false;
    };
    while (offset < bytes.length) {
      const marker = bytes[offset++];
      if (marker === 0x3b) break; // GIF trailer
      if (marker === 0x21) { // extension
        const label = bytes[offset++];
        if (label === 0xf9 && bytes[offset] === 4) {
          const centiseconds = bytes[offset + 2] | (bytes[offset + 3] << 8);
          // Chromium clamps very short GIF delays; prefer actual frame delay.
          lastDelay = centiseconds <= 1 ? 100 : centiseconds * 10;
        }
        if (!skipSubBlocks()) return null;
      } else if (marker === 0x2c) { // image descriptor
        if (offset + 9 > bytes.length) return null;
        const flags = bytes[offset + 8];
        offset += 9;
        if (flags & 0x80) offset += 3 * (1 << ((flags & 7) + 1));
        offset++; // minimum LZW code size
        if (!skipSubBlocks()) return null;
        total += lastDelay;
        frames++;
        lastDelay = 100;
      } else {
        return null;
      }
    }
    return frames ? { total, frames } : null;
  }

  const page32 = document.getElementById('page-32');
  if (page32) {
    const entries = Array.from(page32.querySelectorAll('.p08-fidelity-character'))
      .map(wrapper => {
        const img = wrapper.querySelector('img[data-sequence-gif]');
        if (!img) return null;
        const src = img.dataset.sequenceGif || img.getAttribute('src');
        const canvas = document.createElement('canvas');
        canvas.className = 'p08-gif-poster';
        canvas.setAttribute('aria-hidden', 'true');
        wrapper.insertBefore(canvas, img);
        const entry = { wrapper, img, canvas, src, blob: null, duration: null, activeUrl: null };
        // Capture the first frame as a stationary poster for inactive characters.
        const snapshot = () => {
          try {
            if (!img.naturalWidth) return;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
          } catch (_) { canvas.style.display = 'none'; }
        };
        if (img.complete && img.naturalWidth) snapshot();
        else img.addEventListener('load', snapshot, { once: true });
        entry.read = fetch(src, { cache: 'force-cache' })
          .then(resp => { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.blob(); })
          .then(async blob => {
            const duration = gifDurationMs(await blob.arrayBuffer());
            if (!duration) throw new Error('GIF frame duration unavailable: ' + src);
            entry.blob = blob;
            entry.duration = duration.total;
            return true;
          })
          .catch(err => {
            console.warn('[page-32] GIF duration could not be read; refusing to cut animation early:', src, err);
            return false;
          });
        return entry;
      }).filter(Boolean);

    let visible = false;
    let ready = false;
    let timer = null;
    let current = -1;
    let generation = 0;
    function hide(entry) {
      entry.wrapper.classList.remove('is-gif-active');
      entry.img.style.visibility = 'hidden';
      if (entry.activeUrl) {
        URL.revokeObjectURL(entry.activeUrl);
        entry.activeUrl = null;
      }
    }
    function playCharacter(index) {
      if (!visible || !ready || !entries.length) return;
      clearTimeout(timer);
      entries.forEach(hide);
      current = index;
      const entry = entries[index];
      const token = ++generation;
      entry.wrapper.classList.add('is-gif-active');
      entry.img.style.visibility = 'visible';
      // A fresh blob URL always starts the GIF at its FIRST frame.
      const url = URL.createObjectURL(entry.blob);
      entry.activeUrl = url;
      let clockStarted = false;
      const startClock = () => {
        if (clockStarted || token !== generation || !visible) return;
        clockStarted = true;
        // Do not switch until the last frame's full recorded delay has elapsed.
        timer = window.setTimeout(() => {
          if (visible && token === generation) playCharacter((index + 1) % entries.length);
        }, entry.duration);
      };
      entry.img.addEventListener('load', startClock, { once: true });
      entry.img.src = url;
      if (entry.img.complete && entry.img.naturalWidth) startClock();
    }
    // Important: do NOT begin the first timer while the GIF file is still
    // downloading. That was why long GIFs got cut at 3 seconds.
    Promise.all(entries.map(entry => entry.read)).then(results => {
      ready = results.length === 3 && results.every(Boolean);
      if (visible && ready) playCharacter(0);
      if (!ready) {
        // If file:// blocks fetch or a GIF is malformed, display Dandi
        // continuously instead of cutting characters short with a guess.
        const first = entries[0];
        if (first) {
          entries.forEach(hide);
          first.wrapper.classList.add('is-gif-active');
          first.img.style.visibility = 'visible';
          first.img.src = first.src;
        }
      }
    });
    watchSection(page32, on => {
      if (on === visible) return;
      visible = on;
      clearTimeout(timer);
      ++generation;
      if (!visible) { entries.forEach(hide); return; }
      if (ready) playCharacter(0);
    });
  }

  /* PAGE 44: the Figma six-second wipe is CSS-driven unconditionally.
     It does not depend on a timing-sensitive IntersectionObserver class. */

  /* Background video or GIF; poster (existing Figma image) remains until loading.
     Prefer MP4, then WebM, then GIF.  A GIF is an image, not a <video>. */
  document.querySelectorAll('.portfolio-media-slot').forEach(slot => {
    const base = slot.dataset.mediaBase;
    if (!base) return;
    const section = slot.closest('.portfolio-page');
    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.autoplay = false;
    video.loop = true;
    video.preload = 'metadata';
    let failedSources = 0;
    for (const [ext,type] of [['mp4','video/mp4'],['webm','video/webm']]) {
      const source = document.createElement('source');
      source.src = base + '.' + ext;
      source.type = type;
      source.addEventListener('error', () => {
        failedSources++;
        if (failedSources >= 2) gifFallback();
      });
      video.appendChild(source);
    }
    slot.appendChild(video);
    let ready = false, useGif = false, visible = false;
    const playOrPause = () => {
      if (useGif) return;
      // Playing starts media download even when preload=metadata did not fetch frames.
      if (visible) playSafe(video);
      else video.pause();
    };
    const gifFallback = () => {
      if (ready) return;
      useGif = true;
      video.pause();video.remove();
      const img = document.createElement('img');
      img.alt = '';
      img.src = base + '.gif';
      img.addEventListener('load', () => { ready = true; slot.classList.add('is-media-ready'); });
      img.addEventListener('error', () => { slot.classList.remove('is-media-ready'); section?.setAttribute('data-media-unavailable','true'); });
      slot.appendChild(img);
    };
    video.addEventListener('loadeddata', () => {
      ready = true; slot.classList.add('is-media-ready');
      section?.removeAttribute('data-media-unavailable');
      playOrPause();
    });
    video.addEventListener('error', gifFallback, { once: true });
    // A timeout also covers some browsers that only raise <source> error.
    video.addEventListener('stalled', () => { if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) gifFallback(); });
    watchSection(section, on => { visible = on; playOrPause(); });
    video.load();
  });


  /* PAGE 17: Use the actual source image for the electric-blue glow when present. */
  const f17 = document.querySelector('#page-17 .f55-source-glow');
  if (f17) {
    const stage = f17.closest('.page-17');
    f17.addEventListener('load', () => stage?.classList.add('has-f55-source'));
    f17.addEventListener('error', () => stage?.classList.remove('has-f55-source'));
    if (f17.complete && f17.naturalWidth) stage?.classList.add('has-f55-source');
  }
})();


/* Figma pages 51–66: image file extension fallbacks. Keep original layer stems.
   The actual user assets were not supplied in this archive; these try png,
   jpg, jpeg and webp without changing Figma's basename. */
(() => {
  const extensions = ['png', 'jpg', 'jpeg', 'webp'];
  document.querySelectorAll('.figma-sequence-page img.f7-img[data-asset-stem]').forEach(img => {
    const stem = img.dataset.assetStem;
    const root = './assets/project07/image/' + stem + '.';
    let index = extensions.findIndex(ext => img.getAttribute('src')?.endsWith('.' + ext));
    if (index < 0) index = 0;
    img.addEventListener('error', () => {
      index++;
      if (index < extensions.length) img.src = root + extensions[index];
      else img.classList.add('is-missing');
    });
  });
})();


/* PAGE 20 — isolate the Figma 6s wipe from overlapping historical CSS
   animation rules. Web Animations API applies to the clip-path property,
   loops indefinitely, and keeps the original image files and geometry. */
(() => {
  const page = document.getElementById('page-44');
  if (!page) return;
  const hidden = 'polygon(-50% 0%, -40% 0%, -60% 100%, -70% 100%)';
  const shown = 'polygon(0% 0%, 145% 0%, 125% 100%, 0% 100%)';
  const activeWipes = [];
  const config = [
    ['.lot-message-2', .26667, .33333, .98, .99667],
    ['.lot-message-3', .60, .66667, .98, .99667],
    ['.lot-message-4', .93, .98, .99667, 1],
  ];
  for (const [selector, hold, reveal, endHold, reset] of config) {
    const element = page.querySelector(selector);
    if (!element) continue;
    element.style.setProperty('animation', 'none', 'important');
    element.style.clipPath = hidden;
    if (typeof element.animate !== 'function') continue;
    const keyframes = [
      {offset:0,clipPath:hidden},
      {offset:hold,clipPath:hidden,easing:'ease-in-out'},
      {offset:reveal,clipPath:shown},
      {offset:endHold,clipPath:shown},
    ];
    if (reset<1) keyframes.push({offset:reset,clipPath:hidden});
    keyframes.push({offset:1,clipPath:hidden});
    const animation = element.animate(keyframes,{
      duration:6000,iterations:Infinity,fill:'both',easing:'linear'
    });
    animation.play();
    activeWipes.push(animation);
  }
  // Start a fresh Figma cycle whenever the visitor scrolls into page-44.
  if ('IntersectionObserver' in window && activeWipes.length) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) activeWipes.forEach(animation => {
        animation.currentTime = 0;
        animation.play();
      });
    }, {threshold:0.15});
    observer.observe(page);
  }
  page.dataset.wipeEngine = 'web-animations-6s-loop';
})();

// 포트폴리오 전체 마우스 오른쪽 클릭 차단
document.addEventListener("contextmenu", function (event) {
    event.preventDefault();
});

/* PROJECT 02 / Figma 3605:289—3616:576.
   Begin preparing each image just before the reader reaches it; preserve all
   source filenames and playback motion from the six Figma frames.
   Missing PNGs are reported with the exact Figma layer name in DevTools. */
(() => {
  'use strict';
  const images = [...document.querySelectorAll('.project02-campaign img[data-figma-layer]')];
  if (!images.length) return;

  const warm = img => {
    // Preserve native async decode, but encourage the browser to fetch
    // the next offscreen PNG early instead of waiting for the scroll edge.
    img.loading = 'eager';
  };

  for (const image of images) {
    const missing = () => {
      const name = image.dataset.figmaLayer;
      const src = image.getAttribute('src') || '';
      console.warn(`[project02] 이미지 누락: ${name}.png | ${src} | Figma 레이어: ${image.dataset.figmaImageNode}`);
    };
    image.addEventListener('error', missing);
    if (image.complete && !image.naturalWidth) missing();
    image.addEventListener('load', () => image.classList.remove('is-missing'));
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        warm(entry.target);
        observer.unobserve(entry.target);
      }
    }, {rootMargin:'800px 0px 800px 0px',threshold:0});
    images.forEach(img => observer.observe(img));
  } else images.forEach(warm);
})();

/* PAGE 02: reveal a neutral label if an original gallery PNG is not supplied. */
(() => {
  const thumbs = document.querySelectorAll('#page-02 .page02-gallery-item img');
  thumbs.forEach(img => {
    const missing = () => img.closest('.page02-gallery-item')?.classList.add('is-image-missing');
    img.addEventListener('error', missing, {once:true});
    if (img.complete && img.naturalWidth === 0) missing();
  });
})();
