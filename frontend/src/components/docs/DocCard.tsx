import React from 'react';
import { Link } from 'react-router-dom';
import { DocumentListItem, DocStatus } from '../../types/docs';
import { Eye, ThumbsUp, Star, Calendar } from 'lucide-react';

interface DocCardProps {
  doc: DocumentListItem;
  showStatus?: boolean;
}

export const DocCard: React.FC<DocCardProps> = ({ doc, showStatus = false }) => {
  const getStatusBadge = (status: DocStatus) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Published</span>;
      case 'draft':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Draft</span>;
      case 'archived':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">Archived</span>;
      default:
        return null;
    }
  };

  const formattedDate = new Date(doc.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {doc.category && (
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                {doc.category.name}
              </span>
            )}
            {doc.is_featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                Featured
              </span>
            )}
            {showStatus && getStatusBadge(doc.status)}
          </div>
        </div>

        <Link
          to={`/docs/${doc.slug || doc.id}`}
          className="block text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2"
        >
          {doc.title}
        </Link>

        {doc.summary ? (
          <p className="text-slate-600 text-sm line-clamp-3 mb-4 leading-relaxed">
            {doc.summary}
          </p>
        ) : (
          <p className="text-slate-400 text-sm italic mb-4">
            No summary provided. Click to read article.
          </p>
        )}

        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {doc.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-3 font-medium">
          <span className="flex items-center gap-1" title={`${doc.view_count} views`}>
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>{doc.view_count}</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-600" title={`${doc.helpful_count} found helpful`}>
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{doc.helpful_count}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
