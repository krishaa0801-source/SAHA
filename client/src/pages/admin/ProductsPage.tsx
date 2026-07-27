import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AdminProduct,
  ProductListParams,
  archiveProduct,
  deleteProduct,
  duplicateProduct,
  fetchAdminProducts,
  unarchiveProduct,
} from '../../lib/admin/products';
import { Category, fetchCategories } from '../../lib/admin/categories';
import ProductTable from '../../components/admin/ProductTable';
import { useToast } from '../../components/admin/ToastProvider';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ProductListParams['status']>('');
  const [sort, setSort] = useState<NonNullable<ProductListParams['sort']>>('newest');

  useEffect(() => {
    fetchCategories().catch(() => []).then((cats) => setCategories(cats || []));
  }, []);

  function load() {
    fetchAdminProducts({ q, category, status: status || undefined, sort, limit: 50 })
      .then((data) => {
        setProducts(data.products);
        setTotal(data.total);
      })
      .catch((err) => showError(err instanceof Error ? err.message : 'Could not load products.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, status, sort]);

  async function handleDelete(product: AdminProduct) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    try {
      await deleteProduct(product.id);
      showSuccess('Product deleted.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not delete the product.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(product: AdminProduct) {
    setBusyId(product.id);
    try {
      await archiveProduct(product.id);
      showSuccess('Product archived — hidden from the site.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not archive the product.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnarchive(product: AdminProduct) {
    setBusyId(product.id);
    try {
      await unarchiveProduct(product.id);
      showSuccess('Product unarchived — visible on the site again.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not unarchive the product.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(product: AdminProduct) {
    setBusyId(product.id);
    try {
      const copy = await duplicateProduct(product.id);
      showSuccess('Product duplicated.');
      load();
      navigate(`/admin/products/${copy.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not duplicate the product.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Products</h1>
        <Link to="/admin/products/new" className="admin-btn-primary">
          <span className="material-symbols-outlined text-base">add</span>
          Add Product
        </Link>
      </div>

      <div className="admin-filter-bar card">
        <input
          className="field-input"
          placeholder="Search by name or brand…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as ProductListParams['status'])}>
          <option value="">All availability</option>
          <option value="available">Available</option>
          <option value="rented">Rented</option>
          <option value="hidden">Hidden</option>
        </select>
        <select className="field-input" value={sort} onChange={(e) => setSort(e.target.value as any)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name">Product name (A-Z)</option>
        </select>
      </div>

      {products === null ? (
        <div className="admin-loading">
          <span className="spinner" /> Loading products…
        </div>
      ) : (
        <>
          <p className="admin-result-count">{total} product{total === 1 ? '' : 's'}</p>
          <ProductTable
            products={products}
            categories={categories}
            busyId={busyId}
            onEdit={(p) => navigate(`/admin/products/${p.id}`)}
            onView={(p) => window.open(`/vault.html?product=${encodeURIComponent(p.id)}`, '_blank')}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
          />
        </>
      )}
    </div>
  );
}
