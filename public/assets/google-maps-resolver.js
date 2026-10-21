/**
 * Universal Google Maps URL & Place ID Resolver
 * Converts any Google Maps share link or URL into a direct Google Review Link
 */

(function () {
  'use strict';

  // Compute Place ID (ChIJ...) from 64-bit Hex1 and Hex2 pair
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
      let s = btoa(String.fromCharCode(...a));
      return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
      console.warn('Failed to compute Place ID:', e);
      return null;
    }
  }

  // Parse an expanded Google Maps URL (runs 100% offline)
  function parseExpandedMapsUrl(url) {
    if (!url) return null;

    // Unwrap if wrapped in Google redirect/consent (continue=...)
    if (url.includes('continue=')) {
      const contMatch = url.match(/continue=([^&]+)/i);
      if (contMatch) {
        try {
          url = decodeURIComponent(contMatch[1]);
        } catch (e) {}
      }
    }

    // Extract business name from URL path
    let name = '';
    const nameMatch = url.match(/\/maps\/place\/([^/@?#]+)/i);
    if (nameMatch) {
      name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
    }

    // Extract Hex coordinates
    const hexMatch = url.match(/!1s(0x[a-f0-9]+):(0x[a-f0-9]+)/i) || 
                     url.match(/[?&]ftid=(0x[a-f0-9]+):(0x[a-f0-9]+)/i);

    let placeId = null;
    if (hexMatch) {
      placeId = computePlaceId(hexMatch[1], hexMatch[2]);
    }

    // Direct placeid in query parameters
    if (!placeId) {
      const pidMatch = url.match(/[?&](?:placeid|place_id)=([A-Za-z0-9_-]{10,})/i);
      if (pidMatch) placeId = pidMatch[1];
    }

    // Check CID
    let cid = null;
    const cidMatch = url.match(/[?&]cid=([0-9]+)/i);
    if (cidMatch) cid = cidMatch[1];

    if (!placeId && !cid && !name) return null;

    const reviewUrl = placeId
      ? `https://search.google.com/local/writereview?placeid=${placeId}`
      : cid
      ? `https://maps.google.com/?cid=${cid}`
      : url;

    return {
      name: name || 'Google Business',
      placeId: placeId || '',
      cid: cid || '',
      googleReviewUrl: reviewUrl,
      expandedUrl: url
    };
  }

  // Resolve short URL (maps.app.goo.gl / goo.gl/maps) via public resolver
  async function resolveShortUrl(shortUrl) {
    // 1. Try Productmate resolver API
    try {
      const res = await fetch('https://productmate.com/api/resolve-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: shortUrl })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.resolved_url) {
          return json.resolved_url;
        }
      }
    } catch (e) {
      console.warn('Productmate resolve-url error:', e);
    }

    // 2. Try unshorten.me fallback API
    try {
      const res = await fetch('https://unshorten.me/json/' + encodeURIComponent(shortUrl));
      if (res.ok) {
        const json = await res.json();
        if (json.resolved_url && json.success) {
          return json.resolved_url;
        }
      }
    } catch (e) {
      console.warn('Unshorten.me error:', e);
    }

    return null;
  }

  // Master resolver: handles any input
  async function resolveGoogleMapsInput(input) {
    const raw = (input || '').trim();
    if (!raw) {
      throw new Error('Please enter a Google Maps URL or Place ID.');
    }

    // 1. If it's already a Place ID
    if (/^ChIJ[A-Za-z0-9_-]{20,}$/.test(raw)) {
      return {
        name: 'My Google Business',
        placeId: raw,
        googleReviewUrl: `https://search.google.com/local/writereview?placeid=${raw}`,
        expandedUrl: `https://search.google.com/local/writereview?placeid=${raw}`
      };
    }

    // 2. If it's already a direct writereview link
    const writeReviewMatch = raw.match(/[?&]placeid=([A-Za-z0-9_-]{15,})/i);
    if (writeReviewMatch) {
      return {
        name: 'Google Business',
        placeId: writeReviewMatch[1],
        googleReviewUrl: `https://search.google.com/local/writereview?placeid=${writeReviewMatch[1]}`,
        expandedUrl: raw
      };
    }

    // 3. If it's an expanded Google Maps URL containing !1s0x...:0x...
    if (raw.includes('/maps/place/') || raw.includes('!1s0x') || raw.includes('ftid=')) {
      const parsed = parseExpandedMapsUrl(raw);
      if (parsed && parsed.placeId) {
        return parsed;
      }
    }

    // 4. If it's a short share URL (maps.app.goo.gl or goo.gl/maps)
    if (raw.includes('maps.app.goo.gl') || raw.includes('goo.gl/maps') || raw.includes('share.google')) {
      const resolved = await resolveShortUrl(raw);
      if (resolved) {
        const parsed = parseExpandedMapsUrl(resolved);
        if (parsed) return parsed;
      }
    }

    // 5. Fallback if hex extraction was possible
    const hexFallback = raw.match(/(0x[a-f0-9]+):(0x[a-f0-9]+)/i);
    if (hexFallback) {
      const placeId = computePlaceId(hexFallback[1], hexFallback[2]);
      if (placeId) {
        return {
          name: 'Google Business',
          placeId,
          googleReviewUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
          expandedUrl: raw
        };
      }
    }

    throw new Error('Could not resolve Place ID from this Google Maps link. Please verify the URL or paste the full Google Maps browser link.');
  }

  // Expose globally
  window.GoogleMapsResolver = {
    computePlaceId,
    parseExpandedMapsUrl,
    resolveGoogleMapsInput
  };
})();
