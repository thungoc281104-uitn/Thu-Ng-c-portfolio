/**
 * Clean Girl / Editorial Minimal Portfolio Engine + Fais Case Study Showcase
 * Features:
 * - Bilingual i18n (VI / EN)
 * - Horizontal Lookbook Slide Deck (01 / 08) + Full Poster Board View Toggle
 * - Expandable Fais (Pais) Project Case Studies (Project 1, 2, 3, 4, ...) with 14-image Bento Grid
 * - Dynamic Bar Chart Sync
 * - Lightbox Image Preview
 */

(function () {
  'use strict';

  let currentLang = localStorage.getItem('eno_portfolio_lang_v2') || 'vi';
  let currentMode = localStorage.getItem('eno_portfolio_mode') || 'h-mode'; // 'h-mode' or 'poster-mode'
  let currentSlide = 0;
  let activeProjectId = 'p1';
  let renderedProjectIdsSig = '';

  const panels = Array.from(document.querySelectorAll('.slide-panel'));
  const navPills = Array.from(document.querySelectorAll('.nav-pill'));
  const brandHomeBtn = document.getElementById('brand-home-btn');
  const dotsWrap = document.getElementById('h-dots');
  const countEl = document.getElementById('h-count');
  const prevBtn = document.getElementById('h-prev');
  const nextBtn = document.getElementById('h-next');
  const layoutToggleBtn = document.getElementById('layout-toggle-btn');
  const layoutToggleLabel = document.getElementById('layout-toggle-label');
  const langSwitch = document.getElementById('lang-switch');
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  function getNestedVal(obj, pathStr) {
    if (!obj || !pathStr) return null;
    return pathStr.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : null), obj);
  }

  function getDict() {
    return (typeof PORTFOLIO_DATA !== 'undefined' && (PORTFOLIO_DATA[currentLang] || PORTFOLIO_DATA.vi || PORTFOLIO_DATA.en)) || {};
  }

  function getProjectOrder() {
    const dict = getDict();
    if (dict.projects && Array.isArray(dict.projects.order) && dict.projects.order.length > 0) {
      return dict.projects.order;
    }
    return ['p1', 'p2', 'p3', 'p4', 'p5'];
  }

  // --- 0. BUILD FAIS PROJECT CASE STUDIES DOM ---
  function ensureProjectsStructure(forceRebuild = false) {
    const stage = document.getElementById('projects-showcase-stage');
    const tabsBar = document.getElementById('projects-tabs-bar');
    const navDynamic = document.getElementById('nav-dynamic-projects');
    if (!stage || !tabsBar) return;

    const order = getProjectOrder();
    const sig = order.join(',');
    if (!forceRebuild && renderedProjectIdsSig === sig && stage.children.length > 0) {
      return;
    }
    renderedProjectIdsSig = sig;

    // 1. Build Top Tabs Bar inside Slide #projects
    tabsBar.innerHTML = order.map((pid, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const isAct = pid === activeProjectId ? 'active' : '';
      return `
        <button type="button" class="proj-tab-pill ${isAct}" data-project-open="${pid}">
          <span class="proj-tab-num">${num}</span>
          <span class="proj-tab-name" data-i18n="projects.${pid}.tabName">Project ${idx + 1}</span>
          <span class="proj-tab-sep">·</span>
          <span class="proj-tab-brand" data-i18n="projects.${pid}.brandName">Brand</span>
        </button>
      `;
    }).join('') + `
      <button type="button" class="proj-tab-add-btn" id="slide-add-project-btn" title="Thêm Project mới">
        <i class="ri-add-line"></i> <span>+ Project</span>
      </button>
    `;

    // 2. Build Dynamic Nav Sub-items for p6, p7... in Topbar Dropdown
    if (navDynamic) {
      const extraIds = order.slice(5);
      navDynamic.innerHTML = extraIds.map((pid, i) => {
        const idx = i + 6;
        return `<button type="button" class="nav-sub-item is-project-item" data-slide-to="2" data-project-open="${pid}" data-i18n="nav.proj${idx}">• Project ${idx}</button>`;
      }).join('');
    }

    // 3. Build Expandable Fais Case Study Accordion Panels
    stage.innerHTML = order.map((pid, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const isExpanded = pid === activeProjectId ? 'is-open' : '';
      return `
        <article class="fais-project-accordion ${isExpanded}" id="project-card-${pid}" data-project-id="${pid}">
          <!-- Accordion Header (Click to expand/collapse project) -->
          <div class="fais-accordion-header" data-project-toggle="${pid}">
            <div class="fais-acc-left">
              <span class="fais-acc-index">${num}</span>
              <span class="fais-acc-tab" data-i18n="projects.${pid}.tabName">Project ${idx + 1}</span>
              <span class="fais-acc-cat-pill" data-i18n="projects.${pid}.category">Brand Growth</span>
              <span class="fais-acc-metric-pill" data-i18n="projects.${pid}.heroMetric">Metric</span>
            </div>
            <div class="fais-acc-right">
              <span class="fais-acc-brand-preview" data-i18n="projects.${pid}.brandName">Fujiwa Speed</span>
              <span class="fais-acc-chevron"><i class="ri-arrow-down-s-line"></i></span>
            </div>
          </div>

          <!-- Expandable Fais 2-Board Body -->
          <div class="fais-accordion-body">
            <!-- ==================== BOARD 1: FAIS OVERVIEW + 10-IMAGE BENTO GRID ==================== -->
            <div class="fais-board fais-board-top">
              <div class="fais-top-split">
                <!-- Left Editorial & Case Study Overview Column -->
                <div class="fais-case-left">
                  <div class="fais-badges-row">
                    <span class="fais-cat-tag" data-i18n="projects.${pid}.category">Brand Growth</span>
                    <span class="fais-metric-tag" data-i18n="projects.${pid}.heroMetric">468K Views (+91%) | 200 Triệu doanh thu</span>
                  </div>

                  <h2 class="fais-brand-display" data-i18n="projects.${pid}.brandName">Fujiwa Speed</h2>
                  <h3 class="fais-project-title" data-i18n="projects.${pid}.title">Tăng Trưởng Nhận Diện Thương Hiệu Fujiwa &amp; Ra Mắt Dòng Sản Phẩm Mới Fujiwa Speed</h3>

                  <div class="fais-meta-grid">
                    <div class="fais-meta-item">
                      <strong class="fais-meta-label" data-i18n="projects.lblRole">Vai trò &amp; Phạm vi phụ trách</strong>
                      <p class="fais-meta-val" data-i18n="projects.${pid}.role">Digital Marketing Executive</p>
                    </div>
                    <div class="fais-meta-item fais-meta-period">
                      <strong class="fais-meta-label" data-i18n="projects.lblPeriod">Thời gian triển khai</strong>
                      <p class="fais-meta-val" data-i18n="projects.${pid}.period">02/2026 – 05/2026</p>
                    </div>
                  </div>

                  <div class="fais-section-block">
                    <h4 class="fais-sec-heading" data-i18n="projects.lblObjectives">Key Objectives &amp; Bối Cảnh Bài Toán</h4>
                    <div class="fais-objectives-list">
                      <p data-i18n="projects.${pid}.obj1">• Bối cảnh...</p>
                      <p data-i18n="projects.${pid}.obj2">• Bài toán...</p>
                      <p data-i18n="projects.${pid}.obj3">• Key Objectives...</p>
                    </div>
                  </div>

                  <!-- Key Achievements 4 Metric Boxes -->
                  <div class="fais-section-block">
                    <h4 class="fais-sec-heading" data-i18n="projects.lblAchievements">Key Achievements (Kết Quả Đo Lường)</h4>
                    <div class="fais-kpi-grid">
                      <div class="fais-kpi-card">
                        <strong class="fais-kpi-val" data-i18n="projects.${pid}.ach1Val">468.200</strong>
                        <span class="fais-kpi-lbl" data-i18n="projects.${pid}.ach1Lbl">Lượt xem fanpage mẹ (+91,2%)</span>
                      </div>
                      <div class="fais-kpi-card">
                        <strong class="fais-kpi-val" data-i18n="projects.${pid}.ach2Val">158.800</strong>
                        <span class="fais-kpi-lbl" data-i18n="projects.${pid}.ach2Lbl">Unique users tiếp cận (+72%)</span>
                      </div>
                      <div class="fais-kpi-card">
                        <strong class="fais-kpi-val" data-i18n="projects.${pid}.ach3Val">3.000+</strong>
                        <span class="fais-kpi-lbl" data-i18n="projects.${pid}.ach3Lbl">Followers mới Fujiwa Speed (2 tháng)</span>
                      </div>
                      <div class="fais-kpi-card">
                        <strong class="fais-kpi-val" data-i18n="projects.${pid}.ach4Val">200 Triệu</strong>
                        <span class="fais-kpi-lbl" data-i18n="projects.${pid}.ach4Lbl">Doanh thu tháng đầu ra mắt</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right Fais 10-Image Bento Collage (Matches Fais Top Board) -->
                <div class="fais-bento-top">
                  <div class="fais-bento-card fb-card-1" data-crop-ratio="1.38">
                    <img src="assets/images/fais-1.jpg" alt="Project visual 1" data-img-key="projects.${pid}.img1">
                  </div>
                  <div class="fais-bento-card fb-card-2" data-crop-ratio="1.6">
                    <img src="assets/images/fais-2.jpg" alt="Project visual 2" data-img-key="projects.${pid}.img2">
                  </div>
                  <div class="fais-bento-card fb-card-3" data-crop-ratio="0.53">
                    <img src="assets/images/fais-3.jpg" alt="Project visual 3" data-img-key="projects.${pid}.img3">
                  </div>
                  <div class="fais-bento-card fb-card-4" data-crop-ratio="2.58">
                    <img src="assets/images/fais-4.jpg" alt="Project visual 4" data-img-key="projects.${pid}.img4">
                  </div>
                  <div class="fais-bento-card fb-card-5" data-crop-ratio="1.87">
                    <img src="assets/images/fais-5.jpg" alt="Project visual 5" data-img-key="projects.${pid}.img5">
                  </div>
                  <div class="fais-bento-card fb-card-6" data-crop-ratio="0.7">
                    <img src="assets/images/fais-6.jpg" alt="Project visual 6" data-img-key="projects.${pid}.img6">
                  </div>
                  <div class="fais-bento-row-4">
                    <div class="fais-bento-card fb-card-7" data-crop-ratio="0.72">
                      <img src="assets/images/fais-7.jpg" alt="Project visual 7" data-img-key="projects.${pid}.img7">
                    </div>
                    <div class="fais-bento-card fb-card-8" data-crop-ratio="0.72">
                      <img src="assets/images/fais-8.jpg" alt="Project visual 8" data-img-key="projects.${pid}.img8">
                    </div>
                    <div class="fais-bento-card fb-card-9" data-crop-ratio="0.72">
                      <img src="assets/images/fais-9.jpg" alt="Project visual 9" data-img-key="projects.${pid}.img9">
                    </div>
                    <div class="fais-bento-card fb-card-10" data-crop-ratio="0.72">
                      <img src="assets/images/fais-10.jpg" alt="Project visual 10" data-img-key="projects.${pid}.img10">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Fais Editorial Footer Rule -->
              <div class="fais-board-rule">
                <span class="fais-rule-left" data-i18n="projects.${pid}.footerLeft">PROJECT ${idx + 1}</span>
                <span class="fais-rule-line"></span>
                <span class="fais-rule-right" data-i18n="projects.${pid}.footerRight">${num}</span>
              </div>
            </div>

            <!-- ==================== BOARD 2: EXECUTION STEPS & TAKEAWAYS + FAIS 4-IMAGE SHOWCASE ==================== -->
            <div class="fais-board fais-board-bottom">
              <div class="fais-board2-header" data-i18n="projects.${pid}.board2Header">
                BRAND IDENTITY &amp; CAMPAIGN VISUALS | PROJECT ${idx + 1}
              </div>

              <div class="fais-bottom-split">
                <!-- Left Execution Steps & Key Takeaways Column -->
                <div class="fais-execution-col">
                  <div class="fais-section-block">
                    <h4 class="fais-sec-heading" data-i18n="projects.lblSteps">Execution Steps (Các Bước Triển Khai)</h4>
                    <div class="fais-steps-list">
                      <div class="fais-step-card">
                        <p data-i18n="projects.${pid}.step1">Bước 1...</p>
                      </div>
                      <div class="fais-step-card">
                        <p data-i18n="projects.${pid}.step2">Bước 2...</p>
                      </div>
                      <div class="fais-step-card">
                        <p data-i18n="projects.${pid}.step3">Bước 3...</p>
                      </div>
                      <div class="fais-step-card">
                        <p data-i18n="projects.${pid}.step4">Bước 4...</p>
                      </div>
                    </div>
                  </div>

                  <div class="fais-section-block fais-takeaways-box">
                    <h4 class="fais-sec-heading" data-i18n="projects.lblTakeaways">Key Takeaways &amp; Hướng Tối Ưu</h4>
                    <p class="fais-takeaway-p" data-i18n="projects.${pid}.takeaway1">Takeaway 1...</p>
                    <p class="fais-takeaway-p fais-next-step" data-i18n="projects.${pid}.takeaway2">Bước tiếp theo...</p>
                  </div>

                  <div class="fais-tags-row">
                    <span class="fais-hashtag" data-i18n="projects.${pid}.tag1">#Growth Branding</span>
                    <span class="fais-hashtag" data-i18n="projects.${pid}.tag2">#Meta Ads</span>
                    <span class="fais-hashtag" data-i18n="projects.${pid}.tag3">#Product Launch</span>
                    <span class="fais-hashtag" data-i18n="projects.${pid}.tag4">#Content Strategy</span>
                  </div>
                </div>

                <!-- Right Fais Bottom 4-Image Showcase (Matches Fais Bottom Board) -->
                <div class="fais-bento-bottom">
                  <div class="fais-bottom-left-col">
                    <div class="fais-bento-card fb-card-11" data-crop-ratio="2.32">
                      <img src="assets/images/fais-11.jpg" alt="Billboard campaign visual" data-img-key="projects.${pid}.img11">
                    </div>
                    <div class="fais-bottom-pair">
                      <div class="fais-bento-card fb-card-12" data-crop-ratio="1.05">
                        <img src="assets/images/fais-12.jpg" alt="Social feed & mobile mockups" data-img-key="projects.${pid}.img12">
                      </div>
                      <div class="fais-bento-card fb-card-13" data-crop-ratio="1.05">
                        <img src="assets/images/fais-13.jpg" alt="Editorial spread mockup" data-img-key="projects.${pid}.img13">
                      </div>
                    </div>
                  </div>
                  <div class="fais-bento-card fb-card-14" data-crop-ratio="1.08">
                    <img src="assets/images/fais-14.jpg" alt="Hero product showcase" data-img-key="projects.${pid}.img14">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    const slideAddBtn = document.getElementById('slide-add-project-btn');
    if (slideAddBtn) {
      slideAddBtn.addEventListener('click', addNewProject);
    }
  }

  function openProject(pid, scrollIntoView = true) {
    if (!pid) return;
    activeProjectId = pid;

    // Highlight topbar dropdown item
    document.querySelectorAll('.nav-sub-item[data-project-open]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-project-open') === pid);
    });

    // Highlight project tab pill
    document.querySelectorAll('.proj-tab-pill[data-project-open]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-project-open') === pid);
    });

    // Expand target accordion card & collapse others (or keep clean focus)
    document.querySelectorAll('.fais-project-accordion').forEach(acc => {
      const isMatch = acc.getAttribute('data-project-id') === pid;
      acc.classList.toggle('is-open', isMatch);
    });

    if (scrollIntoView) {
      const card = document.getElementById(`project-card-${pid}`);
      const stage = document.getElementById('projects-showcase-stage');
      if (card && stage) {
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    }
  }

  function addNewProject() {
    if (typeof PORTFOLIO_DATA === 'undefined') return;
    const order = getProjectOrder();
    const nextNum = order.length + 1;
    const newId = `p${nextNum}`;

    ['vi', 'en'].forEach(lang => {
      if (!PORTFOLIO_DATA[lang]) return;
      if (!PORTFOLIO_DATA[lang].projects) PORTFOLIO_DATA[lang].projects = { order: ['p1', 'p2', 'p3', 'p4', 'p5'] };
      if (!Array.isArray(PORTFOLIO_DATA[lang].projects.order)) {
        PORTFOLIO_DATA[lang].projects.order = ['p1', 'p2', 'p3', 'p4', 'p5'];
      }
      if (!PORTFOLIO_DATA[lang].projects.order.includes(newId)) {
        PORTFOLIO_DATA[lang].projects.order.push(newId);
      }
      const template = JSON.parse(JSON.stringify(PORTFOLIO_DATA[lang].projects.p1 || {}));
      template.tabName = `Project ${nextNum}`;
      template.brandName = `Brand ${nextNum}`;
      template.footerLeft = `PROJECT ${nextNum} — NEW CAMPAIGN`;
      template.footerRight = String(nextNum).padStart(2, '0');
      template.board2Header = `BRAND IDENTITY & CAMPAIGN VISUALS | PROJECT ${nextNum}`;
      PORTFOLIO_DATA[lang].projects[newId] = template;
      if (PORTFOLIO_DATA[lang].nav) {
        PORTFOLIO_DATA[lang].nav[`proj${nextNum}`] = `• Project ${nextNum}: Brand ${nextNum}`;
      }
    });

    activeProjectId = newId;
    ensureProjectsStructure(true);
    renderContent();
    goToSlide(2);
    openProject(newId, true);

    if (window.portfolioNotifyProjectAdded) {
      window.portfolioNotifyProjectAdded(newId);
    }
  }

  const navAddProjBtn = document.getElementById('nav-add-project-btn');
  if (navAddProjBtn) {
    navAddProjBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addNewProject();
    });
  }

  // --- 1. RENDER TEXT, IMAGES & BAR CHART ---
  function renderContent() {
    ensureProjectsStructure(false);

    const dict = getDict();
    document.documentElement.lang = currentLang;

    // Update all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = getNestedVal(dict, key);
      if (val !== null && typeof val === 'string') {
        el.textContent = val;
      }
    });

    // Update all [data-img-key] elements
    document.querySelectorAll('[data-img-key]').forEach(img => {
      const key = img.getAttribute('data-img-key');
      const val = getNestedVal(dict, key);
      if (val && typeof val === 'string') {
        img.src = val;
      }
    });

    // Update email, phone, and linkedin hrefs
    const emailLink = document.querySelector('[data-i18n="contact.email"]');
    if (emailLink && dict.contact && dict.contact.email) {
      emailLink.setAttribute('href', `mailto:${dict.contact.email.trim()}`);
    }
    const phoneLink = document.querySelector('[data-i18n="contact.phone"]');
    if (phoneLink && dict.contact && dict.contact.phone) {
      phoneLink.setAttribute('href', `tel:${dict.contact.phone.replace(/\s+/g, '')}`);
    }
    const linkedinLink = document.querySelector('[data-i18n="contact.linkedin"]');
    if (linkedinLink && dict.contact) {
      const url = dict.contact.linkedinUrl || 'https://www.linkedin.com/in/ngodoanthungoc/';
      linkedinLink.setAttribute('href', url);
    }

    // Sync Bar Chart heights from bar1Val..bar5Val
    syncImpactBars();

    // Update language switch active pill
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });

    updateLayoutButtonLabel();

    try {
      window.dispatchEvent(new CustomEvent('portfolio:rendered', { detail: { lang: currentLang } }));
    } catch (e) {}
  }

  function syncImpactBars() {
    const dict = getDict();
    if (!dict.impact) return;
    for (let i = 1; i <= 5; i++) {
      const barEl = document.querySelector(`.bar-fill[data-bar-idx="${i}"]`);
      if (barEl) {
        const raw = parseFloat(String(dict.impact[`bar${i}Val`] || '0').replace(/[^0-9.]/g, '')) || 0;
        const clamped = Math.max(2, Math.min(100, raw));
        barEl.style.setProperty('--pct', `${clamped}%`);
      }
    }
  }

  // --- 2. HORIZONTAL LOOKBOOK SLIDE NAVIGATION ---
  const dots = panels.map((panel, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'pager-dot';
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    if (dotsWrap) dotsWrap.appendChild(dot);
    return dot;
  });

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function goToSlide(index, updateHash = true) {
    if (panels.length === 0) return;
    index = Math.max(0, Math.min(panels.length - 1, index));
    currentSlide = index;

    panels.forEach((panel, i) => {
      panel.classList.toggle('is-active', i === index);
      panel.style.setProperty('--offset', i - index);
    });

    // Highlight brand logo when on Cover (index === 0)
    if (brandHomeBtn) {
      brandHomeBtn.classList.toggle('active', index === 0);
    }

    // Highlight matching tab via data-slide-group (e.g. "2,3,4")
    navPills.forEach((pill) => {
      const groupAttr = pill.getAttribute('data-slide-group') || pill.getAttribute('data-slide-to') || '';
      const groupIndices = groupAttr.split(',').map(s => parseInt(s.trim(), 10));
      pill.classList.toggle('active', groupIndices.includes(index));
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    if (countEl) {
      countEl.textContent = `${pad(index + 1)} / ${pad(panels.length)}`;
    }
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === panels.length - 1;

    const targetId = panels[index].id;
    if (updateHash && targetId && location.hash !== `#${targetId}`) {
      history.replaceState(null, '', `#${targetId}`);
    }

    if (currentMode === 'poster-mode') {
      panels[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Bind top navigation links, project openers, dropdown sub-items & accordion headers
  document.addEventListener('click', (e) => {
    const isEditing = document.body.classList.contains('editor-mode-active');

    // A) Accordion Header Toggle inside #projects
    const accToggle = e.target.closest('[data-project-toggle]');
    if (accToggle) {
      if (isEditing && e.target.closest('[contenteditable="true"]')) {
        return;
      }
      const pid = accToggle.getAttribute('data-project-toggle');
      const card = document.getElementById(`project-card-${pid}`);
      if (card && card.classList.contains('is-open')) {
        card.classList.remove('is-open');
      } else {
        openProject(pid, true);
      }
      return;
    }

    // B) Project Tab Pill or Dropdown Project Item [data-project-open]
    const projOpener = e.target.closest('[data-project-open]');
    if (projOpener) {
      e.preventDefault();
      if (isEditing && e.target.closest('[contenteditable="true"]') && document.activeElement === e.target.closest('[contenteditable="true"]')) {
        return;
      }
      const pid = projOpener.getAttribute('data-project-open');
      const slideAttr = projOpener.getAttribute('data-slide-to');
      if (slideAttr !== null) {
        const idx = parseInt(slideAttr, 10);
        if (!isNaN(idx)) goToSlide(idx);
      }
      openProject(pid, true);
      return;
    }

    // C) Standard Slide Trigger [data-slide-to]
    const slideTrigger = e.target.closest('[data-slide-to]');
    if (slideTrigger) {
      e.preventDefault();
      if (isEditing && e.target.closest('[contenteditable="true"]') && document.activeElement === e.target.closest('[contenteditable="true"]')) {
        return;
      }
      const idx = parseInt(slideTrigger.getAttribute('data-slide-to'), 10);
      if (!isNaN(idx)) goToSlide(idx);

      // Highlight specific sub-activity or skill cluster if clicked from submenu
      const part = slideTrigger.getAttribute('data-highlight-part');
      if (part) {
        document.querySelectorAll('.sub-part-highlight').forEach(el => el.classList.remove('sub-part-highlight'));
        const targets = document.querySelectorAll(`[data-activity-box="${part}"], [data-skill-box="${part}"]`);
        targets.forEach(t => {
          t.classList.add('sub-part-highlight');
          setTimeout(() => t.classList.remove('sub-part-highlight'), 2200);
        });
      }
      return;
    }

    const hashLink = e.target.closest('a[href^="#"]');
    if (hashLink) {
      const id = hashLink.getAttribute('href').slice(1);
      const idx = panels.findIndex(p => p.id === id);
      if (idx !== -1) {
        e.preventDefault();
        goToSlide(idx);
      }
    }
  });

  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

  // Sync when URL hash changes
  function syncFromHash() {
    const idx = panels.findIndex(p => `#${p.id}` === location.hash);
    if (idx !== -1 && idx !== currentSlide) {
      goToSlide(idx, false);
    }
    const vp = document.getElementById('h-viewport');
    const tr = document.getElementById('h-track');
    if (vp) { vp.scrollLeft = 0; vp.scrollTop = 0; }
    if (tr) { tr.scrollLeft = 0; tr.scrollTop = 0; }
  }
  window.addEventListener('hashchange', syncFromHash);
  window.addEventListener('popstate', syncFromHash);

  // Keyboard Arrow Navigation (disabled when typing/editing or modal open)
  document.addEventListener('keydown', (e) => {
    if (currentMode !== 'h-mode') return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
    if (document.querySelector('.cropper-modal-backdrop.active, .lightbox-backdrop.open')) return;

    goToSlide(currentSlide + (e.key === 'ArrowRight' ? 1 : -1));
  });

  // Touch Swipe Navigation
  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (currentMode !== 'h-mode') return;
    if (document.querySelector('.cropper-modal-backdrop.active, .lightbox-backdrop.open')) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goToSlide(currentSlide + (dx < 0 ? 1 : -1));
    }
  }, { passive: true });

  // --- 3. LAYOUT MODE SWITCHER (LOOKBOOK SLIDE vs POSTER BOARD) ---
  function updateLayoutButtonLabel() {
    if (!layoutToggleLabel || !layoutToggleBtn) return;
    const icon = layoutToggleBtn.querySelector('i');
    if (currentMode === 'h-mode') {
      if (icon) icon.className = 'ri-layout-grid-line';
      layoutToggleLabel.textContent = currentLang === 'vi' ? 'Xem toàn bộ Poster' : 'Poster View';
    } else {
      if (icon) icon.className = 'ri-slideshow-line';
      layoutToggleLabel.textContent = currentLang === 'vi' ? 'Xem từng Slide' : 'Slide Deck';
    }
  }

  function applyLayoutMode(mode) {
    currentMode = mode === 'poster-mode' ? 'poster-mode' : 'h-mode';
    localStorage.setItem('eno_portfolio_mode', currentMode);
    document.body.classList.toggle('h-mode', currentMode === 'h-mode');
    document.body.classList.toggle('poster-mode', currentMode === 'poster-mode');
    updateLayoutButtonLabel();
  }

  if (layoutToggleBtn) {
    layoutToggleBtn.addEventListener('click', () => {
      applyLayoutMode(currentMode === 'h-mode' ? 'poster-mode' : 'h-mode');
    });
  }

  // --- 4. LANGUAGE SWITCHER ---
  if (langSwitch) {
    langSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-btn');
      if (!btn) return;
      const lang = btn.getAttribute('data-lang');
      if (lang && lang !== currentLang) {
        currentLang = lang;
        localStorage.setItem('eno_portfolio_lang_v2', currentLang);
        renderContent();
      }
    });
  }

  // --- 4B. INTERACTIVE ENVELOPE STAMP SEAL (CLICK STAMP TO POP UP LETTER) ---
  const pinkEnvelope = document.getElementById('pink-envelope');
  const envelopeStampBtn = document.getElementById('envelope-stamp-btn');
  if (pinkEnvelope && envelopeStampBtn) {
    envelopeStampBtn.addEventListener('click', (e) => {
      if (document.body.classList.contains('editor-mode-active') && e.target.closest('[contenteditable="true"]')) {
        return;
      }
      const isOpen = pinkEnvelope.classList.toggle('is-open');
      envelopeStampBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // --- 5. LIGHTBOX IMAGE PREVIEW (WHEN NOT IN EDIT MODE) ---
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('editor-mode-active')) return;
    const img = e.target.closest('.fais-bento-card img, .mood-img-box img, .works-thumb img, .social-bottom-photo-wrap img, .impact-clip-frame img');
    if (!img || !lightboxModal || !lightboxImg) return;
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || 'Preview';
    lightboxModal.classList.add('open');
    lightboxModal.setAttribute('aria-hidden', 'false');
  });

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open');
    lightboxModal.setAttribute('aria-hidden', 'true');
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('open')) {
      closeLightbox();
    }
  });

  // Expose Global API for Live Visual Editor
  window.portfolioGetCurrentLang = () => currentLang;
  window.portfolioSetLanguage = (lang) => {
    if (lang === 'en' || lang === 'vi') {
      currentLang = lang;
      localStorage.setItem('eno_portfolio_lang_v2', currentLang);
      renderContent();
    }
  };
  window.portfolioRenderAll = renderContent;
  window.portfolioSyncBars = syncImpactBars;
  window.portfolioOpenProject = openProject;

  // Initialize
  applyLayoutMode(currentMode);
  const startIdx = panels.findIndex(p => `#${p.id}` === location.hash);
  goToSlide(startIdx !== -1 ? startIdx : 0, false);
  renderContent();
})();
