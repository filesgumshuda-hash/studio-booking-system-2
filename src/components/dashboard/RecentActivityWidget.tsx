import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

interface Activity {
  id: string;
  icon: string;
  message: string;
  timestamp: string;
  link?: string;
}

export function RecentActivityWidget() {
  const navigate = useNavigate();
  const { bookings, clientPaymentRecords, events, clients } = useAppData();

  const activities: Activity[] = [
    ...bookings.map(b => ({
      id: `booking-${b.id}`,
      icon: '📸',
      message: `New booking: ${b.client?.name || 'Unknown'} - ${b.booking_name || 'Unnamed'}`,
      timestamp: b.created_at,
      link: '/bookings'
    })),
    ...clientPaymentRecords
      .filter(p => p.payment_status === 'received')
      .map(p => {
        const client = clients.find(c => c.id === p.client_id);
        return {
          id: `payment-${p.id}`,
          icon: '✅',
          message: `Payment received: ${client?.name || 'Unknown'} - ₹${p.amount.toLocaleString('en-IN')}`,
          timestamp: p.payment_date,
          link: '/client-payments'
        };
      }),
    ...events
      .filter(e => {
        const date = new Date(e.event_date);
        return date < new Date();
      })
      .slice(0, 5)
      .map(e => {
        const booking = bookings.find(b => b.id === e.booking_id);
        const client = clients.find(c => c.id === booking?.client_id);
        return {
          id: `event-${e.id}`,
          icon: '📋',
          message: `Event completed: ${client?.name || 'Unknown'} - ${e.event_name}`,
          timestamp: e.event_date,
          link: '/tracking'
        };
      })
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const timeAgo = (timestamp: string): string => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>📋</span> Recent Activity
      </h3>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No recent activity</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl flex-shrink-0">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{timeAgo(activity.timestamp)}</p>
                  </div>
                </div>
                {activity.link && (
                  <button
                    onClick={() => navigate(activity.link!)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                  >
                    View →
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/bookings')}
            className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Activity →
          </button>
        </>
      )}
    </Card>
  );
}
