import React, { useState } from 'react';
import { Category, CategoryCreateInput } from '../../types/docs';
import { docsApi } from '../../api/docsApi';
import { X, Plus, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';

interface CategoryAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRefreshCategories: () => void;
}

export const CategoryAdminModal: React.FC<CategoryAdminModalProps> = ({
  isOpen,
  onClose,
  categories,
  onRefreshCategories,
}) => {
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingCatId(null);
    setName('');
    setSlug('');
    setDescription('');
    setDisplayOrder(0);
    setIsActive(true);
    setError(null);
  };

  const startEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setDisplayOrder(cat.display_order);
    setIsActive(cat.is_active);
    setError(null);
    setSuccessMsg(null);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCatId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload: CategoryCreateInput = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        display_order: Number(displayOrder) || 0,
        is_active: isActive,
      };

      if (editingCatId) {
        await docsApi.updateCategory(editingCatId, payload);
        setSuccessMsg('Category updated successfully!');
      } else {
        await docsApi.createCategory(payload);
        setSuccessMsg('Category created successfully!');
      }

      resetForm();
      onRefreshCategories();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (catId: number) => {
    if (!window.confirm('Are you sure you want to delete this category? Active documents in this category may block deletion.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await docsApi.deleteCategory(catId);
      setSuccessMsg('Category deleted.');
      onRefreshCategories();
      if (editingCatId === catId) {
        resetForm();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete category.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Manage Document Categories</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editingCatId ? 'Edit Category' : 'Create New Category'}
              </h3>
              {editingCatId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Authentication & Security"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="auto-generated-slug"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of articles in this category"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-20 text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-4 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Active</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {editingCatId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingCatId ? 'Update Category' : 'Add Category'}</span>
              </button>
            </div>
          </form>

          {/* Existing Categories Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Existing Categories ({categories.length})
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                        /{cat.slug}
                      </span>
                      {!cat.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-slate-500 mt-0.5 line-clamp-1">{cat.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
