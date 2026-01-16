import { useState, useMemo } from 'react';
import { Booking, Event, ClientPaymentRecord, Expense } from '../../context/AppContext';

interface FinanceSummaryWidgetProps {
  bookings: Booking[];
  events: Event[];
  clientPaymentRecords: ClientPaymentRecord[];
  expenses: Expense[];
}

type TabType = 'active' | 'past' | 'all';
type TimeRangeType = 'this-month' | 'this-quarter' | 'this-year' | 'all-time';

function getBookingStatus(booking: Booking, allEvents: Event[]): 'active' | 'past' {
  const bookingEvents = allEvents.filter(e => e.booking_id === booking.id);
  if (bookingEvents.length === 0) return 'active';

  const lastEventDate = new Date(Math.max(...bookingEvents.map(e => new Date(e.event_date).getTime())));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastEventDate.setHours(0, 0, 0, 0);

  return lastEventDate < today ? 'past' : 'active';
}

function isInTimeRange(booking: Booking, allEvents: Event[], range: TimeRangeType): boolean {
  const bookingEvents = allEvents.filter(e => e.booking_id === booking.id);
  if (bookingEvents.length === 0) return false;

  const now = new Date();
  let startDate: Date, endDate: Date;

  if (range === 'this-month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (range === 'this-quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), quarter * 3, 1);
    endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  } else if (range === 'this-year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
  } else {
    return true;
  }

  return bookingEvents.some(e => {
    const eventDate = new Date(e.event_date);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

export function FinanceSummaryWidget({
  bookings,
  events,
  clientPaymentRecords,
  expenses,
}: FinanceSummaryWidgetProps) {
  const [tab, setTab] = useState<TabType>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeType>('all-time');

  const financeSummary = useMemo(() => {
    const filteredBookings = bookings.filter(b => {
      if (tab !== 'all' && getBookingStatus(b, events) !== tab) return false;
      if (!isInTimeRange(b, events, timeRange)) return false;
      return true;
    });

    const filteredBookingIds = new Set(filteredBookings.map(b => b.id));

    const filteredPayments = clientPaymentRecords.filter(p =>
      filteredBookingIds.has(p.booking_id)
    );

    const agreed = filteredPayments
      .filter(p => p.payment_status === 'agreed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const received = filteredPayments
      .filter(p => p.payment_status === 'received')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const now = new Date();
    let expenseStartDate: Date | null = null;
    let expenseEndDate: Date | null = null;

    if (timeRange === 'this-month') {
      expenseStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      expenseEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (timeRange === 'this-quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      expenseStartDate = new Date(now.getFullYear(), quarter * 3, 1);
      expenseEndDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    } else if (timeRange === 'this-year') {
      expenseStartDate = new Date(now.getFullYear(), 0, 1);
      expenseEndDate = new Date(now.getFullYear(), 11, 31);
    }

    const filteredExpenses = expenses.filter(e => {
      if (!expenseStartDate || !expenseEndDate) return true;
      const expDate = new Date(e.date);
      return expDate >= expenseStartDate && expDate <= expenseEndDate;
    });

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const outstanding = agreed - received;
    const profit = received - totalExpenses;

    return {
      agreed: Math.round(agreed),
      received: Math.round(received),
      expenses: Math.round(totalExpenses),
      outstanding: Math.round(outstanding),
      profit: Math.round(profit),
    };
  }, [bookings, events, clientPaymentRecords, expenses, tab, timeRange]);

  return (
    <div className="bg-white border rounded-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Finance Summary</h3>
        <div className="flex gap-1">
          <button
            type="button"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tab === 'active'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTab('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tab === 'past'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTab('past')}
          >
            Past
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setTab('all')}
          >
            All
          </button>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as TimeRangeType)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="this-month">This Month</option>
          <option value="this-quarter">This Quarter</option>
          <option value="this-year">This Year</option>
          <option value="all-time">All Time</option>
        </select>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Agreed</span>
          <span className="font-medium">₹{financeSummary.agreed.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Received</span>
          <span className="font-medium text-green-600">₹{financeSummary.received.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Expenses</span>
          <span className="font-medium text-red-600">₹{financeSummary.expenses.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Outstanding</span>
          <span className="font-medium text-orange-500">₹{financeSummary.outstanding.toLocaleString('en-IN')}</span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="text-gray-800 font-medium">Profit</span>
          <span className={`font-semibold ${financeSummary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{financeSummary.profit.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
