import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkflowStep } from '../components/tracking/WorkflowStep';
import { useAppData } from '../context/AppContext';
import type { Event } from '../context/AppContext';
import { getBookingStatus, getWorkflowProgress, formatDate, formatTimeSlot } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { Users, ChevronDown, ChevronRight, Search } from 'lucide-react';

type WorkflowType = 'still' | 'reel' | 'video' | 'portrait';

interface EnrichedBooking {
  id: string;
  booking_name?: string;
  client?: { id: string; name: string };
  events: Event[];
  workflows: any[];
}

export function EventTrackingPage() {
  const navigate = useNavigate();
  const { bookings, events, clients, workflows, staffAssignments, staff } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'active' | 'past' | 'all'>('active');
  const [sortBy, setSortBy] = useState('date-asc');
  const [hideCompleted, setHideCompleted] = useState(false);

  const getEarliestEventDate = (booking: EnrichedBooking): number => {
    if (booking.events.length === 0) return 0;
    return Math.min(...booking.events.map(e => new Date(e.event_date).getTime()));
  };

  const calculateDataCollection = (booking: EnrichedBooking) => {
    const photographers = new Set<string>();
    const videographers = new Set<string>();

    booking.events.forEach(event => {
      const assignments = staffAssignments.filter(sa => sa.event_id === event.id);
      assignments.forEach(assignment => {
        const staffMember = staff.find(s => s.id === assignment.staff_id);
        if (staffMember) {
          if (staffMember.role === 'photographer') {
            photographers.add(assignment.staff_id);
          } else if (staffMember.role === 'videographer') {
            videographers.add(assignment.staff_id);
          }
        }
      });
    });

    const photosReceived = Array.from(photographers).filter(staffId => {
      return staffAssignments.some(sa =>
        sa.staff_id === staffId &&
        booking.events.some(e => e.id === sa.event_id) &&
        (sa as any).data_received
      );
    }).length;

    const videosReceived = Array.from(videographers).filter(staffId => {
      return staffAssignments.some(sa =>
        sa.staff_id === staffId &&
        booking.events.some(e => e.id === sa.event_id) &&
        (sa as any).data_received
      );
    }).length;

    return {
      photos: {
        received: photosReceived,
        total: photographers.size || 0
      },
      videos: {
        received: videosReceived,
        total: videographers.size || 0
      }
    };
  };

  const calculateOverallProgress = (booking: EnrichedBooking) => {
    const { totals, completed } = calculateBookingProgress(booking);
    const totalSteps = totals.still + totals.reel + totals.video + totals.portrait;
    const completedSteps = completed.still + completed.reel + completed.video + completed.portrait;

    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
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

  const enrichedBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result = bookings
      .map((booking) => {
        const bookingEvents = events.filter((e) => e.booking_id === booking.id);
        const client = clients.find((c) => c.id === booking.client_id);
        const bookingWorkflow = workflows.find((w) => w.booking_id === booking.id);
        return {
          ...booking,
          events: bookingEvents,
          client,
          workflows: bookingWorkflow ? [bookingWorkflow] : [],
        };
      })
      .filter((b) => b.events.length > 0);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.client?.name.toLowerCase().includes(query) ||
        b.booking_name?.toLowerCase().includes(query) ||
        b.events.some(e => e.event_name.toLowerCase().includes(query))
      );
    }

    if (timeFilter === 'active') {
      result = result.filter(b =>
        b.events.some(e => new Date(e.event_date) >= today)
      );
    } else if (timeFilter === 'past') {
      result = result.filter(b =>
        b.events.every(e => new Date(e.event_date) < today)
      );
    }

    if (hideCompleted) {
      result = result.filter(b => {
        const progress = calculateOverallProgress(b);
        return progress < 100;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return getEarliestEventDate(a) - getEarliestEventDate(b);
        case 'date-desc':
          return getEarliestEventDate(b) - getEarliestEventDate(a);
        case 'name':
          return (a.booking_name || a.client?.name || '').localeCompare(
            b.booking_name || b.client?.name || ''
          );
        case 'client':
          return (a.client?.name || '').localeCompare(b.client?.name || '');
        case 'progress-asc':
          return calculateOverallProgress(a) - calculateOverallProgress(b);
        case 'progress-desc':
          return calculateOverallProgress(b) - calculateOverallProgress(a);
        case 'booking':
          return (a.booking_name || '').localeCompare(b.booking_name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [bookings, events, clients, workflows, staffAssignments, staff, searchQuery, timeFilter, sortBy, hideCompleted]);

  const getLatestEventDate = (events: Event[]) => {
    if (events.length === 0) return '';
    const sorted = [...events].sort((a, b) =>
      new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    );
    return sorted[0].event_date;
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      shoot_scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      post_production: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Tracking</h1>
          <p className="text-gray-600 mt-1">Manage workflow progress for all bookings</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by client, booking, or event name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as 'active' | 'past' | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[180px]"
            >
              <option value="active">Active Events</option>
              <option value="past">Past Events</option>
              <option value="all">All Events</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 min-w-[220px]"
            >
              <option value="date-asc">Sort: Date (Earliest First)</option>
              <option value="date-desc">Sort: Date (Latest First)</option>
              <option value="name">Sort: Event Name (A-Z)</option>
              <option value="client">Sort: Client Name (A-Z)</option>
              <option value="booking">Sort: Booking Name (A-Z)</option>
              <option value="progress-asc">Sort: Progress (Low to High)</option>
              <option value="progress-desc">Sort: Progress (High to Low)</option>
            </select>

            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <span className="text-sm font-medium text-gray-700">Hide Completed</span>
            </label>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{enrichedBookings.length}</span> {timeFilter === 'all' ? '' : timeFilter} booking{enrichedBookings.length !== 1 ? 's' : ''}
          </div>
        </div>

        {enrichedBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || timeFilter !== 'all' || hideCompleted
                ? 'No bookings match your filters'
                : 'No bookings yet'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || timeFilter !== 'all' || hideCompleted
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first booking to start tracking'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {enrichedBookings.map((booking) => {
              const status = getBookingStatus(booking.events, booking.workflows);
              const overallProgress = calculateOverallProgress(booking);
              const dataCollection = calculateDataCollection(booking);
              const latestDate = getLatestEventDate(booking.events);

              return (
                <div
                  key={booking.id}
                  onClick={() => navigate(`/tracking/${booking.id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                >
                  {/* Client & Booking Name */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">📸</span>
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {booking.client?.name}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {booking.booking_name || `${booking.client?.name}'s Booking`}
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-4" />

                  {/* Event Count & Latest Date */}
                  <div className="mb-4 text-sm text-gray-600">
                    <p>{booking.events.length} Event{booking.events.length !== 1 ? 's' : ''}</p>
                    <p className="truncate">Latest: {formatDate(latestDate)}</p>
                  </div>

                  {/* Overall Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall:</span>
                      <span className="text-sm font-bold text-gray-900">{overallProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(overallProgress)}`}
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Data Collection */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Data Collection:</p>
                    <div className="space-y-2">
                      {/* Photos */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span>📸</span>
                          <span className="text-gray-600">Photos:</span>
                        </div>
                        <span className="font-semibold">
                          {dataCollection.photos.received}/{dataCollection.photos.total}
                          {dataCollection.photos.total > 0 && (
                            <span className="text-gray-500 ml-1">
                              {Math.round((dataCollection.photos.received / dataCollection.photos.total) * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                      {dataCollection.photos.total > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${(dataCollection.photos.received / dataCollection.photos.total) * 100}%` }}
                          />
                        </div>
                      )}

                      {/* Videos */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span>🎥</span>
                          <span className="text-gray-600">Videos:</span>
                        </div>
                        <span className="font-semibold">
                          {dataCollection.videos.received}/{dataCollection.videos.total}
                          {dataCollection.videos.total > 0 && (
                            <span className="text-gray-500 ml-1">
                              {Math.round((dataCollection.videos.received / dataCollection.videos.total) * 100)}%
                            </span>
                          )}
                        </span>
                      </div>
                      {dataCollection.videos.total > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-purple-500 transition-all"
                            style={{ width: `${(dataCollection.videos.received / dataCollection.videos.total) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
                      {formatStatus(status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
