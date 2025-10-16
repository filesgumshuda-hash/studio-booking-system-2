import React from 'react';
import { Camera, Video, Plane, Scissors, Clipboard, User, Check } from 'lucide-react';
import { StaffAssignment } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

interface DataCollectionChecklistProps {
  eventId: string;
  staffAssignments: StaffAssignment[];
  onUpdate: () => void;
}

export function DataCollectionChecklist({
  eventId,
  staffAssignments,
  onUpdate,
}: DataCollectionChecklistProps) {
  const getRoleIcon = (role: string) => {
    const iconClass = "w-4 h-4";
    switch (role) {
      case 'photographer':
        return <Camera className={iconClass} />;
      case 'videographer':
        return <Video className={iconClass} />;
      case 'drone_operator':
        return <Plane className={iconClass} />;
      case 'editor':
        return <Scissors className={iconClass} />;
      case 'coordinator':
        return <Clipboard className={iconClass} />;
      default:
        return <User className={iconClass} />;
    }
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      photographer: 'Photographer',
      videographer: 'Videographer',
      drone_operator: 'Drone Operator',
      editor: 'Editor',
      coordinator: 'Coordinator',
      manager: 'Manager',
    };
    return labels[role] || role;
  };

  const getReceivedCount = (): number => {
    return staffAssignments.filter((staff) => staff.data_received).length;
  };

  const handleToggleDataReceived = async (assignmentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_assignments')
        .update({
          data_received: !currentStatus,
          data_received_at: !currentStatus ? new Date().toISOString() : null,
          data_received_by: !currentStatus ? 'Admin' : null,
        })
        .eq('id', assignmentId);

      if (error) throw error;
      await onUpdate();
    } catch (error: any) {
      console.error('Error updating data received status:', error);
    }
  };

  const receivedCount = getReceivedCount();
  const totalCount = staffAssignments.length;
  const allDataReceived = totalCount > 0 && receivedCount === totalCount;

  if (totalCount === 0) {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Data Received from Staff:
        </h4>
        <p className="text-sm text-gray-500 italic">No staff assigned yet</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">
        Data Received from Staff:
      </h4>

      <div className="space-y-2">
        {staffAssignments.map((assignment) => (
          <label
            key={assignment.id}
            className="flex items-center gap-3 py-2 px-2 cursor-pointer hover:bg-gray-100 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={assignment.data_received || false}
              onChange={() =>
                handleToggleDataReceived(assignment.id, assignment.data_received)
              }
              className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-2 focus:ring-green-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-gray-700">{getRoleIcon(assignment.role)}</span>
              <span className="text-sm font-medium text-gray-800">
                {assignment.staff?.name || 'Unknown'}
              </span>
              <span className="text-xs text-gray-500">
                ({getRoleLabel(assignment.role)})
              </span>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-300">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {receivedCount}/{totalCount} staff submitted data
          </span>
          {allDataReceived && (
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <Check className="w-4 h-4" />
              All data received
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
