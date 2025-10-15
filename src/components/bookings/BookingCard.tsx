import React, { useState } from 'react';
import { Calendar, MapPin, User, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { Booking, Event, useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatTimeSlot, getBookingStatus } from '../../utils/helpers';
import { canManageBookings, canDeleteBookings } from '../../utils/accessControl';

interface BookingCardProps {
  booking: Booking;
  onEdit: (booking: Booking) => void;
  onDelete: (bookingId: string) => void;
}

export function BookingCard({ booking, onEdit, onDelete }: BookingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const { events, staffAssignments, workflows } = useAppData();

  const bookingEvents = events.filter(e => e.booking_id === booking.id);
  const bookingWorkflows = workflows.filter(w => bookingEvents.some(e => e.id === w.event_id));
  const status = getBookingStatus(bookingEvents, bookingWorkflows);

  const statusColorMap: Record<string, string> = {
    'Shoot Scheduled': 'blue-500',
    'In Progress': 'blue-500',
    'Post-Production': 'yellow-500',
    'Delivered': 'green-500',
  };

  const borderColor = statusColorMap[status] || 'gray-300';

  const primaryEvent = bookingEvents[0];
  const eventCount = bookingEvents.length;

  return (
    <Card borderColor={borderColor} className="hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{booking.client?.name}</h3>
            <StatusBadge status={status} />
          </div>

          {booking.booking_name && (
            <p className="text-gray-700 font-medium mb-2">{booking.booking_name}</p>
          )}

          {primaryEvent && (
            <p className="text-gray-600 mb-3">{primaryEvent.event_name}</p>
          )}

          {eventCount > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-3"
            >
              Multi-Event Booking ({eventCount} events)
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}

          {expanded && (
            <div className="mt-4 space-y-3 border-t pt-3">
              {bookingEvents.map((event, idx) => {
                const eventAssignments = staffAssignments.filter(sa => sa.event_id === event.id);
                const manager = eventAssignments.find(sa => sa.role === 'manager')?.staff;

                return (
                  <div key={event.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {event.event_name} {idx === 0 && '(Primary)'}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(event.event_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {event.venue}
                          </span>
                          {manager && (
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {manager.name}
                            </span>
                          )}
                        </div>
                        <StatusBadge status={formatTimeSlot(event.time_slot)} className="mt-2" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          {canManageBookings(user) && (
            <button
              onClick={() => onEdit(booking)}
              className="text-gray-600 hover:text-blue-600 transition-colors"
              title="Edit"
            >
              <Edit size={18} />
            </button>
          )}
          {canDeleteBookings(user) && (
            <button
              onClick={() => onDelete(booking.id)}
              className="text-gray-600 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
