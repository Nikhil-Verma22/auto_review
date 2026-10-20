# Master Prompt for Antigravity Agent: Zero-Touch GitHub-Only "Smart CONNECT QR" Builder

Copy and paste the prompt below into your **Antigravity Agent**, and simply fill in your **Google Maps Link** and **GitHub Repo Link** at the top.

```markdown
## INPUTS FROM ME
- **My Google Maps Business Link**: [PASTE YOUR GOOGLE MAPS LINK HERE]
- **My GitHub Repository Link**: [PASTE YOUR GITHUB REPO URL HERE]
- **GitHub Authentication**: You already have my GitHub Personal Access Token (PAT) in your environment/config. Use it for all Git operations and GitHub REST API calls.

---

## YOUR ROLE & MISSION
You are an autonomous Principal Full-Stack & DevOps Engineer. Using **ONLY my GitHub repository, GitHub Pages, and GitHub Actions** (zero external websites, zero paid servers, zero custom domains), build and deploy the complete **"Smart CONNECT QR — Zero-Effort SEO Google Review & Auto-Reply System"** (modeled after `connectitgmb.com`).

When you finish, you must hand me:
1. **The exact live URL** (`https://<owner>.github.io/<repo>/`) that I can write directly onto my **NFC tag/card**.
2. **The ready-to-scan QR Code image & Printable Standee URL** (`https://<owner>.github.io/<repo>/standee.html` and `https://<owner>.github.io/<repo>/assets/qr-code.png`).
3. **A short checklist** of any physical or external steps I need to perform myself (such as writing the URL to my NFC tag).

---

## STEP 1: AUTO-EXTRACT BUSINESS INFO FROM MY GOOGLE MAPS LINK
Do not ask me to manually type my business details if you can extract them automatically from my Google Maps link:
1. Follow/expand my Google Maps URL (`curl -Ls -o /dev/null -w %{url_effective} "<MAPS_LINK>"` or fetch/parse the page metadata and URL parameters) to extract:
   - **Business Name**
   - **City / Locality / Neighborhood**
   - **Business Type & 5 Relevant Review Categories** (e.g., `General` + 4 specific service/product categories tailored to my business type, along with high-ranking local SEO keywords for each category)
   - **Direct Google Write-a-Review URL**:
     - If a `place_id` (`ChIJ...`) is found, construct `https://search.google.com/local/writereview?placeid=<PLACE_ID>`.
     - Otherwise, construct a direct Google Maps review/place deep link and provide a 1-click field in `config/business.json` and `admin.html` where I can paste my `g.page/r/.../review` shortlink anytime.
2. Parse my GitHub repository URL (`https://github.com/<owner>/<repo>`) to determine:
   - `<owner>` (lowercase) and `<repo>`
   - **My Live NFC & QR Target URL**: `https://<owner>.github.io/<repo>/`

---

## STEP 2: USE MY GITHUB PAT TO AUTO-CONFIGURE THE REPOSITORY VIA API
Since you already have my GitHub PAT, perform these repository setup actions automatically via `curl` / `gh api` so I do not have to click around in GitHub Settings unless my PAT lacks a specific scope:

1. **Enable Read/Write Workflow Permissions**:
   ```bash
   curl -X PUT -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/<owner>/<repo>/actions/permissions/workflow" \
     -d '{"default_workflow_permissions":"write","can_approve_pull_request_reviews":true}'
   ```
2. **Enable GitHub Pages with GitHub Actions as the Build Source**:
   ```bash
   curl -X POST -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/<owner>/<repo>/pages" \
     -d '{"build_type":"workflow"}'
   ```
   *(If Pages is already enabled, send a `PUT` request with `{"build_type":"workflow"}` instead.)*

---

## STEP 3: BUILD THE COMPLETE GITHUB-ONLY SYSTEM ARCHITECTURE

Scaffold, test, and commit the following repository structure using **strictly relative paths (`./`)** so every page and asset works seamlessly under `https://<owner>.github.io/<repo>/`:

```text
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml              # Generates QR codes, bundles data, & deploys to GitHub Pages
│       ├── claim-review.yml              # Triggered on workflow_dispatch / repository_dispatch to mark a review ID as used globally in data/reviews.json
│       ├── replenish-seo-reviews.yml     # Daily/manual workflow to generate fresh non-duplicate SEO reviews into data/reviews.json
│       └── auto-reply-google-reviews.yml # Scheduled 24h workflow to auto-reply to new Google Business reviews
├── config/
│   └── business.json                     # Central config: Business name, locality, Google Review URL, NFC/QR URL, 5 categories & SEO keywords
├── data/
│   └── reviews.json                      # Pool of 60+ unique, natural, SEO-friendly reviews across the 5 categories (with used: true/false)
├── scripts/
│   ├── generate_qr_assets.mjs            # Generates qr-code.svg, qr-code.png (1024x1024), and public/assets/data-bundle.js
│   ├── replenish_reviews.mjs             # Replenishes used reviews (built-in combinatorial SEO engine + optional Gemini/OpenAI API)
│   └── auto_reply_reviews.mjs            # Polls Google Business Profile API & posts SEO owner replies within 24h
├── public/                               # Published directly to GitHub Pages (https://<owner>.github.io/<repo>/)
│   ├── .nojekyll                         # Ensures GitHub Pages serves all static files without Jekyll processing
│   ├── index.html                        # Customer Mobile Landing Page (5 Categories + Copy & Post + Anti-Duplicate + Redirect)
│   ├── standee.html                      # Printable QR Standee (4x6") & Dual-Sided NFC Card Studio + QR Download Center
│   ├── admin.html                        # Owner Dashboard: Copy NFC URL, Download QR, Edit Config, & AI Reply Generator
│   └── assets/
│       ├── qr-code.svg                   # Scannable vector QR code encoding https://<owner>.github.io/<repo>/
│       ├── qr-code.png                   # High-res 1024x1024 PNG QR code encoding https://<owner>.github.io/<repo>/
│       ├── data-bundle.js                # Pre-bundled business.json + reviews.json for instant <50ms mobile loading
│       └── app.js                        # Client logic (5-category filter, clipboard copy, anti-duplicate rotation, redirect)
├── package.json                          # Dependencies (`qrcode`)
└── README.md                             # Live NFC URL, embedded QR Code preview, Printable Standee link, and Owner Guide
```

---

## STEP 4: DETAILED FEATURE SPECIFICATIONS

### 1. Customer Mobile Review Page (`public/index.html`) — The NFC & QR Destination
When a customer scans the QR code or taps the NFC tag (`https://<owner>.github.io/<repo>/`), this page opens on their phone:
- **Header**: Displays my Business Name, Locality, Verified `★★★★★` badge, and 3 micro-steps (*1. Pick Category → 2. Tap Copy & Post → 3. Paste & 5★ on Google*).
- **5 Category Filter Pills**: `All Categories` plus the 5 categories from `config/business.json` (also selectable via `?cat=1` URL query params).
- **SEO-Rich Review Cards (No Duplicates)**:
  - Loads unclaimed reviews (`used === false`) from `data-bundle.js` (and checks `localStorage` for any review IDs already copied on that phone, plus fetches latest `data/reviews.json` with cache-busting `?t=Date.now()` in the background so globally claimed reviews are hidden too).
  - Shuffles the displayed cards per session so two customers scanning at the same time never see the same review at the top.
- **One-Tap "Copy & Post" Button (`linear-gradient(90deg, #2563eb, #0d9488, #10b981)`)**:
  - Copies the exact review text to the phone clipboard (`navigator.clipboard.writeText` with `<textarea>` `document.execCommand('copy')` fallback).
  - Marks the review ID as used in `localStorage` (and optionally pings a lightweight webhook/dispatch if configured) so it never shows up again.
  - Displays a clean confirmation modal/toast: *"✓ Review Copied to Clipboard! Opening Google Reviews — Tap 5 Stars ★★★★★ & Paste"* and redirects (`window.location.href`) to `googleReviewUrl` after `1.2` seconds.
- **Built-in Testing Bar**: Include a toggleable **"🧪 Test Mode"** bar in the footer so I can test copying reviews on my phone, pause auto-redirect while testing, and reset used reviews in 1 tap.

### 2. QR Code & Printable Standee / NFC Card Studio (`public/standee.html` & `scripts/generate_qr_assets.mjs`)
- `scripts/generate_qr_assets.mjs` must use the `qrcode` npm package to encode the exact GitHub Pages URL (`https://<owner>.github.io/<repo>/`) into:
  - `public/assets/qr-code.svg`
  - `public/assets/qr-code.png` (1024×1024 px, error correction level `H`, crisp dark modules on white background)
- `public/standee.html` (`https://<owner>.github.io/<repo>/standee.html`) must display:
  - **The Exact NFC Tag URL Box** with a 1-click **"📋 Copy NFC URL"** button so I can copy `https://<owner>.github.io/<repo>/` directly on my phone to paste into my NFC tag writer app.
  - **1-Click QR Downloads**: Buttons to download `qr-code.png` (1024×1024) and `qr-code.svg`.
  - **Printable Countertop Standee (4×6 in)** & **Two-Sided NFC Card (CR80)**: Styled just like the "AI-Powered SMART CONNECT QR — Scan the QR Code and leave us a Review on Google ★★★★★" standee and NFC card, with a **"🖨️ Print Standee / Save as PDF"** button (`window.print()`).

### 3. Owner Admin & AI Auto-Reply Studio (`public/admin.html` & GitHub Actions)
- Build `public/admin.html` (`https://<owner>.github.io/<repo>/admin.html`) with:
  - **Quick Links & NFC/QR Hub**: Displays the live NFC URL, QR code preview, and current review pool stats (Total, Available, Used).
  - **AI Review Reply Generator**: Lets me paste any customer review + reviewer name + star rating and immediately generates a personalized, SEO-keyword-rich owner reply to copy-paste, alongside instructions for automated 24-hour replies via `.github/workflows/auto-reply-google-reviews.yml`.
  - **Review Pool & Keyword Editor**: Lets me edit my 5 categories, keywords, or Google Review link and generates updated `config/business.json` / `data/reviews.json` files.

### 4. GitHub Actions Workflows (`.github/workflows/`)
- **`deploy-pages.yml`**:
  - Runs on every push to `main`/`master` and `workflow_dispatch`.
  - Runs `npm install` and `node scripts/generate_qr_assets.mjs` to regenerate `qr-code.png`, `qr-code.svg`, and `data-bundle.js`.
  - Commits updated assets back to the repo if changed.
  - Deploys `public/` to GitHub Pages (`actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`).
  - Writes the live **NFC Tag URL**, **Printable Standee URL**, **Admin URL**, and **QR Image URL** into `$GITHUB_STEP_SUMMARY`.
- **`replenish-seo-reviews.yml`**:
  - Runs weekly/daily or via `workflow_dispatch` to replenish `data/reviews.json` with fresh, non-duplicate SEO reviews across all 5 categories (using a built-in 60+ template combinatorial engine for free, or `GEMINI_API_KEY` / `OPENAI_API_KEY` if set in GitHub Secrets).

---

## STEP 5: PUSH, VERIFY DEPLOYMENT, AND GIVE ME MY FINAL OUTPUTS
1. Run `npm install` and `node scripts/generate_qr_assets.mjs` locally to verify zero errors and confirm `public/assets/qr-code.png` and `public/assets/qr-code.svg` are generated cleanly.
2. Commit all files and push to my GitHub repository using my PAT.
3. Poll the GitHub Actions run status via the GitHub API until `deploy-pages.yml` succeeds and the GitHub Pages site is live.
4. In your final message to me, provide:
   - **🔗 My Live NFC Tag & Customer URL**: `https://<owner>.github.io/<repo>/`
   - **🖨️ My Printable QR Standee & QR Download Studio URL**: `https://<owner>.github.io/<repo>/standee.html`
   - **🖼️ Direct High-Res QR Code Image Link**: `https://<owner>.github.io/<repo>/assets/qr-code.png`
   - **⚙️ My Owner Admin & AI Reply Studio URL**: `https://<owner>.github.io/<repo>/admin.html`
   - **✅ Exact Manual Steps I Need to Perform Myself**:
     1. Any GitHub setting you couldn't toggle automatically with my PAT (if any).
     2. How to write the live `https://<owner>.github.io/<repo>/` URL onto my blank NFC tag/card in 10 seconds using the free **NFC Tools** phone app (*Write → Add a record → URL/URI*).
     3. How to verify or replace the direct Google Write-a-Review link (`g.page/r/.../review`) if my raw Google Maps link redirected to a general map view instead of the review popup.
```
