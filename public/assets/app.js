/**
 * Pink City Gems — Smart CONNECT QR Client Engine
 * High-performance mobile client with instant loading, anti-duplicate rotation, and clipboard redirect.
 */

(function () {
  'use strict';

  // State
  let currentCategory = 'all';
  let availableReviews = [];
  let testModeActive = false;
  let pauseRedirect = false;

  const STORAGE_KEY = 'smart_copied_reviews_v1';
  const TEST_MODE_KEY = 'smart_connect_test_mode';

  // DOM Elements
  const bizNameEl = document.getElementById('biz-name');
  const bizLocalityEl = document.getElementById('biz-locality');
  const categoriesContainer = document.getElementById('categories-container');
  const reviewsFeed = document.getElementById('reviews-feed');
  const reviewCountBadge = document.getElementById('review-count-badge');
  const modalOverlay = document.getElementById('copy-modal');
  const modalProgressBar = document.getElementById('modal-progress');
  const testModeToggle = document.getElementById('test-mode-toggle');
  const testActionsPanel = document.getElementById('test-actions-panel');
  const btnResetCopied = document.getElementById('btn-reset-copied');
  const btnToggleRedirect = document.getElementById('btn-toggle-redirect');
  const testStatusNotice = document.getElementById('test-status-notice');

  // Load Data
  function getData() {
    if (window.SMART_CONNECT_DATA && window.SMART_CONNECT_DATA.business) {
      return Promise.resolve(window.SMART_CONNECT_DATA);
    }
    return fetch('./assets/data-bundle.js')
      .then(() => window.SMART_CONNECT_DATA || null)
      .catch((err) => {
        console.warn('Fallback loading data bundle:', err);
        return null;
      });
  }

  // Get copied review IDs from local storage
  function getCopiedReviewIds() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Mark a review as copied
  function markReviewCopied(id) {
    const ids = getCopiedReviewIds();
    if (!ids.includes(id)) {
      ids.push(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      } catch (e) {
        console.warn('Storage quota exceeded:', e);
      }
    }
  }

  // Fisher-Yates array shuffle for unique per-session ordering
  function shuffleArray(arr) {
    const array = [...arr];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Initialize UI
  async function init() {
    const data = await getData();
    if (!data) {
      reviewsFeed.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Unable to load reviews</h3><p>Please refresh the page or check connection.</p></div>';
      return;
    }

    const { business, categories, reviews } = data;

    // Set business headers
    if (bizNameEl) bizNameEl.textContent = business.name || 'Pink City Gems';
    if (bizLocalityEl) {
      bizLocalityEl.innerHTML = `📍 ${business.locality || 'Sector 23-C, Chandigarh'}`;
    }

    // Check URL parameters for category or test mode
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('cat');
    if (urlParams.get('test') === '1' || localStorage.getItem(TEST_MODE_KEY) === 'true') {
      testModeActive = true;
      if (testModeToggle) testModeToggle.checked = true;
      if (testActionsPanel) testActionsPanel.classList.add('active');
    }

    // Render category filters
    renderCategories(categories, catParam);

    // Filter reviews (Anti-duplicate: exclude locally copied & globally claimed)
    const locallyCopied = getCopiedReviewIds();
    availableReviews = reviews.filter((r) => {
      if (testModeActive) return true; // Show all when testing if desired
      return !r.used && !locallyCopied.includes(r.id);
    });

    // Shuffle reviews so simultaneous visitors don't see identical top cards
    availableReviews = shuffleArray(availableReviews);

    // Render feed
    filterAndRenderFeed();
    updateCounterBadge();

    // Setup event listeners
    setupEventListeners(business);
  }

  // Render Category Filter Pills
  function renderCategories(categories, defaultCat) {
    if (!categoriesContainer) return;

    categoriesContainer.innerHTML = '';

    // "All Categories" pill
    const allBtn = document.createElement('button');
    allBtn.className = 'category-pill' + (!defaultCat || defaultCat === 'all' ? ' active' : '');
    allBtn.id = 'pill-cat-all';
    allBtn.innerHTML = '✨ All Categories';
    allBtn.addEventListener('click', () => selectCategory('all'));
    categoriesContainer.appendChild(allBtn);

    // 5 Categories
    categories.forEach((cat, idx) => {
      const btn = document.createElement('button');
      const isMatch = defaultCat === cat.id || defaultCat === String(idx + 1);
      if (isMatch) currentCategory = cat.id;
      btn.className = 'category-pill' + (isMatch ? ' active' : '');
      btn.id = `pill-cat-${cat.id}`;
      btn.innerHTML = `${cat.icon || '🏷️'} ${cat.name}`;
      btn.title = cat.description;
      btn.addEventListener('click', () => selectCategory(cat.id));
      categoriesContainer.appendChild(btn);
    });
  }

  // Handle category switch
  function selectCategory(catId) {
    currentCategory = catId;
    const pills = categoriesContainer.querySelectorAll('.category-pill');
    pills.forEach((p) => p.classList.remove('active'));

    const activePill = document.getElementById(catId === 'all' ? 'pill-cat-all' : `pill-cat-${catId}`);
    if (activePill) activePill.classList.add('active');

    filterAndRenderFeed();
  }

  // Filter & Render Cards
  function filterAndRenderFeed() {
    let filtered = availableReviews;
    if (currentCategory !== 'all') {
      filtered = availableReviews.filter((r) => r.categoryId === currentCategory);
    }

    if (filtered.length === 0) {
      reviewsFeed.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <h3>You're All Caught Up!</h3>
          <p>You have reviewed our suggestions in this category. Tap below to write your custom review on Google Maps.</p>
          <button id="btn-custom-review" class="btn-copy-post" style="margin-top: 16px;">
            ⭐⭐⭐⭐⭐ Open Google Reviews
          </button>
        </div>
      `;
      const btnCustom = document.getElementById('btn-custom-review');
      if (btnCustom) {
        btnCustom.addEventListener('click', () => {
          window.location.href = window.SMART_CONNECT_DATA?.business?.googleReviewUrl || 'https://maps.google.com/?cid=9732890204388975020';
        });
      }
      return;
    }

    reviewsFeed.innerHTML = filtered.map((r) => createReviewCardHTML(r)).join('');

    // Attach copy & post events
    reviewsFeed.querySelectorAll('.btn-copy-post').forEach((btn) => {
      btn.addEventListener('click', () => {
        const reviewId = btn.getAttribute('data-id');
        const reviewText = decodeURIComponent(btn.getAttribute('data-text'));
        handleCopyAndPost(reviewId, reviewText);
      });
    });
  }

  // Create single card HTML
  function createReviewCardHTML(r) {
    const initials = r.author
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    // Category display name
    const catMeta = window.SMART_CONNECT_DATA?.categories?.find((c) => c.id === r.categoryId);
    const catBadge = catMeta ? `${catMeta.icon} ${catMeta.name}` : 'Verified Customer';

    return `
      <div class="review-card" id="card-${r.id}">
        <div class="card-top">
          <div class="author-meta">
            <div class="author-avatar">${initials}</div>
            <div>
              <div class="author-name">${r.author}</div>
              <div class="author-sub">Verified Buyer • Local Guide</div>
            </div>
          </div>
          <span class="card-category-badge">${catBadge}</span>
        </div>
        <div class="card-stars">★★★★★</div>
        <p class="card-text">"${r.text}"</p>
        <button class="btn-copy-post" data-id="${r.id}" data-text="${encodeURIComponent(r.text)}" id="btn-copy-${r.id}">
          <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          <span>Tap to Copy & Post Review</span>
        </button>
      </div>
    `;
  }

  // Handle Copy to Clipboard & Redirect
  function handleCopyAndPost(reviewId, text) {
    // 1. Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }

    // 2. Mark as used in localStorage
    markReviewCopied(reviewId);

    // 3. Update in-memory pool so it disappears on next reload
    availableReviews = availableReviews.filter((r) => r.id !== reviewId);
    updateCounterBadge();

    // 4. Show modal confirmation
    if (modalOverlay) {
      modalOverlay.classList.add('active');
      if (modalProgressBar) {
        modalProgressBar.style.width = '0%';
        setTimeout(() => {
          modalProgressBar.style.width = '100%';
        }, 50);
      }
    }

    // 5. Redirect to Google Maps review link after 1.2s (unless pauseRedirect is active in test mode)
    const reviewUrl = window.SMART_CONNECT_DATA?.business?.googleReviewUrl || 'https://maps.google.com/?cid=9732890204388975020';

    if (testModeActive && pauseRedirect) {
      console.log('🧪 Test Mode: Redirect paused. Target URL is:', reviewUrl);
      setTimeout(() => {
        if (modalOverlay) modalOverlay.classList.remove('active');
        filterAndRenderFeed();
      }, 1500);
      return;
    }

    setTimeout(() => {
      window.location.href = reviewUrl;
    }, 1200);
  }

  // Textarea fallback for clipboard copying
  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  // Update counter badge
  function updateCounterBadge() {
    if (reviewCountBadge) {
      reviewCountBadge.textContent = `${availableReviews.length} available`;
    }
  }

  // Setup Testing and Auxiliary Event Listeners
  function setupEventListeners(business) {
    if (testModeToggle) {
      testModeToggle.addEventListener('change', (e) => {
        testModeActive = e.target.checked;
        localStorage.setItem(TEST_MODE_KEY, String(testModeActive));
        if (testActionsPanel) {
          testActionsPanel.classList.toggle('active', testModeActive);
        }
        filterAndRenderFeed();
      });
    }

    if (btnToggleRedirect) {
      btnToggleRedirect.addEventListener('click', () => {
        pauseRedirect = !pauseRedirect;
        btnToggleRedirect.textContent = pauseRedirect ? '▶️ Resume Auto-Redirect' : '⏸️ Pause Auto-Redirect';
        btnToggleRedirect.style.background = pauseRedirect ? '#dc2626' : '';
      });
    }

    if (btnResetCopied) {
      btnResetCopied.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        alert('✓ Local review history cleared! Reloading reviews pool...');
        window.location.reload();
      });
    }

    // Modal background click dismiss
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('active');
        }
      });
    }
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
