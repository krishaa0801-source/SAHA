import { AdminProduct } from '../../lib/admin/products';
import { Category } from '../../lib/admin/categories';

type Props = {
  products: AdminProduct[];
  categories: Category[];
  onEdit: (product: AdminProduct) => void;
  onView: (product: AdminProduct) => void;
  onDuplicate: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => void;
  onArchive: (product: AdminProduct) => void;
  onUnarchive: (product: AdminProduct) => void;
  busyId: string | null;
};

const STATUS_LABEL: Record<AdminProduct['status'], string> = {
  available: 'Available',
  rented: 'Rented',
  hidden: 'Hidden',
};

export default function ProductTable({ products, categories, onEdit, onView, onDuplicate, onDelete, onArchive, onUnarchive, busyId }: Props) {
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name || slug;

  if (!products.length) {
    return (
      <div className="card admin-empty-state">
        <span className="material-symbols-outlined text-4xl">checkroom</span>
        <p>No products match these filters yet.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Product</th>
            <th>Category</th>
            <th>Price / day</th>
            <th>Sizes</th>
            <th>Availability</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className={busyId === p.id ? 'busy' : ''}>
              <td>
                <img className="admin-table-thumb" src={p.galleryImages[0]?.thumbnailUrl || p.image} alt={p.name} loading="lazy" />
              </td>
              <td>
                <div className="admin-table-name">{p.name}</div>
                {p.brand && <div className="admin-table-brand">{p.brand}</div>}
              </td>
              <td>{categoryName(p.category)}</td>
              <td>₹{p.price.toLocaleString('en-IN')}</td>
              <td>
                <div className="admin-size-pills">
                  {p.sizes.map((s) => (
                    <span key={s.size} className={`admin-size-pill ${s.quantity > 0 ? '' : 'out'}`}>
                      {s.size}
                      {s.quantity > 0 ? ` (${s.quantity})` : ''}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <span className={`status-badge status-${p.status}`}>{STATUS_LABEL[p.status]}</span>
              </td>
              <td>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td>
                <div className="admin-row-actions">
                  <button title="View on site" onClick={() => onView(p)}>
                    <span className="material-symbols-outlined text-base">visibility</span>
                  </button>
                  <button title="Edit" onClick={() => onEdit(p)}>
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button title="Duplicate" onClick={() => onDuplicate(p)} disabled={busyId === p.id}>
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                  {p.status === 'hidden' ? (
                    <button title="Unarchive" onClick={() => onUnarchive(p)} disabled={busyId === p.id}>
                      <span className="material-symbols-outlined text-base">unarchive</span>
                    </button>
                  ) : (
                    <button title="Archive" onClick={() => onArchive(p)} disabled={busyId === p.id}>
                      <span className="material-symbols-outlined text-base">archive</span>
                    </button>
                  )}
                  <button title="Delete" className="danger" onClick={() => onDelete(p)} disabled={busyId === p.id}>
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
