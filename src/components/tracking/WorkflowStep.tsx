import React from 'react';
import { Check } from 'lucide-react';
import { WorkflowStep as WorkflowStepType } from '../../context/AppContext';

interface WorkflowStepProps {
  label: string;
  step: WorkflowStepType;
  onToggle: () => void;
}

export function WorkflowStep({ label, step, onToggle }: WorkflowStepProps) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg transition-all cursor-pointer ${
        step.completed ? 'bg-green-50' : 'bg-white'
      } hover:shadow-md border border-gray-200`}
      onClick={onToggle}
    >
      <div
        className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center ${
          step.completed ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
        }`}
      >
        {step.completed && <Check size={16} className="text-white" />}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${step.completed ? 'text-green-900' : 'text-gray-900'}`}>
          {label}
        </p>
        {step.completed && step.completed_at && (
          <p className="text-xs text-green-700 mt-1">
            Completed on {new Date(step.completed_at).toLocaleDateString()} {step.updated_by && `by ${step.updated_by}`}
          </p>
        )}
      </div>
    </div>
  );
}
