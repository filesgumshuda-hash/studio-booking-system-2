import React from 'react';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

export function QuickStatsWidget() {
  const { bookings, events, clientPaymentRecords, staff } = useAppData();

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const stats = {
    bookings: bookings.filter(b => {
      const date = new Date(b.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length,

    events: events.filter(e => {
      const date = new Date(e.event_date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length,

    revenue: clientPaymentRecords
      .filter(p => {
        const date = new Date(p.payment_date);
        return p.payment_status === 'received' &&
               date.getMonth() === currentMonth &&
               date.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0),

    staffActive: staff.filter(s => s.status === 'active').length,

    completed: bookings.filter(b => {
      const workflows = b.events?.some(e => {
        const date = new Date(e.event_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      return workflows;
    }).length,
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>📊</span> This Month
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Bookings:</span>
          <span className="text-2xl font-bold text-gray-900">{stats.bookings}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Events:</span>
          <span className="text-2xl font-bold text-gray-900">{stats.events}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Revenue:</span>
          <span className="text-2xl font-bold text-green-600">
            ₹{stats.revenue.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Staff Active:</span>
          <span className="text-2xl font-bold text-gray-900">{stats.staffActive}</span>
        </div>

        <div className="h-px bg-gray-200" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <span className="text-sm text-gray-600">Completed:</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">{stats.completed}</span>
        </div>
      </div>
    </Card>
  );
}
