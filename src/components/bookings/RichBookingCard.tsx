import React from 'react';
import { Booking, Event, useAppData } from '../../context/AppContext';
import { formatDate, getBookingStatus } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { canManageBookings, canDeleteBookings } from '../../utils/accessControl';

interface RichBookingCardProps {
  booking: Booking;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function RichBookingCard({ booking, onClick, onEdit, onDelete }: RichBookingCardProps) {
  const { user } = useAuth();
  const { events, staffAssignments, workflows, clientPaymentRecords } = useAppData();

  const bookingEvents = events.filter(e => e.booking_id === booking.id);
  const bookingWorkflows = workflows.filter(w => bookingEvents.some(e => e.id === w.event_id));
  const status = getBookingStatus(bookingEvents, bookingWorkflows);

  const nextEvent = getNextEvent(bookingEvents);
  const staffCount = getUniqueStaffCount(bookingEvents, staffAssignments);
  const paymentStatus = calculatePaymentStatus(booking, clientPaymentRecords);
  const overallProgress = calculateOverallProgress(bookingWorkflows);

  const handleCardClick = () => {
    onClick();
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer relative group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Edit/Delete Icons */}
      {(canManageBookings(user) || canDeleteBookings(user)) && (
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canManageBookings(user) && (
            <button
              onClick={onEdit}
              className="p-1 hover:bg-gray-100 rounded text-lg"
              title="Edit"
            >
              ✏️
            </button>
          )}
          {canDeleteBookings(user) && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-gray-100 rounded text-lg"
              title="Delete"
            >
              🗑️
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-2xl">📸</span>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">
              {booking.client?.name || 'Unknown Client'}
            </h3>
            <p className="text-sm text-gray-600">
              {booking.booking_name || 'Unnamed Booking'}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-200 mb-3" />

      {/* Next Event Info */}
      {nextEvent && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
            <span>📅</span>
            <span className="font-medium">{nextEvent.event_name}</span>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            {formatDate(nextEvent.event_date)}
          </p>
          {bookingEvents.length > 1 && (
            <p className="text-xs text-blue-600 ml-6 mt-1">
              +{bookingEvents.length - 1} more event{bookingEvents.length > 2 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {!nextEvent && bookingEvents.length === 0 && (
        <p className="text-xs text-gray-500 mb-3">No events scheduled</p>
      )}

      {/* Staff Count */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <span>👥</span>
        <span>{staffCount} photographer{staffCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Payment Status */}
      <div className="flex items-center gap-2 text-sm mb-3">
        <span>💰</span>
        <span className={getPaymentStatusColor(paymentStatus)}>
          {paymentStatus.message}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Progress:</span>
          <span className="text-xs font-semibold text-gray-900">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor(overallProgress)}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex justify-center">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function getNextEvent(events: Event[]): Event | null {
  if (events.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const upcoming = events
    .filter(e => e.event_date >= todayString)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  return upcoming[0] || events[events.length - 1] || null;
}

function getUniqueStaffCount(events: Event[], staffAssignments: any[]): number {
  const staffIds = new Set<string>();
  events.forEach(event => {
    const eventAssignments = staffAssignments.filter(sa => sa.event_id === event.id);
    eventAssignments
      .filter(sa => sa.role === 'photographer' || sa.role === 'videographer')
      .forEach(sa => staffIds.add(sa.staff_id));
  });
  return staffIds.size;
}

function calculatePaymentStatus(booking: Booking, clientPaymentRecords: any[]) {
  const packageAmount = booking.package_amount || 0;
  const received = clientPaymentRecords
    .filter(p => p.booking_id === booking.id && p.payment_status === 'received')
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = packageAmount - received;

  let message = '';
  if (packageAmount === 0) message = 'No package amount';
  else if (outstanding === 0) message = 'Fully paid';
  else if (outstanding < 0) message = `Overpaid by ₹${Math.abs(outstanding).toLocaleString('en-IN')}`;
  else message = `₹${outstanding.toLocaleString('en-IN')} due`;

  return { packageAmount, received, outstanding, message };
}

function getPaymentStatusColor(status: { outstanding: number; packageAmount: number }): string {
  if (status.packageAmount === 0) return 'text-gray-500 font-medium';
  if (status.outstanding <= 0) return 'text-green-600 font-medium';
  if (status.outstanding < status.packageAmount * 0.3) return 'text-yellow-600 font-medium';
  return 'text-red-600 font-medium';
}

function calculateOverallProgress(workflows: any[]): number {
  if (workflows.length === 0) return 0;

  let totalCompleted = 0;
  let totalSteps = 0;

  workflows.forEach(workflow => {
    ['still_workflow', 'reel_workflow', 'video_workflow', 'portrait_workflow'].forEach(workflowType => {
      const wf = workflow[workflowType] || {};
      const steps = Object.values(wf);
      totalSteps += steps.length;
      totalCompleted += steps.filter((s: any) => s?.completed).length;
    });
  });

  return totalSteps > 0 ? Math.round((totalCompleted / totalSteps) * 100) : 0;
}

function getProgressColor(percentage: number): string {
  if (percentage === 0) return 'bg-gray-300';
  if (percentage < 30) return 'bg-blue-500';
  if (percentage < 60) return 'bg-orange-500';
  if (percentage < 100) return 'bg-yellow-500';
  return 'bg-green-500';
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
