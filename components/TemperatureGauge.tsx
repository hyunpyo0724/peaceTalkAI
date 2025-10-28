import React from 'react';

interface TemperatureGaugeProps {
  temperature: number;
  title: string;
}

const TemperatureGauge: React.FC<TemperatureGaugeProps> = ({ temperature, title }) => {
  const getTemperatureColor = (temp: number) => {
    if (temp <= 33) return 'bg-sky-500'; // Cool
    if (temp <= 66) return 'bg-yellow-500'; // Warm
    return 'bg-red-500'; // Hot
  };
  
  const getTemperatureRingColor = (temp: number) => {
    if (temp <= 33) return 'stroke-sky-500';
    if (temp <= 66) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  const getTemperatureTextColor = (temp: number) => {
    if (temp <= 33) return 'text-sky-600 dark:text-sky-400';
    if (temp <= 66) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const circumference = 2 * Math.PI * 52; // 2 * pi * r
  const strokeDashoffset = circumference - (temperature / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
      <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-4">{title}</h3>
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle
            className="stroke-current text-slate-200 dark:text-slate-700"
            cx="60"
            cy="60"
            r="52"
            fill="none"
            strokeWidth="16"
          />
          <circle
            className={`transform -rotate-90 origin-center transition-all duration-1000 ease-out ${getTemperatureRingColor(temperature)}`}
            cx="60"
            cy="60"
            r="52"
            fill="none"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold ${getTemperatureTextColor(temperature)}`}>
            {temperature}
          </span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">°C</span>
        </div>
      </div>
    </div>
  );
};

export default TemperatureGauge;
