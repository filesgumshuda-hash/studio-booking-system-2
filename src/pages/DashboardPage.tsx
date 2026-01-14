import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Clipboard, DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { useAppData } from '../context/AppContext';
import { detectConflicts, formatDate, getBookingStatus, getWorkflowProgress } from '../utils/helpers';
import { FinancialOverviewWidget } from '../components/dashboard/FinancialOverviewWidget';
import { QuickStatsWidget } from '../components/dashboard/QuickStatsWidget';
import { RecentActivityWidget } from '../components/dashboard/RecentActivityWidget';
import { PaymentQuickAccess } from '../components/dashboard/PaymentQuickAccess';
import { DataNotReceivedModal } from '../components/dashboard/DataNotReceivedModal';
import { OverduePaymentsModal } from '../components/dashboard/OverduePaymentsModal';
import { ExpensesWidget } from '../components/dashboard/ExpensesWidget';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';

export function DashboardPage() {
  const navigate = useNavigate();
  const { bookings, events, clients, staff, staffAssignments, workflows, payments } = useAppData();
  const [showDataModal, setShowDataModal] = useState(false);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const today = new Date();
  const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  const stats = useMemo(() => {
    const activeBookingsCount = bookings.filter(b => {
      const bookingEvents = events.filter(e => e.booking_id === b.id);
      const hasUpcomingEvents = bookingEvents.some(e => e.event_date >= todayString);
      const bookingWorkflows = workflows.filter(w => bookingEvents.some(e => e.id === w.event_id));
      const hasActiveWorkflow = bookingWorkflows.some(w => {
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

    const eventsThisMonth = events.filter(e => e.event_date >= thisMonthStartString && e.event_date <= thisMonthEndString).length;

    const pendingTasks = workflows.reduce((count, w) => {
      const stillPending = Object.values(w.still_workflow || {}).filter((s: any) => !s?.completed).length;
      const reelPending = Object.values(w.reel_workflow || {}).filter((s: any) => !s?.completed).length;
      const videoPending = Object.values(w.video_workflow || {}).filter((s: any) => !s?.completed).length;
      const portraitPending = Object.values(w.portrait_workflow || {}).filter((s: any) => !s?.completed).length;
      return count + stillPending + reelPending + videoPending + portraitPending;
    }, 0);

    const overduePayments = payments.filter(p => {
      if (p.status === 'paid') return false;
      const event = events.find(e => e.id === p.event_id);
      if (!event) return false;
      const eventDate = new Date(event.event_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return eventDate < thirtyDaysAgo;
    });

    const overdueAmount = overduePayments.reduce((sum, p) => sum + (p.agreed_amount - p.amount_paid), 0);

    const dataNotReceivedCount = staffAssignments.filter(sa => {
      const event = events.find(e => e.id === sa.event_id);
      if (!event) return false;
      const isPastEvent = event.event_date < todayString;
      return isPastEvent && !(sa as any).data_received;
    }).length;

    return {
      activeBookings: activeBookingsCount,
      eventsThisMonth,
      pendingTasks,
      overduePayments: overduePayments.length,
      overdueAmount,
      dataNotReceived: dataNotReceivedCount,
    };
  }, [bookings, events, workflows, payments, staffAssignments, todayString]);

  const todaysEvents = useMemo(() => {
    return events
      .filter(e => e.event_date === todayString)
      .map(event => {
        const booking = bookings.find(b => b.id === event.booking_id);
        const client = clients.find(c => c.id === booking?.client_id);
        const eventAssignments = staffAssignments.filter(sa => sa.event_id === event.id);
        const assignedStaff = eventAssignments.map(sa => {
          const staffMember = staff.find(s => s.id === sa.staff_id);
          return staffMember?.name;
        }).filter(Boolean);
        return {
          ...event,
          clientName: client?.name || 'Unknown',
          assignedStaff,
        };
      });
  }, [events, bookings, clients, staff, staffAssignments, todayString]);

  const upcomingWeekEvents = useMemo(() => {
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const weekString = `${weekFromNow.getFullYear()}-${(weekFromNow.getMonth() + 1).toString().padStart(2, '0')}-${weekFromNow.getDate().toString().padStart(2, '0')}`;

    return events
      .filter(e => e.event_date >= todayString && e.event_date <= weekString)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 5)
      .map(event => {
        const booking = bookings.find(b => b.id === event.booking_id);
        const client = clients.find(c => c.id === booking?.client_id);
        return {
          ...event,
          clientName: client?.name || 'Unknown',
        };
      });
  }, [events, bookings, clients, todayString]);

  const { conflicts, shortages } = detectConflicts(events, staffAssignments, staff);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome to WedRing Studios Management System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/bookings')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Active Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeBookings}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Clipboard className="text-blue-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/calendar')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Events This Month</p>
                <p className="text-3xl font-bold text-gray-900">{stats.eventsThisMonth}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="text-green-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/tracking')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Pending Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingTasks}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setShowOverdueModal(true)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Overdue Payments</p>
                <p className="text-3xl font-bold text-gray-900">{stats.overduePayments}</p>
                {stats.overdueAmount > 0 && (
                  <p className="text-sm text-red-600 mt-1">₹{stats.overdueAmount.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <DollarSign className="text-red-600" size={24} />
              </div>
            </div>
          </Card>
        </div>

        {(conflicts.length > 0 || shortages.length > 0 || stats.dataNotReceived > 0) && (
          <div className="mb-8">
            <Card className="border-l-4 border-red-500">
              <div className="flex items-start gap-4">
                <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Scheduling Alerts</h3>
                  <div className="space-y-2">
                    {conflicts.length > 0 && (
                      <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="font-medium text-gray-900">{conflicts.length} Double Booking{conflicts.length > 1 ? 's' : ''}</span>
                          <span className="text-gray-600 text-sm">Same staff assigned to multiple events</span>
                        </div>
                        <Button variant="danger" size="sm" onClick={() => navigate('/calendar')}>
                          View Calendar
                        </Button>
                      </div>
                    )}
                    {shortages.length > 0 && (
                      <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          <span className="font-medium text-gray-900">{shortages.length} Staff Shortage{shortages.length > 1 ? 's' : ''}</span>
                          <span className="text-gray-600 text-sm">Events need more staff members</span>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/calendar')}>
                          View Calendar
                        </Button>
                      </div>
                    )}
                    {stats.dataNotReceived > 0 && (
                      <div className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                          <span className="font-medium text-gray-900">{stats.dataNotReceived} Data Not Received</span>
                          <span className="text-gray-600 text-sm">Past events missing staff data</span>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setShowDataModal(true)}>
                          View Details
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <PaymentQuickAccess onAddExpense={() => setShowExpenseModal(true)} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Today's Events</h3>
              <span className="text-sm text-gray-600">{todaysEvents.length} event{todaysEvents.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {todaysEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
                  <p>No events scheduled for today</p>
                </div>
              ) : (
                todaysEvents.map(event => (
                  <div key={event.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{event.clientName}</p>
                        <p className="text-sm text-gray-600">{event.event_name} • {event.venue}</p>
                      </div>
                      <StatusBadge status={event.time_slot} />
                    </div>
                    {event.assignedStaff.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Users size={14} />
                        <span>{event.assignedStaff.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">This Week's Schedule</h3>
              <Button variant="secondary" size="sm" onClick={() => navigate('/calendar')}>
                View Calendar
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingWeekEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="mx-auto mb-2" size={48} />
                  <p>No upcoming events this week</p>
                </div>
              ) : (
                upcomingWeekEvents.map(event => (
                  <div key={event.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{event.clientName}</p>
                        <p className="text-sm text-gray-600">{event.event_name} • {event.venue}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(event.event_date)}</p>
                      </div>
                      <StatusBadge status={event.time_slot} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/bookings')}>
            <div className="text-center py-6">
              <Clipboard className="mx-auto mb-3 text-gray-600" size={36} />
              <p className="text-lg font-semibold text-gray-900 mb-1">New Booking</p>
              <p className="text-sm text-gray-600">Create a new client booking</p>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/calendar')}>
            <div className="text-center py-6">
              <Calendar className="mx-auto mb-3 text-gray-600" size={36} />
              <p className="text-lg font-semibold text-gray-900 mb-1">View Calendar</p>
              <p className="text-sm text-gray-600">Check event schedule and conflicts</p>
            </div>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate('/staff')}>
            <div className="text-center py-6">
              <Users className="mx-auto mb-3 text-gray-600" size={36} />
              <p className="text-lg font-semibold text-gray-900 mb-1">Manage Staff</p>
              <p className="text-sm text-gray-600">View and assign team members</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <FinancialOverviewWidget />
          <QuickStatsWidget />
          <ExpensesWidget />
        </div>

        <div className="mb-8">
          <RecentActivityWidget />
        </div>
      </div>

      {showDataModal && <DataNotReceivedModal onClose={() => setShowDataModal(false)} />}
      {showOverdueModal && <OverduePaymentsModal onClose={() => setShowOverdueModal(false)} />}
      {showExpenseModal && <AddExpenseModal onClose={() => setShowExpenseModal(false)} />}
    </div>
  );
}
