import { useState } from 'react';

/* The product detail sidebar shows the garment on its own — no hanger.
   Kept as its own tiny component (rather than a "hideHanger" flag bolted
   onto HangingGarment) so each place that renders a garment says exactly
   what it wants: the rack hangs it, the detail view just shows it.

   detailImage (public/images/detail/<id>.png) is an OPTIONAL sidebar-only
   photo, distinct from the rack's image — falls back to the rack photo
   if it 404s (or was never set). */
export default function GarmentPhoto({ garment, className = '' }) {
  const [useFallback, setUseFallback] = useState(false);
  const src = !useFallback && garment.detailImage ? garment.detailImage : garment.image;
  return (
    <img
      className={`garment-photo ${className}`}
      src={src}
      alt={garment.name || ''}
      loading="lazy"
      onError={() => setUseFallback(true)}
    />
  );
}
