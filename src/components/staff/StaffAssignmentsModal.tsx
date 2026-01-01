import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Staff, useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface AssignmentWithEvent {
  assignment_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  booking_name: string | null;
  client_name: string | null;
  data_received: boolean;
}

interface StaffAssignmentsModalProps {
  staff: Staff;
  onClose: () => void;
}

type DateFilter = 'next3months' | 'next6months' | 'past3months' | 'past6months' | 'all';

export function StaffAssignmentsModal({ staff, onClose }: StaffAssignmentsModalProps) {
  const { user } = useAuth();
  const { refreshData } = useAppData();
  const [assignments, setAssignments] = useState<AssignmentWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>('next3months');

  useEffect(() => {
    fetchAssignments();
  }, [staff.id]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_assignments')
        .select(`
          id,
          event_id,
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

      if (error) throw error;

      const formattedAssignments: AssignmentWithEvent[] = (data || [])
        .map((item: any) => {
          if (!item.events) return null;

          return {
            assignment_id: item.id,
            event_id: item.event_id,
            event_name: item.events.event_name,
            event_date: item.events.event_date,
            booking_name: item.events.bookings?.booking_name || null,
            client_name: item.events.bookings?.clients?.name || null,
            data_received: item.data_received || false
          };
        })
        .filter((item): item is AssignmentWithEvent => item !== null);

      setAssignments(formattedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
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

      case 'all':
      default:
        return assignments.sort((a, b) => a.event_date.localeCompare(b.event_date));
    }

    if (!startDate || !endDate) {
      return assignments.sort((a, b) => a.event_date.localeCompare(b.event_date));
    }

    return assignments
      .filter(assignment => {
        const [year, month, day] = assignment.event_date.split('-').map(Number);
        const eventDate = new Date(year, month - 1, day);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= startDate! && eventDate <= endDate!;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [assignments, dateFilter]);

  const receivedCount = filteredAssignments.filter(a => a.data_received).length;
  const pendingCount = filteredAssignments.length - receivedCount;

  const handleToggleDataReceived = async (assignmentId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;

    try {
      const { error } = await supabase
        .from('staff_assignments')
        .update({
          data_received: newStatus,
          data_received_at: newStatus ? new Date().toISOString() : null,
          data_received_by: newStatus ? user?.id : null
        })
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev =>
        prev.map(assignment =>
          assignment.assignment_id === assignmentId
            ? { ...assignment, data_received: newStatus }
            : assignment
        )
      );

      await refreshData();
    } catch (error) {
      console.error('Error updating data received status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Event Assignments - {staff.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Track data received from assigned events</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
            </select>
          </div>

          <div className="flex gap-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm">
              <span className="text-gray-600">Total:</span>{' '}
              <strong className="text-gray-900 text-lg">{filteredAssignments.length}</strong>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Received:</span>{' '}
              <strong className="text-green-600 text-lg">{receivedCount}</strong>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Pending:</span>{' '}
              <strong className="text-amber-600 text-lg">{pendingCount}</strong>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading events...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No events found in this date range
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Booking</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Event</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Data Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.assignment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {assignment.booking_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {assignment.event_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {assignment.client_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatDate(assignment.event_date)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignment.data_received}
                          onChange={() =>
                            handleToggleDataReceived(
                              assignment.assignment_id,
                              assignment.data_received
                            )
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${
                          assignment.data_received
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}>
                          {assignment.data_received ? '✅ Received' : '⏳ Not Received'}
                        </span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
