import React, { useState } from 'react';
import { Edit, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Staff, useAppData } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';

interface StaffCardProps {
  staff: Staff;
  onEdit: (staff: Staff) => void;
}

export function StaffCard({ staff, onEdit }: StaffCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { events, staffAssignments } = useAppData();

  const assignments = staffAssignments.filter((sa) => sa.staff_id === staff.id);
  const assignedEvents = events
    .filter((e) => assignments.some((a) => a.event_id === e.id))
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const today = new Date();
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  const upcomingEvents = assignedEvents.filter(
    (e) => e.event_date >= todayString
  );

  return (
    <Card className="hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{staff.name}</h3>
            <StatusBadge status={staff.status === 'active' ? 'Active' : 'Inactive'} />
          </div>
          <p className="text-gray-600 mb-2 capitalize">{staff.role.replace('_', ' ')}</p>
          <p className="text-sm text-gray-500 mb-3">{staff.contact_number}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-700">
              {assignedEvents.length} event{assignedEvents.length !== 1 ? 's' : ''} assigned
            </span>
            {upcomingEvents.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                View Schedule
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>

          {expanded && upcomingEvents.length > 0 && (
            <div className="mt-4 space-y-2 border-t pt-3">
              <h4 className="font-semibold text-gray-900 mb-2">Upcoming Events:</h4>
              {upcomingEvents.map((event) => {
                const assignment = assignments.find((a) => a.event_id === event.id);
                return (
                  <div key={event.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{event.event_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(event.event_date)} • {event.venue}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">
                          Role: {assignment?.role.replace('_', ' ')}
                        </p>
                      </div>
                      <StatusBadge status={event.time_slot} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => onEdit(staff)}
          className="text-gray-600 hover:text-blue-600 transition-colors ml-4"
          title="Edit"
        >
          <Edit size={18} />
        </button>
      </div>
    </Card>
  );
}
