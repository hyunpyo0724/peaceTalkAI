import React from 'react';
import { ImpactIcon } from './IconComponents';

interface ImpactAnalysisCardProps {
  predictedFeeling: string;
  impactExplanation: string;
  title: string;
  feelingLabel: string;
  impactLabel: string;
}

const getFeelingPillColor = (feeling: string) => {
    switch (feeling.toLowerCase()) {
      case 'defensive':
      case 'attacked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'hurt':
      case 'confused':
      case 'misunderstood':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      case 'neutral':
      case 'curious':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
  };

const ImpactAnalysisCard: React.FC<ImpactAnalysisCardProps> = ({ 
    predictedFeeling, 
    impactExplanation,
    title,
    feelingLabel,
    impactLabel,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <ImpactIcon className="h-8 w-8 text-slate-500 dark:text-slate-400 mt-1" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <div className="mt-4 space-y-4">
            <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300">{feelingLabel}</h4>
                <div className={`mt-1 inline-block px-3 py-1 text-sm font-semibold rounded-full ${getFeelingPillColor(predictedFeeling)}`}>
                    {predictedFeeling}
                </div>
            </div>
            <div>
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300">{impactLabel}</h4>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{impactExplanation}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactAnalysisCard;
