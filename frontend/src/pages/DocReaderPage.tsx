import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { docsApi } from '../api/docsApi';
import { SupportDocument, Category, Tag, DocStatus, DocumentListItem } from '../types/docs';
import { MarkdownRenderer } from '../components/docs/MarkdownRenderer';
import { FeedbackWidget } from '../components/docs/FeedbackWidget';
import { DocEditorModal } from '../components/docs/DocEditorModal';
import {
  ChevronRight,
  Calendar,
  Eye,
  ThumbsUp,
  Edit3,
  Trash2,
  Share2,
  ArrowLeft,
  Star,
  Check,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

export const DocReaderPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [document, setDocument] = useState<SupportDocument | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [relatedDocs, setRelatedDocs] = useState<DocumentListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const isStaff = Boolean(user && (user.role === 'admin' || user.role === 'agent'));
  const isAdmin = Boolean(user && user.role === 'admin');

  // Load document by ID or Slug
  const loadDocument = useCallback(async () => {
    if (!idOrSlug) return;
    setLoading(true);
    setError(null);

    try {
      const doc = await docsApi.getDocument(idOrSlug);
      setDocument(doc);

      // Load related documents in same category
      if (doc.category_id) {
        docsApi.listDocuments({ category_id: doc.category_id, limit: 4 })
          .then((res) => {
            setRelatedDocs(res.documents.filter((d) => d.id !== doc.id).slice(0, 3));
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setError(
        err?.response?.status === 404
          ? 'Article not found or you do not have permission to view it.'
          : 'Failed to load article.'
      );
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Load Categories & Tags for editor modal
  useEffect(() => {
    if (isStaff) {
      Promise.all([docsApi.listCategories(), docsApi.listTags()])
        .then(([cats, tgs]) => {
          setCategories(cats);
          setTags(tgs);
        })
        .catch(() => {});
    }
  }, [isStaff]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleStatusChange = async (newStatus: DocStatus) => {
    if (!document) return;
    setStatusUpdating(true);
    try {
      const updated = await docsApi.updateDocumentStatus(document.id, newStatus);
      setDocument(updated);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${document.title}"?`)) {
      return;
    }

    try {
      await docsApi.deleteDocument(document.id);
      navigate('/docs');
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete document.');
    }
  };

  const handleDocSaved = (updatedDoc: SupportDocument) => {
    setDocument(updatedDoc);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-10 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="h-64 bg-slate-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Article Unavailable</h2>
        <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
          {error || 'This article could not be loaded.'}
        </p>
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Knowledge Base</span>
        </Link>
      </div>
    );
  }

  const formattedCreatedDate = new Date(document.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedUpdatedDate = new Date(document.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Breadcrumbs & Action Bar */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <Link to="/" className="hover:text-indigo-600">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/docs" className="hover:text-indigo-600">Knowledge Base</Link>
            {document.category && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <Link
                  to={`/docs?category=${document.category_id}`}
                  className="hover:text-indigo-600 font-medium text-slate-700"
                >
                  {document.category.name}
                </Link>
              </>
            )}
          </nav>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              title="Copy shareable link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Share</span>
                </>
              )}
            </button>

            {isStaff && (
              <button
                onClick={() => setIsEditorOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 border border-slate-200"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Edit</span>
              </button>
            )}

            {isAdmin && (
              <>
                <select
                  value={document.status}
                  disabled={statusUpdating}
                  onChange={(e) => handleStatusChange(e.target.value as DocStatus)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="published">Status: Published</option>
                  <option value="draft">Status: Draft</option>
                  <option value="archived">Status: Archived</option>
                </select>

                <button
                  onClick={handleDelete}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  title="Delete article"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Reader Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Article Main Body */}
          <article className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
            {/* Header / Badges */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {document.category && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                    {document.category.name}
                  </span>
                )}
                {document.is_featured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    Featured
                  </span>
                )}
                {document.status !== 'published' && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      document.status === 'draft'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {document.status.toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                {document.title}
              </h1>

              {document.summary && (
                <p className="text-base text-slate-600 bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r-xl leading-relaxed italic">
                  {document.summary}
                </p>
              )}

              {/* Metadata row */}
              <div className="flex items-center gap-4 text-xs text-slate-500 pt-4 border-b border-slate-100 pb-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Published {formattedCreatedDate}</span>
                </div>
                {formattedCreatedDate !== formattedUpdatedDate && (
                  <span>(Updated {formattedUpdatedDate})</span>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>{document.view_count} views</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{document.helpful_count} helpful ratings</span>
                </div>
              </div>
            </div>

            {/* Markdown Body */}
            <div className="pt-2">
              <MarkdownRenderer content={document.content} />
            </div>

            {/* Tags footer */}
            {document.tags && document.tags.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Tagged with
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {document.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      to={`/docs?tag=${tag.slug}`}
                      className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Widget */}
            <div className="pt-6 border-t border-slate-100">
              <FeedbackWidget
                docId={document.id}
                initialHelpfulCount={document.helpful_count}
                initialNotHelpfulCount={document.not_helpful_count}
              />
            </div>
          </article>

          {/* Right Sidebar: Quick Navigation & Related Articles */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Related Articles</span>
              </h3>

              {relatedDocs.length > 0 ? (
                <div className="space-y-3 divide-y divide-slate-100">
                  {relatedDocs.map((rDoc) => (
                    <div key={rDoc.id} className="pt-3 first:pt-0">
                      <Link
                        to={`/docs/${rDoc.slug || rDoc.id}`}
                        className="text-xs font-semibold text-slate-800 hover:text-indigo-600 line-clamp-2 leading-snug"
                      >
                        {rDoc.title}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {rDoc.view_count}
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <ThumbsUp className="w-3 h-3" />
                          {rDoc.helpful_count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No related articles found in this category.</p>
              )}

              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/docs"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Explore all articles</span>
                </Link>
              </div>
            </div>

            {/* Need More Help Card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center">
              <h4 className="font-bold text-indigo-900 text-sm mb-1">
                Still have questions?
              </h4>
              <p className="text-indigo-700 text-xs mb-4 leading-relaxed">
                If our documentation didn't resolve your problem, our support team is ready to help.
              </p>
              <Link
                to="/tickets/new"
                className="inline-block w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Create a Support Ticket
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Editor Modal for Editing */}
      <DocEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        categories={categories}
        existingTags={tags}
        initialDoc={document}
        onSaved={handleDocSaved}
        userRole={user?.role || 'agent'}
      />
    </div>
  );
};
