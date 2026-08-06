// ── Hero Typing Animation ──
(function initTyping() {
  const line1 = document.getElementById('typing-line-1');
  const line2 = document.getElementById('typing-line-2');
  if (!line1 || !line2) return;

  const TEXT_1     = 'PORTFOLIO';
  const TEXT_2     = '2026';
  const CHAR_SPEED = 80;   // ms per character
  const LINE_PAUSE = 220;  // ms pause between lines
  const END_PAUSE  = 900;  // ms before cursor disappears

  // Use inner text spans so cursor element never contaminates textContent
  const t1 = document.createElement('span');
  const t2 = document.createElement('span');
  const cursor = document.createElement('span');
  cursor.className = 'hero-cursor';
  cursor.textContent = '|';

  line1.appendChild(t1);
  line1.appendChild(cursor); // cursor starts after line1

  function typeInto(el, text) {
    return new Promise((resolve) => {
      let i = 0;
      const tick = setInterval(() => {
        el.textContent += text[i++];
        if (i >= text.length) { clearInterval(tick); resolve(); }
      }, CHAR_SPEED);
    });
  }

  async function run() {
    await new Promise((r) => setTimeout(r, 400));

    await typeInto(t1, TEXT_1);
    await new Promise((r) => setTimeout(r, LINE_PAUSE));

    // move cursor to line2
    line2.appendChild(t2);
    line2.appendChild(cursor);

    await typeInto(t2, TEXT_2);
    await new Promise((r) => setTimeout(r, END_PAUSE));

    // fade out cursor and remove
    cursor.style.transition = 'opacity 0.5s';
    cursor.style.opacity    = '0';
    setTimeout(() => cursor.remove(), 600);
  }

  run();
})();

// ── Config ──
const TOTAL_PAGES = 55; // pages 2–56 (page 57 = closing HTML)
const FINAL_PAGE_TOTAL = 57;
const STORAGE_KEY = 'portfolio_slots';

const VIDEO_PAGES = new Set([
  5, 7, 11, 13, 17, 21,
  24, 25, 30, 31, 32, 33,
  34, 37, 38, 39,
  46, 47, 51
]);

// ── Load saved slots from localStorage ──
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveSaved(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Build portfolio section ──
const section = document.getElementById('portfolio');
const saved   = loadSaved();

for (let i = 1; i <= TOTAL_PAGES; i++) {
  const pageNum = i + 1; // pages 2–56
  const slot    = document.createElement('div');
  slot.className   = 'portfolio-slot';
  slot.dataset.index = i;

  // 모든 페이지에 이동용 id 부여: page-02, page-03, page-21 ...
slot.id = `page-${String(pageNum).padStart(2, '0')}`;

  // page number badge
  const numBadge = document.createElement('span');
  numBadge.className   = 'slot-num';
  numBadge.textContent = `${String(pageNum).padStart(2, '0')} / ${FINAL_PAGE_TOTAL}`;
  slot.appendChild(numBadge);

  // ── PAGE 02: Project Index ──
if (pageNum === 2) {
  slot.classList.add('project-index-page');

  const bg = document.createElement('img');
  bg.className = 'project-index-bg loaded';
  bg.src = 'assets/images/page-02.png';
  bg.alt = '';
  slot.appendChild(bg);

  addProjectIndex(slot);

  section.appendChild(slot);
  continue;
}
  
  // upload zone
  const zone = document.createElement('div');
  zone.className = 'upload-zone';
  zone.innerHTML = `
    <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
      <path d="M12 16V8M8 12l4-4 4 4"/>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke-opacity=".4"/>
    </svg>
    <span class="upload-label">로딩 중입니다. 잠시만 기다려주세요.</span>
    <input type="file" accept="image/*,video/*" />
  `;
  slot.appendChild(zone);

  const fileInput = zone.querySelector('input[type="file"]');

  // ── Auto-load from assets folder ──
  const padded2 = String(pageNum).padStart(2, '0');
  const padded3 = String(pageNum).padStart(3, '0');

  const candidates = VIDEO_PAGES.has(pageNum)
  ? [
      { type: 'video', src: `assets/videos/page-${padded2}.mp4` }
    ]
  : [
      { type: 'image', src: `assets/images/page-${padded2}.png` },
      { type: 'video', src: `assets/videos/page-${padded2}.mp4` }
    ];
  
  function tryCandidate(index = 0) {
    if (index >= candidates.length) {
      console.warn(`page-${padded2} 파일을 찾지 못했습니다.`);
      return;
    }

    const item = candidates[index];

    if (item.type === 'image') {
      const testImg = new Image();

      testImg.onload = () => {
        renderMedia(slot, zone, 'image', item.src);
      };

      testImg.onerror = () => {
        tryCandidate(index + 1);
      };

      testImg.src = item.src;
    }

    if (item.type === 'video') {
      const testVideo = document.createElement('video');

      testVideo.onloadedmetadata = () => {
        testVideo.remove();
        renderMedia(slot, zone, 'video', item.src);
      };

      testVideo.onerror = () => {
        testVideo.remove();
        tryCandidate(index + 1);
      };

      testVideo.preload = 'metadata';
      testVideo.src = item.src;
      testVideo.load();
    }
  }

  tryCandidate();

  // ── File input change ──
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFile(slot, zone, file, i);
  });

  // ── Drag & drop ──
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    handleFile(slot, zone, file, i);
  });

  section.appendChild(slot);
}

// ── Handle uploaded file ──
function handleFile(slot, zone, file, index) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const src  = e.target.result;
    const type = file.type.startsWith('video') ? 'video' : 'image';
    renderMedia(slot, zone, type, src);
    try {
      const sv = loadSaved();
      sv[index] = { type, src };
      saveSaved(sv);
    } catch { /* quota exceeded for large files */ 
    }
  };
  
  reader.readAsDataURL(file);
}

// ── Render image or video inside slot ──
function renderMedia(slot, zone, type, src) {
  slot.querySelectorAll('img, video').forEach((el) => el.remove());
  zone.classList.add('hidden');

  const pageNum = Number(slot.dataset.index) + 1;

  if (type === 'video') {
  const vid = document.createElement('video');

  vid.src = src;
  vid.preload = 'auto';
  vid.autoplay = true;
  vid.loop = true;
  vid.playsInline = true;
  vid.muted = true;
  vid.controls = false;
    
  slot.appendChild(vid);  
  } else {
  const img = document.createElement('img');

  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';

  img.onload = () => {
    img.classList.add('loaded');
  };

  img.onerror = () => {
    console.warn('이미지 로딩 실패:', src);
  };

  img.src = src;

  if (img.complete) {
    img.classList.add('loaded');
  }

  slot.appendChild(img);
  }
}

// ── Custom Cursor + Magnifier ──
(function initCursor() {
  const cursor = document.getElementById('custom-cursor');
  if (!cursor) return;

  let mx = 0, my = 0;
  let isDown = false;
  const ZOOM = 1.2;
  const MAG_SIZE = 200;

  // magnifier lens — a cloned <body> rendered at 120% inside the circle
  const lens = document.createElement('div');
  lens.style.cssText = `
    position: absolute; top: 0; left: 0;
    width: ${MAG_SIZE}px; height: ${MAG_SIZE}px;
    border-radius: 50%; overflow: hidden;
    pointer-events: none; display: none;
  `;
  const inner = document.createElement('div');
  inner.style.cssText = `
    position: absolute;
    transform-origin: 0 0;
    pointer-events: none;
  `;
  lens.appendChild(inner);
  cursor.appendChild(lens);

  function updateLensPos() {
    const sx = window.scrollX || window.pageXOffset;
    const sy = window.scrollY || window.pageYOffset;
    const x = mx + sx;
    const y = my + sy;
    inner.style.transform = `scale(${ZOOM})`;
    inner.style.left = (-x * ZOOM + MAG_SIZE / 2) + 'px';
    inner.style.top  = (-y * ZOOM + MAG_SIZE / 2) + 'px';
  }

  function buildSnapshot() {
    // clone entire body into lens
    inner.innerHTML = '';
    const clone = document.body.cloneNode(true);
    // remove cursor from clone
    const c = clone.querySelector('#custom-cursor');
    if (c) c.remove();
    // remove scripts
    clone.querySelectorAll('script').forEach((s) => s.remove());
    // set dimensions
    clone.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: ${document.body.scrollWidth}px;
      margin: 0; padding: 0;
      pointer-events: none;
    `;
    inner.appendChild(clone);
    inner.style.width  = document.body.scrollWidth + 'px';
    inner.style.height = document.body.scrollHeight + 'px';
  }

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
    if (!cursor.classList.contains('visible')) cursor.classList.add('visible');
    if (isDown) updateLensPos();
  });

  document.addEventListener('mouseleave', () => cursor.classList.remove('visible'));
  document.addEventListener('mouseenter', () => cursor.classList.add('visible'));

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.nav, button, a, .upload-zone')) return;
    isDown = true;
    cursor.classList.add('magnify');
    lens.style.display = 'block';
    buildSnapshot();
    updateLensPos();
  });

  document.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    cursor.classList.remove('magnify');
    lens.style.display = 'none';
    inner.innerHTML = '';
  });
})();

// ── Active nav highlight ──
const navLinks       = document.querySelectorAll('.nav-links a');
const trackedSections = document.querySelectorAll('section[id], div[id]');

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((a) => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  },
  { threshold: 0.3 }
);

trackedSections.forEach((s) => navObserver.observe(s));

function addProjectIndex(slot) {
  const projects = [
    {
      num: '01',
      title: '삼쩜삼',
      desc: 'Pop-up store',
      image: 'assets/images/project-01.png',
      target: '#page-03',
      imgX: 220,
      textX: 220
    },
    {
      num: '02',
      title: 'BPT',
      desc: 'Rebranding',
      image: 'assets/images/project-02.png',
      target: '#page-14',
      imgX: 542,
      textX: 542
    },
    {
      num: '03',
      title: '푸본현대생명',
      desc: 'Sns Content',
      image: 'assets/images/project-03.png',
      target: '#page-26',
      imgX: 864,
      textX: 864
    },
    {
      num: '04',
      title: 'ORION',
      desc: 'Sns Content',
      image: 'assets/images/project-04.png',
      target: '#page-35',
      imgX: 1186,
      textX: 1186
    },
    {
      num: '05',
      title: 'DAYMINE',
      desc: 'Branding / Product',
      image: 'assets/images/project-05.png',
      target: '#page-42',
      imgX: 1508,
      textX: 1508
    }
  ];

  const layer = document.createElement('div');
  layer.className = 'page02-project-layer';

  projects.forEach((project) => {
    const imgLeft = `${(project.imgX / 1920) * 100}%`;
    const textLeft = `${(project.textX / 1920) * 100}%`;

    layer.innerHTML += `
      <span class="page02-text page02-num" style="left:${textLeft};">${project.num}</span>

      <a class="page02-thumb" href="${project.target}" style="left:${imgLeft};">
        <img src="${project.image}" alt="" />
      </a>

      <span class="page02-text page02-title" style="left:${textLeft};">${project.title}</span>
      <span class="page02-text page02-desc" style="left:${textLeft};">${project.desc}</span>
    `;
  });

  slot.appendChild(layer);
}
