/* Product photos are shot on a real hanger, so the rack no longer draws
   one — the photo IS the hanger. This component just places that photo
   against the rod, so the real, photographed hanger reads as if it's
   hanging from the rod itself. --rod-offset is the ONE page-layout fact
   this needs: how far the rod bar sits below this card's top edge
   (supplied by the page via CSS custom property, 0 when used standalone
   e.g. in the admin preview).

   Every product photo is framed with some plain (transparent) background
   above the metal hook — studio shot margin, not just the hook itself —
   so parking the image's top pixel flush at the rod line still reads as a
   gap between the rod and the actual hook. IMAGE_LIFT pulls the image up
   past that flush position to cancel the built-in framing, so the hook
   (not the photo's edge) is what lands on the rod, with a small deliberate
   overlap so it never floats free. It's a negative margin on the image —
   not less padding on the container — specifically so it can move the
   image ABOVE the flush position even when that's more than --rod-offset
   itself (a plain padding floor would clamp at 0 and cap the lift at
   whatever --rod-offset happens to be). One global constant, identical for
   every product; never tuned per item. */
const IMAGE_LIFT = 8; // px the image is lifted above sitting flush at the rod line

export default function HangingGarment({ garment, className = '' }) {
  const containerStyle = { paddingTop: 'var(--rod-offset, 0px)' };
  const imgStyle = { marginTop: `-${IMAGE_LIFT}px` };

  return (
    <div className={`hanging-garment ${className}`} style={containerStyle}>
      <img
        className="hanging-garment-img"
        src={garment.image}
        alt={garment.name || ''}
        loading="lazy"
        style={imgStyle}
      />
    </div>
  );
}
