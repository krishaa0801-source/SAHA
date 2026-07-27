import { FormEvent, useEffect, useState } from 'react';
import { Category, createCategory, deleteCategory, fetchCategories, updateCategory } from '../../lib/admin/categories';
import { useToast } from '../../components/admin/ToastProvider';

export default function CategoriesPage() {
  const { showSuccess, showError } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetchCategories()
      .then(setCategories)
      .catch((err) => showError(err instanceof Error ? err.message : 'Could not load categories.'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCategory(newName.trim());
      setNewName('');
      showSuccess('Category created.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not create the category.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editingName.trim()) return;
    setBusyId(id);
    try {
      await updateCategory(id, editingName.trim());
      setEditingId(null);
      showSuccess('Category updated.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not update the category.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setBusyId(category._id);
    try {
      await deleteCategory(category._id);
      showSuccess('Category deleted.');
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Could not delete the category.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">Categories</h1>

      <form className="admin-inline-form card" onSubmit={handleCreate}>
        <input
          className="field-input"
          placeholder="New category name (e.g. Jackets)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="admin-btn-primary" type="submit" disabled={creating}>
          {creating && <span className="spinner" />}
          Add Category
        </button>
      </form>

      {categories === null ? (
        <div className="admin-loading">
          <span className="spinner" /> Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="card admin-empty-state">
          <span className="material-symbols-outlined text-4xl">category</span>
          <p>No categories yet — add your first one above.</p>
        </div>
      ) : (
        <div className="card">
          <ul className="admin-category-list">
            {categories.map((c) => (
              <li key={c._id}>
                {editingId === c._id ? (
                  <>
                    <input
                      className="field-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                    />
                    <div className="admin-row-actions">
                      <button onClick={() => handleSaveEdit(c._id)} disabled={busyId === c._id} title="Save">
                        <span className="material-symbols-outlined text-base">check</span>
                      </button>
                      <button onClick={() => setEditingId(null)} title="Cancel">
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span>{c.name}</span>
                    <div className="admin-row-actions">
                      <button
                        onClick={() => {
                          setEditingId(c._id);
                          setEditingName(c.name);
                        }}
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button className="danger" onClick={() => handleDelete(c)} disabled={busyId === c._id} title="Delete">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
