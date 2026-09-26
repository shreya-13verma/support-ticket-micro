import React, { useState, useEffect } from 'react';
import { Category, Tag, SupportDocument, DocumentCreateInput, DocumentUpdateInput, DocStatus } from '../../types/docs';
import { docsApi } from '../../api/docsApi';
import { MarkdownRenderer } from './MarkdownRenderer';
import { X, Save, Edit3, Sparkles, Tag as TagIcon, Layers, AlertCircle, Check } from 'lucide-react';

interface DocEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingTags: Tag[];
  initialDoc?: SupportDocument | null;
  onSaved: (doc: SupportDocument) => void;
  userRole?: string;
}

export const DocEditorModal: React.FC<DocEditorModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingTags,
  initialDoc,
  onSaved,
  userRole = 'agent',
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<DocStatus>('draft');
  const [isFeatured, setIsFeatured] = useState(false);

  // Tags
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // UI States
  const [previewTab, setPreviewTab] = useState<'write' | 'preview' | 'split'>('write');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDoc) {
      setTitle(initialDoc.title);
      setSlug(initialDoc.slug);
      setSummary(initialDoc.summary || '');
      setContent(initialDoc.content);
      setCategoryId(initialDoc.category_id);
      setStatus(initialDoc.status);
      setIsFeatured(initialDoc.is_featured);
      setSelectedTagNames(initialDoc.tags.map((t) => t.name));
    } else {
      setTitle('');
      setSlug('');
      setSummary('');
      setContent('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setStatus('draft');
      setIsFeatured(false);
      setSelectedTagNames([]);
    }
    setError(null);
  }, [initialDoc, isOpen, categories]);

  if (!isOpen) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialDoc) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter' && e.key !== ',') return;
    if (e) e.preventDefault();

    const clean = tagInput.trim().toLowerCase().replace(/,/g, '');
    if (clean && !selectedTagNames.includes(clean)) {
      setSelectedTagNames([...selectedTagNames, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTagNames(selectedTagNames.filter((t) => t !== tagName));
  };

  const handleToggleExistingTag = (tagName: string) => {
    if (selectedTagNames.includes(tagName)) {
      handleRemoveTag(tagName);
    } else {
      setSelectedTagNames([...selectedTagNames, tagName]);
    }
  };

  const handleSubmit = async (submitStatus?: DocStatus) => {
    if (!title.trim()) {
      setError('Article title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Article content is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveStatus = submitStatus || status;

    try {
      if (initialDoc) {
        const updatePayload: DocumentUpdateInput = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          summary: summary.trim() || undefined,
          content: content.trim(),
          category_id: Number(categoryId),
          status: effectiveStatus,
          is_featured: isFeatured,
          tag_names: selectedTagNames,
        };
        const updated = await docsApi.updateDocument(initialDoc.id, updatePayload);
        onSaved(updated);
        onClose();
      } else {
        const createPayload: DocumentCreateInput = {
          title: title.trim(),
          slug: slug.trim() || undefined,
          summary: summary.trim() || undefined,
          content: content.trim(),
          category_id: Number(categoryId),
          status: effectiveStatus,
          is_featured: isFeatured,
          tag_names: selectedTagNames,
        };
        const created = await docsApi.createDocument(createPayload);
        onSaved(created);
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save document. Please check fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = userRole.toLowerCase() === 'admin';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialDoc ? 'Edit Support Article' : 'Create Knowledge Base Article'}
              </h2>
              <p className="text-xs text-slate-500">
                Author technical documentation, troubleshooting procedures, or FAQ guides.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Article Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. How to Configure Single Sign-On (SSO)"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                URL Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-slug"
                className="w-full text-xs font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-600"
              />
            </div>
          </div>

          {/* Category & Status & Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Category *</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                required
              >
                <option value="" disabled>Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocStatus)}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
              >
                <option value="draft">Draft (Private)</option>
                <option value="published">Published (Public)</option>
                <option value="archived">Archived (Retired)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pin as Featured Article</span>
                </span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tags (Press Enter or comma to add)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] items-center">
              {selectedTagNames.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-mono"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-indigo-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={selectedTagNames.length === 0 ? "Type tag name (e.g. sso, billing, api)..." : "Add more..."}
                className="text-xs bg-transparent border-none focus:outline-none flex-1 min-w-[140px] px-1 py-0.5 text-slate-800"
              />
            </div>

            {existingTags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs text-slate-500">
                <span className="text-[11px] font-semibold text-slate-400">Suggestions:</span>
                {existingTags.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleToggleExistingTag(t.name)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      selectedTagNames.includes(t.name)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Summary / Short Excerpt
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="1-2 sentences explaining what problem this article solves"
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Content & Markdown Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Article Body (Markdown Supported) *
              </label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => setPreviewTab('write')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    previewTab === 'write' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('preview')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    previewTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('split')}
                  className={`hidden sm:inline-block px-3 py-1 rounded-md transition-colors ${
                    previewTab === 'split' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'hover:text-slate-900'
                  }`}
                >
                  Split View
                </button>
              </div>
            </div>

            {previewTab === 'write' && (
              <textarea
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Introduction&#10;&#10;Explain step-by-step instructions with code snippets or lists..."
                className="w-full text-xs font-mono p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
                required
              />
            )}

            {previewTab === 'preview' && (
              <div className="min-h-[280px] max-h-[400px] overflow-y-auto p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                {content ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-xs text-slate-400 italic">No content to preview yet.</p>
                )}
              </div>
            )}

            {previewTab === 'split' && (
              <div className="grid grid-cols-2 gap-3 min-h-[300px]">
                <textarea
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Markdown Content..."
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
                  required
                />
                <div className="overflow-y-auto max-h-[300px] p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-xs">
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Preview will appear here.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit('draft')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-50 border border-slate-200"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(isAdmin ? 'published' : undefined)}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{initialDoc ? 'Update Article' : (isAdmin ? 'Publish Now' : 'Save Article')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
