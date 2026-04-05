// =================================================================
//  DÜELLO RANK BADGE — dinamik SVG (rank 1–50, tier renkleri, boyut)
// =================================================================
//
//  Kullanım:
//    const el = createDuelRankBadge(17, { size: 'md' });   // 80px
//    const el = createDuelRankBadge(3, { size: 40 });     // 40px liste
//    const el = createDuelRankBadge(42, { size: 'lg' });   // 120px
//    const html = duelRankBadgeSVG(25, { size: 'sm', className: 'my-badge' });
//
//  Global: createDuelRankBadge, duelRankBadgeSVG, duelRankBadgePalette, DUEL_RANK_BADGE_SIZES
// =================================================================

(function (global) {
  'use strict';

  const SIZES = { sm: 40, md: 80, lg: 120 };

  const TIER_GRADIENTS = [
    { light: '#4ade80', dark: '#22c55e' },
    { light: '#60a5fa', dark: '#3b82f6' },
    { light: '#a78bfa', dark: '#8b5cf6' },
    { light: '#fbbf24', dark: '#f59e0b' },
    { light: '#f87171', dark: '#ef4444' },
  ];

  function hexToRgb(hex) {
    const n = String(hex).replace('#', '');
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpHex(c1, c2, t) {
    const A = hexToRgb(c1);
    const B = hexToRgb(c2);
    return rgbToHex(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t));
  }

  function blendTowardBlack(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  }

  function rgbaFromHex(hex, a) {
    const { r, g, b } = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /** rank ∈ [1,50] → tier 0..4 ve tier içi karışım 0..1 */
  function duelRankBadgePalette(rank) {
    const r = Math.max(1, Math.min(50, Math.floor(Number(rank) || 1)));
    const tier = Math.floor((r - 1) / 10);
    const pair = TIER_GRADIENTS[Math.min(4, Math.max(0, tier))];
    const within = ((r - 1) % 10) / 9;
    const fillLight = lerpHex(pair.light, pair.dark, within * 0.35);
    const fillDark = lerpHex(pair.light, pair.dark, 0.45 + within * 0.55);
    const stroke = blendTowardBlack(pair.dark, 0.38 + within * 0.12);
    const wing = lerpHex(pair.light, pair.dark, 0.48 + within * 0.22);
    return {
      rank: r,
      tier: tier + 1,
      fillLight,
      fillDark,
      stroke,
      wing,
      glow: pair.dark,
    };
  }

  /** Düz üst köşeli altıgen (pointy top), merkez (cx,cy), yarıçap R */
  function duelRankBadgeHexPoints(cx, cy, R) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const th = (-Math.PI / 2) + (i * Math.PI) / 3;
      pts.push((cx + R * Math.cos(th)).toFixed(2) + ',' + (cy + R * Math.sin(th)).toFixed(2));
    }
    return pts.join(' ');
  }

  let _badgeUid = 0;

  function normalizeSize(size) {
    if (typeof size === 'number' && !isNaN(size)) {
      return Math.max(24, Math.min(200, Math.round(size)));
    }
    if (typeof size === 'string' && SIZES[size] != null) return SIZES[size];
    return SIZES.md;
  }

  /**
   * SVG string döndürür (innerHTML veya template için).
   * @param {number} rank — 1..50
   * @param {{ size?: number|'sm'|'md'|'lg', className?: string, ariaLabel?: string }} [opts]
   */
  function duelRankBadgeSVG(rank, opts) {
    opts = opts || {};
    const px = normalizeSize(opts.size);
    const p = duelRankBadgePalette(rank);
    const uid = 'drb-' + (++_badgeUid);
    const gid = uid + '-g';
    const aria = opts.ariaLabel != null ? opts.ariaLabel : 'Düello sırası ' + p.rank;
    const extraClass = opts.className ? ' ' + opts.className : '';

    const cx = 50;
    const cy = 46;
    const R = 30;
    const hexPts = duelRankBadgeHexPoints(cx, cy, R);

    const dropShadow =
      'drop-shadow(0 2px 5px ' + rgbaFromHex(p.glow, 0.28) + ') drop-shadow(0 1px 2px rgba(15,23,42,0.18))';
    const numSize = p.rank >= 10 ? 20 : 22;

    return (
      '<svg class="duel-rank-badge' +
      extraClass +
      '" width="' +
      px +
      '" height="' +
      px +
      '" viewBox="0 0 100 100" role="img" aria-label="' +
      escapeAttr(aria) +
      '" data-duel-rank="' +
      p.rank +
      '" data-duel-tier="' +
      p.tier +
      '" style="filter:' +
      escapeAttr(dropShadow) +
      '">' +
      '<defs>' +
      '<linearGradient id="' +
      gid +
      '" x1="22%" y1="12%" x2="82%" y2="92%">' +
      '<stop offset="0%" stop-color="' +
      p.fillLight +
      '"/>' +
      '<stop offset="100%" stop-color="' +
      p.fillDark +
      '"/>' +
      '</linearGradient>' +
      '</defs>' +
      '<g class="duel-rank-badge__wings" fill="' +
      p.wing +
      '" opacity="0.9">' +
      '<polygon points="15,46 26,36 26,56" />' +
      '<polygon points="85,46 74,36 74,56" />' +
      '<polygon points="50,80 38,69 62,69" />' +
      '<polygon points="50,88 43,81 57,81" opacity="0.75" />' +
      '</g>' +
      '<polygon class="duel-rank-badge__hex" points="' +
      hexPts +
      '" fill="url(#' +
      gid +
      ')" stroke="' +
      p.stroke +
      '" stroke-width="1.35" stroke-linejoin="round"/>' +
      '<text class="duel-rank-badge__num" x="' +
      cx +
      '" y="' +
      cy +
      '" text-anchor="middle" dominant-baseline="central" fill="#f8fafc" font-family="system-ui,-apple-system,\'Segoe UI\',Roboto,\'DM Sans\',sans-serif" font-weight="800" font-size="' +
      numSize +
      '" style="paint-order:stroke fill;stroke:rgba(15,23,42,0.25);stroke-width:0.6px">' +
      p.rank +
      '</text>' +
      '</svg>'
    );
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * DOM’da kullanmak için SVG elementi.
   * @param {number} rank
   * @param {{ size?: number|'sm'|'md'|'lg', className?: string, ariaLabel?: string }} [opts]
   * @returns {SVGSVGElement}
   */
  function createDuelRankBadge(rank, opts) {
    const wrap = document.createElement('div');
    wrap.innerHTML = duelRankBadgeSVG(rank, opts).trim();
    const svg = wrap.firstElementChild;
    return /** @type {SVGSVGElement} */ (svg);
  }

  global.duelRankBadgeSVG = duelRankBadgeSVG;
  global.createDuelRankBadge = createDuelRankBadge;
  global.duelRankBadgePalette = duelRankBadgePalette;
  global.DUEL_RANK_BADGE_SIZES = { ...SIZES };
})(typeof window !== 'undefined' ? window : globalThis);
