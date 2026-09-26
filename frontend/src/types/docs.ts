export type DocStatus = 'draft' | 'published' | 'archived';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  doc_count?: number;
  created_at: string;
}

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface TagCreateInput {
  name: string;
  slug?: string;
}

export interface SupportDocument {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  category_id: number;
  author_id: number;
  status: DocStatus;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  tags: Tag[];
}

export interface DocumentListItem {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  category_id: number;
  author_id: number;
  status: DocStatus;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  tags: Tag[];
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DocumentCreateInput {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  category_id: number;
  status?: DocStatus;
  is_featured?: boolean;
  tag_ids?: number[];
  tag_names?: string[];
}

export interface DocumentUpdateInput {
  title?: string;
  slug?: string;
  summary?: string;
  content?: string;
  category_id?: number;
  status?: DocStatus;
  is_featured?: boolean;
  tag_ids?: number[];
  tag_names?: string[];
}

export interface DocumentFilterParams {
  search?: string;
  category_id?: number;
  category_slug?: string;
  tag_slug?: string;
  status?: DocStatus | 'all';
  author_id?: number;
  is_featured?: boolean;
  sort_by?: 'created_at' | 'view_count' | 'helpful_count' | 'title';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FeedbackInput {
  is_helpful: boolean;
  comment?: string;
}

export interface FeedbackResponse {
  id: number;
  document_id: number;
  user_id?: number | null;
  is_helpful: boolean;
  comment?: string | null;
  created_at: string;
}

export interface FeedbackStatsResponse {
  document_id: number;
  helpful_count: number;
  not_helpful_count: number;
  total_feedback: number;
  helpful_ratio: number;
}

export interface DocumentSuggestionItem {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  category_name?: string | null;
  view_count: number;
  helpful_count: number;
}

export interface DocumentSuggestionResponse {
  query: string;
  suggestions: DocumentSuggestionItem[];
}
