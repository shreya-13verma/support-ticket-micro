import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { docsApi } from '../../api/docsApi';

interface FeedbackWidgetProps {
  docId: number;
  initialHelpfulCount?: number;
  initialNotHelpfulCount?: number;
  onFeedbackSubmitted?: (isHelpful: boolean) => void;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  docId,
  initialHelpfulCount = 0,
  initialNotHelpfulCount = 0,
  onFeedbackSubmitted,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount);
  const [notHelpfulCount, setNotHelpfulCount] = useState(initialNotHelpfulCount);

  const handleVote = (isHelpful: boolean) => {
    setSelectedVote(isHelpful);
    setShowCommentInput(true);
    setError(null);
  };

  const submitFeedback = async (skipComment = false) => {
    if (selectedVote === null) return;
    setLoading(true);
    setError(null);

    try {
      await docsApi.submitFeedback(docId, {
        is_helpful: selectedVote,
        comment: skipComment ? undefined : (comment.trim() || undefined),
      });

      if (selectedVote) {
        setHelpfulCount((prev) => prev + 1);
      } else {
        setNotHelpfulCount((prev) => prev + 1);
      }

      setSubmitted(true);
      setShowCommentInput(false);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(selectedVote);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-base mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Thank you for your feedback!</span>
        </div>
        <p className="text-emerald-600 text-xs">
          Your feedback helps us continuously improve our documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-800 text-sm">
            Was this article helpful?
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {helpfulCount} people found this helpful ({notHelpfulCount} did not)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              selectedVote === true
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Yes</span>
          </button>

          <button
            onClick={() => handleVote(false)}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              selectedVote === false
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>No</span>
          </button>
        </div>
      </div>

      {showCommentInput && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>How can we improve this article? (Optional)</span>
          </label>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what was missing, unclear, or out of date..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />

          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => submitFeedback(true)}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Skip comment
            </button>
            <button
              onClick={() => submitFeedback(false)}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-1.5 text-xs bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{loading ? 'Submitting...' : 'Send Feedback'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
