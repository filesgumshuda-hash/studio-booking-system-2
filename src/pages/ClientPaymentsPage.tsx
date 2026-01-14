import { useState, useMemo } from 'react';
import { useAppData, ClientPaymentRecord } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { Button } from '../components/common/Button';
import { ClientSummaryCard } from '../components/payments/ClientSummaryCard';
import { ClientDetailSection } from '../components/payments/ClientDetailSection';
import { AddClientPaymentForm, ClientPaymentFormData } from '../components/payments/AddClientPaymentForm';
import { AddExpenseModal } from '../components/expenses/AddExpenseModal';
import { Plus, Trash2 } from 'lucide-react';
import {
  getTop10Clients,
  calculateClientSummary,
  getClientBookings,
  getClientPayments,
  formatCurrency,
  formatDate,
} from '../utils/clientPaymentCalculations';

export function ClientPaymentsPage() {
  const { clients, bookings, events, clientPaymentRecords, expenses, dispatch } = useAppData();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
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

  const top10Clients = useMemo(() => {
    return getTop10Clients(clients, bookings, clientPaymentRecords);
  }, [clients, bookings, clientPaymentRecords]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [selectedClientId, clients]);

  const selectedClientSummary = useMemo(() => {
    if (!selectedClientId) return null;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return null;
    return calculateClientSummary(selectedClientId, client.name, bookings, clientPaymentRecords);
  }, [selectedClientId, clients, bookings, clientPaymentRecords]);

  const selectedClientBookingAmounts = useMemo(() => {
    if (!selectedClientId) return [];
    return getClientBookings(selectedClientId, bookings, events, clientPaymentRecords);
  }, [selectedClientId, bookings, events, clientPaymentRecords]);

  const selectedClientPaymentHistory = useMemo(() => {
    if (!selectedClientId) return [];
    return getClientPayments(selectedClientId, clientPaymentRecords, bookings);
  }, [selectedClientId, clientPaymentRecords, bookings]);

  const selectedClientExpenses = useMemo(() => {
    if (!selectedClientId) return [];
    const clientBookingIds = bookings
      .filter(b => b.client_id === selectedClientId)
      .map(b => b.id);
    return expenses.filter(e => e.booking_id && clientBookingIds.includes(e.booking_id));
  }, [selectedClientId, bookings, expenses]);

  const totalClientExpenses = useMemo(() => {
    return selectedClientExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [selectedClientExpenses]);

  const clientsWithBookings = useMemo(() => {
    return clients
      .filter((c) => bookings.some((b) => b.client_id === c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, bookings]);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Client Payments</h1>
          <Button
            type="button"
            onClick={() => {
              setShowAddPaymentModal(true);
            }}
            className="bg-gray-900 hover:bg-gray-800"
          >
            + New Payment
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Clients by Outstanding Balance</h2>
          {top10Clients.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">No client payment records yet. Add a payment to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {top10Clients.map((summary) => (
                <ClientSummaryCard
                  key={summary.clientId}
                  summary={summary}
                  onClick={() => handleClientSelect(summary.clientId)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <label htmlFor="clientSelect" className="block text-sm font-medium text-gray-700 mb-2">
            Search or Select Client:
          </label>
          <select
            id="clientSelect"
            value={selectedClientId || ''}
            onChange={(e) => handleClientSelect(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="">-- Select a client --</option>
            {clientsWithBookings.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.contact_number}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && selectedClientSummary && (
          <>
            <ClientDetailSection
              client={selectedClient}
              summary={selectedClientSummary}
              bookingAmounts={selectedClientBookingAmounts}
              paymentHistory={selectedClientPaymentHistory}
              onAddPayment={() => setShowAddPaymentModal(true)}
              onDeletePayment={handleDeletePayment}
            />

            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Expenses Incurred</h2>
                <Button
                  type="button"
                  onClick={() => setShowExpenseModal(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Plus size={18} />
                  Add Expense
                </Button>
              </div>

              {selectedClientExpenses.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No expenses recorded for this client</p>
              ) : (
                <>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Booking</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Description</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Method</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Amount</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedClientExpenses.map((expense) => {
                          const booking = bookings.find(b => b.id === expense.booking_id);
                          return (
                            <tr key={expense.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDate(expense.date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {booking?.booking_name || 'Unknown Booking'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                {expense.payment_method.replace('_', ' ')}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                {formatCurrency(expense.amount)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Delete expense"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={4} className="px-4 py-3 text-sm text-right text-gray-900">
                            Total Expenses:
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600 font-bold">
                            {formatCurrency(totalClientExpenses)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

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
            currentSummary={selectedClientSummary || undefined}
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

      {showExpenseModal && selectedClient && (
        <AddExpenseModal
          preSelectedBooking={null}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {ToastComponent}
    </div>
  );
}
