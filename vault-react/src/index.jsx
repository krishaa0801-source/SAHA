import { createRoot } from 'react-dom/client';
import Card from './Card.jsx';
import GarmentPhoto from './GarmentPhoto.jsx';
import ShareButton from './ShareButton.jsx';

/* The integration points vault.html needs. All three take plain DOM nodes
   + plain data — the rest of the page never has to know React is
   involved. The rack hangs each product from its hanger; the product
   detail view just shows the photo; the share button owns its own popup/
   toast/fallback modal so the sidebar just has to give it a mount point. */

function mountRack(container, items) {
  createRoot(container).render(
    <>
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
    </>,
  );
}

let detailRoot = null;
function mountDetail(container, item) {
  if (detailRoot) detailRoot.unmount();
  detailRoot = createRoot(container);
  detailRoot.render(<GarmentPhoto garment={item} className="garment-photo--detail" />);
}

let shareRoot = null;
function mountShare(container, item) {
  if (shareRoot) shareRoot.unmount();
  shareRoot = createRoot(container);
  shareRoot.render(<ShareButton product={item} />);
}

window.VaultReact = { mountRack, mountDetail, mountShare };
