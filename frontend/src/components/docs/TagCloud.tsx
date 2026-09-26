import React from 'react';
import { Tag } from '../../types/docs';
import { Tag as TagIcon, X } from 'lucide-react';

interface TagCloudProps {
  tags: Tag[];
  selectedTagSlug: string | null;
  onSelectTag: (tagSlug: string | null) => void;
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags, selectedTagSlug, onSelectTag }) => {
  if (tags.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-indigo-600" />
          <span>Popular Tags</span>
        </h3>
        {selectedTagSlug && (
          <button
            onClick={() => onSelectTag(null)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            title="Clear Tag Filter"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isSelected = selectedTagSlug === tag.slug;
          return (
            <button
              key={tag.id}
              onClick={() => onSelectTag(isSelected ? null : tag.slug)}
              className={`text-xs px-2.5 py-1 rounded-md transition-all font-mono ${
                isSelected
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              #{tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
