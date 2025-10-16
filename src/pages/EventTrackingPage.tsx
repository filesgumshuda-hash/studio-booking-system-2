import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventWorkflow } from '../components/tracking/EventWorkflow';
import { useAppData } from '../context/AppContext';
import { getBookingStatus, getWorkflowProgress, formatDate } from '../utils/helpers';

export function EventTrackingPage() {
  const { bookings, events, clients, workflows } = useAppData();
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());

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

              const totalProgress = booking.events.reduce(
                (acc, event) => {
                  const workflow = workflows.find((w) => w.event_id === event.id);
                  const progress = getWorkflowProgress(workflow);
                  return {
                    still: acc.still + progress.still,
                    stillTotal: acc.stillTotal + progress.stillTotal,
                    reel: acc.reel + progress.reel,
                    reelTotal: acc.reelTotal + progress.reelTotal,
                    video: acc.video + progress.video,
                    videoTotal: acc.videoTotal + progress.videoTotal,
                    portrait: acc.portrait + progress.portrait,
                    portraitTotal: acc.portraitTotal + progress.portraitTotal,
                  };
                },
                { still: 0, stillTotal: 0, reel: 0, reelTotal: 0, video: 0, videoTotal: 0, portrait: 0, portraitTotal: 0 }
              );

              return (
                <div key={booking.id}>
                  <Card>
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleBooking(booking.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {booking.client?.name}
                            </h3>
                            <StatusBadge status={status} />
                          </div>
                          <p className="text-gray-600 mb-3">
                            {booking.events.length} Event{booking.events.length > 1 ? 's' : ''} • Latest: {formatDate(latestEvent.event_date)}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                            <span>Still: {totalProgress.still}/{totalProgress.stillTotal}</span>
                            <span>Reel: {totalProgress.reel}/{totalProgress.reelTotal}</span>
                            <span>Video: {totalProgress.video}/{totalProgress.videoTotal}</span>
                            <span>Portrait: {totalProgress.portrait}/{totalProgress.portraitTotal}</span>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 space-y-6 border-t pt-6">
                        {booking.events.map((event) => {
                          const workflow = workflows.find((w) => w.event_id === event.id);
                          return (
                            <EventWorkflow
                              key={event.id}
                              event={event}
                              workflow={workflow}
                            />
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
