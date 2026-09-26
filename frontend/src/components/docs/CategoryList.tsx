import React from 'react';
import { Category } from '../../types/docs';
import { Folder, FolderOpen, Layers, Plus } from 'lucide-react';

interface CategoryListProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  isAdmin?: boolean;
  onOpenCategoryManager?: () => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isAdmin = false,
  onOpenCategoryManager,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Categories</span>
        </h3>
        {isAdmin && onOpenCategoryManager && (
          <button
            onClick={onOpenCategoryManager}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
            title="Manage Categories"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage</span>
          </button>
        )}
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
            selectedCategoryId === null
              ? 'bg-indigo-50 text-indigo-700 font-semibold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${selectedCategoryId === null ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>All Articles</span>
          </div>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                isSelected
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isSelected ? (
                  <FolderOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="truncate">{cat.name}</span>
              </div>
              {cat.doc_count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-200/60 text-indigo-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cat.doc_count}
                </span>
              )}
            </button>
          );
        })}

        {categories.length === 0 && (
          <p className="text-xs text-slate-400 py-2 px-3 italic">No categories yet.</p>
        )}
      </div>
    </div>
  );
};
