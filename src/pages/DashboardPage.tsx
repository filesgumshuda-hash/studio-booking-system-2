import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { detectConflicts, formatDate } from '../utils/helpers';
import { Plus, Calendar, DollarSign, Menu, X, LogOut, Users } from 'lucide-react';
import { FinanceSummaryWidget } from '../components/dashboard/FinanceSummaryWidget';
import { DataNotReceivedModal } from '../components/dashboard/DataNotReceivedModal';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { BookingForm } from '../components/bookings/BookingForm';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

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
  const { user, logout } = useAuth();
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [dataNotReceivedModalOpen, setDataNotReceivedModalOpen] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const { showToast, ToastComponent } = useToast();

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
  const conflictsCount = conflicts.length;

  const pendingDataCount = useMemo(() => {
    const todayForComparison = new Date();
    todayForComparison.setHours(0, 0, 0, 0);

    return staffAssignments.filter(assignment => {
      const event = events.find(e => e.id === assignment.event_id);
      if (!event) return false;

      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);

      return eventDate < todayForComparison && !(assignment as any).data_received;
    }).length;
  }, [staffAssignments, events]);

  const handleBookingFormSuccess = () => {
    setShowBookingForm(false);
    showToast('Booking created successfully', 'success');
  };

  const handleBookingFormCancel = () => {
    setShowBookingForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-40">
        <div>
          <div className="font-semibold text-gray-900">WedRing Studios</div>
          <div className="text-xs text-gray-500">{user?.name || 'User'}</div>
        </div>
        <button type="button" onClick={() => setMenuOpen(true)} className="p-2">
          <Menu size={24} />
        </button>
      </header>

      {/* Slide-out Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} className="p-2">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/staff');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Users size={20} />
                <span>Staff</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 rounded-lg transition-colors text-red-600"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 lg:px-6 lg:py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6 hidden md:block">Dashboard</h1>

        {/* Stats Row */}
        <div className="text-sm text-gray-700 mb-4 flex flex-wrap items-center gap-x-1">
          <button
            type="button"
            onClick={() => navigate('/tracking?filter=active')}
            className="hover:text-blue-600 transition-colors whitespace-nowrap"
          >
            Bookings <strong>{stats.activeBookings}</strong>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="hover:text-blue-600 transition-colors whitespace-nowrap"
          >
            Events <strong>{stats.eventsThisMonth}</strong>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => navigate('/tracking?filter=past')}
            className="hover:text-blue-600 transition-colors whitespace-nowrap"
          >
            Tasks <strong>{stats.pendingTasks}</strong>
          </button>
          {stats.overdueBookings > 0 && (
            <button
              type="button"
              onClick={() => navigate('/client-payments')}
              className="text-red-500 hover:text-red-700 transition-colors whitespace-nowrap"
            >
              Overdue <strong>{stats.overdueBookings}</strong> ⚠️
            </button>
          )}
        </div>

        {/* Conflicts Alert */}
        {conflictsCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/calendar?view=days&filter=conflicts')}
            className="w-full flex items-center gap-3 bg-red-50 border-l-4 border-red-400 rounded px-4 py-3 mb-4 hover:bg-red-100 transition-colors text-left"
          >
            <span className="text-sm text-red-800 flex-1">
              ⚠️ Double booking: {conflictsCount} conflict{conflictsCount > 1 ? 's' : ''} detected
            </span>
            <span className="text-sm text-blue-500">View calendar →</span>
          </button>
        )}

        {/* Staff Shortage Alert */}
        {staffShortages > 0 && (
          <button
            type="button"
            onClick={() => navigate('/calendar?view=days&filter=shortages')}
            className="w-full flex items-center gap-3 bg-yellow-50 border-l-4 border-yellow-400 rounded px-4 py-3 mb-4 hover:bg-yellow-100 transition-colors text-left"
          >
            <span className="text-sm text-yellow-800 flex-1">
              ⚠️ Staff shortage: {staffShortages} shift{staffShortages > 1 ? 's' : ''} uncovered
            </span>
            <span className="text-sm text-blue-500">View calendar →</span>
          </button>
        )}

        {/* Data Not Received Alert */}
        {pendingDataCount > 0 && (
          <button
            type="button"
            onClick={() => setDataNotReceivedModalOpen(true)}
            className="w-full flex items-center gap-3 bg-orange-50 border-l-4 border-orange-400 rounded px-4 py-3 mb-4 hover:bg-orange-100 transition-colors text-left"
          >
            <span className="text-sm text-orange-800 flex-1">
              ⚠️ Data pending: {pendingDataCount} staff member{pendingDataCount > 1 ? 's' : ''} haven't submitted data from past events
            </span>
            <span className="text-sm text-blue-500">Review →</span>
          </button>
        )}

        {/* Finance Summary */}
        <div className="space-y-4 mb-6">
          <FinanceSummaryWidget
            bookings={bookings}
            events={events}
            clientPaymentRecords={clientPaymentRecords}
            expenses={expenses}
          />

          {/* Agenda */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Agenda</h2>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Today</span>
                <span>{scheduleStats.today === 0 ? 'No events' : scheduleStats.today}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">This week</span>
                <span>{scheduleStats.thisWeek} events</span>
              </div>
              {scheduleStats.nextEvent && (
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Next</span>
                  <button
                    type="button"
                    onClick={() => navigate('/calendar')}
                    className="text-blue-500"
                  >
                    {formatCompactDate(scheduleStats.nextEvent.event_date)} · {scheduleStats.nextEvent.event_name}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Desktop Only */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowBookingForm(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <Plus size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">New Booking</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExpenseModal(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <DollarSign size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Add Expense</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/calendar?view=days')}
                className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
              >
                <Calendar size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Assign Staff</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-900">Recent Activity</span>
            <button type="button" className="text-xs text-blue-500">See all →</button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No recent activity</div>
          ) : (
            <div className="text-sm space-y-2">
              {recentActivity.slice(0, 3).map((activity, index) => (
                <div key={index} className="flex justify-between">
                  <span>
                    {activity.type === 'booking' ? '🆕' : '✅'} {activity.type === 'booking' ? 'Booking' : 'Event completed'} · {activity.text}
                  </span>
                  <span className="text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Not Received Modal */}
      {dataNotReceivedModalOpen && (
        <DataNotReceivedModal onClose={() => setDataNotReceivedModalOpen(false)} />
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {/* New Booking Modal */}
      <Modal
        isOpen={showBookingForm}
        onClose={handleBookingFormCancel}
        title="New Booking"
        size="full"
      >
        <BookingForm
          onSuccess={handleBookingFormSuccess}
          onCancel={handleBookingFormCancel}
        />
      </Modal>

      {ToastComponent}
    </div>
  );
}
