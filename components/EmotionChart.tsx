import React from 'react';
import { AnalysisResult } from '../types';

interface EmotionChartProps {
  history: AnalysisResult[];
  title: string;
}

const EmotionChart: React.FC<EmotionChartProps> = ({ history, title }) => {
  if (history.length < 2) {
    return null; 
  }

  const getTemperatureColor = (temp: number) => {
    if (temp <= 33) return 'fill-sky-500'; // Cool
    if (temp <= 66) return 'fill-yellow-500'; // Warm
    return 'fill-red-500'; // Hot
  };

  const SVG_WIDTH = 500;
  const SVG_HEIGHT = 200;
  const PADDING = 30;

  const chartWidth = SVG_WIDTH - PADDING * 2;
  const chartHeight = SVG_HEIGHT - PADDING * 2;

  const points = history
    .map((result, index) => {
      const x = PADDING + (index / (history.length - 1)) * chartWidth;
      const y = PADDING + chartHeight - (result.temperature / 100) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');
  
  const yAxisLabels = [
    { value: 100, y: PADDING },
    { value: 50, y: PADDING + chartHeight / 2 },
    { value: 0, y: PADDING + chartHeight },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-4">{title}</h3>
      <div className="w-full h-auto">
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto" aria-labelledby="chart-title">
          <title id="chart-title">{title}</title>
          
          {/* Y-Axis Labels and Grid Lines */}
          {yAxisLabels.map(({ value, y }) => (
            <g key={value} className="text-xs text-slate-400 dark:text-slate-500">
              <text x={PADDING - 10} y={y + 4} textAnchor="end" className="fill-current">
                {value}
              </text>
              <line
                x1={PADDING}
                y1={y}
                x2={SVG_WIDTH - PADDING}
                y2={y}
                className="stroke-current text-slate-200 dark:text-slate-700"
                strokeWidth="1"
                strokeDasharray="2,3"
              />
            </g>
          ))}
          
          {/* Gradient for Line */}
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {history.map((result, index) => {
                    const offset = `${(index / (history.length - 1)) * 100}%`;
                    let stopColor = '#f59e0b'; // yellow-500
                    if (result.temperature <= 33) stopColor = '#0ea5e9'; // sky-500
                    if (result.temperature > 66) stopColor = '#ef4444'; // red-500
                    return <stop key={index} offset={offset} stopColor={stopColor} />;
                })}
            </linearGradient>
          </defs>

          {/* Data Line */}
          <polyline
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          
          {/* Data Points */}
          {history.map((result, index) => {
            const x = PADDING + (index / (history.length - 1)) * chartWidth;
            const y = PADDING + chartHeight - (result.temperature / 100) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="5"
                className={`${getTemperatureColor(result.temperature)} stroke-white dark:stroke-slate-800`}
                strokeWidth="2"
              >
                <title>Analysis {index + 1}: {result.temperature}°C</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default EmotionChart;
