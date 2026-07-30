import { useEffect, useState } from 'react';
import {
  AdminReview,
  ReviewListParams,
  deleteReview,
  featureReview,
  fetchAdminReviews,
  hideReview,
  publishReview,
  unfeatureReview,
  unverifyReview,
  verifyReview,
} from '../../lib/admin/reviews';
import { fetchAdminProducts } from '../../lib/admin/products';
import ReviewTable from '../../components/admin/ReviewTable';
import ReviewFormModal from '../../components/admin/ReviewFormModal';
import { useToast } from '../../components/admin/ToastProvider';

export default function ReviewsPage() {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalReview, setModalReview] = useState<AdminReview | null | undefined>(undefined);

  const [q, setQ] = useState('');
  const [product, setProduct] = useState('');
  const [rating, setRating] = useState<ReviewListParams['rating']>('');
  const [published, setPublished] = useState<ReviewListParams['published']>('');
  const [sort, setSort] = useState<NonNullable<ReviewListParams['sort']>>('newest');

  useEffect(() => {
    fetchAdminProducts({ limit: 100 })
      .catch(() => null)
      .then((data) => setProducts((data?.products || []).map((p) => ({ id: p.id, name: p.name }))));
  }, []);

  function load() {
    fetchAdminReviews({ q, product, rating: rating || undefined, published: published || undefined, sort, limit: 50 })
      .then((data) => {
        setReviews(data.reviews);
        setTotal(data.total);
      })
      .catch((err) => showError(err instanceof Error ? err.message : 'Could not load reviews.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, product, rating, published, sort]);

  async function withBusy(review: AdminReview, action: () => Promise<unknown>, successMessage: string, errorMessage: string) {
    setBusyId(review.id);
    try {
      await action();
      showSuccess(successMessage);
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : errorMessage);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(review: AdminReview) {
    if (!window.confirm(`Delete this review from "${review.customerName}"? This cannot be undone.`)) return;
    withBusy(review, () => deleteReview(review.id), 'Review deleted.', 'Could not delete the review.');
  }

  function handleTogglePublished(review: AdminReview) {
    withBusy(
      review,
      () => (review.published ? hideReview(review.id) : publishReview(review.id)),
      review.published ? 'Review hidden.' : 'Review published.',
      'Could not update the review.'
    );
  }

  function handleToggleFeatured(review: AdminReview) {
    withBusy(
      review,
      () => (review.featured ? unfeatureReview(review.id) : featureReview(review.id)),
      review.featured ? 'Removed from featured.' : 'Pinned as featured.',
      'Could not update the review.'
    );
  }

  function handleToggleVerified(review: AdminReview) {
    withBusy(
      review,
      () => (review.verified ? unverifyReview(review.id) : verifyReview(review.id)),
      review.verified ? 'Verified badge removed.' : 'Marked as verified purchase.',
      'Could not update the review.'
    );
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Reviews</h1>
        <button className="admin-btn-primary" onClick={() => setModalReview(null)}>
          <span className="material-symbols-outlined text-base">add</span>
          Add Review
        </button>
      </div>

      <div className="admin-filter-bar card">
        <input className="field-input" placeholder="Search by customer or product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field-input" value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select className="field-input" value={rating} onChange={(e) => setRating((e.target.value ? Number(e.target.value) : '') as ReviewListParams['rating'])}>
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <select className="field-input" value={published} onChange={(e) => setPublished(e.target.value as ReviewListParams['published'])}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
        <select className="field-input" value={sort} onChange={(e) => setSort(e.target.value as NonNullable<ReviewListParams['sort']>)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="rating_desc">Highest rating</option>
        </select>
      </div>

      {reviews === null ? (
        <div className="admin-loading">
          <span className="spinner" /> Loading reviews…
        </div>
      ) : (
        <>
          <p className="admin-result-count">{total} review{total === 1 ? '' : 's'}</p>
          <ReviewTable
            reviews={reviews}
            busyId={busyId}
            onEdit={setModalReview}
            onDelete={handleDelete}
            onTogglePublished={handleTogglePublished}
            onToggleFeatured={handleToggleFeatured}
            onToggleVerified={handleToggleVerified}
          />
        </>
      )}

      {modalReview !== undefined && (
        <ReviewFormModal review={modalReview} products={products} onClose={() => setModalReview(undefined)} onSaved={load} />
      )}
    </div>
  );
}
