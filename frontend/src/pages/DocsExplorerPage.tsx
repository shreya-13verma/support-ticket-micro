import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { docsApi } from '../api/docsApi';
import {
  DocumentListItem,
  Category,
  Tag,
  SupportDocument,
  DocStatus,
} from '../types/docs';
import { DocCard } from '../components/docs/DocCard';
import { CategoryList } from '../components/docs/CategoryList';
import { TagCloud } from '../components/docs/TagCloud';
import { DocEditorModal } from '../components/docs/DocEditorModal';
import { CategoryAdminModal } from '../components/docs/CategoryAdminModal';
import {
  Search,
  Plus,
  BookOpen,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export const DocsExplorerPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    searchParams.get('category') ? Number(searchParams.get('category')) : null
  );
  const [selectedTagSlug, setSelectedTagSlug] = useState<string | null>(
    searchParams.get('tag') || null
  );
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>(
    (searchParams.get('status') as DocStatus) || 'all'
  );
  const [sortBy, setSortBy] = useState<'created_at' | 'view_count' | 'helpful_count' | 'title'>(
    (searchParams.get('sort_by') as any) || 'created_at'
  );
  const [sortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9);

  // Data states
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [featuredDocs, setFeaturedDocs] = useState<DocumentListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // UI / Modal states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<SupportDocument | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const isStaff = Boolean(user && (user.role === 'admin' || user.role === 'agent'));
  const isAdmin = Boolean(user && user.role === 'admin');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Categories and Tags once
  const loadMetadata = useCallback(async () => {
    try {
      const [catsData, tagsData] = await Promise.all([
        docsApi.listCategories(),
        docsApi.listTags(),
      ]);
      setCategories(catsData);
      setTags(tagsData);
    } catch (err) {
      console.error('Failed to load categories/tags', err);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Fetch Featured Documents
  const loadFeaturedDocs = useCallback(async () => {
    try {
      const res = await docsApi.listDocuments({ is_featured: true, limit: 3 });
      setFeaturedDocs(res.documents);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadFeaturedDocs();
  }, [loadFeaturedDocs]);

  // Fetch Documents matching current filters
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await docsApi.listDocuments({
        search: debouncedSearch || undefined,
        category_id: selectedCategoryId || undefined,
        tag_slug: selectedTagSlug || undefined,
        status: isStaff && statusFilter !== 'all' ? statusFilter : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page: currentPage,
        limit: pageSize,
      });

      setDocuments(res.documents);
      setTotalDocs(res.total);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load support documents.');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    selectedCategoryId,
    selectedTagSlug,
    statusFilter,
    sortBy,
    sortDir,
    currentPage,
    pageSize,
    isStaff,
  ]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Synchronize URL search params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (selectedCategoryId) params.category = String(selectedCategoryId);
    if (selectedTagSlug) params.tag = selectedTagSlug;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedCategoryId, selectedTagSlug, statusFilter, sortBy, setSearchParams]);

  const handleSelectCategory = (catId: number | null) => {
    setSelectedCategoryId(catId);
    setCurrentPage(1);
  };

  const handleSelectTag = (tagSlug: string | null) => {
    setSelectedTagSlug(tagSlug);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategoryId(null);
    setSelectedTagSlug(null);
    setStatusFilter('all');
    setSortBy('created_at');
    setCurrentPage(1);
  };

  const handleDocSaved = () => {
    fetchDocuments();
    loadFeaturedDocs();
    loadMetadata();
  };

  const activeCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name;

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Hero Header */}
      <div className="bg-indigo-700 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-indigo-800 shadow-sm relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/70 border border-indigo-500/50 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Support Documentation & Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            How can we help you today?
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Browse our comprehensive library of troubleshooting guides, technical procedures, and step-by-step FAQs.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base articles (e.g. 2FA, billing, SSO, reset)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white text-slate-900 shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-400/50 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Staff Action Banner */}
        {isStaff && (
          <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider">
                {user?.role} Mode
              </span>
              <span className="text-xs text-slate-600">
                You have authoring privileges. You can draft, preview, and edit knowledge base articles.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdmin && (
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Categories</span>
                </button>
              )}

              <button
                onClick={() => {
                  setEditingDoc(null);
                  setIsEditorOpen(true);
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Article</span>
              </button>
            </div>
          </div>
        )}

        {/* Featured Articles (shown when no deep search/filters active) */}
        {!debouncedSearch && !selectedCategoryId && !selectedTagSlug && featuredDocs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Featured Guides
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {featuredDocs.map((doc) => (
                <DocCard key={doc.id} doc={doc} showStatus={isStaff} />
              ))}
            </div>
          </div>
        )}

        {/* Main Grid: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <CategoryList
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              isAdmin={isAdmin}
              onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
            />

            <TagCloud
              tags={tags}
              selectedTagSlug={selectedTagSlug}
              onSelectTag={handleSelectTag}
            />
          </div>

          {/* Main List */}
          <div className="lg:col-span-3 space-y-5">
            {/* Filter Bar / Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Filtered by:</span>
                </span>

                {activeCategoryName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                    Category: {activeCategoryName}
                    <button onClick={() => setSelectedCategoryId(null)} className="hover:text-indigo-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedTagSlug && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono">
                    #{selectedTagSlug}
                    <button onClick={() => setSelectedTagSlug(null)} className="hover:text-indigo-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                    "{debouncedSearch}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-slate-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {!activeCategoryName && !selectedTagSlug && !debouncedSearch && (
                  <span className="text-slate-400">All Available Guides</span>
                )}

                {(activeCategoryName || selectedTagSlug || debouncedSearch || statusFilter !== 'all') && (
                  <button
                    onClick={clearAllFilters}
                    className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline ml-1"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Sorting & Status Filters */}
              <div className="flex items-center gap-3 ml-auto flex-wrap">
                {isStaff && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as any);
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      <option value="all">All Statuses</option>
                      <option value="published">Published</option>
                      <option value="draft">Drafts</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="created_at">Newest First</option>
                    <option value="view_count">Most Viewed</option>
                    <option value="helpful_count">Most Helpful</option>
                    <option value="title">Title (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Document Card Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                    <div className="h-12 bg-slate-100 rounded w-full" />
                    <div className="h-4 bg-slate-100 rounded w-1/2 pt-2" />
                  </div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800 mb-1">No articles found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  We couldn't find any documentation matching your search criteria.
                </p>
                {(activeCategoryName || selectedTagSlug || debouncedSearch) && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100"
                  >
                    Reset Search Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {documents.map((doc) => (
                  <DocCard key={doc.id} doc={doc} showStatus={isStaff} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing page <span className="font-bold text-slate-900">{currentPage}</span> of{' '}
                  <span className="font-bold text-slate-900">{totalPages}</span> ({totalDocs} articles)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      <DocEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingDoc(null);
        }}
        categories={categories}
        existingTags={tags}
        initialDoc={editingDoc}
        onSaved={handleDocSaved}
        userRole={user?.role || 'agent'}
      />

      {/* Category Admin Modal */}
      {isAdmin && (
        <CategoryAdminModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          onRefreshCategories={loadMetadata}
        />
      )}
    </div>
  );
};
