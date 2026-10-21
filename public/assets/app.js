/**
 * Smart CONNECT QR Client Engine
 * 5-Ready Reviews Selection + Universal Dynamic Business & Google Write-a-Review Redirect
 */

(function () {
  'use strict';

  // State
  let availableReviews = [];
  let testModeActive = false;
  let pauseRedirect = false;
  let activeBusiness = {
    name: 'Pink City Gems',
    locality: 'Sector 23-C, Chandigarh',
    googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJdSHXX7ztDzkRrOF75hIsEoc',
    placeId: 'ChIJdSHXX7ztDzkRrOF75hIsEoc'
  };

  const STORAGE_KEY = 'smart_copied_reviews_v2';
  const TEST_MODE_KEY = 'smart_connect_test_mode';

  // DOM Elements
  const bizNameEl = document.getElementById('biz-name');
  const bizLocalityEl = document.getElementById('biz-locality');
  const reviewsFeed = document.getElementById('reviews-feed');
  const reviewCountBadge = document.getElementById('review-count-badge');
  const modalOverlay = document.getElementById('copy-modal');
  const modalProgressBar = document.getElementById('modal-progress');
  const modalPreviewText = document.getElementById('modal-preview-text');
  const modalDirectBtn = document.getElementById('modal-direct-btn');
  const testModeToggle = document.getElementById('test-mode-toggle');
  const testActionsPanel = document.getElementById('test-actions-panel');
  const btnResetCopied = document.getElementById('btn-reset-copied');
  const btnToggleRedirect = document.getElementById('btn-toggle-redirect');

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

  // Generate 5 natural, human-sounding reviews for any external business
  function generateNaturalBusinessReviews(bizName, category, ownerName, colloquial) {
    if (window.AiReviewEngine) {
      const sanitized = window.AiReviewEngine.sanitizeBusinessTitle(bizName);
      const res = window.AiReviewEngine.generateSmartReviews({
        name: sanitized.clean,
        colloquial: colloquial || sanitized.colloquial,
        category: category || sanitized.categoryHint,
        ownerName: ownerName || ''
      });
      return res.reviews;
    }

    // Fallback if AI engine not loaded
    return [
      {
        id: 'rev_1',
        badge: '⭐ Quality & Variety',
        author: 'Rohit Sharma',
        rating: 5,
        text: `Consistently high quality products and dependable service. Everything was neatly organized and handled with great care.`
      },
      {
        id: 'rev_2',
        badge: '🤝 Humble Hospitality',
        author: 'Priya Verma',
        rating: 5,
        text: `The staff and owner are remarkably polite, humble, and attentive to customer needs. Truly welcoming neighborhood service!`
      },
      {
        id: 'rev_3',
        badge: '💰 Fair & Honest Rates',
        author: 'Amit Patel',
        rating: 5,
        text: `Honest and transparent pricing with zero unnecessary markups. Great value for money and complete peace of mind.`
      },
      {
        id: 'rev_4',
        badge: '✨ Clean & Convenient',
        author: 'Dr. Neha Gupta',
        rating: 5,
        text: `A very smooth, clean, and hassle-free shopping experience. Prompt assistance and hassle-free billing every single time.`
      },
      {
        id: 'rev_5',
        badge: '🏆 Highly Recommended',
        author: 'Rajesh Mehra',
        rating: 5,
        text: `Our family has trusted this establishment for a long time. Consistent standards, fair dealing, and humble customer care. 5 stars!`
      }
    ];
  }

  // Initialize UI
  async function init() {
    const data = await getData();
    const defaultBiz = data?.business || activeBusiness;

    // 1. Check URL parameters for any dynamic business
    const urlParams = new URLSearchParams(window.location.search);
    const paramBiz = urlParams.get('biz');
    const paramPlaceId = urlParams.get('placeid');
    const paramLoc = urlParams.get('loc');
    const paramCat = urlParams.get('cat');
    const paramShort = urlParams.get('short');
    const paramOwner = urlParams.get('owner');
    const paramRevs = urlParams.get('revs');
    const paramReviewUrl = urlParams.get('reviewUrl');

    if (paramPlaceId) {
      activeBusiness.placeId = paramPlaceId;
      activeBusiness.googleReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(paramPlaceId)}`;
    } else if (paramReviewUrl) {
      activeBusiness.googleReviewUrl = paramReviewUrl;
    } else {
      activeBusiness.placeId = defaultBiz.placeId;
      activeBusiness.googleReviewUrl = defaultBiz.googleReviewUrl;
    }

    if (paramBiz) {
      const decodedRaw = decodeURIComponent(paramBiz);
      const sanitized = window.AiReviewEngine 
        ? window.AiReviewEngine.sanitizeBusinessTitle(decodedRaw)
        : { clean: decodedRaw, colloquial: decodedRaw };

      activeBusiness.name = sanitized.clean;
      activeBusiness.colloquial = paramShort ? decodeURIComponent(paramShort) : sanitized.colloquial;
      activeBusiness.category = paramCat ? decodeURIComponent(paramCat) : sanitized.categoryHint;
      activeBusiness.locality = paramLoc ? decodeURIComponent(paramLoc) : 'Verified Google Business';
    } else {
      activeBusiness.name = defaultBiz.name || 'Pink City Gems';
      activeBusiness.colloquial = 'Pink City Gems';
      activeBusiness.category = 'Gemstone Dealer';
      activeBusiness.locality = defaultBiz.locality || 'Sector 23-C, Chandigarh';
    }

    // Update document title and header
    document.title = `${activeBusiness.name} — Leave a 5★ Google Review`;
    if (bizNameEl) bizNameEl.textContent = activeBusiness.name;
    if (bizLocalityEl) bizLocalityEl.innerHTML = `📍 ${activeBusiness.locality}`;

    // Test mode query check
    if (urlParams.get('test') === '1' || localStorage.getItem(TEST_MODE_KEY) === 'true') {
      testModeActive = true;
      if (testModeToggle) testModeToggle.checked = true;
      if (testActionsPanel) testActionsPanel.classList.add('active');
    }

    // 2. Load the 5 ready comments
    // Check if custom packed reviews exist in URL
    if (paramRevs && window.AiReviewEngine) {
      const unpacked = window.AiReviewEngine.unpackReviewsFromUrl(paramRevs);
      if (unpacked && unpacked.length >= 5) {
        availableReviews = unpacked.slice(0, 5);
      }
    }

    // If still empty, check for active custom business
    if (!availableReviews || availableReviews.length === 0) {
      if (paramBiz && paramBiz.toLowerCase() !== 'pink city gems') {
        availableReviews = generateNaturalBusinessReviews(
          activeBusiness.name,
          activeBusiness.category,
          paramOwner ? decodeURIComponent(paramOwner) : '',
          activeBusiness.colloquial
        );
      } else {
        // Use the 5 curated reviews for Pink City Gems
        availableReviews = (data?.reviews && data.reviews.length >= 5) 
          ? data.reviews.slice(0, 5) 
          : generateNaturalBusinessReviews('Pink City Gems', 'jewelry_gems', '', 'Pink City Gems');
      }
    }

    // Render the 5 review cards
    renderReviewsFeed();

    // Setup event listeners
    setupEventListeners();
  }

  // Render exactly 5 clean cards + Write Custom Review action
  function renderReviewsFeed() {
    if (!reviewsFeed) return;

    if (reviewCountBadge) {
      reviewCountBadge.textContent = `${availableReviews.length} Ready Reviews`;
    }

    const cardsHTML = availableReviews.map((r, index) => {
      const initials = r.author
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const badge = r.badge || `Option #${index + 1}`;

      return `
        <div class="review-card" id="card-${r.id}" data-id="${r.id}" data-text="${encodeURIComponent(r.text)}">
          <div class="card-top">
            <div class="author-meta">
              <div class="author-avatar">${initials}</div>
              <div>
                <div class="author-name">${r.author}</div>
                <div class="author-sub">Verified Customer • 5.0 ★</div>
              </div>
            </div>
            <span class="card-category-badge">${badge}</span>
          </div>
          <div class="card-stars">★★★★★</div>
          <p class="card-text">"${r.text}"</p>
          <button class="btn-copy-post" data-id="${r.id}" data-text="${encodeURIComponent(r.text)}" id="btn-copy-${r.id}">
            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            <span>Tap to Copy & Open Review Dialog</span>
          </button>
        </div>
      `;
    }).join('');

    // Append custom review option at bottom
    const customReviewHTML = `
      <div style="margin-top: 10px; text-align: center;">
        <button id="btn-custom-review-direct" class="btn-test-action" style="background: rgba(255, 255, 255, 0.05); border: 1px dashed rgba(255, 255, 255, 0.2); padding: 12px 20px; font-size: 13px; color: #93c5fd; width: 100%; border-radius: var(--radius-md);">
          ✍️ Or Write Your Own Custom Review Directly on Google
        </button>
      </div>
    `;

    reviewsFeed.innerHTML = cardsHTML + customReviewHTML;

    // Attach click events
    reviewsFeed.querySelectorAll('.review-card').forEach((card) => {
      card.addEventListener('click', () => {
        const reviewId = card.getAttribute('data-id');
        const reviewText = decodeURIComponent(card.getAttribute('data-text'));
        handleCopyAndPost(reviewId, reviewText);
      });
    });

    const btnDirect = document.getElementById('btn-custom-review-direct');
    if (btnDirect) {
      btnDirect.addEventListener('click', () => {
        window.location.href = activeBusiness.googleReviewUrl;
      });
    }
  }

  // Copy to clipboard & trigger direct Google Review popup
  function handleCopyAndPost(reviewId, text) {
    // 1. Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }

    // 2. Mark review as copied
    markReviewCopied(reviewId);

    // 3. Update modal preview & direct button
    if (modalPreviewText) {
      modalPreviewText.textContent = `“${text}”`;
    }
    if (modalDirectBtn) {
      modalDirectBtn.href = activeBusiness.googleReviewUrl;
    }

    // 4. Show confirmation modal
    if (modalOverlay) {
      modalOverlay.classList.add('active');
      if (modalProgressBar) {
        modalProgressBar.style.width = '0%';
        setTimeout(() => {
          modalProgressBar.style.width = '100%';
        }, 50);
      }
    }

    // 5. Auto-redirect to Google Write-a-Review popup dialog in 1.2s
    if (testModeActive && pauseRedirect) {
      console.log('🧪 Test Mode: Redirect paused. Review URL is:', activeBusiness.googleReviewUrl);
      setTimeout(() => {
        if (modalOverlay) modalOverlay.classList.remove('active');
      }, 1500);
      return;
    }

    setTimeout(() => {
      window.location.href = activeBusiness.googleReviewUrl;
    }, 1200);
  }

  // Fallback for clipboard
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

  // Setup auxiliary event listeners
  function setupEventListeners() {
    if (testModeToggle) {
      testModeToggle.addEventListener('change', (e) => {
        testModeActive = e.target.checked;
        localStorage.setItem(TEST_MODE_KEY, String(testModeActive));
        if (testActionsPanel) {
          testActionsPanel.classList.toggle('active', testModeActive);
        }
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
        alert('✓ Local review history cleared!');
        window.location.reload();
      });
    }

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
