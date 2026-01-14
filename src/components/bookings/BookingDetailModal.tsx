import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Booking, Event, useAppData } from '../../context/AppContext';
import { formatDate, formatTimeSlot, getBookingStatus, getWorkflowProgress } from '../../utils/helpers';

interface BookingDetailModalProps {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
}

export function BookingDetailModal({ booking, onClose, onEdit }: BookingDetailModalProps) {
  const navigate = useNavigate();
  const { events, staffAssignments, staff, workflows, clientPaymentRecords } = useAppData();

  const bookingEvents = events.filter(e => e.booking_id === booking.id);
  const bookingWorkflows = workflows.filter(w => bookingEvents.some(e => e.id === w.event_id));
  const status = getBookingStatus(bookingEvents, bookingWorkflows);

  const paymentStatus = calculatePaymentStatus(booking, clientPaymentRecords);
  const progress = calculateBookingProgress(bookingWorkflows);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown as any);
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Booking Details: {booking.client?.name} - {booking.booking_name || 'Unnamed Booking'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Information */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>👤</span> Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{booking.client?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-medium">{booking.client?.contact_number || 'N/A'}</span>
              </div>
              {booking.client?.email && (
                <div className="col-span-1 md:col-span-2">
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{booking.client.email}</span>
                </div>
              )}
              {booking.client?.notes && (
                <div className="col-span-1 md:col-span-2">
                  <span className="text-gray-600">Notes:</span>
                  <p className="mt-1 text-gray-700">{booking.client.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Booking Details */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📋</span> Booking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Booking Name:</span>
                <span className="ml-2 font-medium">{booking.booking_name || 'Unnamed Booking'}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
                  {status}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Date Range:</span>
                <span className="ml-2 font-medium">
                  {formatDateRange(bookingEvents)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Package Amount:</span>
                <span className="ml-2 font-medium">
                  {booking.package_amount ? `₹${booking.package_amount.toLocaleString('en-IN')}` : 'Not set'}
                </span>
              </div>
            </div>
          </section>

          {/* Events */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📅</span> Events ({bookingEvents.length})
            </h3>
            {bookingEvents.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No events scheduled</p>
            ) : (
              <div className="space-y-3">
                {bookingEvents.map((event, index) => {
                  const eventStaff = staffAssignments
                    .filter(sa => sa.event_id === event.id)
                    .map(sa => ({ ...sa, staff: staff.find(s => s.id === sa.staff_id) }))
                    .filter(sa => sa.staff);

                  return (
                    <div key={event.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-lg">{getEventIcon(event.event_name)}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {index + 1}. {event.event_name}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              📅 {formatDate(event.event_date)}, {formatTimeSlot(event.time_slot)}
                            </p>
                            <p className="text-xs text-gray-600">
                              📍 {event.venue}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            navigate('/tracking');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                        >
                          View Tracking →
                        </button>
                      </div>

                      {/* Assigned Staff */}
                      {eventStaff.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Staff:</p>
                          <div className="flex flex-wrap gap-2">
                            {eventStaff.map(assignment => (
                              <span
                                key={assignment.id}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs"
                              >
                                {getRoleIcon(assignment.staff?.role || assignment.role)} {assignment.staff?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Event Notes */}
                      {event.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-700">{event.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Payment Status */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>💰</span> Payment Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Package Amount:</span>
                <span className="font-semibold">
                  ₹{paymentStatus.packageAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Received:</span>
                <span className="font-semibold text-green-600">
                  ₹{paymentStatus.received.toLocaleString('en-IN')} ✓
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Outstanding:</span>
                <span className={`font-semibold ${paymentStatus.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{paymentStatus.outstanding.toLocaleString('en-IN')}
                  {paymentStatus.outstanding > 0 ? ' ⚠️' : ' ✓'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                navigate('/client-payments');
              }}
              className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Payment History →
            </button>
          </section>

          {/* Workflow Progress */}
          <section className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📊</span> Workflow Progress
            </h3>
            <div className="space-y-3">
              <ProgressBar label="Still" completed={progress.still.completed} total={progress.still.total} />
              <ProgressBar label="Reel" completed={progress.reel.completed} total={progress.reel.total} />
              <ProgressBar label="Video" completed={progress.video.completed} total={progress.video.total} />
              <ProgressBar label="Portrait" completed={progress.portrait.completed} total={progress.portrait.total} />
            </div>
          </section>

          {/* Booking Notes */}
          {booking.notes && (
            <section className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📝</span> Notes
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {booking.notes}
              </p>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Edit Booking
          </button>
          <button
            onClick={() => {
              onClose();
              navigate('/tracking');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Tracking
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, completed, total }: { label: string; completed: number; total: number }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getColorClass = () => {
    if (percentage === 0) return 'bg-gray-300';
    if (percentage < 30) return 'bg-blue-500';
    if (percentage < 60) return 'bg-orange-500';
    if (percentage < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}:</span>
        <span className="text-sm text-gray-600">
          {completed}/{total} ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getColorClass()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function calculatePaymentStatus(booking: Booking, clientPaymentRecords: any[]) {
  const packageAmount = booking.package_amount || 0;
  const received = clientPaymentRecords
    .filter(p => p.booking_id === booking.id && p.payment_status === 'received')
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = packageAmount - received;

  return { packageAmount, received, outstanding };
}

function calculateBookingProgress(workflows: any[]) {
  const totals = { still: 0, reel: 0, video: 0, portrait: 0 };
  const completed = { still: 0, reel: 0, video: 0, portrait: 0 };

  workflows.forEach((workflow) => {
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

  return {
    still: { completed: completed.still, total: totals.still },
    reel: { completed: completed.reel, total: totals.reel },
    video: { completed: completed.video, total: totals.video },
    portrait: { completed: completed.portrait, total: totals.portrait },
  };
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    'Shoot Scheduled': 'bg-blue-100 text-blue-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Post-Production': 'bg-purple-100 text-purple-800',
    'Delivered': 'bg-green-100 text-green-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function getEventIcon(eventName: string): string {
  const name = eventName.toLowerCase();
  if (name.includes('wedding')) return '💒';
  if (name.includes('pre-wedding') || name.includes('prewedding')) return '📸';
  if (name.includes('ring') || name.includes('engagement')) return '💍';
  if (name.includes('haldi')) return '🌼';
  if (name.includes('sangeet') || name.includes('mehndi')) return '💃';
  if (name.includes('reception')) return '🎉';
  return '📅';
}

function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    photographer: '📷',
    videographer: '🎥',
    drone_operator: '🚁',
    editor: '✂️',
    coordinator: '📋',
    manager: '👔',
  };
  return icons[role] || '👤';
}

function formatDateRange(events: Event[]): string {
  if (events.length === 0) return 'No events';
  if (events.length === 1) return formatDate(events[0].event_date);

  const dates = events.map(e => e.event_date).sort();
  const first = formatDate(dates[0]);
  const last = formatDate(dates[dates.length - 1]);

  if (first === last) return first;
  return `${first} - ${last}`;
}
