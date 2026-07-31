import HangingGarment from './HangingGarment.jsx';

/* <Card item={product} />
   Renders the same .piece button markup (classes, dataset, aria-label)
   the vanilla renderer used to build by hand, so the existing filter
   logic, hover/nudge listeners, and the sidebar-open click handler — all
   of which are wired via delegated listeners on ancestor elements in
   vault.html, not per-card — keep working unmodified against this DOM
   regardless of who rendered it. */
export default function Card({ item }) {
  const ariaLabel = `${item.name} by ${item.brand}, base rental price ₹${item.price.toLocaleString('en-IN')}. Open details`;
  const searchText = `${item.name} ${item.brand} ${item.collectionName}`.toLowerCase();
  return (
    <button
      className="piece"
      role="listitem"
      aria-label={ariaLabel}
      data-id={item.id}
      data-sizes={item.sizes.join(',')}
      data-tags={item.tags.join(',')}
      data-avail={item.avail}
      data-search={searchText}
    >
      <HangingGarment garment={item} />
      <span className="piece-label">{item.name}</span>
    </button>
  );
}
