import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

export function StaffPerformanceWidget() {
  const navigate = useNavigate();
  const { staff, events, staffAssignments } = useAppData();

  const staffWithMetrics = staff.map(member => {
    const memberEvents = events.filter(e => {
      const assignments = staffAssignments.filter(sa => sa.event_id === e.id);
      return assignments.some(sa => sa.staff_id === member.id);
    });

    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);

    const recentEvents = memberEvents.filter(e => {
      const date = new Date(e.event_date);
      return date >= lastMonth && date < today;
    }).length;

    const previousEvents = memberEvents.filter(e => {
      const date = new Date(e.event_date);
      return date >= twoMonthsAgo && date < lastMonth;
    }).length;

    const growthRate = previousEvents > 0
      ? ((recentEvents - previousEvents) / previousEvents) * 100
      : recentEvents * 100;

    return {
      id: member.id,
      name: member.name,
      eventsCompleted: memberEvents.length,
      recentEvents,
      rating: 4.8,
      growthRate
    };
  });

  staffWithMetrics.sort((a, b) => b.eventsCompleted - a.eventsCompleted);
  const topPerformer = staffWithMetrics[0];

  staffWithMetrics.sort((a, b) => b.growthRate - a.growthRate);
  const risingStar = staffWithMetrics[0];

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>⭐</span> Staff Performance
      </h3>

      {!topPerformer || topPerformer.eventsCompleted === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No staff performance data yet</p>
        </div>
      ) : (
        <>
          {/* Top Performer */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span>👑</span>
              <h4 className="text-sm font-semibold text-gray-700">Top Performer</h4>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-bold text-gray-900 text-lg">{topPerformer.name}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>{topPerformer.eventsCompleted} events</span>
                <span>{topPerformer.rating}⭐</span>
              </div>
            </div>
          </div>

          {/* Rising Star */}
          {risingStar && risingStar.recentEvents > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>📈</span>
                <h4 className="text-sm font-semibold text-gray-700">Rising Star</h4>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-bold text-gray-900 text-lg">{risingStar.name}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>{risingStar.recentEvents} events</span>
                  <span>{risingStar.rating}⭐</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/staff')}
            className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Staff →
          </button>
        </>
      )}
    </Card>
  );
}
