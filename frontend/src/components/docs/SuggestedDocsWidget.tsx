import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DocumentSuggestionItem } from '../../types/docs';
import { docsApi } from '../../api/docsApi';
import { ExternalLink, Lightbulb, ThumbsUp, Eye } from 'lucide-react';

interface SuggestedDocsWidgetProps {
  query: string;
  categoryId?: number;
  className?: string;
}

export const SuggestedDocsWidget: React.FC<SuggestedDocsWidgetProps> = ({
  query,
  categoryId,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<DocumentSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await docsApi.suggestDocuments(query.trim(), categoryId, 4);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [query, categoryId]);

  if (!query || query.trim().length < 3 || (suggestions.length === 0 && !loading)) {
    return null;
  }

  return (
    <div className={`bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs mb-2.5">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span>Recommended Knowledge Base Articles</span>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse py-1">
          <div className="h-3.5 bg-indigo-100 rounded w-3/4" />
          <div className="h-3.5 bg-indigo-100 rounded w-1/2" />
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((item) => (
            <div
              key={item.id}
              className="bg-white p-2.5 rounded-lg border border-indigo-50/80 shadow-xs flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <Link
                  to={`/docs/${item.slug || item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-800 hover:text-indigo-600 line-clamp-1 flex items-center gap-1.5"
                >
                  <span>{item.title}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                </Link>
                {item.summary && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.summary}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0">
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />
                  {item.view_count}
                </span>
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <ThumbsUp className="w-3 h-3" />
                  {item.helpful_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
