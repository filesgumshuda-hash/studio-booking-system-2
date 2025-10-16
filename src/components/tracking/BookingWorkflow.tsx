import React, { useState, useEffect } from 'react';
import { Workflow, useAppData } from '../../context/AppContext';
import { WorkflowStep } from './WorkflowStep';
import { supabase } from '../../lib/supabase';

interface BookingWorkflowProps {
  bookingId: string;
  workflow: Workflow | undefined;
}

export function BookingWorkflow({ bookingId, workflow }: BookingWorkflowProps) {
  const { refreshData } = useAppData();
  const [activeTab, setActiveTab] = useState<'still' | 'reel' | 'video' | 'portrait'>('still');
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const initializeWorkflow = async () => {
      if (!workflow && bookingId && !isCreating) {
        setIsCreating(true);
        try {
          const { error } = await supabase
            .from('workflows')
            .insert({
              booking_id: bookingId,
              event_id: null,
              still_workflow: {},
              reel_workflow: {},
              video_workflow: {},
              portrait_workflow: {}
            });

          if (error) {
            console.error('Error creating workflow:', error);
          } else {
            await refreshData();
          }
        } catch (error) {
          console.error('Error initializing workflow:', error);
        } finally {
          setIsCreating(false);
        }
      }
    };

    initializeWorkflow();
  }, [workflow, bookingId, refreshData, isCreating]);

  if (!workflow) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Workflow Progress</h2>
        <p className="text-sm text-gray-600 mb-4">
          Track deliverables for this booking (applies to all events)
        </p>
        <div className="text-center py-8">
          {isCreating ? (
            <>
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600 font-medium">Initializing workflow...</p>
              <p className="text-sm text-gray-500 mt-1">
                Setting up tracking for this booking
              </p>
            </>
          ) : (
            <>
              <div className="text-gray-400 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No workflow initialized yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Workflow tracking will appear once the booking is set up
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

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
    const completed = Object.values(workflowSteps || {}).filter((s: any) => s?.completed).length;
    const total = Object.keys(workflowSteps || {}).length;
    return { completed, total };
  };

  const stillProgress = getProgress(workflow.still_workflow);
  const reelProgress = getProgress(workflow.reel_workflow);
  const videoProgress = getProgress(workflow.video_workflow);
  const portraitProgress = getProgress(workflow.portrait_workflow);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Workflow Progress</h2>
        <p className="text-sm text-gray-600">
          Track deliverables for this booking (applies to all events)
        </p>
      </div>

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workflow
            </h3>
            <span className="text-sm text-gray-600">
              {getProgress((workflow as any)[`${activeTab}_workflow`]).completed}/
              {getProgress((workflow as any)[`${activeTab}_workflow`]).total} completed
            </span>
          </div>

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
            />
          ))}
        </div>
      </div>
    </div>
  );
}
