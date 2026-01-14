import React, { useState } from 'react';
import { Event, Workflow, useAppData } from '../../context/AppContext';
import { WorkflowStep } from './WorkflowStep';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/helpers';

interface EventWorkflowProps {
  event: Event;
  workflow: Workflow | undefined;
}

export function EventWorkflow({ event, workflow }: EventWorkflowProps) {
  const { refreshData } = useAppData();
  const [activeTab, setActiveTab] = useState<'still' | 'reel' | 'video' | 'portrait'>('still');
  const [notes, setNotes] = useState('');

  if (!workflow) return null;

  const stillSteps = [
    { key: 'rawDataSent', label: 'Raw Data Sent to Client' },
    { key: 'clientSelectionReceived', label: 'Portrait / Album Selection Received' },
    { key: 'sentToAlbumEditor', label: 'Sent to Album Editor' },
    { key: 'albumPreviewSent', label: 'Album Preview / Soft Copy Sent to Client' },
    { key: 'clientApproved', label: 'Client Approved Album' },
    { key: 'revisionRequested', label: 'Revision Requested' },
    { key: 'sentForPrinting', label: 'Sent for Printing' },
    { key: 'albumFinalized', label: 'Album Finalized' },
    { key: 'deliveredToClient', label: 'Delivered to Client' },
  ];

  const reelSteps = [
    { key: 'reelSentToEditor', label: 'Reel Sent to Editor' },
    { key: 'reelReceivedFromEditor', label: 'Reel Received from Editor' },
    { key: 'reelSentToClient', label: 'Reel Sent to Client for Approval' },
    { key: 'reelDelivered', label: 'Reel Delivered' },
  ];

  const videoSteps = [
    { key: 'videoSentToEditor', label: 'Full Video Sent to Editor' },
    { key: 'videoReceivedFromEditor', label: 'Full Video Received from Editor' },
    { key: 'videoSentToClient', label: 'Full Video Sent to Client for Approval' },
    { key: 'videoDelivered', label: 'Full Video Delivered' },
  ];

  const portraitSteps = [
    { key: 'portraitEdited', label: 'Portrait Video Edited' },
    { key: 'portraitDelivered', label: 'Portrait Video Delivered' },
  ];

  const toggleStep = async (workflowType: string, stepKey: string) => {
    const workflowField = `${workflowType}_workflow`;
    const currentWorkflow = (workflow as any)[workflowField] || {};
    const currentStep = currentWorkflow[stepKey] || { completed: false };

    const updatedStep = {
      ...currentStep,
      completed: !currentStep.completed,
      completed_at: !currentStep.completed ? new Date().toISOString() : null,
      updated_by: 'Admin',
      notes: notes || currentStep.notes || null,
    };

    const updatedWorkflow = {
      ...currentWorkflow,
      [stepKey]: updatedStep,
    };

    try {
      const { error } = await supabase
        .from('workflows')
        .update({
          [workflowField]: updatedWorkflow,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflow.id);

      if (error) throw error;
      await refreshData();
      setNotes('');
    } catch (error: any) {
      console.error('Error updating workflow:', error);
    }
  };

  const toggleNA = async (workflowType: string, stepKey: string) => {
    const workflowField = `${workflowType}_workflow`;
    const currentWorkflow = (workflow as any)[workflowField] || {};
    const currentStep = currentWorkflow[stepKey] || { completed: false };

    const updatedStep = {
      ...currentStep,
      notApplicable: !currentStep.notApplicable,
      completed: currentStep.notApplicable ? currentStep.completed : false,
      completed_at: currentStep.notApplicable ? currentStep.completed_at : null,
    };

    const updatedWorkflow = {
      ...currentWorkflow,
      [stepKey]: updatedStep,
    };

    try {
      const { error } = await supabase
        .from('workflows')
        .update({
          [workflowField]: updatedWorkflow,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflow.id);

      if (error) throw error;
      await refreshData();
    } catch (error: any) {
      console.error('Error updating workflow:', error);
    }
  };

  const getStepsByTab = () => {
    switch (activeTab) {
      case 'still':
        return { steps: stillSteps, workflow: workflow.still_workflow };
      case 'reel':
        return { steps: reelSteps, workflow: workflow.reel_workflow };
      case 'video':
        return { steps: videoSteps, workflow: workflow.video_workflow };
      case 'portrait':
        return { steps: portraitSteps, workflow: workflow.portrait_workflow };
    }
  };

  const { steps, workflow: activeWorkflow } = getStepsByTab();

  const getProgress = (workflowSteps: any) => {
    const allSteps = Object.values(workflowSteps || {});
    const applicableSteps = allSteps.filter((s: any) => !s?.notApplicable);
    const completed = applicableSteps.filter((s: any) => s?.completed).length;
    const total = applicableSteps.length;
    return { completed, total };
  };

  const stillProgress = getProgress(workflow.still_workflow);
  const reelProgress = getProgress(workflow.reel_workflow);
  const videoProgress = getProgress(workflow.video_workflow);
  const portraitProgress = getProgress(workflow.portrait_workflow);

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b border-gray-200">
        <div className="flex gap-1 p-2">
          {[
            { id: 'still', label: 'Still', progress: stillProgress },
            { id: 'reel', label: 'Reel', progress: reelProgress },
            { id: 'video', label: 'Video', progress: videoProgress },
            { id: 'portrait', label: 'Portrait', progress: portraitProgress },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label} ({tab.progress.completed}/{tab.progress.total})
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.event_name}</h3>
          <p className="text-gray-600">Date: {formatDate(event.event_date)}</p>
          {notes && (
            <div className="mt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this step..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <WorkflowStep
              key={step.key}
              label={step.label}
              step={(activeWorkflow as any)[step.key] || { completed: false }}
              onToggle={() => toggleStep(activeTab, step.key)}
              onToggleNA={() => toggleNA(activeTab, step.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
