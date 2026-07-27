import { createRoot } from 'react-dom/client';
import Card from './Card.jsx';
import GarmentPhoto from './GarmentPhoto.jsx';

/* The only two integration points vault.html needs. Both take plain DOM
   nodes + plain data — the rest of the page never has to know React is
   involved, and never positions a hanger itself. The rack hangs each
   product from its hanger; the product detail view just shows the photo. */

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

window.VaultReact = { mountRack, mountDetail };
