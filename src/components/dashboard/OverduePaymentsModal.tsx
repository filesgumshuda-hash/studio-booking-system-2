import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OverdueBooking {
  booking_id: string;
  booking_name: string;
  client_name: string;
  agreed: number;
  received: number;
  due: number;
  latest_event_date: string;
}

interface OverduePaymentsModalProps {
  onClose: () => void;
}

export function OverduePaymentsModal({ onClose }: OverduePaymentsModalProps) {
  const [timePeriod, setTimePeriod] = useState('6months');
  const [overdueBookings, setOverdueBookings] = useState<OverdueBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverduePayments();
  }, [timePeriod]);

  const fetchOverduePayments = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let startDate = new Date(today);
      switch (timePeriod) {
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      const startDateString = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`;
      const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_name,
          client_id,
          clients (
            id,
            name
          ),
          events (
            id,
            event_date
          )
        `);

      if (bookingsError) throw bookingsError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('client_payment_records')
        .select('*');

      if (paymentsError) throw paymentsError;

      const overdueList: OverdueBooking[] = [];

      for (const booking of bookingsData || []) {
        const events = booking.events || [];
        if (events.length === 0) continue;

        const latestEventDate = events.reduce((latest: string, event: any) => {
          return event.event_date > latest ? event.event_date : latest;
        }, events[0].event_date);

        if (latestEventDate >= todayString) continue;
        if (latestEventDate < startDateString) continue;

        const bookingPayments = (paymentsData || []).filter((p: any) => p.booking_id === booking.id);

        const agreed = bookingPayments
          .filter((p: any) => p.payment_status === 'agreed')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const received = bookingPayments
          .filter((p: any) => p.payment_status === 'received')
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        const due = agreed - received;

        if (due > 0) {
          overdueList.push({
            booking_id: booking.id,
            booking_name: booking.booking_name || 'Unnamed Booking',
            client_name: booking.clients?.name || 'Unknown Client',
            agreed,
            received,
            due,
            latest_event_date: latestEventDate
          });
        }
      }

      overdueList.sort((a, b) => b.due - a.due);

      setOverdueBookings(overdueList);
    } catch (error) {
      console.error('Error fetching overdue payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const totalOverdue = overdueBookings.reduce((sum, b) => sum + b.due, 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
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
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-red-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">💰</span>
              Overdue Payments
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Client payments with outstanding amounts
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700">Time Period:</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
            >
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last 1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex gap-8 p-4 bg-red-50 rounded-lg border border-red-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Overdue</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Clients</p>
              <p className="text-2xl font-bold text-gray-900">{overdueBookings.length}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : overdueBookings.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">✅</span>
              <h3 className="text-xl font-semibold text-green-600 mb-2">
                No Overdue Payments
              </h3>
              <p className="text-gray-600">
                All client payments are up to date for this period
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Booking</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Agreed</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Received</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {overdueBookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {booking.client_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.booking_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-right">
                      {formatCurrency(booking.agreed)}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium text-right">
                      {formatCurrency(booking.received)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600 font-bold text-right">
                      {formatCurrency(booking.due)}
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
