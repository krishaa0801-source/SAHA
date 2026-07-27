import { useCallback, useEffect, useRef, useState } from 'react';
import { HookLayer, HangerBody, HANGER_VARIANTS, DEFAULT_HANGER_CATEGORY } from './Hanger.jsx';

/* Design constants — global, never per-product. All fractions of the
   card's own width, so everything scales across breakpoints. */
const HOOK_WIDTH_FRAC = 0.15; // hook render width (card-based → small & identical for every item)
const SPAN_MULTIPLIER = 1.0; // base hanger width vs. measured span; category widthFactor trims it further
const MIN_HANGER_FRAC = 0.3; // never let the bar collapse on a very narrow strap
const MAX_HANGER_FRAC = 0.78; // never let the bar overrun the card
const DROP_FRAC = 0.33; // rod → garment-shoulder distance (the bar straddles this line)
const DEFAULT_SPAN_FRAC = 0.55; // used only if pixel measurement is unavailable
const DEFAULT_CENTER_FRAC = 0.5;

/* Category-aware hanger shape (dress: narrow, jacket: wide, hoodie:
   rounded, t-shirt: standard — see Hanger.jsx). Falls back to 'tshirt'
   for anything unmapped, so a new garment type never breaks.

   The second half of this map is admin-managed Category slugs
   (server/models/Category.js, e.g. "dresses", "jackets", "sarees") —
   there are only 4 hanger silhouettes today, so each slug is mapped to
   its closest match (long/flowing → dress, structured/shoulder → jacket,
   everything else → the neutral tshirt bar). Pants/jeans/accessories
   don't have a dedicated silhouette (e.g. a trouser clip-hanger) yet —
   they render on the neutral tshirt bar until one is designed. */
const GARMENT_TO_HANGER_CATEGORY = {
  dress: 'dress', slip: 'dress', gown: 'dress', lehenga: 'dress', jumpsuit: 'dress',
  blazer: 'jacket', coat: 'jacket',
  shirt: 'tshirt', tshirt: 'tshirt',
  hoodie: 'hoodie',
  // Admin Category slugs:
  dresses: 'dress', sarees: 'dress', lehengas: 'dress',
  suits: 'jacket', jackets: 'jacket', coats: 'jacket', blazers: 'jacket',
  hoodies: 'hoodie',
  shirts: 'tshirt', 't-shirts': 'tshirt', tshirts: 'tshirt', kurtas: 'tshirt',
  pants: 'tshirt', jeans: 'tshirt', accessories: 'tshirt',
};
function resolveHangerCategory(garment) {
  const key = garment.category || garment.garment;
  return GARMENT_TO_HANGER_CATEGORY[key] || DEFAULT_HANGER_CATEGORY;
}

/* Measures where THIS garment is actually opaque near the top (the
   shoulder/collar/strap band) — both its horizontal CENTER and its SPAN —
   by sampling the loaded image's own alpha channel on an offscreen canvas.
   Centering the hanger on the measured center (not blindly on 50%) keeps
   an off-center neckline — a one-shoulder dress, an asymmetric cut — from
   leaving an arm drawn over bare background with nothing to hide it
   behind. Returns null if the pixels can't be read (e.g. a cross-origin
   image); the caller falls back to the defaults. */
function measureShoulderBand(img) {
  const sampleWidth = 48;
  const sampleHeight = Math.max(1, Math.round(sampleWidth * (img.naturalHeight / img.naturalWidth)));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const bandHeight = Math.max(1, Math.round(sampleHeight * 0.16));
    const { data } = ctx.getImageData(0, 0, sampleWidth, bandHeight);
    let minX = null;
    let maxX = null;
    for (let y = 0; y < bandHeight; y++) {
      for (let x = 0; x < sampleWidth; x++) {
        const alpha = data[(y * sampleWidth + x) * 4 + 3];
        if (alpha > 40) {
          if (minX === null || x < minX) minX = x;
          if (maxX === null || x > maxX) maxX = x;
        }
      }
    }
    if (minX === null) return null;
    return { centerFrac: (minX + maxX + 1) / 2 / sampleWidth, spanFrac: (maxX - minX + 1) / sampleWidth };
  } catch {
    return null; // e.g. a cross-origin image with no CORS headers
  }
}

/* <HangingGarment garment={{id, image, name, garment?}} />

   Vertical model (all measured against the rod, whose distance below the
   container's top edge the page supplies as --rod-offset):
     rod ─────────────── hook loop + neck top
        │  drop            (the hanger, filling this gap)
     shoulders ────────── arm tips  ┐ image top sits OVERLAP above the tips,
        │                           ┘ so the tips are hidden behind fabric
     garment body ...

   The image is pushed down by padding-top so its top (the shoulders)
   lands `drop − overlap` below the rod; the two hanger layers are
   absolutely positioned at the rod line (padding never moves them), so
   the hanger fills the gap without the garment overlapping up past the
   rod. The container's flow height is still just the image + that padding,
   so the only spacing the hanger adds is the deliberate, uniform gap it
   lives in. */
export default function HangingGarment({ garment, className = '' }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [shoulderBand, setShoulderBand] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleImageLoad = useCallback((event) => {
    const img = event.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    setShoulderBand(measureShoulderBand(img));
  }, []);

  const span = shoulderBand?.spanFrac ?? DEFAULT_SPAN_FRAC;
  const centerFrac = shoulderBand?.centerFrac ?? DEFAULT_CENTER_FRAC;
  const category = resolveHangerCategory(garment);
  const variant = HANGER_VARIANTS[category] || HANGER_VARIANTS[DEFAULT_HANGER_CATEGORY];
  // Hanger width tracks the measured garment span, trimmed by the category
  // factor so the wooden bar sits within the shoulders (tips behind straps).
  const hangerWidth = Math.min(
    Math.max(containerWidth * span * SPAN_MULTIPLIER * variant.widthFactor, containerWidth * MIN_HANGER_FRAC),
    containerWidth * MAX_HANGER_FRAC,
  );
  const hookWidth = containerWidth * HOOK_WIDTH_FRAC;
  const drop = containerWidth * DROP_FRAC; // rod → garment shoulder line

  const centeredAt = `${centerFrac * 100}%`;
  // The garment's shoulders sit `drop` below the rod; both hanger layers sit
  // AT the rod (--rod-offset is the container-top→rod distance the page
  // supplies, 0 when the component is used standalone). The wooden bar
  // straddles the shoulder line from there — its own geometry handles how
  // much shows above the neckline vs. tucks behind the fabric.
  const containerStyle = { paddingTop: `calc(var(--rod-offset, 0px) + ${drop}px)` };
  const atRod = 'var(--rod-offset, 0px)';
  const bodyStyle = { left: centeredAt, top: atRod, transform: 'translateX(-50%)' };
  const hookStyle = { left: centeredAt, top: atRod, transform: 'translateX(-50%)' };

  return (
    <div className={`hanging-garment ${className}`} ref={containerRef} style={containerStyle}>
      {containerWidth > 0 && (
        <>
          <HangerBody width={hangerWidth} drop={drop} category={category} style={bodyStyle} />
          <img
            className="hanging-garment-img"
            src={garment.image}
            alt={garment.name || ''}
            loading="lazy"
            onLoad={handleImageLoad}
          />
          <HookLayer width={hookWidth} style={hookStyle} />
        </>
      )}
    </div>
  );
}
