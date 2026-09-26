import { docsClient } from './client';
import {
  SupportDocument,
  DocumentListResponse,
  DocumentCreateInput,
  DocumentUpdateInput,
  DocumentFilterParams,
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
  Tag,
  TagCreateInput,
  FeedbackInput,
  FeedbackResponse,
  FeedbackStatsResponse,
  DocumentSuggestionItem,
  DocStatus,
} from '../types/docs';

export const docsApi = {
  // Documents
  async listDocuments(params: DocumentFilterParams = {}): Promise<DocumentListResponse> {
    const queryParams: Record<string, any> = {};
    if (params.search) queryParams.search = params.search;
    if (params.category_id) queryParams.category_id = params.category_id;
    if (params.category_slug) queryParams.category_slug = params.category_slug;
    if (params.tag_slug) queryParams.tag_slug = params.tag_slug;
    if (params.status && params.status !== 'all') queryParams.status = params.status;
    if (params.author_id) queryParams.author_id = params.author_id;
    if (params.is_featured !== undefined) queryParams.is_featured = params.is_featured;
    if (params.sort_by) queryParams.sort_by = params.sort_by;
    if (params.sort_dir) queryParams.sort_dir = params.sort_dir;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;

    const res = await docsClient.get<DocumentListResponse>('/docs', { params: queryParams });
    return res.data;
  },

  async getDocument(idOrSlug: string | number): Promise<SupportDocument> {
    const res = await docsClient.get<SupportDocument>(`/docs/${idOrSlug}`);
    return res.data;
  },

  async createDocument(data: DocumentCreateInput): Promise<SupportDocument> {
    const res = await docsClient.post<SupportDocument>('/docs', data);
    return res.data;
  },

  async updateDocument(id: number, data: DocumentUpdateInput): Promise<SupportDocument> {
    const res = await docsClient.put<SupportDocument>(`/docs/${id}`, data);
    return res.data;
  },

  async updateDocumentStatus(id: number, status: DocStatus): Promise<SupportDocument> {
    const res = await docsClient.patch<SupportDocument>(`/docs/${id}/status`, { status });
    return res.data;
  },

  async deleteDocument(id: number): Promise<void> {
    await docsClient.delete(`/docs/${id}`);
  },

  async recordView(id: number): Promise<{ id: number; view_count: number }> {
    const res = await docsClient.post<{ id: number; view_count: number }>(`/docs/${id}/view`);
    return res.data;
  },

  // Feedback
  async submitFeedback(docId: number, data: FeedbackInput): Promise<FeedbackResponse> {
    const res = await docsClient.post<FeedbackResponse>(`/docs/${docId}/feedback`, data);
    return res.data;
  },

  async getFeedbackStats(docId: number): Promise<FeedbackStatsResponse> {
    const res = await docsClient.get<FeedbackStatsResponse>(`/docs/${docId}/feedback/stats`);
    return res.data;
  },

  // Categories
  async listCategories(): Promise<Category[]> {
    const res = await docsClient.get<{ categories: Category[]; total: number }>('/categories');
    return res.data.categories;
  },

  async getCategory(id: number): Promise<Category> {
    const res = await docsClient.get<Category>(`/categories/${id}`);
    return res.data;
  },

  async createCategory(data: CategoryCreateInput): Promise<Category> {
    const res = await docsClient.post<Category>('/categories', data);
    return res.data;
  },

  async updateCategory(id: number, data: CategoryUpdateInput): Promise<Category> {
    const res = await docsClient.put<Category>(`/categories/${id}`, data);
    return res.data;
  },

  async deleteCategory(id: number): Promise<void> {
    await docsClient.delete(`/categories/${id}`);
  },

  // Tags
  async listTags(): Promise<Tag[]> {
    const res = await docsClient.get<{ tags: Tag[]; total: number }>('/tags');
    return res.data.tags;
  },

  async createTag(data: TagCreateInput): Promise<Tag> {
    const res = await docsClient.post<Tag>('/tags', data);
    return res.data;
  },

  // Suggestions
  async suggestDocuments(query: string, categoryId?: number, limit = 5): Promise<DocumentSuggestionItem[]> {
    if (!query || query.trim().length === 0) return [];
    try {
      const res = await docsClient.get<DocumentListResponse>('/docs', {
        params: { search: query, category_id: categoryId, limit }
      });
      return res.data.documents.map(d => ({
        id: d.id,
        title: d.title,
        slug: d.slug,
        summary: d.summary,
        category_name: d.category?.name || null,
        view_count: d.view_count,
        helpful_count: d.helpful_count,
      }));
    } catch {
      return [];
    }
  }
};
