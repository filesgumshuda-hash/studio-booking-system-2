import { useState, useMemo, Fragment } from 'react';
import { useAppData, ClientPaymentRecord } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { Button } from '../components/common/Button';
import { ClientDetailModal } from '../components/payments/ClientDetailModal';
import { AddClientPaymentForm, ClientPaymentFormData } from '../components/payments/AddClientPaymentForm';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { AddStaffPaymentModal } from '../components/payments/AddStaffPaymentModal';
import { Plus, Trash2, Search, AlertTriangle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  formatCurrency,
  formatDate,
} from '../utils/clientPaymentCalculations';

export function ClientPaymentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clients, bookings, events, clientPaymentRecords, expenses, staffPaymentRecords, staff, dispatch } = useAppData();

  const urlParams = new URLSearchParams(location.search);
  const urlStatus = urlParams.get('status');

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showStaffPaymentModal, setShowStaffPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(urlStatus || 'all');
  const [clientFilter, setClientFilter] = useState('all');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    paymentId: string;
    payment: ClientPaymentRecord | null;
  }>({
    isOpen: false,
    paymentId: '',
    payment: null,
  });
  const { showToast, ToastComponent } = useToast();

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [selectedClientId, clients]);

  const clientsWithBookings = useMemo(() => {
    return clients
      .filter((c) => bookings.some((b) => b.client_id === c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, bookings]);

  const getLastEventDate = (bookingId: string): Date | null => {
    const bookingEvents = events.filter(e => e.booking_id === bookingId);
    if (bookingEvents.length === 0) return null;

    const lastEventDate = new Date(
      Math.max(...bookingEvents.map(e => new Date(e.event_date).getTime()))
    );
    return lastEventDate;
  };

  const getDaysOverdue = (bookingId: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastEventDate = getLastEventDate(bookingId);
    if (!lastEventDate) return 0;

    lastEventDate.setHours(0, 0, 0, 0);
    const diff = today.getTime() - lastEventDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const filteredPayments = useMemo(() => {
    let filtered = [...clientPaymentRecords];

    filtered = filtered.filter((payment, index, self) =>
      index === self.findIndex(p => p.id === payment.id)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        const client = clients.find((c) => c.id === p.client_id);
        const booking = bookings.find((b) => b.id === p.booking_id);
        return (
          client?.name.toLowerCase().includes(query) ||
          booking?.booking_name?.toLowerCase().includes(query) ||
          client?.contact_number?.includes(query)
        );
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (statusFilter === 'overdue') {
      filtered = filtered.filter((p) => {
        if (p.payment_status !== 'agreed') return false;

        const lastEventDate = getLastEventDate(p.booking_id);
        if (!lastEventDate) return false;

        lastEventDate.setHours(0, 0, 0, 0);
        return lastEventDate < today;
      });
    } else if (statusFilter === 'agreed') {
      filtered = filtered.filter((p) => p.payment_status === 'agreed');
    } else if (statusFilter === 'received') {
      filtered = filtered.filter((p) => p.payment_status === 'received');
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter((p) => p.client_id === clientFilter);
    }

    if (bookingFilter !== 'all') {
      filtered = filtered.filter((p) => p.booking_id === bookingFilter);
    }

    return filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [clientPaymentRecords, searchQuery, statusFilter, clientFilter, bookingFilter, clients, bookings]);

  const overduePayments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredPayments.filter((p) => {
      if (p.payment_status !== 'agreed') return false;

      const lastEventDate = getLastEventDate(p.booking_id);
      if (!lastEventDate) return false;

      lastEventDate.setHours(0, 0, 0, 0);
      return lastEventDate < today;
    });
  }, [filteredPayments, events]);

  const overdueTotal = useMemo(() => {
    return overduePayments.reduce((sum, p) => sum + p.amount, 0);
  }, [overduePayments]);

  const hasActiveFilters = statusFilter !== 'all' || clientFilter !== 'all' || bookingFilter !== 'all' || searchQuery !== '';

  const totalOutstanding = useMemo(() => {
    return filteredPayments
      .filter(p => p.payment_status === 'agreed')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const getClientOutstanding = (clientId: string): number => {
    return clientPaymentRecords
      .filter(p => p.client_id === clientId && p.payment_status === 'agreed')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setClientFilter('all');
    setBookingFilter('all');
    navigate('/client-payments');
  };

  const handleClientRowClick = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowClientDetailModal(true);
  };

  const handleAddPayment = async (formData: ClientPaymentFormData) => {
    try {
      const { data, error } = await supabase
        .from('client_payment_records')
        .insert({
          client_id: formData.clientId,
          booking_id: formData.bookingId,
          amount: formData.amount,
          payment_date: formData.paymentDate,
          payment_method: formData.paymentMethod ? formData.paymentMethod : null,
          payment_status: formData.paymentStatus,
          transaction_ref: formData.transactionRef ? formData.transactionRef : null,
          remarks: formData.remarks ? formData.remarks : null,
        })
        .select('*, client:clients(*), booking:bookings(*)')
        .single();

      if (error) throw error;

      dispatch({ type: 'ADD_CLIENT_PAYMENT_RECORD', payload: data });
      setShowAddPaymentModal(false);
      setSelectedClientId(formData.clientId);
      showToast('Payment recorded successfully', 'success');
    } catch (error: any) {
      console.error('Error adding payment:', error);
      showToast(error.message || 'Failed to add payment', 'error');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const payment = clientPaymentRecords.find((p) => p.id === paymentId);
    if (!payment) return;

    setDeleteConfirmation({
      isOpen: true,
      paymentId,
      payment,
    });
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('client_payment_records')
        .delete()
        .eq('id', deleteConfirmation.paymentId);

      if (error) throw error;

      dispatch({ type: 'DELETE_CLIENT_PAYMENT_RECORD', payload: deleteConfirmation.paymentId });
      setDeleteConfirmation({ isOpen: false, paymentId: '', payment: null });
      showToast('Payment deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;

      dispatch({ type: 'DELETE_EXPENSE', payload: expenseId });
      showToast('Expense deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      showToast(error.message || 'Failed to delete expense', 'error');
    }
  };

  const handleAddStaffPayment = async (staffPaymentData: any) => {
    try {
      const { data, error } = await supabase
        .from('staff_payment_records')
        .insert(staffPaymentData)
        .select('*, event:events(*), staff:staff(*)')
        .single();

      if (error) throw error;

      dispatch({ type: 'ADD_STAFF_PAYMENT_RECORD', payload: data });
      showToast('Staff payment added successfully', 'success');
    } catch (error: any) {
      console.error('Error adding staff payment:', error);
      showToast(error.message || 'Failed to add staff payment', 'error');
      throw error;
    }
  };

  const handleDeleteStaffPayment = async (staffPaymentId: string) => {
    if (!confirm('Are you sure you want to delete this staff payment?')) return;

    try {
      const { error } = await supabase.from('staff_payment_records').delete().eq('id', staffPaymentId);
      if (error) throw error;

      dispatch({ type: 'DELETE_STAFF_PAYMENT_RECORD', payload: staffPaymentId });
      showToast('Staff payment deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting staff payment:', error);
      showToast(error.message || 'Failed to delete staff payment', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Client Payments</h1>
          <Button
            type="button"
            onClick={() => {
              setSelectedClientId(null);
              setShowAddPaymentModal(true);
            }}
            className="bg-gray-900 hover:bg-gray-800"
          >
            + New Payment
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by client name, booking, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
          >
            <option value="all">All Status</option>
            <option value="overdue">Overdue</option>
            <option value="agreed">Agreed</option>
            <option value="received">Received</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm min-w-[200px]"
          >
            <option value="all">All Clients</option>
            {clientsWithBookings.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={bookingFilter}
            onChange={(e) => setBookingFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm min-w-[200px]"
          >
            <option value="all">All Bookings</option>
            {bookings.map((b) => {
              const client = clients.find((c) => c.id === b.client_id);
              return (
                <option key={b.id} value={b.id}>
                  {client?.name} - {b.booking_name || 'Unnamed Booking'}
                </option>
              );
            })}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Clear Filters
            </button>
          )}
        </div>

        {statusFilter === 'overdue' && overduePayments.length > 0 && (
          <div className="mb-6 flex items-center gap-3 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
            <span className="flex-1 text-sm text-amber-900 font-medium">
              {overduePayments.length} overdue payment(s) • Total: {formatCurrency(overdueTotal)}
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className="text-sm text-amber-900 hover:underline font-medium"
            >
              Clear
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Event</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Outstanding</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      No payments found matching filters
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => {
                    const client = clients.find((c) => c.id === payment.client_id);
                    const booking = bookings.find((b) => b.id === payment.booking_id);
                    const lastEventDate = getLastEventDate(payment.booking_id);
                    const daysOverdue = getDaysOverdue(payment.booking_id);
                    const isOverdue = payment.payment_status === 'agreed' && daysOverdue > 0;
                    const clientOutstanding = getClientOutstanding(payment.client_id);

                    return (
                      <Fragment key={payment.id}>
                        <tr
                          onClick={() => handleClientRowClick(payment.client_id)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{client?.name}</div>
                            <div className="text-xs text-gray-500">{client?.contact_number}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{booking?.booking_name || 'Unnamed'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(payment.payment_date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {lastEventDate ? formatDate(lastEventDate.toISOString()) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-600">
                            {formatCurrency(clientOutstanding)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                payment.payment_status === 'received'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {payment.payment_status === 'received' ? 'Received' : 'Agreed'}
                            </span>
                          </td>
                        </tr>
                        {isOverdue && (
                          <tr className="bg-amber-50">
                            <td colSpan={7} className="px-4 py-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-900">
                                  <AlertTriangle size={14} />
                                  <span className="text-xs font-medium">{daysOverdue} days overdue (since last event)</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredPayments.length > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t-2 border-gray-200 flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Total: {filteredPayments.length} payment(s)</span>
              <span>Total Outstanding: <span className="text-red-600 font-semibold">{formatCurrency(totalOutstanding)}</span></span>
            </div>
          )}
        </div>
      </div>

      {showClientDetailModal && selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => {
            setShowClientDetailModal(false);
            setSelectedClientId(null);
          }}
          onAddPayment={() => setShowAddPaymentModal(true)}
          onAddExpense={() => setShowExpenseModal(true)}
          onAddStaffPayment={() => setShowStaffPaymentModal(true)}
          onDeletePayment={handleDeletePayment}
          onDeleteExpense={handleDeleteExpense}
          onDeleteStaffPayment={handleDeleteStaffPayment}
        />
      )}

      {showAddPaymentModal && (
        <Modal
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          title={`Add Payment${selectedClient ? ` from ${selectedClient.name}` : ''}`}
          size="md"
        >
          <AddClientPaymentForm
            client={selectedClient || undefined}
            clients={clients}
            bookings={bookings}
            clientPayments={clientPaymentRecords}
            currentSummary={undefined}
            onSubmit={handleAddPayment}
            onCancel={() => setShowAddPaymentModal(false)}
          />
        </Modal>
      )}

      {deleteConfirmation.isOpen && deleteConfirmation.payment && (
        <ConfirmDialog
          isOpen={deleteConfirmation.isOpen}
          title="Delete Payment?"
          message={
            <div className="space-y-2">
              <p>Are you sure you want to delete this payment record?</p>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <div>
                  <span className="font-medium">Date:</span> {formatDate(deleteConfirmation.payment.payment_date)}
                </div>
                <div>
                  <span className="font-medium">Amount:</span>{' '}
                  {formatCurrency(Number(deleteConfirmation.payment.amount))}
                </div>
                <div>
                  <span className="font-medium">Method:</span>{' '}
                  {deleteConfirmation.payment.payment_method
                    ? deleteConfirmation.payment.payment_method.replace('_', ' ')
                    : 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      deleteConfirmation.payment.payment_status === 'received'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {deleteConfirmation.payment.payment_status === 'received' ? 'Received' : 'Agreed'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Booking:</span>{' '}
                  {deleteConfirmation.payment.booking?.booking_name || 'Unknown Booking'}
                </div>
                {deleteConfirmation.payment.remarks && (
                  <div>
                    <span className="font-medium">Remarks:</span> {deleteConfirmation.payment.remarks}
                  </div>
                )}
              </div>
              <p className="text-red-600 font-medium">This action cannot be undone.</p>
            </div>
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmation({ isOpen: false, paymentId: '', payment: null })}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

      {showExpenseModal && (
        <AddExpenseModal
          preSelectedBooking={null}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {showStaffPaymentModal && selectedClientId && (
        <AddStaffPaymentModal
          clientBookings={bookings.filter(b => b.client_id === selectedClientId)}
          onClose={() => setShowStaffPaymentModal(false)}
          onSave={handleAddStaffPayment}
        />
      )}

      {ToastComponent}
    </div>
  );
}
