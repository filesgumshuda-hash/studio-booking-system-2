import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppContext';
import { detectConflicts, formatDate } from '../utils/helpers';
import { AlertTriangle, Wallet, Users, Receipt } from 'lucide-react';

function formatAmount(amount: number): string {
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString('en-IN');
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateString);
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

    const pendingTasks = workflows.reduce((count, w) => {
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

      return lastEventDate < today;
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
  }, [bookings, events, workflows, expenses, todayString]);

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
    const todayEvents = events.filter((e) => e.event_date === todayString).length;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartString = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;
    const weekEndString = `${weekEnd.getFullYear()}-${(weekEnd.getMonth() + 1).toString().padStart(2, '0')}-${weekEnd.getDate().toString().padStart(2, '0')}`;

    const thisWeekEvents = events.filter(
      (e) => e.event_date >= weekStartString && e.event_date <= weekEndString
    ).length;

    return {
      today: todayEvents,
      thisWeek: thisWeekEvents,
    };
  }, [events, todayString]);

  const recentActivity = useMemo(() => {
    const activities: Array<{ text: string; time: string; timestamp: Date }> = [];

    bookings
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .forEach((b) => {
        const client = clients.find((c) => c.id === b.client_id);
        activities.push({
          text: `New booking: ${client?.name || 'Unknown'} - ${b.booking_name || 'Unnamed'}`,
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
          text: `Event completed: ${client?.name || 'Unknown'} - ${e.event_name}`,
          time: formatDate(e.event_date),
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          <div
            className="bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => navigate('/bookings')}
          >
            <div className="text-xs text-gray-600 mb-2">Bookings</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.activeBookings}</div>
          </div>

          <div
            className="bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => navigate('/calendar')}
          >
            <div className="text-xs text-gray-600 mb-2">Events</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.eventsThisMonth}</div>
          </div>

          <div
            className="bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => navigate('/tracking')}
          >
            <div className="text-xs text-gray-600 mb-2">Tasks</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.pendingTasks}</div>
          </div>

          <div
            className="bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => navigate('/client-payments')}
          >
            <div
              className="text-xs text-gray-600 mb-2 cursor-help border-b border-dotted border-gray-400 inline-block"
              title="Number of bookings whose last event date has already passed"
            >
              Overdue
            </div>
            <div className="text-2xl font-semibold text-gray-900">{stats.overdueBookings}</div>
          </div>

          <div
            className="bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={() => navigate('/expenses')}
          >
            <div className="text-xs text-gray-600 mb-2">Expenses</div>
            <div className="text-2xl font-semibold text-red-600">
              ₹{formatAmount(stats.thisMonthExpenses)}
            </div>
          </div>
        </div>

        {staffShortages > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-5">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <span className="flex-1 text-sm text-amber-900 font-medium">
              {staffShortages} Staff Shortage{staffShortages > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => navigate('/calendar')}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              View Calendar →
            </button>
          </div>
        )}

        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-5">
          <div className="text-xs font-semibold text-gray-600 mb-3 tracking-wide">
            FINANCE SUMMARY
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex gap-2 text-sm">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-semibold text-gray-900">
                ₹{formatAmount(financeStats.revenue)}
              </span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-600">Expenses:</span>
              <span className="font-semibold text-red-600">
                ₹{formatAmount(financeStats.expenses)}
              </span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-600">Profit:</span>
              <span
                className={`font-semibold ${financeStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                ₹{formatAmount(financeStats.profit)}
              </span>
            </div>
            <div className="flex gap-2 text-sm">
              <span
                className="text-gray-600 cursor-help border-b border-dotted border-gray-400"
                title="Outstanding payments for bookings whose last event date has already passed"
              >
                Outstanding:
              </span>
              <span className="font-semibold text-gray-900">
                ₹{formatAmount(financeStats.outstanding)}
              </span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-gray-600">Staff Due:</span>
              <span className="font-semibold text-red-600">
                ₹{formatAmount(financeStats.staffDue)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <button
            onClick={() => navigate('/client-payments')}
            className="flex items-center gap-3 bg-white border-l-4 border-green-600 rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            <Wallet className="text-green-600 flex-shrink-0" size={20} />
            <span className="text-sm font-medium text-gray-900">Client Payments</span>
          </button>

          <button
            onClick={() => navigate('/staff-payments')}
            className="flex items-center gap-3 bg-white border-l-4 border-blue-600 rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            <Users className="text-blue-600 flex-shrink-0" size={20} />
            <span className="text-sm font-medium text-gray-900">Staff Payments</span>
          </button>

          <button
            onClick={() => navigate('/expenses')}
            className="flex items-center gap-3 bg-white border-l-4 border-red-600 rounded-lg p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
          >
            <Receipt className="text-red-600 flex-shrink-0" size={20} />
            <span className="text-sm font-medium text-gray-900">Expenses</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-gray-600 mb-2 tracking-wide">TODAY</div>
            <div className="text-lg font-semibold text-gray-900">
              {scheduleStats.today === 0 ? 'No events' : `${scheduleStats.today} events`}
            </div>
          </div>

          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-gray-600 mb-2 tracking-wide">THIS WEEK</div>
            <div className="text-lg font-semibold text-gray-900">
              {scheduleStats.thisWeek === 0 ? '0 events' : `${scheduleStats.thisWeek} events`}
            </div>
          </div>
        </div>

        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-600 tracking-wide">RECENT ACTIVITY</h3>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-300 last:border-b-0"
                >
                  <span className="text-sm text-gray-900">{activity.text}</span>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
