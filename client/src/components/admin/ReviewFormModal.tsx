import { FormEvent, useRef, useState } from 'react';
import AdminModal from './AdminModal';
import StarRating from './StarRating';
import { AdminApiError, AdminReview, ReviewFormFields, createReview, updateReview } from '../../lib/admin/reviews';
import { useToast } from './ToastProvider';

type ProductOption = { id: string; name: string };

type Props = {
  review: AdminReview | null;
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
};

function emptyFields(): ReviewFormFields {
  return {
    product: '',
    customerName: '',
    rating: 5,
    title: '',
    text: '',
    reviewDate: new Date().toISOString().slice(0, 10),
    verified: false,
    featured: false,
    published: true,
  };
}

function fieldsFromReview(review: AdminReview): ReviewFormFields {
  return {
    product: review.product,
    customerName: review.customerName,
    rating: review.rating,
    title: review.title,
    text: review.text,
    reviewDate: review.reviewDate.slice(0, 10),
    verified: review.verified,
    featured: review.featured,
    published: review.published,
  };
}

export default function ReviewFormModal({ review, products, onClose, onSaved }: Props) {
  const isEdit = Boolean(review);
  const { showSuccess, showError } = useToast();
  const [fields, setFields] = useState<ReviewFormFields>(review ? fieldsFromReview(review) : emptyFields());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(review?.customerImage || undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!fields.product) next.product = 'Choose a product.';
    if (!fields.customerName.trim()) next.customerName = 'Customer name is required.';
    if (!(fields.rating >= 1 && fields.rating <= 5)) next.rating = 'Choose a rating.';
    if (!fields.title.trim()) next.title = 'Review title is required.';
    if (!fields.text.trim()) next.text = 'Review text is required.';
    if (!fields.reviewDate) next.reviewDate = 'Choose a review date.';
    return next;
  }

  function handleImagePick(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      showError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && review) {
        await updateReview(review.id, fields, imageFile);
        showSuccess('Review updated.');
      } else {
        await createReview(fields, imageFile);
        showSuccess('Review added.');
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) setErrors(err.fields);
      showError(err instanceof Error ? err.message : 'Could not save the review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModal title={isEdit ? 'Edit Review' : 'Add Review'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div>
            <label className="field-label">Customer Name</label>
            <input
              className={`field-input ${errors.customerName ? 'field-invalid' : ''}`}
              value={fields.customerName}
              onChange={(e) => setFields({ ...fields, customerName: e.target.value })}
            />
            {errors.customerName && <p className="field-error">{errors.customerName}</p>}
          </div>
          <div>
            <label className="field-label">Product</label>
            <select
              className={`field-input ${errors.product ? 'field-invalid' : ''}`}
              value={fields.product}
              onChange={(e) => setFields({ ...fields, product: e.target.value })}
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.product && <p className="field-error">{errors.product}</p>}
          </div>
          <div>
            <label className="field-label">Rating</label>
            <StarRating value={fields.rating} onChange={(rating) => setFields({ ...fields, rating })} size={1.3} />
            {errors.rating && <p className="field-error">{errors.rating}</p>}
          </div>
          <div>
            <label className="field-label">Review Date</label>
            <input
              type="date"
              className={`field-input ${errors.reviewDate ? 'field-invalid' : ''}`}
              value={fields.reviewDate}
              onChange={(e) => setFields({ ...fields, reviewDate: e.target.value })}
            />
            {errors.reviewDate && <p className="field-error">{errors.reviewDate}</p>}
          </div>
        </div>

        <div className="mt-4">
          <label className="field-label">Review Title</label>
          <input
            className={`field-input ${errors.title ? 'field-invalid' : ''}`}
            value={fields.title}
            onChange={(e) => setFields({ ...fields, title: e.target.value })}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="mt-4">
          <label className="field-label">Review Description</label>
          <textarea
            className={`field-input ${errors.text ? 'field-invalid' : ''}`}
            rows={4}
            value={fields.text}
            onChange={(e) => setFields({ ...fields, text: e.target.value })}
          />
          {errors.text && <p className="field-error">{errors.text}</p>}
        </div>

        <div className="mt-4">
          <label className="field-label">Customer Photo (optional)</label>
          <div className="admin-avatar-picker">
            {imagePreview ? (
              <img className="admin-avatar-preview" src={imagePreview} alt="" />
            ) : (
              <div className="admin-avatar-preview admin-avatar-preview-empty">
                <span className="material-symbols-outlined">person</span>
              </div>
            )}
            <button type="button" className="admin-btn-ghost" onClick={() => fileInputRef.current?.click()}>
              Choose Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => handleImagePick(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="admin-checkbox-row">
          <label>
            <input type="checkbox" checked={fields.verified} onChange={(e) => setFields({ ...fields, verified: e.target.checked })} />
            Verified Purchase
          </label>
          <label>
            <input type="checkbox" checked={fields.featured} onChange={(e) => setFields({ ...fields, featured: e.target.checked })} />
            Featured Review (pins it first)
          </label>
          <label>
            <input type="checkbox" checked={fields.published} onChange={(e) => setFields({ ...fields, published: e.target.checked })} />
            Published (visible on the product page)
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {isEdit ? 'Save Changes' : 'Add Review'}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
