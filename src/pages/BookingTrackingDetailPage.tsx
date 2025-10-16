import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useAppData } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { EventWorkflow } from '../components/tracking/EventWorkflow';
import { formatDate, formatTimeSlot, getBookingStatus, getWorkflowProgress } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { Button } from '../components/common/Button';

export function BookingTrackingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookings, events, clients, workflows, staffAssignments, staff, refreshData } = useAppData();

  const [activeEventTab, setActiveEventTab] = useState<string>('');
  const [updatingAssignments, setUpdatingAssignments] = useState<Set<string>>(new Set());

  const booking = useMemo(() => {
    return bookings.find(b => b.id === bookingId);
  }, [bookings, bookingId]);

  const client = useMemo(() => {
    return clients.find(c => c.id === booking?.client_id);
  }, [clients, booking]);

  const bookingEvents = useMemo(() => {
    if (!booking) return [];
    return events
      .filter(e => e.booking_id === booking.id)
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events, booking]);

  const bookingWorkflows = useMemo(() => {
    return workflows.filter(w => bookingEvents.some(e => e.id === w.event_id));
  }, [workflows, bookingEvents]);

  React.useEffect(() => {
    if (bookingEvents.length > 0 && !activeEventTab) {
      setActiveEventTab(bookingEvents[0].id);
    }
  }, [bookingEvents, activeEventTab]);

  const hasAccess = useMemo(() => {
    if (!user || !booking) return false;

    if (user.role === 'admin' || user.role === 'manager') {
      return true;
    }

    if (user.role === 'staff' && user.staff_id) {
      return staffAssignments.some(
        sa => bookingEvents.some(e => e.id === sa.event_id) && sa.staff_id === user.staff_id
      );
    }

    return false;
  }, [user, booking, bookingEvents, staffAssignments]);

  const overallProgress = useMemo(() => {
    let totalSteps = 0;
    let completedSteps = 0;

    bookingWorkflows.forEach(workflow => {
      const progress = getWorkflowProgress(workflow);
      totalSteps += progress.stillTotal + progress.reelTotal + progress.videoTotal + progress.portraitTotal;
      completedSteps += progress.still + progress.reel + progress.video + progress.portrait;
    });

    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }, [bookingWorkflows]);

  const getEventAssignments = (eventId: string) => {
    return staffAssignments
      .filter(sa => sa.event_id === eventId)
      .map(sa => ({
        ...sa,
        staffMember: staff.find(s => s.id === sa.staff_id)
      }))
      .filter(sa => sa.staffMember);
  };

  const toggleDataReceived = async (assignmentId: string, currentValue: boolean) => {
    setUpdatingAssignments(prev => new Set(prev).add(assignmentId));

    try {
      const { error } = await supabase
        .from('staff_assignments')
        .update({ data_received: !currentValue })
        .eq('id', assignmentId);

      if (error) throw error;
      await refreshData();
    } catch (error: any) {
      console.error('Error updating data received status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingAssignments(prev => {
        const next = new Set(prev);
        next.delete(assignmentId);
        return next;
      });
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadgeClass = (status: string): string => {
    const classes: Record<string, string> = {
      'Shoot Scheduled': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Post-Production': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📸</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist.</p>
          <Button
            variant="primary"
            onClick={() => navigate(user?.role === 'staff' ? '/my-events' : '/tracking')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Tracking
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to view this booking.</p>
          <Button
            variant="primary"
            onClick={() => navigate(user?.role === 'staff' ? '/my-events' : '/tracking')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Tracking
          </Button>
        </div>
      </div>
    );
  }

  if (bookingEvents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="secondary"
            onClick={() => navigate(user?.role === 'staff' ? '/my-events' : '/tracking')}
            className="mb-6"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Events in This Booking</h3>
            <p className="text-gray-600">Add events to start tracking workflow progress.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeEvent = bookingEvents.find(e => e.id === activeEventTab);
  const activeWorkflow = workflows.find(w => w.event_id === activeEventTab);
  const status = getBookingStatus(bookingEvents, bookingWorkflows);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => navigate(user?.role === 'staff' ? '/my-events' : '/tracking')}
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to {user?.role === 'staff' ? 'My Events' : 'Event Tracking'}
          </Button>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{client?.name}</h1>
                <p className="text-lg text-gray-600 mt-1">
                  {booking.booking_name || `${client?.name}'s Booking`}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeClass(status)}`}>
                {status}
              </span>
            </div>

            {/* Overall Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress:</span>
                <span className="text-sm font-bold text-gray-900">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(overallProgress)}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {bookingEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setActiveEventTab(event.id)}
                  className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeEventTab === event.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-semibold">{event.event_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(event.event_date)} • {event.venue}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Event Content */}
        {activeEvent && (
          <div className="space-y-6">
            {/* Data Collection Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Data Collection</h2>

              {(() => {
                const assignments = getEventAssignments(activeEvent.id);
                const photographers = assignments.filter(a => a.staffMember?.role === 'photographer');
                const videographers = assignments.filter(a => a.staffMember?.role === 'videographer');

                if (photographers.length === 0 && videographers.length === 0) {
                  return (
                    <p className="text-gray-500 text-sm">No staff assigned to this event yet.</p>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Photographers */}
                    {photographers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>📸</span> Photographers ({photographers.length})
                        </h3>
                        <div className="space-y-2">
                          {photographers.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {(assignment as any).data_received ? (
                                  <CheckCircle size={20} className="text-green-600" />
                                ) : (
                                  <XCircle size={20} className="text-gray-400" />
                                )}
                                <span className="font-medium text-gray-900">
                                  {assignment.staffMember?.name}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleDataReceived(assignment.id, (assignment as any).data_received || false)}
                                disabled={updatingAssignments.has(assignment.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  (assignment as any).data_received
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {updatingAssignments.has(assignment.id)
                                  ? 'Updating...'
                                  : (assignment as any).data_received
                                  ? 'Received'
                                  : 'Mark Received'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videographers */}
                    {videographers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>🎥</span> Videographers ({videographers.length})
                        </h3>
                        <div className="space-y-2">
                          {videographers.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {(assignment as any).data_received ? (
                                  <CheckCircle size={20} className="text-green-600" />
                                ) : (
                                  <XCircle size={20} className="text-gray-400" />
                                )}
                                <span className="font-medium text-gray-900">
                                  {assignment.staffMember?.name}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleDataReceived(assignment.id, (assignment as any).data_received || false)}
                                disabled={updatingAssignments.has(assignment.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  (assignment as any).data_received
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {updatingAssignments.has(assignment.id)
                                  ? 'Updating...'
                                  : (assignment as any).data_received
                                  ? 'Received'
                                  : 'Mark Received'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Workflow Section */}
            <EventWorkflow event={activeEvent} workflow={activeWorkflow} />
          </div>
        )}
      </div>
    </div>
  );
}
