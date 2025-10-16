import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppData } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BookingWorkflow } from '../components/tracking/BookingWorkflow';
import { formatDate, getBookingStatus, getWorkflowProgress } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { Button } from '../components/common/Button';

export function BookingTrackingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookings, events, clients, workflows, staffAssignments, staff, refreshData } = useAppData();

  const [updatingAssignments, setUpdatingAssignments] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

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

  const bookingWorkflow = useMemo(() => {
    return workflows.find(w => w.booking_id === bookingId && w.event_id === null);
  }, [workflows, bookingId]);

  React.useEffect(() => {
    if (bookingEvents.length > 0 && expandedEvents.size === 0) {
      setExpandedEvents(new Set([bookingEvents[0].id]));
    }
  }, [bookingEvents]);

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
    if (!bookingWorkflow) return 0;

    const progress = getWorkflowProgress(bookingWorkflow);
    const totalSteps = progress.stillTotal + progress.reelTotal + progress.videoTotal + progress.portraitTotal;
    const completedSteps = progress.still + progress.reel + progress.video + progress.portrait;

    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }, [bookingWorkflow]);

  const getEventAssignments = (eventId: string) => {
    return staffAssignments
      .filter(sa => sa.event_id === eventId)
      .map(sa => ({
        ...sa,
        staffMember: staff.find(s => s.id === sa.staff_id)
      }))
      .filter(sa => sa.staffMember);
  };

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleDataReceived = async (assignmentId: string, currentValue: boolean) => {
    setUpdatingAssignments(prev => new Set(prev).add(assignmentId));

    try {
      const { error} = await supabase
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

  const getLatestEventDate = () => {
    if (bookingEvents.length === 0) return '';
    const sorted = [...bookingEvents].sort((a, b) =>
      new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    );
    return sorted[0].event_date;
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

  const status = getBookingStatus(bookingEvents, bookingWorkflow ? [bookingWorkflow] : []);

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

          {/* Booking Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{client?.name}</h1>
                <p className="text-lg text-gray-600 mt-1">
                  {booking.booking_name || `${client?.name}'s Booking`}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {bookingEvents.length} Event{bookingEvents.length !== 1 ? 's' : ''} •
                  Latest: {formatDate(getLatestEventDate())}
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

        {/* Events Section with Expand/Collapse */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Events</h2>
          <div className="space-y-3">
            {bookingEvents.map((event, index) => {
              const eventAssignments = getEventAssignments(event.id);
              const photographers = eventAssignments.filter(a => a.staffMember?.role === 'photographer');
              const videographers = eventAssignments.filter(a => a.staffMember?.role === 'videographer');
              const isExpanded = expandedEvents.has(event.id);

              return (
                <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Event Header - Always Visible */}
                  <button
                    onClick={() => toggleEvent(event.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-gray-600">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {index + 1}. {event.event_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          📅 {formatDate(event.event_date)} • 📍 {event.venue}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content - Data Collection */}
                  {isExpanded && (photographers.length > 0 || videographers.length > 0) && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                      <div className="pt-4">
                        <h4 className="font-semibold text-gray-900 mb-4">Data Collection</h4>

                        {/* Photographers */}
                        {photographers.length > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span>📸</span>
                              <span className="text-sm font-medium text-gray-700">
                                Photographers ({photographers.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {photographers.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    {(assignment as any).data_received ? (
                                      <CheckCircle size={20} className="text-green-600" />
                                    ) : (
                                      <XCircle size={20} className="text-gray-400" />
                                    )}
                                    <span className="text-sm font-medium text-gray-900">
                                      {assignment.staffMember?.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => toggleDataReceived(assignment.id, (assignment as any).data_received || false)}
                                    disabled={updatingAssignments.has(assignment.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                      (assignment as any).data_received
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                            <div className="flex items-center gap-2 mb-3">
                              <span>🎥</span>
                              <span className="text-sm font-medium text-gray-700">
                                Videographers ({videographers.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {videographers.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200"
                                >
                                  <div className="flex items-center gap-3">
                                    {(assignment as any).data_received ? (
                                      <CheckCircle size={20} className="text-green-600" />
                                    ) : (
                                      <XCircle size={20} className="text-gray-400" />
                                    )}
                                    <span className="text-sm font-medium text-gray-900">
                                      {assignment.staffMember?.name}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => toggleDataReceived(assignment.id, (assignment as any).data_received || false)}
                                    disabled={updatingAssignments.has(assignment.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                      (assignment as any).data_received
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Single Booking-Level Workflow Section */}
        <BookingWorkflow bookingId={bookingId!} workflow={bookingWorkflow} />
      </div>
    </div>
  );
}
