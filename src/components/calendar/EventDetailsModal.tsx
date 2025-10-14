import React from 'react';
import { X, Clock, MapPin, Users, Calendar, ExternalLink } from 'lucide-react';
import { Event, Booking, Client, StaffAssignment, Staff } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { getTimeSlotBadge, formatDate } from '../../utils/helpers';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  client: Client | null;
  booking: Booking | null;
  staffAssignments: StaffAssignment[];
  staff: Staff[];
  onViewBooking?: () => void;
}

export function EventDetailsModal({
  isOpen,
  onClose,
  event,
  client,
  booking,
  staffAssignments,
  staff,
  onViewBooking,
}: EventDetailsModalProps) {
  if (!isOpen || !event) return null;

  const assignedStaff = staffAssignments
    .filter((sa) => sa.event_id === event.id)
    .map((sa) => {
      const staffMember = staff.find((s) => s.id === sa.staff_id);
      return {
        ...sa,
        staff: staffMember,
      };
    });

  const photographerCount = assignedStaff.filter((sa) => sa.role === 'photographer').length;
  const videographerCount = assignedStaff.filter((sa) => sa.role === 'videographer').length;
  const droneCount = assignedStaff.filter((sa) => sa.role === 'drone_operator').length;
  const editorCount = assignedStaff.filter((sa) => sa.role === 'editor').length;

  const totalRequired =
    event.photographers_required +
    event.videographers_required +
    event.drone_operators_required +
    event.editors_required;
  const totalAssigned = photographerCount + videographerCount + droneCount + editorCount;

  const isFullyStaffed = totalAssigned >= totalRequired;

  const timeSlotBadge = getTimeSlotBadge(event.time_slot);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Events on {formatDate(event.event_date)}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">1 event(s) scheduled</p>

          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{client?.name || 'Unknown Client'}</h3>
              <StatusBadge status="Shoot Scheduled" variant="info" />
            </div>

            <div className="bg-gray-900 text-white inline-block px-3 py-1 rounded text-sm font-medium mb-4">
              {event.event_name}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={18} className="text-gray-500" />
                <span className="capitalize">{timeSlotBadge}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={18} className="text-gray-500" />
                <span>{event.venue}</span>
              </div>

              <div className="flex items-start gap-2 text-gray-700">
                <Users size={18} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium mb-1">Staff Booked:</div>
                  {assignedStaff.length > 0 ? (
                    <div className="space-y-1">
                      {assignedStaff.map((sa) => (
                        <div key={sa.id} className="flex items-center gap-2">
                          <span className="text-sm">• {sa.staff?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {sa.role.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No staff assigned yet</div>
                  )}
                </div>
              </div>
            </div>

            <div className={`px-4 py-3 rounded-lg mb-4 ${
              isFullyStaffed
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  isFullyStaffed ? 'bg-green-500' : 'bg-yellow-500'
                }`}></span>
                <span className={`font-medium ${
                  isFullyStaffed ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {isFullyStaffed ? 'Fully staffed' : 'Staff shortage'}
                </span>
              </div>
            </div>

            {onViewBooking && (
              <button
                onClick={onViewBooking}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <ExternalLink size={16} />
                View Full Booking Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
