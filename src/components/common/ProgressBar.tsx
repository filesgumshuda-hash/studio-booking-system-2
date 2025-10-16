import React from 'react';

interface ProgressBarProps {
  label: string;
  percentage: number;
  current?: number;
  target?: number;
  color?: 'green' | 'yellow' | 'orange' | 'red';
}

export function ProgressBar({ label, percentage, current, target, color }: ProgressBarProps) {
  const getColorClass = () => {
    if (color) {
      const colorMap = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500',
      };
      return colorMap[color];
    }

    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-600">
          {percentage}% {current !== undefined && target !== undefined && `(${current}/${target})`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColorClass()} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
