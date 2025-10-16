import React, { useState, useMemo } from 'react';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkflowStep } from '../components/tracking/WorkflowStep';
import { useAppData } from '../context/AppContext';
import type { Event, Staff } from '../context/AppContext';
import { getBookingStatus, getWorkflowProgress, formatDate, formatTimeSlot } from '../utils/helpers';
import { supabase } from '../lib/supabase';

type WorkflowType = 'still' | 'reel' | 'video' | 'portrait';

interface EnrichedBooking {
  id: string;
  booking_name?: string;
  client?: { id: string; name: string };
  events: Event[];
  workflows: any[];
}

interface StaffWithAssignment extends Staff {
  assignmentId: string;
  data_received: boolean;
}

export function EventTrackingPage() {
  const { bookings, events, clients, workflows, staffAssignments, staff } = useAppData();
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [activeWorkflowTabs, setActiveWorkflowTabs] = useState<Record<string, WorkflowType>>({});

  const enrichedBookings = useMemo(() => {
    return bookings
      .map((booking) => {
        const bookingEvents = events.filter((e) => e.booking_id === booking.id);
        const client = clients.find((c) => c.id === booking.client_id);
        const bookingWorkflows = workflows.filter((w) =>
          bookingEvents.some((e) => e.id === w.event_id)
        );
        return {
          ...booking,
          events: bookingEvents,
          client,
          workflows: bookingWorkflows,
        };
      })
      .filter((b) => b.events.length > 0)
      .sort((a, b) => {
        const aLatestDate = a.events.reduce(
          (latest, e) => (e.event_date > latest ? e.event_date : latest),
          ''
        );
        const bLatestDate = b.events.reduce(
          (latest, e) => (e.event_date > latest ? e.event_date : latest),
          ''
        );
        return new Date(bLatestDate).getTime() - new Date(aLatestDate).getTime();
      });
  }, [bookings, events, clients, workflows]);

  const toggleBooking = (bookingId: string) => {
    const newExpanded = new Set(expandedBookings);
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
    }
    setExpandedBookings(newExpanded);
  };

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getActiveTab = (bookingId: string): WorkflowType => {
    return activeWorkflowTabs[bookingId] || 'still';
  };

  const setActiveTab = (bookingId: string, tab: WorkflowType) => {
    setActiveWorkflowTabs(prev => ({ ...prev, [bookingId]: tab }));
  };

  const calculateBookingProgress = (booking: EnrichedBooking) => {
    const totals = { still: 0, reel: 0, video: 0, portrait: 0 };
    const completed = { still: 0, reel: 0, video: 0, portrait: 0 };

    booking.workflows.forEach((workflow) => {
      const progress = getWorkflowProgress(workflow);
      totals.still += progress.stillTotal;
      totals.reel += progress.reelTotal;
      totals.video += progress.videoTotal;
      totals.portrait += progress.portraitTotal;
      completed.still += progress.still;
      completed.reel += progress.reel;
      completed.video += progress.video;
      completed.portrait += progress.portrait;
    });

    return { totals, completed };
  };

  const handleStaffToggle = async (eventId: string, assignmentId: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_assignments')
        .update({
          data_received: checked,
          data_received_at: checked ? new Date().toISOString() : null,
          data_received_by: checked ? 'Admin' : null,
        })
        .eq('id', assignmentId);

      if (error) throw error;

      window.location.reload();
    } catch (error) {
      console.error('Error updating staff assignment:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Tracking</h1>
          <p className="text-gray-600 mt-2">Manage workflow progress for all events</p>
        </div>

        <div className="space-y-4">
          {enrichedBookings.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No bookings with events found</p>
              </div>
            </Card>
          ) : (
            enrichedBookings.map((booking) => {
              const status = getBookingStatus(booking.events, booking.workflows);
              const isExpanded = expandedBookings.has(booking.id);
              const latestEvent = booking.events.reduce((latest, e) =>
                e.event_date > latest.event_date ? e : latest
              );
              const { totals, completed } = calculateBookingProgress(booking);

              return (
                <Card key={booking.id}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {booking.client?.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Booking: {booking.booking_name || `${booking.client?.name}'s Booking`}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {booking.events.length} Event{booking.events.length > 1 ? 's' : ''} • Latest: {formatDate(latestEvent.event_date)}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </div>

                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Overall Progress:
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ProgressCard
                        label="Still"
                        completed={completed.still}
                        total={totals.still}
                      />
                      <ProgressCard
                        label="Reel"
                        completed={completed.reel}
                        total={totals.reel}
                      />
                      <ProgressCard
                        label="Video"
                        completed={completed.video}
                        total={totals.video}
                      />
                      <ProgressCard
                        label="Portrait"
                        completed={completed.portrait}
                        total={totals.portrait}
                      />
                    </div>
                  </div>

                  {booking.events.map((event, index) => {
                    const isEventExpanded = expandedEvents.has(event.id);
                    const eventStaffAssignments = staffAssignments
                      .filter((sa) => sa.event_id === event.id)
                      .map((sa) => ({
                        ...staff.find((s) => s.id === sa.staff_id)!,
                        assignmentId: sa.id,
                        data_received: (sa as any).data_received || false,
                      }));

                    return (
                      <div key={event.id} className="mb-4 border-l-4 border-blue-500 pl-4">
                        <button
                          onClick={() => toggleEvent(event.id)}
                          className="w-full text-left flex items-center gap-2 py-2 hover:bg-gray-50 rounded transition-colors"
                        >
                          <span className="text-gray-600 text-sm">
                            {isEventExpanded ? '▼' : '▶'}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Event {index + 1}: {event.event_name}
                          </h3>
                        </button>

                        <div className="text-sm text-gray-600 mb-2 ml-6">
                          Date: {formatDate(event.event_date)} | {formatTimeSlot(event.time_slot)} | Venue: {event.venue}
                        </div>

                        {isEventExpanded && (
                          <div className="mt-3 mb-4 ml-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Staff Assigned:
                            </h4>
                            {eventStaffAssignments.length > 0 ? (
                              <div className="space-y-2">
                                {eventStaffAssignments.map((staffMember) => (
                                  <StaffCheckbox
                                    key={staffMember.assignmentId}
                                    staff={staffMember}
                                    eventId={event.id}
                                    onToggle={handleStaffToggle}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">
                                No staff assigned to this event yet
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">
                      Workflow Progress (Booking-level):
                    </h3>

                    <div className="flex gap-2 mb-6 flex-wrap">
                      <WorkflowTab
                        label="Still"
                        count={`${completed.still}/${totals.still}`}
                        isActive={getActiveTab(booking.id) === 'still'}
                        onClick={() => setActiveTab(booking.id, 'still')}
                      />
                      <WorkflowTab
                        label="Reel"
                        count={`${completed.reel}/${totals.reel}`}
                        isActive={getActiveTab(booking.id) === 'reel'}
                        onClick={() => setActiveTab(booking.id, 'reel')}
                      />
                      <WorkflowTab
                        label="Video"
                        count={`${completed.video}/${totals.video}`}
                        isActive={getActiveTab(booking.id) === 'video'}
                        onClick={() => setActiveTab(booking.id, 'video')}
                      />
                      <WorkflowTab
                        label="Portrait"
                        count={`${completed.portrait}/${totals.portrait}`}
                        isActive={getActiveTab(booking.id) === 'portrait'}
                        onClick={() => setActiveTab(booking.id, 'portrait')}
                      />
                    </div>

                    <div className="mt-4">
                      <BookingWorkflowContent
                        booking={booking}
                        activeTab={getActiveTab(booking.id)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ label, completed, total }: { label: string; completed: number; total: number }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getColorClass = () => {
    if (percentage === 0) return 'bg-gray-300';
    if (percentage < 30) return 'bg-blue-500';
    if (percentage < 60) return 'bg-orange-500';
    if (percentage < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="text-center">
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 mb-2">
        {completed}/{total}
      </p>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{percentage}%</p>
    </div>
  );
}

function StaffCheckbox({
  staff,
  eventId,
  onToggle,
}: {
  staff: StaffWithAssignment;
  eventId: string;
  onToggle: (eventId: string, assignmentId: string, checked: boolean) => void;
}) {
  const [isChecked, setIsChecked] = useState(staff.data_received);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsChecked(checked);
    onToggle(eventId, staff.assignmentId, checked);
  };

  const getRoleIcon = (role: string) => {
    const iconMap: Record<string, string> = {
      photographer: '📷',
      videographer: '🎥',
      drone_operator: '🚁',
      editor: '✂️',
      coordinator: '📋',
      manager: '👔',
    };
    return iconMap[role] || '👤';
  };

  const formatRole = (role: string) => {
    return role
      .replace('_', ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <label className="flex items-center gap-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleChange}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-lg">{getRoleIcon(staff.role)}</span>
      <span className="flex-1 text-gray-900 font-medium">{staff.name}</span>
      <span className="text-sm text-gray-500">({formatRole(staff.role)})</span>
    </label>
  );
}

function WorkflowTab({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label} ({count})
    </button>
  );
}

function BookingWorkflowContent({
  booking,
  activeTab,
}: {
  booking: EnrichedBooking;
  activeTab: WorkflowType;
}) {
  const { refreshData } = useAppData();

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

  const getStepsByTab = () => {
    switch (activeTab) {
      case 'still':
        return stillSteps;
      case 'reel':
        return reelSteps;
      case 'video':
        return videoSteps;
      case 'portrait':
        return portraitSteps;
    }
  };

  const toggleStep = async (workflowId: string, workflowType: string, stepKey: string, currentWorkflow: any) => {
    const workflowField = `${workflowType}_workflow`;
    const currentStep = currentWorkflow[stepKey] || { completed: false };

    const updatedStep = {
      completed: !currentStep.completed,
      completed_at: !currentStep.completed ? new Date().toISOString() : null,
      updated_by: 'Admin',
      notes: currentStep.notes || null,
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
        .eq('id', workflowId);

      if (error) throw error;
      await refreshData();
    } catch (error: any) {
      console.error('Error updating workflow:', error);
    }
  };

  const steps = getStepsByTab();

  return (
    <div className="space-y-6">
      {booking.workflows.map((workflow) => {
        const workflowField = `${activeTab}_workflow`;
        const activeWorkflow = (workflow as any)[workflowField] || {};

        return (
          <div key={workflow.id} className="space-y-3">
            {steps.map((step) => (
              <WorkflowStep
                key={step.key}
                label={step.label}
                step={activeWorkflow[step.key] || { completed: false }}
                onToggle={() => toggleStep(workflow.id, activeTab, step.key, activeWorkflow)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
