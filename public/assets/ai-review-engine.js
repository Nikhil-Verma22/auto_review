/**
 * Smart CONNECT QR — AI Business & Review Framing Engine
 * Generates natural, human-sounding, growth-driving 5★ reviews inspired by real customer feedback
 * Eliminates robotic corporate boilerplate ("Exceptional quality and service at...")
 */

(function () {
  'use strict';

  // Sample authentic Indian customer names
  const FIRST_NAMES = [
    'Aakash', 'Aarav', 'Amit', 'Anjali', 'Ankita', 'Arjun', 'Bhavna', 'Chetan', 'Deepak', 'Divya',
    'Gaurav', 'Gurpreet', 'Harish', 'Harleen', 'Jaspreet', 'Karan', 'Kavita', 'Manish', 'Meenakshi', 'Mohit',
    'Naveen', 'Neha', 'Nitin', 'Pankaj', 'Pooja', 'Pradeep', 'Priya', 'Rahul', 'Rajesh', 'Ritu',
    'Rohit', 'Sameer', 'Sandeep', 'Sanjay', 'Shalini', 'Shikha', 'Simran', 'Sneha', 'Sunil', 'Vikas'
  ];

  const LAST_NAMES = [
    'Agarwal', 'Arora', 'Bansal', 'Bhatia', 'Chawla', 'Chopra', 'Dhawan', 'Garg', 'Gill', 'Goyal',
    'Grover', 'Gupta', 'Jain', 'Joshi', 'Kapoor', 'Khanna', 'Kumar', 'Malhotra', 'Mehra', 'Mehta',
    'Mittal', 'Narang', 'Puri', 'Saini', 'Sehgal', 'Sethi', 'Sharma', 'Singla', 'Sood', 'Verma'
  ];

  function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getRandomAuthor() {
    return `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`;
  }

  // Sanitize raw Google Maps listing title
  function sanitizeBusinessTitle(raw) {
    if (!raw) return { clean: 'Local Business', colloquial: 'the shop', categoryHint: '' };

    let title = raw;
    try { title = decodeURIComponent(title); } catch (e) {}
    title = title.replace(/\+/g, ' ').trim();

    let categoryHint = '';

    // Extract category inside parentheses e.g. (Grocery & Daily Needs)
    const parenMatch = title.match(/\(([^)]+)\)/);
    if (parenMatch) {
      categoryHint = parenMatch[1].trim();
      title = title.replace(/\([^)]+\)/g, '').trim();
    }

    // Split on pipe '|' or ' - '
    if (title.includes('|')) {
      const parts = title.split('|').map(s => s.trim()).filter(Boolean);
      title = parts[0];
      if (!categoryHint && parts[1]) categoryHint = parts[1];
    }

    // Strip phone numbers
    title = title.replace(/(?:\+?\d{1,3}[- ]?)?\(?\d{3,5}\)?[- ]?\d{3,5}[- ]?\d{3,5}/g, '').trim();

    // Strip SCO / Booth / Shop / Sector / Landmark suffixes
    title = title.replace(/[-|,|•]\s*(?:SCO|Shop|Booth|Plot|Sector|Sec|Near|Opp|Opposite)[\s\w\d,-]+/gi, '').trim();

    // Check hyphen split e.g. "Store - Grocery & Daily Needs"
    if (title.includes(' - ')) {
      const parts = title.split(' - ').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1 && parts[1].length > 2) {
        if (!categoryHint) categoryHint = parts[1];
        title = parts[0];
      }
    }

    // Strip trailing punctuation
    title = title.replace(/[-|,\/•]+$/, '').trim();

    // Convert ALL CAPS to Title Case
    if (title === title.toUpperCase() && title.length > 3) {
      title = title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }

    // Derive natural colloquial name
    let colloquial = title;
    const prefixMatch = title.match(/^(?:New|Shree|Sri|The|M\/s\.?)\s+(.+)$/i);
    if (prefixMatch && prefixMatch[1].length > 2) {
      colloquial = prefixMatch[1];
    }

    return {
      clean: title || 'Local Business',
      colloquial: colloquial || title || 'the shop',
      categoryHint: categoryHint || ''
    };
  }

  // Category detection from keywords
  function detectCategory(text) {
    const t = (text || '').toLowerCase();
    if (/grocery|kirana|departmental|supermarket|daily needs|dairy|provisions|ration|mart/i.test(t)) {
      return 'grocery';
    }
    if (/restaurant|cafe|dhaba|kitchen|dining|pizzeria|food|burger|pizza|biryani|roll/i.test(t)) {
      return 'food';
    }
    if (/sweets|mithai|bakery|cake|pastry|confectionery|halwai/i.test(t)) {
      return 'sweets_bakery';
    }
    if (/dental|dentist|doctor|clinic|hospital|physio|pathology|diagnostic|ortho|eye care/i.test(t)) {
      return 'healthcare';
    }
    if (/salon|parlour|beauty|spa|hair|makeup|nails|barber|makeover/i.test(t)) {
      return 'salon_beauty';
    }
    if (/gem|gemstone|jewel|jeweller|gold|silver|diamond|pukhraj|emerald|ratna|astrolog/i.test(t)) {
      return 'jewelry_gems';
    }
    if (/auto|motor|car|garage|mechanic|tyre|wheel|bike|scooter|repair workshop/i.test(t)) {
      return 'auto_garage';
    }
    if (/clothing|garment|boutique|fashion|apparel|textile|tailor|saree|ethnic/i.test(t)) {
      return 'clothing_fashion';
    }
    if (/mobile|computer|laptop|electronic|gadget|cctv|telecom/i.test(t)) {
      return 'electronics_mobile';
    }
    if (/pharmacy|chemist|medicine|druggist|medical store/i.test(t)) {
      return 'pharmacy';
    }
    if (/gym|fitness|crossfit|workout|yoga|trainer/i.test(t)) {
      return 'fitness_gym';
    }
    return 'general';
  }

  // Built-in Smart Category Review Synthesizers
  const CATEGORY_TEMPLATES = {
    grocery: {
      label: 'Grocery & Daily Needs',
      badges: ['🛒 Daily Essentials', '🤝 Humble Service', '💰 Fair Pricing', '✨ Clean & Stocked', '🏆 Neighborhood Trust'],
      build: (c, h) => [
        `One of the most dependable grocery stores in the area. Always stocked with fresh dairy, daily essentials, and branded household items. Billing is quick and everything is neatly arranged.`,
        `${h ? h + ' and the staff are' : 'Uncle ji and the team are'} always so polite and humble. Even during evening rush hours, they attend to every customer with total patience. True neighborhood trust!`,
        `Very honest pricing with genuine discounts on MRP. No unnecessary markups and the quality of pulses, grains, and spices is always fresh and clean.`,
        `Super convenient shopping experience. Clean aisles, well-organized racks, and they even help carry heavy grocery bags. Highly appreciated!`,
        `Our family has been buying monthly groceries from ${c} for a long time. Trustworthy dealing, authentic products, and warm service every single time. 5 stars!`
      ]
    },
    food: {
      label: 'Restaurant & Dining',
      badges: ['🍽️ Delicious Food', '👨‍🍳 Courteous Staff', '💰 Value for Money', '✨ Great Ambiance', '🏆 Highly Recommended'],
      build: (c, h) => [
        `Delicious food with authentic flavors and generous portion sizes. Everything we ordered was served piping hot and fresh. A fantastic dining experience!`,
        `${h ? h + ' and the staff' : 'The host and serving team'} were incredibly courteous and attentive. Service was prompt despite the crowd. Warm hospitality at its best.`,
        `Great value for money! High quality ingredients, rich taste, and very reasonable pricing compared to other places in the city.`,
        `Wonderful ambiance with great seating and spotless hygiene. Perfect place to visit with family or catch up with friends.`,
        `Easily one of our favorite food spots in town. Consistent taste, generous portions, and welcoming vibe every single visit. Must try!`
      ]
    },
    sweets_bakery: {
      label: 'Sweets & Bakery',
      badges: ['🍬 Fresh Sweets', '🎂 Custom Cakes', '🤝 Polite Behavior', '✨ Pure Desi Ghee', '🏆 Family Favorite'],
      build: (c, h) => [
        `Exceptional freshness and authentic taste! You can clearly tell they use pure desi ghee and high quality ingredients. The sweets melt in the mouth.`,
        `Ordered a customized celebration cake from here and it turned out gorgeous! Soft, fresh sponge, perfect sweetness, and delivered right on time.`,
        `${h ? h + ' was' : 'The staff was'} very humble and let us sample the fresh batch with a genuine smile. Warm, respectful customer care.`,
        `Spotless hygiene and beautiful presentation. From hot crispy snacks to traditional sweets, everything is prepared in a very clean kitchen.`,
        `Our go-to place for all festival sweets and family celebrations. Decades of trust, authentic recipes, and top quality!`
      ]
    },
    healthcare: {
      label: 'Clinic & Healthcare',
      badges: ['🩺 Gentle Doctor', '⏱️ Minimal Wait', '💡 Clear Guidance', '✨ Spotless Clinic', '🏆 Highly Trusted'],
      build: (c, h) => [
        `${h ? h : 'The doctor'} was extremely gentle, patient, and knowledgeable. Took time to listen to my symptoms and explained the diagnosis thoroughly.`,
        `Virtually painless procedure! The entire clinical staff made sure I felt comfortable and relaxed throughout the treatment.`,
        `Transparent treatment fees without unnecessary tests or medication. Honest, ethical, and deeply compassionate healthcare.`,
        `Pristine clinic hygiene with sanitized modern equipment. Very well-maintained waiting area and punctual appointment timings.`,
        `I have recommended ${c} to my family and relatives without hesitation. Truly one of the finest doctors in the area. 5 stars!`
      ]
    },
    salon_beauty: {
      label: 'Salon & Beauty Care',
      badges: ['✂️ Skilled Styling', '💆 Relaxing Vibe', '🧴 Genuine Products', '⏱️ Punctual Service', '🏆 Regular Customer'],
      build: (c, h) => [
        `Outstanding styling and haircut! The stylist listened carefully to what I wanted and gave great personalized recommendations. Turned out better than expected.`,
        `${h ? h + ' and the team' : 'The salon staff'} were warm, professional, and very courteous. Thorough service without rushing through the appointment.`,
        `They use 100% genuine, branded grooming products and maintain strict tool sterilization. My skin and hair felt great afterward!`,
        `Clean, modern aesthetic with soothing music and comfortable chairs. Great hygiene standards and fair pricing.`,
        `I’ve been coming to ${c} regularly for grooming. Consistent quality, skilled team, and relaxing atmosphere every time!`
      ]
    },
    jewelry_gems: {
      label: 'Gemstones & Jewelry',
      badges: ['💎 100% Certified', '🪐 Vedic Guidance', '📜 Authentic Lab Test', '💍 Flawless Rings', '🏆 Wholesale Trust'],
      build: (c, h) => [
        `Purchased a natural certified gemstone with authentic laboratory certification. Outstanding clarity, genuine pricing, and total peace of mind.`,
        `Exceptional Vedic astrological guidance for birthstones. ${h ? h : 'The owner'} patiently explained the planetary aspects and energized the stone as per Vedic norms.`,
        `Custom ring crafted to perfection! Silky smooth finish, accurate sizing, and designed with an open back for proper skin contact.`,
        `Honest dealing and transparent per-carat pricing. They gladly demonstrated the natural inclusions under magnification in front of us.`,
        `Decades of trust and reliable service. Best place in the city for authentic, untreated natural gemstones and astrological advice!`
      ]
    },
    auto_garage: {
      label: 'Automobile Care & Workshop',
      badges: ['🔧 Expert Diagnostics', '🔩 Genuine Parts', '💰 Fair Estimate', '⏱️ On-Time Delivery', '🏆 Honest Mechanics'],
      build: (c, h) => [
        `Very thorough and accurate diagnostics. They pinpointed the exact issue without trying to sell unnecessary replacements. Car runs silky smooth now!`,
        `${h ? h + ' and the mechanics' : 'The workshop team'} were transparent and courteous. Kept me updated via photos during the repair process.`,
        `Honest pricing with genuine OEM spare parts used. Fair labor charges and zero surprise additions on the final bill.`,
        `Prompt turnaround! Promised delivery by evening and handed over the vehicle washed, cleaned, and perfectly tuned on time.`,
        `Finding an honest automobile workshop is rare, but ${c} has earned my complete trust. Highly recommended to all car and bike owners!`
      ]
    },
    clothing_fashion: {
      label: 'Boutique & Clothing',
      badges: ['👗 Beautiful Designs', '✂️ Perfect Fitting', '🧵 Premium Fabric', '🤝 Patient Guidance', '🏆 Highly Recommended'],
      build: (c, h) => [
        `Stunning collection with the latest trends and timeless classics. Fabric quality is premium and feel is super comfortable.`,
        `Flawless fitting and alteration! The cuts and stitching details were executed with great precision on the very first try.`,
        `${h ? h + ' was' : 'The staff was'} so patient in helping me select the right outfit, colors, and styling accessories. Never felt rushed.`,
        `Great variety across budgets. From daily casuals to festive wear, everything is priced honestly with high stitching quality.`,
        `Got compliments from everyone when I wore the outfit! Will definitely be coming back to ${c} for future shopping.`
      ]
    },
    electronics_mobile: {
      label: 'Electronics & Mobile Repair',
      badges: ['📱 Quick Diagnosis', '🔌 Genuine Parts', '⚡ Fast Turnaround', '💰 Honest Charges', '🏆 Trusted Techs'],
      build: (c, h) => [
        `Quick diagnosis and same-day repair! Fixed my device flawlessly when other shops suggested expensive board replacements.`,
        `${h ? h : 'The technician'} was very knowledgeable and clearly explained the repair procedure and warranty terms before starting.`,
        `Honest pricing and genuine replacement components used. Total transparency and no hidden repair fees.`,
        `Professional service with clean workstations. Saved all my data safely during the repair. Truly dependable technical work!`,
        `My go-to place for gadget repairs and accessories. Reliable, skilled, and honest service every time.`
      ]
    },
    pharmacy: {
      label: 'Pharmacy & Chemist',
      badges: ['💊 All Medicines in Stock', '🤝 Helpful Chemist', '⏱️ Fast Billing', '❄️ Proper Storage', '🏆 Trusted Chemist'],
      build: (c, h) => [
        `Extremely well-stocked pharmacy. Always found prescribed medicines, surgical supplies, and wellness products readily available.`,
        `${h ? h : 'The chemist'} is very polite, checks prescriptions with great care, and explains dosage timings patiently.`,
        `Genuine medicines with accurate batches and long expiry dates. Proper cold-chain storage for insulins and vaccines.`,
        `Quick billing, neat packaging, and prompt neighborhood assistance. Fair prices with helpful guidance.`,
        `Most reliable chemist shop in the locality. Honest service, genuine stock, and humble behavior at all times.`
      ]
    },
    fitness_gym: {
      label: 'Gym & Fitness Centre',
      badges: ['🏋️ Modern Equipment', '💪 Dedicated Trainers', '✨ Clean & Hygienic', '🎵 Great Energy', '🏆 Visible Results'],
      build: (c, h) => [
        `Top-notch gym equipment with plenty of weights, cardio stations, and functional training space. Never feel cramped!`,
        `The trainers are very supportive, correct your form with patience, and create tailored workout plans for your goals.`,
        `Spotless hygiene, fresh ventilation, clean locker rooms, and sanitized workout machines throughout the day.`,
        `Energetic atmosphere with great music and a motivating community. Working out here is the highlight of my day!`,
        `Joined ${c} a few months back and have seen amazing improvement in strength and stamina. Best fitness facility in the area!`
      ]
    },
    general: {
      label: 'Local Business',
      badges: ['⭐ Top Quality', '🤝 Courteous Team', '💰 Honest Dealing', '✨ Clean Environment', '🏆 Highly Trusted'],
      build: (c, h) => [
        `Consistently high quality products and dependable service. Everything was handled with great care and professionalism.`,
        `${h ? h + ' and the staff are' : 'The team is'} remarkably courteous, humble, and attentive to customer needs. A very welcoming experience!`,
        `Honest, fair pricing with zero hidden charges. You truly get great value and peace of mind here.`,
        `Clean, well-organized setup with smooth and prompt service. They value your time and deliver on their commitments.`,
        `Our family has trusted ${c} for a long time. Transparent dealing, high standards, and genuine customer care. 5 stars all the way!`
      ]
    }
  };

  // Generate realistic reviews without API key
  function generateSmartReviews({ name, colloquial, category, ownerName, highlights, sampleReviews, count = 5 }) {
    const detectedCat = category && CATEGORY_TEMPLATES[category] 
      ? category 
      : detectCategory(`${name} ${category || ''} ${highlights || ''} ${sampleReviews || ''}`);

    const catConfig = CATEGORY_TEMPLATES[detectedCat] || CATEGORY_TEMPLATES.general;
    const cleanColloquial = colloquial || name || 'the store';
    const texts = catConfig.build(cleanColloquial, ownerName || highlights || '');

    const reviews = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      reviews.push({
        id: `rev_${i + 1}`,
        badge: catConfig.badges[i] || `⭐ Option #${i + 1}`,
        author: getRandomAuthor(),
        rating: 5,
        text: texts[i]
      });
    }

    return {
      category: detectedCat,
      categoryLabel: catConfig.label,
      reviews
    };
  }

  // Generate with Google Gemini API
  async function generateWithGemini({ apiKey, name, colloquial, category, ownerName, highlights, sampleReviews }) {
    if (!apiKey) {
      throw new Error('Please provide a Google Gemini API Key.');
    }

    const cleanColloquial = colloquial || name || 'the business';
    const prompt = `You are an expert local business growth strategist.
Analyze this real-world local business:
- Full Business Name: "${name}"
- Natural Spoken / Short Name: "${cleanColloquial}"
- Category / Specialty: "${category || 'Local Business'}"
- Owner / Highlights: "${ownerName || highlights || 'none'}"
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

OUTPUT FORMAT: Return ONLY valid, raw JSON array of 5 objects (no markdown code blocks, no preamble):
[
  {
    "id": "rev_1",
    "badge": "🛒 Short Badge",
    "author": "Full Name",
    "rating": 5,
    "text": "Natural review text..."
  }, ...
]`;

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
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
          const errJson = await response.json().catch(() => ({}));
          lastError = new Error(errJson?.error?.message || `Gemini API (${model}) returned status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleaned = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();

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
          return parsed.slice(0, 5).map((r, i) => ({
            id: `rev_${i + 1}`,
            badge: r.badge || `⭐ Option #${i + 1}`,
            author: r.author || getRandomAuthor(),
            rating: 5,
            text: r.text || ''
          }));
        }
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('All Gemini models failed to generate reviews.');
  }

  // Pack reviews to URL-safe string
  function packReviewsToUrl(reviews) {
    try {
      const minimal = reviews.map(r => [r.badge, r.author, r.text]);
      const json = JSON.stringify(minimal);
      return btoa(encodeURIComponent(json));
    } catch (e) {
      console.warn('Could not pack reviews:', e);
      return '';
    }
  }

  // Unpack reviews from URL-safe string
  function unpackReviewsFromUrl(str) {
    if (!str) return null;
    try {
      const json = decodeURIComponent(atob(str));
      const minimal = JSON.parse(json);
      if (Array.isArray(minimal) && minimal.length > 0) {
        return minimal.map((item, index) => ({
          id: `rev_${index + 1}`,
          badge: item[0] || `⭐ Option #${index + 1}`,
          author: item[1] || getRandomAuthor(),
          rating: 5,
          text: item[2] || ''
        }));
      }
    } catch (e) {
      console.warn('Could not unpack reviews:', e);
    }
    return null;
  }

  // Expose globally
  window.AiReviewEngine = {
    sanitizeBusinessTitle,
    detectCategory,
    generateSmartReviews,
    generateWithGemini,
    packReviewsToUrl,
    unpackReviewsFromUrl,
    CATEGORY_TEMPLATES
  };
})();
