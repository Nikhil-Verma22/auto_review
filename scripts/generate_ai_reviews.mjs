import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const businessConfigPath = path.join(rootDir, 'config', 'business.json');
const reviewsDataPath = path.join(rootDir, 'data', 'reviews.json');

// 1. Read Inputs
const apiKey = process.env.GEMINI_API_KEY;
const rawMapsUrl = process.env.MAPS_URL || process.argv[2];
const ownerName = process.env.OWNER_NAME || process.argv[3] || '';
const sampleReviews = process.env.SAMPLE_REVIEWS || process.argv[4] || '';

if (!rawMapsUrl) {
  console.error('❌ Error: No Google Maps URL or Place ID provided.');
  console.error('Usage: node scripts/generate_ai_reviews.mjs "<MAPS_URL>" "[OWNER_NAME]" "[SAMPLE_REVIEWS]"');
  process.exit(1);
}

if (!apiKey) {
  console.warn('⚠️ Warning: GEMINI_API_KEY not detected in environment. Will use Built-in Smart Natural Engine.');
}

// 2. Google Maps Decoding & Resolution
function computePlaceId(hex1Str, hex2Str) {
  try {
    const hex1 = BigInt(hex1Str);
    const hex2 = BigInt(hex2Str);
    const m = (e) => {
      const t = [];
      let n = e;
      for (let r = 0; r < 8; r++) {
        t.push(Number(n & 0xffn));
        n >>= 8n;
      }
      return t;
    };
    const n = [9, ...m(hex1), 17, ...m(hex2)];
    const r = [10, n.length, ...n];
    const a = new Uint8Array(r);
    let s = Buffer.from(a).toString('base64');
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return null;
  }
}

function sanitizeBusinessTitle(raw) {
  if (!raw) return { clean: 'Google Business', colloquial: 'the shop', categoryHint: '' };

  let title = raw;
  try { title = decodeURIComponent(title); } catch (e) {}
  title = title.replace(/\+/g, ' ').trim();

  let categoryHint = '';

  const parenMatch = title.match(/\(([^)]+)\)/);
  if (parenMatch) {
    categoryHint = parenMatch[1].trim();
    title = title.replace(/\([^)]+\)/g, '').trim();
  }

  if (title.includes('|')) {
    const parts = title.split('|').map(s => s.trim()).filter(Boolean);
    title = parts[0];
    if (!categoryHint && parts[1]) categoryHint = parts[1];
  }

  title = title.replace(/(?:\+?\d{1,3}[- ]?)?\(?\d{3,5}\)?[- ]?\d{3,5}[- ]?\d{3,5}/g, '').trim();
  title = title.replace(/[-|,|•]\s*(?:SCO|Shop|Booth|Plot|Sector|Sec|Near|Opp|Opposite)[\s\w\d,-]+/gi, '').trim();

  if (title.includes(' - ')) {
    const parts = title.split(' - ').map(s => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts[1].length > 2) {
      if (!categoryHint) categoryHint = parts[1];
      title = parts[0];
    }
  }

  title = title.replace(/[-|,\/•]+$/, '').trim();

  if (title === title.toUpperCase() && title.length > 3) {
    title = title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  let colloquial = title;
  const prefixMatch = title.match(/^(?:New|Shree|Sri|The|M\/s\.?)\s+(.+)$/i);
  if (prefixMatch && prefixMatch[1].length > 2) {
    colloquial = prefixMatch[1];
  }

  return {
    clean: title || 'Google Business',
    colloquial: colloquial || title || 'the shop',
    categoryHint: categoryHint || ''
  };
}

async function resolveShortUrl(shortUrl) {
  try {
    const res = await fetch('https://productmate.com/api/resolve-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: shortUrl })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.resolved_url) return json.resolved_url;
    }
  } catch (e) {}

  try {
    const res = await fetch('https://unshorten.me/json/' + encodeURIComponent(shortUrl));
    if (res.ok) {
      const json = await res.json();
      if (json.resolved_url && json.success) return json.resolved_url;
    }
  } catch (e) {}

  return null;
}

function parseExpandedMapsUrl(url) {
  if (!url) return null;

  if (url.includes('continue=')) {
    const contMatch = url.match(/continue=([^&]+)/i);
    if (contMatch) {
      try { url = decodeURIComponent(contMatch[1]); } catch (e) {}
    }
  }

  let rawName = '';
  const nameMatch = url.match(/\/maps\/place\/([^/@?#]+)/i);
  if (nameMatch) {
    rawName = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
  }

  const { clean, colloquial, categoryHint } = sanitizeBusinessTitle(rawName);

  const hexMatch = url.match(/!1s(0x[a-f0-9]+):(0x[a-f0-9]+)/i) || 
                   url.match(/[?&]ftid=(0x[a-f0-9]+):(0x[a-f0-9]+)/i);

  let placeId = null;
  if (hexMatch) {
    placeId = computePlaceId(hexMatch[1], hexMatch[2]);
  }

  if (!placeId) {
    const pidMatch = url.match(/[?&](?:placeid|place_id)=([A-Za-z0-9_-]{10,})/i);
    if (pidMatch) placeId = pidMatch[1];
  }

  if (!placeId && !clean) return null;

  return {
    name: clean,
    colloquial,
    categoryHint,
    placeId: placeId || '',
    googleReviewUrl: placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : url
  };
}

async function resolveInput(input) {
  const raw = input.trim();
  if (/^ChIJ[A-Za-z0-9_-]{20,}$/.test(raw)) {
    return {
      name: 'Google Business',
      colloquial: 'the shop',
      categoryHint: '',
      placeId: raw,
      googleReviewUrl: `https://search.google.com/local/writereview?placeid=${raw}`
    };
  }

  if (raw.includes('maps.app.goo.gl') || raw.includes('goo.gl/maps') || raw.includes('share.google')) {
    console.log('Resolving short share URL...');
    const expanded = await resolveShortUrl(raw);
    if (expanded) {
      const parsed = parseExpandedMapsUrl(expanded);
      if (parsed) return parsed;
    }
  }

  const parsed = parseExpandedMapsUrl(raw);
  if (parsed && parsed.placeId) return parsed;

  throw new Error(`Could not resolve Place ID from URL: ${raw}`);
}

// 3. Gemini Generation Call
async function generateGeminiReviews({ apiKey, name, colloquial, category, ownerName, sampleReviews }) {
  const prompt = `You are an expert local business growth strategist.
Analyze this real-world local business:
- Full Business Name: "${name}"
- Natural Spoken / Short Name: "${colloquial}"
- Category / Specialty: "${category || 'Local Business'}"
- Owner / Highlights: "${ownerName || 'none'}"
- Sample Google Reviews / Vibe: "${sampleReviews || 'none'}"

TASK: Generate exactly 5 realistic, natural 5-star customer reviews that will help this business rank on Google Local Maps and attract new customers.

CRITICAL RULES:
1. NEVER write corporate robotic fluff like "Exceptional quality and service at [Business]! The entire experience exceeded my expectations."
2. Write like real local customers: vary tone, sentence length, and authentic details.
3. Distribute across these 5 key growth pillars:
   - Review 1: Quality / Freshness / Craftsmanship of their main items or services.
   - Review 2: Staff / Owner hospitality (mention humble owner, "uncle ji", polite bhaiya, or attentive team if appropriate).
   - Review 3: Fair pricing & value for money (honest rates, no overcharging).
   - Review 4: Convenience, hygiene, atmosphere, or quick hassle-free service.
   - Review 5: Long-term trust & word-of-mouth recommendation.
4. Real people rarely shout the full formal business name. Mention the colloquial name naturally once or twice, or refer to "the shop/store/clinic/here".
5. Provide realistic Indian customer names for authors.

OUTPUT FORMAT: Return ONLY valid, raw JSON array of 5 objects (no markdown, no backticks, no preamble):
[
  {
    "badge": "🛒 Short Badge",
    "author": "Full Name",
    "rating": 5,
    "text": "Natural review text..."
  }
]`;

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

  let lastError = null;
  for (const model of candidateModels) {
    try {
      console.log(`Calling Google Gemini API using model "${model}" for "${name}" (${category || 'General'})...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2500,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Model ${model} returned status ${response.status}. Trying fallback...`);
        lastError = new Error(`Gemini API (${model}) error ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      let parsed = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (pe) {
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end > start) {
          parsed = JSON.parse(cleaned.slice(start, end + 1));
        } else {
          throw pe;
        }
      }

      if (Array.isArray(parsed) && parsed.length >= 5) {
        console.log(`✓ Model "${model}" generated ${parsed.length} reviews successfully!`);
        return parsed.slice(0, 5);
      }
    } catch (e) {
      lastError = e;
      console.warn(`Attempt with ${model} failed:`, e.message);
    }
  }

  throw lastError || new Error('All Gemini models failed to generate reviews.');
}

// 4. Main Execution
async function main() {
  console.log('--- Universal Google Review & AI Framing Engine ---');
  console.log(`Input URL: ${rawMapsUrl}`);

  const placeInfo = await resolveInput(rawMapsUrl);
  console.log(`✓ Clean Business Name: "${placeInfo.name}"`);
  console.log(`✓ Colloquial Name:     "${placeInfo.colloquial}"`);
  console.log(`✓ Place ID:            ${placeInfo.placeId}`);
  console.log(`✓ Direct Review Link:  ${placeInfo.googleReviewUrl}`);

  let generatedList = [];

  if (apiKey) {
    try {
      generatedList = await generateGeminiReviews({
        apiKey,
        name: placeInfo.name,
        colloquial: placeInfo.colloquial,
        category: placeInfo.categoryHint,
        ownerName,
        sampleReviews
      });
      console.log('✓ Successfully generated 5 Gemini AI reviews!');
    } catch (e) {
      console.warn('⚠️ Gemini API call failed:', e.message);
      console.log('Falling back to built-in Smart Natural Engine...');
    }
  }

  // Fallback if no API key or failed
  if (!generatedList || generatedList.length < 5) {
    // Import built-in smart review generator logic
    const sampleAuthors = ['Dr. Amit Bansal', 'Meenakshi Joshi', 'Simranjeet Kaur', 'Kunal Sehgal', 'Baldev Krishan'];
    const badges = ['⭐ Top Quality', '🤝 Humble Service', '💰 Fair Pricing', '✨ Clean & Organized', '🏆 Neighborhood Trust'];
    const texts = [
      `One of the most dependable places in the area. High standards, transparent dealing, and genuine quality products. Neatly arranged and well organized.`,
      `${ownerName ? ownerName + ' and the staff are' : 'The team is'} always so polite, humble, and attentive to customer needs. Patient service even during rush hours!`,
      `Very fair and honest pricing with zero unnecessary markups. Great value for money and total peace of mind.`,
      `Super clean, well-maintained environment with prompt assistance and hassle-free billing every single time.`,
      `Our family has trusted ${placeInfo.colloquial} for a long time. Consistent quality, authentic stock, and warm customer care. 5 stars!`
    ];

    generatedList = [];
    for (let i = 0; i < 5; i++) {
      generatedList.push({
        badge: badges[i],
        author: sampleAuthors[i],
        rating: 5,
        text: texts[i]
      });
    }
  }

  // Format reviews for reviews.json
  const formattedReviews = generatedList.map((r, i) => ({
    id: `rev_${String(i + 1).padStart(3, '0')}`,
    categoryId: placeInfo.categoryHint ? placeInfo.categoryHint.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'general',
    badge: r.badge || `⭐ Option #${i + 1}`,
    author: r.author || 'Verified Customer',
    rating: 5,
    text: r.text.trim(),
    used: false,
    createdAt: new Date().toISOString()
  }));

  // Update data/reviews.json
  fs.writeFileSync(reviewsDataPath, JSON.stringify(formattedReviews, null, 2), 'utf8');
  console.log(`✓ Saved 5 framed reviews to ${reviewsDataPath}`);

  // Update config/business.json
  const currentConfig = JSON.parse(fs.readFileSync(businessConfigPath, 'utf8'));
  currentConfig.business.name = placeInfo.name;
  currentConfig.business.legalName = placeInfo.name;
  currentConfig.business.googleMapsUrl = rawMapsUrl;
  currentConfig.business.googleReviewUrl = placeInfo.googleReviewUrl;
  currentConfig.business.placeId = placeInfo.placeId;
  fs.writeFileSync(businessConfigPath, JSON.stringify(currentConfig, null, 2), 'utf8');
  console.log(`✓ Updated business config in ${businessConfigPath}`);

  // Run generate_qr_assets.mjs
  const { execSync } = await import('node:child_process');
  console.log('Regenerating QR code assets and bundled data...');
  execSync('node scripts/generate_qr_assets.mjs', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n✨ All operations completed successfully!');
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
