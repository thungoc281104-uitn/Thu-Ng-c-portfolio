/**
 * Live Visual In-Place Editor & Image Cropper Studio
 * For E nờ Portfolio (Clean Girl / Editorial Minimal Template)
 * - Auto-saves on every change + explicit "LƯU THAY ĐỔI" button
 * - Saves permanently to disk (js/data.js & assets/images/) via http://localhost:3457
 * - Also persists in IndexedDB + localStorage so file:// or Live Server never loses edits
 */

(function () {
  'use strict';

  const API_BASES = ['http://localhost:3457', ''];
  const STORAGE_KEY = 'eno_portfolio_saved_data_v17';
  const IDB_NAME = 'EnoPortfolioDB';
  const IDB_STORE = 'state';
  const IDB_RECORD_KEY = 'portfolioData_v17';

  let isEditMode = false;
  let unsavedCount = 0;
  let pendingImageUploads = [];
  let activeImageTarget = null;
  let activeCropper = null;
  let cropperScaleX = 1;
  let autoSaveTimer = null;

  const initialBackupData = typeof PORTFOLIO_DATA !== 'undefined'
    ? JSON.parse(JSON.stringify(PORTFOLIO_DATA))
    : {};

  // --- INDEXEDDB HELPER (Supports large cropped images without 5MB localStorage limit) ---
  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('No IndexedDB'));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function deepMergeObj(target, source) {
    if (!target || !source || typeof source !== 'object') return target;
    Object.keys(source).forEach(k => {
      if (Array.isArray(source[k])) {
        target[k] = source[k].slice();
      } else if (source[k] && typeof source[k] === 'object') {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        deepMergeObj(target[k], source[k]);
      } else {
        target[k] = source[k];
      }
    });
    return target;
  }

  function stripHeavyDataUrls(obj) {
    const clone = JSON.parse(JSON.stringify(obj));
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      Object.keys(node).forEach(k => {
        if (typeof node[k] === 'string' && node[k].startsWith('data:image/') && node[k].length > 50000) {
          delete node[k];
        } else if (typeof node[k] === 'object') {
          walk(node[k]);
        }
      });
    }
    walk(clone);
    return clone;
  }

  async function saveToBrowserStorage(dataObj) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataObj));
    } catch (quotaErr) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyDataUrls(dataObj)));
      } catch (e) { }
    }
    try {
      const db = await openIDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(JSON.parse(JSON.stringify(dataObj)), IDB_RECORD_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { }
  }

  async function loadFromBrowserStorage() {
    try {
      const db = await openIDB();
      const idbData = await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_RECORD_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (idbData && idbData.vi && idbData.en) return idbData;
    } catch (e) { }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.vi && parsed.en) return parsed;
      }
    } catch (e) { }
    return null;
  }

  async function clearBrowserStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { }
    try {
      const db = await openIDB();
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_RECORD_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch (e) { }
  }

  // Restore saved browser state on startup (synchronous localStorage first, then IndexedDB, then Server)
  try {
    const rawSync = localStorage.getItem(STORAGE_KEY);
    if (rawSync && typeof PORTFOLIO_DATA !== 'undefined') {
      const parsedSync = JSON.parse(rawSync);
      if (parsedSync && parsedSync.vi && parsedSync.en) {
        deepMergeObj(PORTFOLIO_DATA, parsedSync);
        if (window.portfolioRenderAll) window.portfolioRenderAll();
      }
    }
  } catch (e) { }

  loadFromBrowserStorage().then((saved) => {
    if (saved && typeof PORTFOLIO_DATA !== 'undefined') {
      deepMergeObj(PORTFOLIO_DATA, saved);
      if (window.portfolioRenderAll) window.portfolioRenderAll();
    }
  });

  // Also fetch latest from local server in case browser opened via file:// or localhost with cleared storage
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:') {
    fetch('http://localhost:3457/api/get-content', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res && res.success && res.portfolioData && typeof PORTFOLIO_DATA !== 'undefined') {
          deepMergeObj(PORTFOLIO_DATA, res.portfolioData);
          if (window.portfolioRenderAll) window.portfolioRenderAll();
        }
      })
      .catch(() => { });
  }

  function getActiveLang() {
    return (window.portfolioGetCurrentLang && window.portfolioGetCurrentLang()) || 'vi';
  }

  function setNestedVal(obj, pathStr, value) {
    if (!obj || !pathStr) return;
    const keys = pathStr.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') {
        cur[keys[i]] = {};
      }
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  // Helper to call local server API (Uses text/plain to bypass CORS preflight OPTIONS on file://)
  async function postApi(endpoint, payload) {
    for (const base of API_BASES) {
      if (!base && location.protocol === 'file:') continue;
      try {
        const res = await fetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) { }
    }
    return null;
  }

  // --- 1. FLOATING EDITOR TOOLBAR ---
  function initToolbar() {
    if (document.getElementById('live-editor-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'live-editor-toolbar';
    toolbar.className = 'live-editor-toolbar minimized';

    toolbar.innerHTML = `
      <div class="editor-bar-capsule">
        <div class="editor-status-pill">
          <span class="editor-pulse-dot"></span>
          <span id="editor-status-text">STUDIO EDIT</span>
        </div>

        <span class="editor-hint-text">Nhấp vào chữ để sửa (tự động lưu) • Rê chuột lên ảnh để thay/cắt</span>

        <button type="button" class="editor-btn-action editor-btn-save" id="editor-save-btn" title="Lưu vĩnh viễn (Ctrl + S)">
          <i class="ri-save-3-line"></i>
          <span>LƯU THAY ĐỔI</span>
          <span class="editor-unsaved-badge" id="editor-unsaved-badge" style="display:none;">0</span>
        </button>

        <button type="button" class="editor-btn-action" id="editor-reset-btn" title="Khôi phục nội dung mặc định">
          <i class="ri-refresh-line"></i>
          <span>Đặt lại</span>
        </button>

        <button type="button" class="editor-btn-action" id="editor-close-btn" title="Đóng chế độ sửa">
          <i class="ri-close-circle-line"></i>
          <span>Đóng</span>
        </button>
      </div>
    `;

    document.body.appendChild(toolbar);

    const toast = document.createElement('div');
    toast.id = 'editor-toast';
    toast.className = 'editor-toast';
    document.body.appendChild(toast);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'editor-hidden-file-input';
    fileInput.accept = 'image/png, image/jpeg, image/webp, image/svg+xml';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const topEditBtn = document.getElementById('top-edit-btn');
    if (topEditBtn) {
      topEditBtn.addEventListener('click', () => {
        setEditMode(!isEditMode);
      });
    }

    document.getElementById('editor-save-btn').addEventListener('click', () => saveAllChanges(false));
    document.getElementById('editor-reset-btn').addEventListener('click', resetToDefault);
    document.getElementById('editor-close-btn').addEventListener('click', () => {
      saveAllChanges(true);
      setEditMode(false);
    });

    // Ctrl+S / Cmd+S shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (isEditMode || unsavedCount > 0) {
          e.preventDefault();
          saveAllChanges(false);
        }
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !activeImageTarget) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        openCropperModal({
          imageSrc: ev.target.result,
          imgKey: activeImageTarget.imgKey,
          imgEl: activeImageTarget.imgEl,
          ratio: activeImageTarget.ratio,
          filename: file.name.replace(/\.[^.]+$/, '')
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function showToast(msg) {
    const toast = document.getElementById('editor-toast');
    if (!toast) return;
    toast.innerHTML = `<i class="ri-checkbox-circle-line" style="color:#f09cb8;margin-right:6px;"></i> ${msg}`;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function scheduleAutoSave() {
    unsavedCount++;
    const badge = document.getElementById('editor-unsaved-badge');
    if (badge) {
      badge.textContent = unsavedCount;
      badge.style.display = 'inline-block';
    }
    // Save immediately to browser storage so refreshing never loses anything
    if (typeof PORTFOLIO_DATA !== 'undefined') {
      saveToBrowserStorage(PORTFOLIO_DATA);
    }
    // Fast debounced disk save to js/data.js (250ms)
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveAllChanges(true);
    }, 250);
  }

  // Ensure immediate flush ONLY if the user actually made edits in this session
  window.addEventListener('beforeunload', () => {
    if (!unsavedCount || typeof PORTFOLIO_DATA === 'undefined') return;
    try {
      saveToBrowserStorage(PORTFOLIO_DATA);
    } catch (e) { }
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify({ portfolioData: PORTFOLIO_DATA })], {
          type: 'text/plain;charset=UTF-8'
        });
        navigator.sendBeacon('http://localhost:3457/api/save-content', blob);
      } catch (e) { }
    }
  });

  function clearChanged() {
    unsavedCount = 0;
    const badge = document.getElementById('editor-unsaved-badge');
    if (badge) badge.style.display = 'none';
  }

  function setEditMode(enable) {
    isEditMode = !!enable;
    document.body.classList.toggle('editor-mode-active', isEditMode);
    const toolbar = document.getElementById('live-editor-toolbar');
    if (toolbar) toolbar.classList.toggle('minimized', !isEditMode);

    if (isEditMode) {
      enableTextEditing();
      enableImageOverlays();
      showToast('Đã bật chế độ sửa! Mọi thay đổi được tự động lưu.');
    } else {
      disableTextEditing();
      disableImageOverlays();
    }
  }

  // --- 2. IN-PLACE TEXT EDITING ---
  function enableTextEditing() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      // Do not make the Edit Studio button itself contenteditable
      if (el.closest('#top-edit-btn')) return;

      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');

      if (!el._boundEdit) {
        el._boundEdit = true;

        const syncText = () => {
          const key = el.getAttribute('data-i18n');
          const lang = getActiveLang();
          if (key && PORTFOLIO_DATA[lang]) {
            const val = el.innerText.trim();
            setNestedVal(PORTFOLIO_DATA[lang], key, val);
            // Sync duplicate elements in DOM sharing the same data-i18n key
            document.querySelectorAll(`[data-i18n="${key}"]`).forEach(other => {
              if (other !== el && other.innerText.trim() !== val) {
                other.textContent = val;
              }
            });
            // Sync shared brand/project keys across both VI and EN
            if (key === 'nav.brand' || key === 'cover.firstName' || key === 'cover.lastName' || key.startsWith('projects.')) {
              ['vi', 'en'].forEach(l => {
                if (PORTFOLIO_DATA[l]) setNestedVal(PORTFOLIO_DATA[l], key, val);
              });
            }
            if (key.startsWith('impact.bar') && window.portfolioSyncBars) {
              window.portfolioSyncBars();
            }
            scheduleAutoSave();
          }
        };

        el.addEventListener('input', syncText);
        el.addEventListener('blur', syncText);
      }
    });
  }

  function disableTextEditing() {
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });
  }

  // --- 3. IMAGE OVERLAYS & CROPPER STUDIO ---
  function enableImageOverlays() {
    document.querySelectorAll('img[data-img-key]').forEach(img => {
      const parent = img.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      if (parent.querySelector('.editor-img-overlay')) return;

      const ratioAttr = parseFloat(parent.getAttribute('data-crop-ratio') || 'NaN');
      const imgKey = img.getAttribute('data-img-key');

      const overlay = document.createElement('div');
      overlay.className = 'editor-img-overlay';
      overlay.innerHTML = `
        <button type="button" class="editor-img-btn btn-upload" title="Tải ảnh mới từ máy">
          <i class="ri-upload-2-line"></i> Thay ảnh
        </button>
        <button type="button" class="editor-img-btn btn-crop" title="Căn chỉnh khung cắt">
          <i class="ri-crop-2-line"></i> Cắt
        </button>
      `;

      overlay.querySelector('.btn-upload').addEventListener('click', (e) => {
        e.stopPropagation();
        activeImageTarget = { imgKey, imgEl: img, ratio: ratioAttr };
        const fileInput = document.getElementById('editor-hidden-file-input');
        if (fileInput) {
          fileInput.value = '';
          fileInput.click();
        }
      });

      overlay.querySelector('.btn-crop').addEventListener('click', (e) => {
        e.stopPropagation();
        openCropperModal({
          imageSrc: img.src,
          imgKey,
          imgEl: img,
          ratio: ratioAttr,
          filename: imgKey.replace(/\./g, '_')
        });
      });

      parent.appendChild(overlay);
    });
  }

  function disableImageOverlays() {
    document.querySelectorAll('.editor-img-overlay').forEach(el => el.remove());
  }

  function openCropperModal({ imageSrc, imgKey, imgEl, ratio, filename }) {
    activeImageTarget = { imgKey, imgEl, ratio, filename };
    const modal = document.getElementById('image-cropper-modal');
    const stageImg = document.getElementById('cropper-active-image');
    const zoomSlider = document.getElementById('cropper-zoom-slider');
    const zoomVal = document.getElementById('cropper-zoom-val');

    if (!modal || !stageImg) return;

    if (activeCropper) {
      activeCropper.destroy();
      activeCropper = null;
    }

    cropperScaleX = 1;
    stageImg.src = imageSrc;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const initCropper = () => {
      if (typeof Cropper === 'undefined') return;
      activeCropper = new Cropper(stageImg, {
        aspectRatio: isNaN(ratio) ? NaN : ratio,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.96,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        preview: '#cropper-live-preview',
        ready() {
          if (zoomSlider) zoomSlider.value = 1;
          if (zoomVal) zoomVal.textContent = '100%';
        }
      });
    };

    if (stageImg.complete && stageImg.naturalWidth > 0) {
      initCropper();
    } else {
      stageImg.onload = () => {
        initCropper();
        stageImg.onload = null;
      };
    }
  }

  function closeCropperModal() {
    const modal = document.getElementById('image-cropper-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (activeCropper) {
      activeCropper.destroy();
      activeCropper = null;
    }
  }

  function initCropperEvents() {
    const closeBtn = document.getElementById('cropper-close-btn');
    const cancelBtn = document.getElementById('cropper-cancel-btn');
    const applyBtn = document.getElementById('cropper-apply-btn');
    const changeFileBtn = document.getElementById('cropper-change-file-btn');
    const zoomSlider = document.getElementById('cropper-zoom-slider');
    const zoomVal = document.getElementById('cropper-zoom-val');
    const zoomInBtn = document.getElementById('cropper-zoom-in-btn');
    const zoomOutBtn = document.getElementById('cropper-zoom-out-btn');
    const rotLeftBtn = document.getElementById('cropper-rot-left-btn');
    const rotRightBtn = document.getElementById('cropper-rot-right-btn');
    const flipXBtn = document.getElementById('cropper-flip-x-btn');
    const resetBtn = document.getElementById('cropper-reset-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeCropperModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCropperModal);

    if (changeFileBtn) {
      changeFileBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('editor-hidden-file-input');
        if (fileInput) {
          fileInput.value = '';
          fileInput.click();
        }
      });
    }

    document.querySelectorAll('.cropper-ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!activeCropper) return;
        document.querySelectorAll('.cropper-ratio-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const r = parseFloat(btn.getAttribute('data-ratio'));
        activeCropper.setAspectRatio(isNaN(r) ? NaN : r);
      });
    });

    if (zoomSlider) {
      zoomSlider.addEventListener('input', () => {
        if (!activeCropper) return;
        const val = parseFloat(zoomSlider.value);
        activeCropper.zoomTo(val);
        if (zoomVal) zoomVal.textContent = `${Math.round(val * 100)}%`;
      });
    }

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => activeCropper && activeCropper.zoom(0.1));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => activeCropper && activeCropper.zoom(-0.1));
    if (rotLeftBtn) rotLeftBtn.addEventListener('click', () => activeCropper && activeCropper.rotate(-90));
    if (rotRightBtn) rotRightBtn.addEventListener('click', () => activeCropper && activeCropper.rotate(90));
    if (flipXBtn) {
      flipXBtn.addEventListener('click', () => {
        if (!activeCropper) return;
        cropperScaleX = -cropperScaleX;
        activeCropper.scaleX(cropperScaleX);
      });
    }
    if (resetBtn) resetBtn.addEventListener('click', () => activeCropper && activeCropper.reset());

    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        if (!activeCropper || !activeImageTarget) return;
        const isPng = activeImageTarget.imgKey === 'cover.portrait';
        const canvas = activeCropper.getCroppedCanvas({
          maxWidth: 1600,
          maxHeight: 1600,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        if (!canvas) return;

        const dataUrl = isPng
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.92);

        if (activeImageTarget.imgEl) {
          activeImageTarget.imgEl.src = dataUrl;
        }

        if (typeof PORTFOLIO_DATA !== 'undefined') {
          ['en', 'vi'].forEach(lang => {
            if (PORTFOLIO_DATA[lang]) {
              setNestedVal(PORTFOLIO_DATA[lang], activeImageTarget.imgKey, dataUrl);
            }
          });
        }

        pendingImageUploads.push({
          imgKey: activeImageTarget.imgKey,
          dataUrl,
          filename: activeImageTarget.filename || 'cropped_img'
        });

        closeCropperModal();
        await saveAllChanges(false);
      });
    }
  }

  // --- 4. SAVE & RESET ---
  async function saveAllChanges(silent = false) {
    if (typeof PORTFOLIO_DATA === 'undefined') return;

    // 1. Always persist to IndexedDB & localStorage immediately
    await saveToBrowserStorage(PORTFOLIO_DATA);

    // 2. Upload any pending images & write permanently to js/data.js via local server (port 3457)
    let savedToDisk = false;
    try {
      while (pendingImageUploads.length > 0) {
        const item = pendingImageUploads[0];
        const upRes = await postApi('/api/upload-image', {
          data: item.dataUrl,
          filename: item.filename
        });
        if (upRes && upRes.success && upRes.url) {
          ['en', 'vi'].forEach(lang => {
            if (PORTFOLIO_DATA[lang]) {
              setNestedVal(PORTFOLIO_DATA[lang], item.imgKey, upRes.url);
            }
          });
          pendingImageUploads.shift();
        } else {
          break;
        }
      }

      const saveRes = await postApi('/api/save-content', {
        portfolioData: PORTFOLIO_DATA
      });

      if (saveRes && saveRes.success) {
        savedToDisk = true;
        await saveToBrowserStorage(PORTFOLIO_DATA);
      }
    } catch (e) { }

    clearChanged();
    if (!silent) {
      if (savedToDisk) {
        showToast('Đã lưu vĩnh viễn vào mã nguồn (js/data.js)!');
      } else {
        showToast('Đã lưu thành công!');
      }
    }
  }

  async function resetToDefault() {
    if (!confirm('Khôi phục toàn bộ nội dung về bản mẫu gốc?')) return;
    await clearBrowserStorage();
    Object.assign(PORTFOLIO_DATA, JSON.parse(JSON.stringify(initialBackupData)));
    await postApi('/api/save-content', { portfolioData: PORTFOLIO_DATA });
    if (window.portfolioRenderAll) window.portfolioRenderAll();
    if (isEditMode) {
      enableTextEditing();
      enableImageOverlays();
    }
    clearChanged();
    showToast('Đã khôi phục về nội dung mặc định!');
  }

  window.portfolioNotifyProjectAdded = (newId) => {
    if (isEditMode) {
      enableTextEditing();
      enableImageOverlays();
    }
    scheduleAutoSave();
    showToast(`Đã tạo thêm ${newId.toUpperCase()} thành công!`);
  };

  window.addEventListener('portfolio:rendered', () => {
    if (isEditMode) {
      enableTextEditing();
      enableImageOverlays();
    }
  });

  initToolbar();
  initCropperEvents();
})();
