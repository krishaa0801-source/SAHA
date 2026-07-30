import { AdminReview } from '../../lib/admin/reviews';
import StarRating from './StarRating';

type Props = {
  reviews: AdminReview[];
  busyId: string | null;
  onEdit: (review: AdminReview) => void;
  onDelete: (review: AdminReview) => void;
  onTogglePublished: (review: AdminReview) => void;
  onToggleFeatured: (review: AdminReview) => void;
  onToggleVerified: (review: AdminReview) => void;
};

export default function ReviewTable({ reviews, busyId, onEdit, onDelete, onTogglePublished, onToggleFeatured, onToggleVerified }: Props) {
  if (!reviews.length) {
    return (
      <div className="card admin-empty-state">
        <span className="material-symbols-outlined text-4xl">reviews</span>
        <p>No reviews match these filters yet.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Product</th>
            <th>Rating</th>
            <th>Title</th>
            <th>Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id} className={busyId === r.id ? 'busy' : ''}>
              <td>
                <div className="admin-table-name-with-avatar">
                  {r.customerImage ? (
                    <img className="admin-table-avatar" src={r.customerImage} alt="" loading="lazy" />
                  ) : (
                    <div className="admin-table-avatar admin-table-avatar-fallback">{r.customerName.charAt(0).toUpperCase()}</div>
                  )}
                  <div>
                    <div className="admin-table-name">
                      {r.customerName}
                      {r.verified && (
                        <span className="material-symbols-outlined verified-badge" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified Purchase">
                          verified
                        </span>
                      )}
                    </div>
                    {r.featured && <span className="featured-pin">Featured</span>}
                  </div>
                </div>
              </td>
              <td>
                <div className="admin-table-name-with-avatar">
                  {r.productImage && <img className="admin-table-thumb" src={r.productImage} alt="" loading="lazy" />}
                  <span>{r.productName}</span>
                </div>
              </td>
              <td>
                <StarRating value={r.rating} size={0.85} />
              </td>
              <td className="admin-table-title-cell">{r.title}</td>
              <td>{new Date(r.reviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td>
                <span className={`status-badge status-${r.published ? 'published' : 'hidden'}`}>{r.published ? 'Published' : 'Hidden'}</span>
              </td>
              <td>
                <div className="admin-row-actions">
                  <button title="Edit" onClick={() => onEdit(r)}>
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button title={r.published ? 'Hide' : 'Publish'} onClick={() => onTogglePublished(r)} disabled={busyId === r.id}>
                    <span className="material-symbols-outlined text-base">{r.published ? 'visibility_off' : 'visibility'}</span>
                  </button>
                  <button title={r.featured ? 'Unpin' : 'Pin as Featured'} onClick={() => onToggleFeatured(r)} disabled={busyId === r.id}>
                    <span className="material-symbols-outlined text-base">push_pin</span>
                  </button>
                  <button title={r.verified ? 'Unmark Verified' : 'Mark Verified'} onClick={() => onToggleVerified(r)} disabled={busyId === r.id}>
                    <span className="material-symbols-outlined text-base">verified</span>
                  </button>
                  <button title="Delete" className="danger" onClick={() => onDelete(r)} disabled={busyId === r.id}>
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
