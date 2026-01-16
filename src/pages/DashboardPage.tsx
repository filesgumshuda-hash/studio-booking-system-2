import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppContext';
import { detectConflicts, formatDate } from '../utils/helpers';
import { Plus, Calendar, DollarSign } from 'lucide-react';
import { FinanceSummaryWidget } from '../components/dashboard/FinanceSummaryWidget';

function formatAmount(amount: number): string {
  if (amount >= 100000) {
    return `${Math.round(amount / 100000)}L`;
  } else if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`;
  }
  return Math.round(amount).toLocaleString('en-IN');
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return '—';

  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  try {
    return formatDate(dateString);
  } catch {
    return '—';
  }
}

function formatCompactDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    bookings,
    events,
    clients,
    staff,
    staffAssignments,
    workflows,
    clientPaymentRecords,
    expenses,
    staffPayments,
  } = useAppData();

  const today = new Date();
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const stats = useMemo(() => {
    const activeBookingsCount = bookings.filter((b) => {
      const bookingEvents = events.filter((e) => e.booking_id === b.id);
      const hasUpcomingEvents = bookingEvents.some((e) => e.event_date >= todayString);
      const bookingWorkflows = workflows.filter((w) =>
        bookingEvents.some((e) => e.id === w.event_id)
      );
      const hasActiveWorkflow = bookingWorkflows.some((w) => {
        const allDelivered =
          w.still_workflow?.deliveredToClient?.completed &&
          w.reel_workflow?.reelDelivered?.completed &&
          w.video_workflow?.videoDelivered?.completed &&
          w.portrait_workflow?.portraitDelivered?.completed;
        return !allDelivered;
      });
      return hasUpcomingEvents || hasActiveWorkflow;
    }).length;

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const thisMonthStartString = `${thisMonthStart.getFullYear()}-${(thisMonthStart.getMonth() + 1).toString().padStart(2, '0')}-01`;
    const thisMonthEndString = `${thisMonthEnd.getFullYear()}-${(thisMonthEnd.getMonth() + 1).toString().padStart(2, '0')}-${thisMonthEnd.getDate().toString().padStart(2, '0')}`;

    const eventsThisMonth = events.filter(
      (e) => e.event_date >= thisMonthStartString && e.event_date <= thisMonthEndString
    ).length;

    const todayForComparison = new Date();
    todayForComparison.setHours(0, 0, 0, 0);

    const pendingTasks = workflows.reduce((count, w) => {
      const booking = bookings.find(b => b.id === w.booking_id);
      if (!booking) return count;

      const bookingEvents = events.filter(e => e.booking_id === booking.id);
      if (bookingEvents.length === 0) return count;

      const allEventsPassed = bookingEvents.every(e => new Date(e.event_date) < todayForComparison);
      if (!allEventsPassed) return count;

      const stillPending = Object.values(w.still_workflow || {}).filter(
        (s: any) => !s?.completed && !s?.notApplicable
      ).length;
      const reelPending = Object.values(w.reel_workflow || {}).filter(
        (s: any) => !s?.completed && !s?.notApplicable
      ).length;
      const videoPending = Object.values(w.video_workflow || {}).filter(
        (s: any) => !s?.completed && !s?.notApplicable
      ).length;
      const portraitPending = Object.values(w.portrait_workflow || {}).filter(
        (s: any) => !s?.completed && !s?.notApplicable
      ).length;
      return count + stillPending + reelPending + videoPending + portraitPending;
    }, 0);

    const overdueBookings = bookings.filter((b) => {
      const bookingEvents = events.filter(e => e.booking_id === b.id);
      if (bookingEvents.length === 0) return false;

      const sortedEvents = bookingEvents.sort((a, b) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      );
      const lastEvent = sortedEvents[0];
      const lastEventDate = new Date(lastEvent.event_date);
      lastEventDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastEventDate >= today) return false;

      const bookingPayments = clientPaymentRecords.filter((p) => p.booking_id === b.id);
      const agreed = bookingPayments
        .filter((p) => p.payment_status === 'agreed')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const received = bookingPayments
        .filter((p) => p.payment_status === 'received')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const due = agreed - received;

      return due > 0;
    }).length;

    const thisMonthExpenses = expenses
      .filter((e) => {
        const expDate = new Date(e.date);
        return (
          expDate.getMonth() === today.getMonth() &&
          expDate.getFullYear() === today.getFullYear()
        );
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      activeBookings: activeBookingsCount,
      eventsThisMonth,
      pendingTasks,
      overdueBookings,
      thisMonthExpenses,
    };
  }, [bookings, events, workflows, expenses, clientPaymentRecords, todayString]);

  const financeStats = useMemo(() => {
    const totalRevenue = clientPaymentRecords
      .filter((p) => p.payment_status === 'received')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    const outstanding = clientPaymentRecords
      .filter((p) => {
        if (p.payment_status !== 'agreed') return false;

        const booking = bookings.find(b => b.id === p.booking_id);
        if (!booking) return false;

        const bookingEvents = events.filter(e => e.booking_id === booking.id);
        if (bookingEvents.length === 0) return false;

        const sortedEvents = bookingEvents.sort((a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        );
        const lastEvent = sortedEvents[0];
        const lastEventDate = new Date(lastEvent.event_date);
        lastEventDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return lastEventDate < today;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const staffDue = staffPayments
      .filter((sp) => sp.status === 'agreed')
      .reduce((sum, sp) => sum + sp.amount, 0);

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: netProfit,
      outstanding,
      staffDue,
    };
  }, [clientPaymentRecords, expenses, staffPayments, bookings, events]);

  const scheduleStats = useMemo(() => {
    const todayEvents = events.filter((e) => e.event_date === todayString);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartString = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;
    const weekEndString = `${weekEnd.getFullYear()}-${(weekEnd.getMonth() + 1).toString().padStart(2, '0')}-${weekEnd.getDate().toString().padStart(2, '0')}`;

    const thisWeekEvents = events.filter(
      (e) => e.event_date >= weekStartString && e.event_date <= weekEndString
    );

    const upcomingEvents = events
      .filter((e) => e.event_date >= todayString)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

    return {
      today: todayEvents.length,
      thisWeek: thisWeekEvents.length,
      nextEvent,
    };
  }, [events, todayString]);

  const recentActivity = useMemo(() => {
    const activities: Array<{ type: 'booking' | 'event'; text: string; time: string; timestamp: Date }> = [];

    bookings
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .forEach((b) => {
        const client = clients.find((c) => c.id === b.client_id);
        activities.push({
          type: 'booking',
          text: `${client?.name || 'Unknown'}${b.booking_name ? ` · ${b.booking_name}` : ''}`,
          time: getRelativeTime(b.created_at),
          timestamp: new Date(b.created_at),
        });
      });

    events
      .filter((e) => e.event_date < todayString)
      .slice()
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
      .slice(0, 2)
      .forEach((e) => {
        const booking = bookings.find((b) => b.id === e.booking_id);
        const client = clients.find((c) => c.id === booking?.client_id);
        activities.push({
          type: 'event',
          text: `${e.event_name}${client ? ` · ${client.name}` : ''}`,
          time: formatCompactDate(e.event_date),
          timestamp: new Date(e.event_date),
        });
      });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }, [bookings, events, clients, todayString]);

  const { conflicts, shortages } = detectConflicts(events, staffAssignments, staff);
  const staffShortages = shortages.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

        {/* KPI Strip with Profit */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              onClick={() => navigate('/bookings')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm">Bookings</span>{' '}
              <span className="text-lg font-semibold text-gray-900">{stats.activeBookings}</span>
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => navigate('/calendar')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm">Events</span>{' '}
              <span className="text-lg font-semibold text-gray-900">{stats.eventsThisMonth}</span>
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => navigate('/tracking?filter=past')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm">Tasks</span>{' '}
              <span className="text-lg font-semibold text-gray-900">{stats.pendingTasks}</span>
            </button>
            {stats.overdueBookings > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => navigate('/client-payments')}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span className="text-sm">Overdue</span>{' '}
                  <span className="text-lg font-semibold text-amber-600">{stats.overdueBookings}</span>{' '}
                  <span className="text-amber-500">⚠</span>
                </button>
              </>
            )}
            <span className="text-gray-300">·</span>
            <button
              onClick={() => navigate('/expenses')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm">Expenses</span>{' '}
              <span className="text-lg font-semibold text-red-600">₹{formatAmount(stats.thisMonthExpenses)}</span>{' '}
              <span className="text-red-500">🔴</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">PROFIT</span>
            <span className={`text-2xl font-bold ${financeStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{formatAmount(financeStats.profit)}
            </span>
            {financeStats.profit >= 0 && <span className="text-green-500">🟢</span>}
          </div>
        </div>


        {/* Staff Shortage Alert */}
        {staffShortages > 0 && (
          <button
            onClick={() => navigate('/calendar')}
            className="w-full flex items-center gap-3 bg-amber-50 border-l-4 border-amber-400 rounded px-4 py-2.5 mb-6 hover:bg-amber-100 transition-colors text-left"
          >
            <span className="text-amber-500">⚠</span>
            <span className="flex-1 text-sm text-amber-900">
              Staff shortage: {staffShortages} shift{staffShortages > 1 ? 's' : ''} uncovered
            </span>
            <span className="text-sm text-amber-700">View calendar →</span>
          </button>
        )}

        {/* Finance Summary and Agenda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Finance Summary Widget */}
          <FinanceSummaryWidget
            bookings={bookings}
            events={events}
            clientPaymentRecords={clientPaymentRecords}
            expenses={expenses}
          />

          {/* Agenda */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-medium text-gray-900 mb-4">Agenda</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Today:</span>
                <span className="font-medium text-gray-900">
                  {scheduleStats.today === 0 ? 'No events' : `${scheduleStats.today} event${scheduleStats.today > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">This week:</span>
                <span className="font-medium text-gray-900">
                  {scheduleStats.thisWeek} event{scheduleStats.thisWeek !== 1 ? 's' : ''}
                </span>
              </div>
              {scheduleStats.nextEvent && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">Next:</div>
                  <button
                    type="button"
                    onClick={() => navigate('/calendar')}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {formatCompactDate(scheduleStats.nextEvent.event_date)} · {scheduleStats.nextEvent.event_name}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate('/bookings')}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <Plus size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">New Booking</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <DollarSign size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Add Expense</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <Calendar size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Assign Staff</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-medium text-gray-900 mb-4">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No recent activity</div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-sm flex-shrink-0">
                      {activity.type === 'booking' ? '🆕' : '✅'}
                    </span>
                    <span className="text-sm text-gray-600 flex-shrink-0">
                      {activity.type === 'booking' ? 'Booking' : 'Event completed'}
                    </span>
                    <span className="text-sm text-gray-300 flex-shrink-0">·</span>
                    <span className="text-sm text-gray-900 truncate">{activity.text}</span>
                  </div>
                  <span className="text-sm text-gray-500 ml-4 flex-shrink-0">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
