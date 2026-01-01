import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Staff, Event, Booking, Client, StaffAssignment, Workflow } from '../../context/AppContext';

interface EventWithDetails extends Event {
  booking?: Booking & { client?: Client };
  staff_assignments?: StaffAssignment[];
  workflow?: Workflow;
}

interface StaffAssignmentsModalProps {
  staff: Staff;
  onClose: () => void;
}

type DateFilter = 'next3months' | 'next6months' | 'past3months' | 'past6months' | 'all' | 'custom';

export function StaffAssignmentsModal({ staff, onClose }: StaffAssignmentsModalProps) {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('next3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [staff.id]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('staff_assignments')
        .select(`
          id,
          event_id,
          staff_id,
          role,
          data_received,
          events (
            id,
            event_name,
            event_date,
            booking_id,
            bookings (
              id,
              booking_name,
              client_id,
              clients (
                id,
                name
              )
            )
          )
        `)
        .eq('staff_id', staff.id);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const eventIds = assignments.map(a => a.event_id);
      const bookingIds = [...new Set(assignments.map((a: any) => a.events?.booking_id).filter(Boolean))];

      const { data: workflows, error: workflowsError } = await supabase
        .from('workflows')
        .select('*')
        .in('booking_id', bookingIds);

      if (workflowsError) throw workflowsError;

      const eventsWithDetails: EventWithDetails[] = assignments
        .map((assignment: any) => {
          const event = assignment.events;
          if (!event) return null;

          const booking = event.bookings;
          const workflow = workflows?.find(w => w.booking_id === event.booking_id);

          return {
            id: event.id,
            booking_id: event.booking_id,
            event_name: event.event_name,
            event_date: event.event_date,
            time_slot: event.time_slot || 'morning',
            venue: event.venue || '',
            photographers_required: event.photographers_required || 0,
            videographers_required: event.videographers_required || 0,
            drone_operators_required: event.drone_operators_required || 0,
            editors_required: event.editors_required || 0,
            created_at: event.created_at,
            updated_at: event.updated_at,
            booking: booking ? {
              ...booking,
              client: booking.clients
            } : undefined,
            staff_assignments: [
              {
                id: assignment.id,
                event_id: assignment.event_id,
                staff_id: assignment.staff_id,
                role: assignment.role,
                data_received: assignment.data_received,
                created_at: assignment.created_at || new Date().toISOString()
              }
            ],
            workflow: workflow || undefined
          };
        })
        .filter((e): e is EventWithDetails => e !== null);

      setEvents(eventsWithDetails);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (dateFilter) {
      case 'next3months':
        startDate = today;
        endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 3);
        break;

      case 'next6months':
        startDate = today;
        endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 6);
        break;

      case 'past3months':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 3);
        endDate = today;
        break;

      case 'past6months':
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6);
        endDate = today;
        break;

      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        }
        break;

      case 'all':
      default:
        return events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    }

    if (!startDate || !endDate) {
      return events.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    }

    return events
      .filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= startDate! && eventDate <= endDate!;
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  }, [events, dateFilter, customStartDate, customEndDate]);

  const getWorkflowStatus = (event: EventWithDetails) => {
    const workflow = event.workflow;
    if (!workflow) {
      return { still: 'not_started', reel: 'not_started', video: 'not_started' };
    }

    const stillStatus = workflow.still_workflow?.deliveredToClient?.completed
      ? 'received'
      : workflow.still_workflow?.rawDataSent?.completed
      ? 'pending'
      : 'not_started';

    const reelStatus = workflow.reel_workflow?.reelDelivered?.completed
      ? 'received'
      : workflow.reel_workflow?.reelSentToEditor?.completed
      ? 'pending'
      : 'not_started';

    const videoStatus = workflow.video_workflow?.videoDelivered?.completed
      ? 'received'
      : workflow.video_workflow?.videoSentToEditor?.completed
      ? 'pending'
      : 'not_started';

    return { still: stillStatus, reel: reelStatus, video: videoStatus };
  };

  const getOverallStatus = (event: EventWithDetails) => {
    const { still, reel, video } = getWorkflowStatus(event);

    if (still === 'received' && (reel === 'received' || reel === 'not_started') && (video === 'received' || video === 'not_started')) {
      return 'received';
    }

    if (still === 'not_started' && reel === 'not_started' && video === 'not_started') {
      return 'not_started';
    }

    return 'pending';
  };

  const completedCount = filteredEvents.filter(e => getOverallStatus(e) === 'received').length;
  const pendingCount = filteredEvents.filter(e => getOverallStatus(e) === 'pending').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
        return '✅';
      case 'pending':
        return '⏳';
      case 'not_started':
        return '➖';
      default:
        return '❓';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Delivered';
      case 'pending':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStaffRole = (event: EventWithDetails) => {
    const assignment = event.staff_assignments?.[0];
    return assignment?.role || 'Photographer';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Event Assignments - {staff.name}</h2>
            <p className="text-sm text-gray-600 mt-1">View all events assigned to this staff member</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar size={16} />
              Date Range:
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
            >
              <option value="next3months">Next 3 Months</option>
              <option value="next6months">Next 6 Months</option>
              <option value="past3months">Past 3 Months</option>
              <option value="past6months">Past 6 Months</option>
              <option value="all">All Events</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateFilter === 'custom' && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex gap-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm">
              <span className="text-gray-600">Total Events:</span>{' '}
              <strong className="text-gray-900 text-lg">{filteredEvents.length}</strong>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Completed:</span>{' '}
              <strong className="text-green-600 text-lg">{completedCount}</strong>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Pending:</span>{' '}
              <strong className="text-amber-600 text-lg">{pendingCount}</strong>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading events...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events found in this date range
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const { still, reel, video } = getWorkflowStatus(event);
                const overallStatus = getOverallStatus(event);

                return (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="bg-white p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <h3 className="font-semibold text-gray-900">{event.event_name}</h3>
                          {event.booking?.booking_name && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {event.booking.booking_name}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Client:</span>{' '}
                          {event.booking?.client?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Date:</span> {formatDate(event.event_date)}
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getStaffRole(event)}
                          </span>
                          {overallStatus === 'received' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Received
                            </span>
                          ) : overallStatus === 'pending' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              ⏳ Pending
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              ➖ Not Started
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div
                          className={`flex items-center gap-1 px-3 py-1 rounded ${
                            still === 'received'
                              ? 'bg-green-100 text-green-800'
                              : still === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <strong>Still:</strong> {getStatusIcon(still)} {getStatusText(still)}
                        </div>
                        <div
                          className={`flex items-center gap-1 px-3 py-1 rounded ${
                            reel === 'received'
                              ? 'bg-green-100 text-green-800'
                              : reel === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <strong>Reel:</strong> {getStatusIcon(reel)} {getStatusText(reel)}
                        </div>
                        <div
                          className={`flex items-center gap-1 px-3 py-1 rounded ${
                            video === 'received'
                              ? 'bg-green-100 text-green-800'
                              : video === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <strong>Video:</strong> {getStatusIcon(video)} {getStatusText(video)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex gap-4 text-xs text-gray-600">
            <span><strong>Legend:</strong></span>
            <span>✅ Received/Completed</span>
            <span>⏳ Pending</span>
            <span>➖ Not applicable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
