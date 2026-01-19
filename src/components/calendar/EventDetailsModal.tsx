import React, { useState } from 'react';
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
  events: Event[];
  onViewBooking?: () => void;
  onAssignStaff?: (eventId: string, staffId: string) => Promise<void>;
  onUnassignStaff?: (assignmentId: string) => Promise<void>;
}

export function EventDetailsModal({
  isOpen,
  onClose,
  event,
  client,
  booking,
  staffAssignments,
  staff,
  events,
  onViewBooking,
  onAssignStaff,
  onUnassignStaff,
}: EventDetailsModalProps) {
  const [photographerSelect, setPhotographerSelect] = useState('');
  const [videographerSelect, setVideographerSelect] = useState('');
  const [droneSelect, setDroneSelect] = useState('');
  const [editorSelect, setEditorSelect] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

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

  const photographerCount = assignedStaff.filter((sa) => sa.staff?.role === 'photographer').length;
  const videographerCount = assignedStaff.filter((sa) => sa.staff?.role === 'videographer').length;
  const droneCount = assignedStaff.filter((sa) => sa.staff?.role === 'drone_operator').length;
  const editorCount = assignedStaff.filter((sa) => sa.staff?.role === 'editor').length;

  const isFullyStaffed =
    photographerCount >= event.photographers_required &&
    videographerCount >= event.videographers_required &&
    droneCount >= event.drone_operators_required &&
    editorCount >= event.editors_required;

  const photographerShortage = Math.max(0, event.photographers_required - photographerCount);
  const videographerShortage = Math.max(0, event.videographers_required - videographerCount);
  const droneShortage = Math.max(0, event.drone_operators_required - droneCount);
  const editorShortage = Math.max(0, event.editors_required - editorCount);

  const eventDate = event.event_date;
  const busyStaffIds = staffAssignments
    .filter((sa) => {
      const assignedEvent = events.find((e) => e.id === sa.event_id);
      return assignedEvent?.event_date === eventDate;
    })
    .map((sa) => sa.staff_id);

  const availablePhotographers = staff.filter(
    (s) => s.role === 'photographer' && s.status === 'active' && !busyStaffIds.includes(s.id)
  );
  const availableVideographers = staff.filter(
    (s) => s.role === 'videographer' && s.status === 'active' && !busyStaffIds.includes(s.id)
  );
  const availableDroneOps = staff.filter(
    (s) => s.role === 'drone_operator' && s.status === 'active' && !busyStaffIds.includes(s.id)
  );
  const availableEditors = staff.filter(
    (s) => s.role === 'editor' && s.status === 'active' && !busyStaffIds.includes(s.id)
  );

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
                <div className="flex-1">
                  <div className="font-medium mb-1">Staff Booked:</div>
                  {assignedStaff.length > 0 ? (
                    <div className="space-y-1">
                      {assignedStaff.map((sa) => (
                        <div key={sa.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">• {sa.staff?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500 capitalize">
                              ({(sa.staff?.role || sa.role).replace('_', ' ')})
                            </span>
                          </div>
                          {onUnassignStaff && (
                            <button
                              onClick={async () => {
                                if (confirm(`Remove ${sa.staff?.name || 'this staff member'}?`)) {
                                  await onUnassignStaff(sa.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-1 transition-colors"
                              title="Remove staff"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No staff assigned yet</div>
                  )}
                </div>
              </div>
            </div>

            {isFullyStaffed && (
              <div className="px-4 py-3 rounded-lg mb-4 bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="font-medium text-green-800">Fully staffed</span>
                </div>
              </div>
            )}

            {!isFullyStaffed && (
              <div className="mt-4 pt-4 border-t border-gray-200 mb-4">
                <p className="text-sm font-medium text-amber-700 mb-3">⚠️ Still needed:</p>
                <div className="space-y-2">
                  {photographerShortage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        +{photographerShortage} Photographer{photographerShortage > 1 ? 's' : ''}
                      </span>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                        value={photographerSelect}
                        disabled={isAssigning}
                        onChange={async (e) => {
                          const value = e.target.value;
                          console.log('Photographer selected:', value);
                          if (value) {
                            setIsAssigning(true);
                            setPhotographerSelect(value);
                            console.log('Calling onAssignStaff with event.id:', event.id, 'staffId:', value);
                            try {
                              await onAssignStaff?.(event.id, value);
                              console.log('onAssignStaff completed successfully');
                            } catch (error) {
                              console.error('Error in onAssignStaff:', error);
                            } finally {
                              setPhotographerSelect('');
                              setIsAssigning(false);
                            }
                          }
                        }}
                      >
                        <option value="" disabled>
                          {isAssigning ? 'Assigning...' : 'Assign ▼'}
                        </option>
                        {availablePhotographers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                        {availablePhotographers.length === 0 && (
                          <option disabled>No one available</option>
                        )}
                      </select>
                    </div>
                  )}

                  {videographerShortage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        +{videographerShortage} Videographer{videographerShortage > 1 ? 's' : ''}
                      </span>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                        value={videographerSelect}
                        disabled={isAssigning}
                        onChange={async (e) => {
                          const value = e.target.value;
                          console.log('Videographer selected:', value);
                          if (value) {
                            setIsAssigning(true);
                            setVideographerSelect(value);
                            try {
                              await onAssignStaff?.(event.id, value);
                              console.log('Videographer assigned successfully');
                            } catch (error) {
                              console.error('Error assigning videographer:', error);
                            } finally {
                              setVideographerSelect('');
                              setIsAssigning(false);
                            }
                          }
                        }}
                      >
                        <option value="" disabled>
                          {isAssigning ? 'Assigning...' : 'Assign ▼'}
                        </option>
                        {availableVideographers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                        {availableVideographers.length === 0 && (
                          <option disabled>No one available</option>
                        )}
                      </select>
                    </div>
                  )}

                  {droneShortage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        +{droneShortage} Drone Operator{droneShortage > 1 ? 's' : ''}
                      </span>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                        value={droneSelect}
                        disabled={isAssigning}
                        onChange={async (e) => {
                          const value = e.target.value;
                          console.log('Drone operator selected:', value);
                          if (value) {
                            setIsAssigning(true);
                            setDroneSelect(value);
                            try {
                              await onAssignStaff?.(event.id, value);
                              console.log('Drone operator assigned successfully');
                            } catch (error) {
                              console.error('Error assigning drone operator:', error);
                            } finally {
                              setDroneSelect('');
                              setIsAssigning(false);
                            }
                          }
                        }}
                      >
                        <option value="" disabled>
                          {isAssigning ? 'Assigning...' : 'Assign ▼'}
                        </option>
                        {availableDroneOps.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                        {availableDroneOps.length === 0 && (
                          <option disabled>No one available</option>
                        )}
                      </select>
                    </div>
                  )}

                  {editorShortage > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        +{editorShortage} Editor{editorShortage > 1 ? 's' : ''}
                      </span>
                      <select
                        className="text-sm border border-gray-300 rounded px-2 py-1 disabled:opacity-50"
                        value={editorSelect}
                        disabled={isAssigning}
                        onChange={async (e) => {
                          const value = e.target.value;
                          console.log('Editor selected:', value);
                          if (value) {
                            setIsAssigning(true);
                            setEditorSelect(value);
                            try {
                              await onAssignStaff?.(event.id, value);
                              console.log('Editor assigned successfully');
                            } catch (error) {
                              console.error('Error assigning editor:', error);
                            } finally {
                              setEditorSelect('');
                              setIsAssigning(false);
                            }
                          }
                        }}
                      >
                        <option value="" disabled>
                          {isAssigning ? 'Assigning...' : 'Assign ▼'}
                        </option>
                        {availableEditors.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                        {availableEditors.length === 0 && (
                          <option disabled>No one available</option>
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

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
