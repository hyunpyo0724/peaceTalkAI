import React, { useState } from 'react';
import { LightbulbIcon, ThumbsUpIcon, ThumbsDownIcon } from './IconComponents';

interface SuggestionCardProps {
  suggestion: string;
  explanation: string;
  title: string;
  explanationPrefix: string;
  feedbackPrompt: string;
  feedbackThanks: string;
  likeButtonLabel: string;
  dislikeButtonLabel: string;
  feedbackCommentPlaceholder: string;
  submitFeedbackButtonLabel: string;
  feedbackState: 'none' | 'submitted';
  onFeedback: (type: 'like' | 'dislike', comment?: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ 
    suggestion, 
    explanation, 
    title, 
    explanationPrefix,
    feedbackPrompt,
    feedbackThanks,
    likeButtonLabel,
    dislikeButtonLabel,
    feedbackCommentPlaceholder,
    submitFeedbackButtonLabel,
    feedbackState,
    onFeedback
}) => {
  const [isCommentVisible, setIsCommentVisible] = useState(false);
  const [comment, setComment] = useState('');

  const handleDislikeClick = () => {
    setIsCommentVisible(true);
  };

  const handleLikeClick = () => {
    onFeedback('like');
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFeedback('dislike', comment);
  };
  
  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 shadow-lg flex flex-col">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <LightbulbIcon className="h-8 w-8 text-emerald-500 dark:text-emerald-400 mt-1" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{title}</h3>
          <p className="mt-2 text-lg text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800/50 rounded-lg p-4">
            "{suggestion}"
          </p>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold">{explanationPrefix}</span> {explanation}
          </p>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-emerald-200 dark:border-emerald-700/50">
        {feedbackState === 'submitted' ? (
           <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">{feedbackThanks}</p>
        ) : (
          <div>
            <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">{feedbackPrompt}</p>
            <div className="flex justify-center gap-4">
              <button onClick={handleLikeClick} aria-label={likeButtonLabel} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow">
                <ThumbsUpIcon className="w-5 h-5" />
                <span>{likeButtonLabel}</span>
              </button>
              <button onClick={handleDislikeClick} aria-label={dislikeButtonLabel} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors shadow">
                <ThumbsDownIcon className="w-5 h-5" />
                <span>{dislikeButtonLabel}</span>
              </button>
            </div>
            {isCommentVisible && (
              <form onSubmit={handleCommentSubmit} className="mt-4 space-y-2 animate-fade-in">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={feedbackCommentPlaceholder}
                  rows={2}
                  className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150"
                />
                <button type="submit" className="w-full px-4 py-2 text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
                  {submitFeedbackButtonLabel}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionCard;