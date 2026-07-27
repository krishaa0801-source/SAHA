import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AdminApiError,
  GalleryEntry,
  ProductFormFields,
  createProduct,
  fetchAdminProduct,
  updateProduct,
} from '../../lib/admin/products';
import { Category, fetchCategories } from '../../lib/admin/categories';
import HangerImageUploader from '../../components/admin/HangerImageUploader';
import GalleryUploader from '../../components/admin/GalleryUploader';
import SizeQuantityEditor from '../../components/admin/SizeQuantityEditor';
import { useToast } from '../../components/admin/ToastProvider';

const EMPTY_FIELDS: ProductFormFields = {
  name: '',
  category: '',
  brand: '',
  description: '',
  price: 0,
  status: 'available',
  sizes: [],
};

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = id !== 'new' && Boolean(id);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<ProductFormFields>(EMPTY_FIELDS);
  const [hangerExistingUrl, setHangerExistingUrl] = useState<string | undefined>(undefined);
  const [hangerFile, setHangerFile] = useState<File | null>(null);
  const [galleryEntries, setGalleryEntries] = useState<GalleryEntry[]>([]);
  const [priceInput, setPriceInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories().catch(() => []).then((cats) => setCategories(cats || []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    fetchAdminProduct(id!)
      .then((product) => {
        if (cancelled) return;
        setFields({
          name: product.name,
          category: product.category,
          brand: product.brand,
          description: product.description,
          price: product.price,
          status: product.status,
          sizes: product.sizes,
        });
        setPriceInput(String(product.price));
        setHangerExistingUrl(product.image);
        setGalleryEntries(product.galleryImages.map((g) => ({ type: 'existing' as const, url: g.url, thumbnailUrl: g.thumbnailUrl })));
        setLoading(false);
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : 'Could not load this product.');
        navigate('/admin/products');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!fields.name.trim()) next.name = 'Product name is required.';
    if (!fields.category) next.category = 'Choose a category.';
    if (!(fields.price > 0)) next.price = 'Rental price must be greater than 0.';
    if (!fields.sizes.some((s) => s.quantity > 0)) next.sizes = 'Add at least one size with a stock quantity greater than 0.';
    if (!hangerFile && !hangerExistingUrl) next.image = 'A hanger image is required.';
    if (!galleryEntries.length) next.galleryImages = 'At least one product gallery image is required.';
    return next;
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
      if (isEdit) {
        await updateProduct(id!, fields, hangerFile, galleryEntries);
        showSuccess('Product updated.');
      } else {
        await createProduct(fields, hangerFile!, galleryEntries.map((g) => (g as { type: 'new'; file: File }).file));
        showSuccess('Product created.');
      }
      navigate('/admin/products');
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) {
        setErrors(err.fields);
      }
      showError(err instanceof Error ? err.message : 'Could not save the product.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <span className="spinner" /> Loading product…
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">{isEdit ? 'Edit Product' : 'Add Product'}</h1>

      <form className="admin-product-form" onSubmit={handleSubmit}>
        <section className="card">
          <h2 className="admin-section-title">Basic Information</h2>
          <div className="admin-form-grid">
            <div>
              <label className="field-label">Product Name</label>
              <input
                className={`field-input ${errors.name ? 'field-invalid' : ''}`}
                value={fields.name}
                onChange={(e) => setFields({ ...fields, name: e.target.value })}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div>
              <label className="field-label">Category</label>
              <select
                className={`field-input ${errors.category ? 'field-invalid' : ''}`}
                value={fields.category}
                onChange={(e) => setFields({ ...fields, category: e.target.value })}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="field-error">{errors.category}</p>}
              {!categories.length && (
                <p className="admin-hint">No categories yet — create one on the Categories page first.</p>
              )}
            </div>
            <div>
              <label className="field-label">Brand</label>
              <input className="field-input" value={fields.brand} onChange={(e) => setFields({ ...fields, brand: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Rental Price (₹ / day)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className={`field-input ${errors.price ? 'field-invalid' : ''}`}
                value={priceInput}
                onChange={(e) => {
                  setPriceInput(e.target.value);
                  setFields({ ...fields, price: parseFloat(e.target.value) || 0 });
                }}
              />
              {errors.price && <p className="field-error">{errors.price}</p>}
            </div>
            <div>
              <label className="field-label">Status</label>
              <select
                className="field-input"
                value={fields.status}
                onChange={(e) => setFields({ ...fields, status: e.target.value as ProductFormFields['status'] })}
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="field-label">Description</label>
            <textarea
              className="field-input"
              rows={4}
              value={fields.description}
              onChange={(e) => setFields({ ...fields, description: e.target.value })}
            />
          </div>
        </section>

        <section className="card">
          <h2 className="admin-section-title">Sizes</h2>
          <SizeQuantityEditor value={fields.sizes} onChange={(sizes) => setFields({ ...fields, sizes })} error={errors.sizes} />
        </section>

        <section className="card">
          <h2 className="admin-section-title">Hanger Image</h2>
          <HangerImageUploader
            existingUrl={hangerExistingUrl}
            categorySlug={fields.category}
            onFileSelected={setHangerFile}
            error={errors.image}
          />
        </section>

        <section className="card">
          <h2 className="admin-section-title">Product Gallery Images</h2>
          <GalleryUploader value={galleryEntries} onChange={setGalleryEntries} error={errors.galleryImages} />
        </section>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-ghost" onClick={() => navigate('/admin/products')}>
            Cancel
          </button>
          <button type="submit" className="admin-btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
