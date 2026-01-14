import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { WorkflowStep as WorkflowStepType } from '../../context/AppContext';

interface WorkflowStepProps {
  label: string;
  step: WorkflowStepType;
  onToggle: () => void;
  onToggleNA?: () => void;
}

export function WorkflowStep({ label, step, onToggle, onToggleNA }: WorkflowStepProps) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-lg transition-all border ${
        step.notApplicable
          ? 'bg-gray-50 opacity-60 border-gray-200'
          : step.completed
          ? 'bg-green-50 border-gray-200'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      <div
        className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center ${
          step.notApplicable
            ? 'bg-gray-200 border-gray-300 cursor-not-allowed'
            : step.completed
            ? 'bg-green-500 border-green-500 cursor-pointer'
            : 'bg-white border-gray-300 cursor-pointer'
        }`}
        onClick={step.notApplicable ? undefined : onToggle}
      >
        {step.completed && !step.notApplicable && <Check size={16} className="text-white" />}
        {step.notApplicable && <span className="text-gray-500 text-xs">⊘</span>}
      </div>
      <div className="flex-1" onClick={step.notApplicable ? undefined : onToggle} style={{ cursor: step.notApplicable ? 'default' : 'pointer' }}>
        <p className={`font-medium ${
          step.notApplicable
            ? 'text-gray-500 line-through'
            : step.completed
            ? 'text-green-900'
            : 'text-gray-900'
        }`}>
          {label}
          {step.notApplicable && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
              Not Needed
            </span>
          )}
        </p>
        {step.completed && step.completed_at && !step.notApplicable && (
          <p className="text-xs text-green-700 mt-1">
            Completed on {new Date(step.completed_at).toLocaleDateString()} {step.updated_by && `by ${step.updated_by}`}
          </p>
        )}
      </div>
      {onToggleNA && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleNA();
          }}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            step.notApplicable
              ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
          }`}
          title={step.notApplicable ? 'Mark as applicable' : 'Mark as not applicable'}
        >
          {step.notApplicable ? <RotateCcw size={14} /> : 'N/A'}
        </button>
      )}
    </div>
  );
}
