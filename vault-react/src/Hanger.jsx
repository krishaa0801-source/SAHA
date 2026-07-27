import { useId } from 'react';

/* Premium wooden hanger — modelled on a boutique display piece, not a wire
   icon. Three materials, each drawn as what it physically is:

     - HookLayer: a slim POLISHED-METAL hook (thin stroke) that curls over
       the rod. Sized from the CARD's width so every hook matches and lands
       on the rod identically. z-index 30 — always the topmost, always
       fully visible. Its bottom stays up at the rod, far above the garment.

     - HangerBody: a thin metal SHAFT dropping from the rod, then the
       WOODEN SHOULDER BAR — a solid, gently-curved bar with a vertical
       wood-tone gradient (light sheen on top, shadow beneath) and rounded
       ends, so it reads as a real turned-wood hanger rather than an
       outline. z-index 10 — it sits BEHIND the garment, so the fabric
       drapes over its front; only its upper edge shows above the neckline
       and its rounded tips peek out at the shoulders.

   Everything scales from `width` (the measured garment span) and `drop`
   (rod→shoulder distance) — no fixed pixels, no per-product tweaks. The
   bar is deliberately slim and its curve subtle (req: Massimo Dutti /
   Ralph Lauren, not a cartoon hanger). */

const WOOD_TOP = '#F3E6CD';    // polished highlight along the top of the bar
const WOOD_MID = '#D5B183';    // mid wood tone
const WOOD_LOW = '#9E7A48';    // shadowed underside
const METAL = '#CBA76E';       // hook + shaft (warm polished metal)

export const HANGER_VARIANTS = {
  // widthFactor: hanger width relative to the measured garment span
  //              (<1 keeps the tips inside the shoulders / behind straps)
  // curveFrac:   how far the bar dips from center to tip, as a fraction of
  //              its width — kept small for a subtle, premium curve
  dress: { widthFactor: 0.84, curveFrac: 0.11 },
  jacket: { widthFactor: 0.98, curveFrac: 0.09 },
  hoodie: { widthFactor: 0.94, curveFrac: 0.12 },
  tshirt: { widthFactor: 0.9, curveFrac: 0.1 },
};
export const DEFAULT_HANGER_CATEGORY = 'tshirt';

/* z-index 30. width = the hook's own (card-based) render width. The curl's
   top is at svg y=0, so the caller places y=0 at the rod line. Thin. */
export function HookLayer({ width, style }) {
  const r = width * 0.34;
  const stem = width * 0.12;
  const height = stem + r * 2;
  const cx = width / 2;
  const strokeWidth = Math.max(1.1, width * 0.11); // ~half the old hook weight
  const path = `M${cx} ${height} v${-stem} a${r} ${r} 0 1 1 ${r} ${-r}`;
  return (
    <svg
      className="hg-layer hg-hook-layer"
      style={style}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} fill="none" stroke={METAL} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* z-index 10, behind the garment. width = hanger width; drop = rod→shoulder
   distance. A thin metal shaft runs from the rod (y=0) down to the wooden
   bar; the bar's peak sits just above the shoulder line so its top edge
   shows above the neckline while its lower body + tips tuck behind the
   fabric. */
export function HangerBody({ width, drop, category, style }) {
  const rawId = useId();
  const woodId = `wood-${rawId.replace(/:/g, '')}`;
  const v = HANGER_VARIANTS[category] || HANGER_VARIANTS[DEFAULT_HANGER_CATEGORY];
  const cx = width / 2;

  const half = width / 2;                       // tips reach the hanger's own edges
  const barRise = width * 0.06;                 // how far the bar peak sits above the shoulder line
  const barCurve = width * v.curveFrac;         // subtle dip from peak to tips
  const peakY = drop - barRise;                 // bar peak, just above the garment top
  const tipY = peakY + barCurve;                // tips dip below the shoulder line → behind fabric
  const barThickness = Math.max(3.5, width * 0.07); // slim wooden bar
  const shaftWidth = Math.max(1.1, width * 0.02);   // thin metal shaft
  const svgH = tipY + barThickness;

  const shaft = `M${cx} 0 L${cx} ${peakY}`;
  // quadratic whose visible peak lands exactly at (cx, peakY)
  const bar = `M${cx - half} ${tipY} Q${cx} ${2 * peakY - tipY} ${cx + half} ${tipY}`;

  return (
    <svg
      className="hg-layer hg-arms-layer"
      style={style}
      width={width}
      height={svgH}
      viewBox={`0 0 ${width} ${svgH}`}
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WOOD_TOP} />
          <stop offset="0.5" stopColor={WOOD_MID} />
          <stop offset="1" stopColor={WOOD_LOW} />
        </linearGradient>
      </defs>
      <path d={shaft} fill="none" stroke={METAL} strokeWidth={shaftWidth} strokeLinecap="round" />
      <path d={bar} fill="none" stroke={`url(#${woodId})`} strokeWidth={barThickness} strokeLinecap="round" />
    </svg>
  );
}
