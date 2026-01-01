import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface AssignmentWithDetails {
  assignment_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  booking_name: string | null;
  client_name: string | null;
  staff_name: string;
  staff_role: string;
  data_received: boolean;
}

interface DataNotReceivedModalProps {
  onClose: () => void;
}

export function DataNotReceivedModal({ onClose }: DataNotReceivedModalProps) {
  const { user } = useAuth();
  const { refreshData } = useAppData();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPastAssignments();
  }, []);

  const fetchPastAssignments = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      const { data, error } = await supabase
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
          ),
          staff (
            id,
            name,
            role
          )
        `)
        .eq('data_received', false)
        .lt('events.event_date', todayString);

      if (error) throw error;

      const formattedAssignments: AssignmentWithDetails[] = (data || [])
        .map((item: any) => {
          if (!item.events || !item.staff) return null;

          return {
            assignment_id: item.id,
            event_id: item.event_id,
            event_name: item.events.event_name,
            event_date: item.events.event_date,
            booking_name: item.events.bookings?.booking_name || null,
            client_name: item.events.bookings?.clients?.name || null,
            staff_name: item.staff.name,
            staff_role: item.staff.role,
            data_received: item.data_received || false
          };
        })
        .filter((item): item is AssignmentWithDetails => item !== null)
        .sort((a, b) => b.event_date.localeCompare(a.event_date));

      setAssignments(formattedAssignments);
      setPendingChanges({});
    } catch (error) {
      console.error('Error fetching past assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = (assignmentId: string, currentStatus: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [assignmentId]: !currentStatus
    }));
  };

  const getCurrentStatus = (assignmentId: string, originalStatus: boolean) => {
    return pendingChanges.hasOwnProperty(assignmentId)
      ? pendingChanges[assignmentId]
      : originalStatus;
  };

  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) return;

    setSaving(true);
    try {
      const updatePromises = Object.entries(pendingChanges).map(([assignmentId, newStatus]) => {
        return supabase
          .from('staff_assignments')
          .update({
            data_received: newStatus,
            data_received_at: newStatus ? new Date().toISOString() : null,
            data_received_by: newStatus ? user?.id : null
          })
          .eq('id', assignmentId);
      });

      const results = await Promise.all(updatePromises);
      const hasErrors = results.some(result => result.error);

      if (hasErrors) {
        throw new Error('Some updates failed');
      }

      await refreshData();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(pendingChanges).length > 0) {
      const confirmDiscard = window.confirm(
        `You have ${Object.keys(pendingChanges).length} unsaved change(s). Are you sure you want to discard them?`
      );
      if (!confirmDiscard) return;
    }
    onClose();
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
      handleCancel();
    }
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-orange-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Data Not Received - Past Events
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600">
                {assignments.length} past event{assignments.length !== 1 ? 's have' : ' has'} not received data from staff
              </p>
              {hasChanges && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                  {Object.keys(pendingChanges).length} unsaved change{Object.keys(pendingChanges).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">✅</span>
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600">
                All past events have received data from staff
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Booking</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Event</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Staff Member</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Data Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignments.map((assignment) => {
                  const currentStatus = getCurrentStatus(assignment.assignment_id, assignment.data_received);

                  return (
                    <tr key={assignment.assignment_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {assignment.booking_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {assignment.event_name}
                        <div className="text-xs text-gray-500">{assignment.client_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {formatDate(assignment.event_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {assignment.staff_name}
                        <div className="text-xs text-gray-500 capitalize">{assignment.staff_role.replace('_', ' ')}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentStatus}
                            onChange={() => handleToggleChange(assignment.assignment_id, assignment.data_received)}
                            className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {currentStatus ? '✅ Received' : '⏳ Pending'}
                          </span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && assignments.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : hasChanges ? `Save Changes (${Object.keys(pendingChanges).length})` : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
