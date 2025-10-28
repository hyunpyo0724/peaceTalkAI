export interface AnalysisResult {
  temperature: number;
  emotion: string;
  suggestion: string;
  explanation: string;
  recipientImpact: {
    predictedFeeling: string;
    impactExplanation: string;
  };
}
