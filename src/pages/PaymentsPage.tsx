import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { SearchBar } from '../components/common/SearchBar';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { StaffPaymentCard } from '../components/payments/StaffPaymentCard';
import { AddPaymentModal } from '../components/payments/AddPaymentModal';
import { useAppData, Payment, StaffPaymentSummary } from '../context/AppContext';
import { groupPaymentsByStaff } from '../utils/paymentHelpers';

export function PaymentsPage() {
  const { payments, paymentTransactions, events, clients, bookings, refreshData } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>();
  const [selectedStaff, setSelectedStaff] = useState<StaffPaymentSummary | undefined>();
  const { showToast, ToastComponent } = useToast();

  const staffPaymentSummaries = useMemo(() => {
    return groupPaymentsByStaff(payments, paymentTransactions, events, clients);
  }, [payments, paymentTransactions, events, clients]);

  const filteredSummaries = useMemo(() => {
    let result = staffPaymentSummaries;

    if (filterStatus !== 'all') {
      result = result.filter((s) => s.overall_status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const staffMatch = s.staff_name.toLowerCase().includes(query);

        const paymentMatches = s.payment_records.some((p) => {
          if (p.is_non_event_payment) {
            return p.notes?.toLowerCase().includes(query);
          }

          const event = events.find((e) => e.id === p.event_id);
          const eventMatch = event?.event_name.toLowerCase().includes(query);

          const booking = event ? bookings.find((b) => b.id === event.booking_id) : null;
          const client = booking ? clients.find((c) => c.id === booking.client_id) : null;
          const clientMatch = client?.name.toLowerCase().includes(query);

          return eventMatch || clientMatch;
        });

        return staffMatch || paymentMatches;
      });
    }

    return result;
  }, [staffPaymentSummaries, searchQuery, filterStatus, events, clients, bookings]);

  const totalPending = staffPaymentSummaries.filter((s) => s.overall_status === 'pending').length;
  const totalPartial = staffPaymentSummaries.filter((s) => s.overall_status === 'partial').length;
  const totalPaid = staffPaymentSummaries.filter((s) => s.overall_status === 'paid').length;
  const totalOverdue = staffPaymentSummaries.filter((s) => s.overall_status === 'overdue').length;

  const handleAddPayment = (payment: Payment) => {
    setSelectedPayment(payment);
  };

  const handleEditStaff = (summary: StaffPaymentSummary) => {
    setSelectedStaff(summary);
  };

  const handleFormSuccess = async () => {
    await refreshData();
    setSelectedPayment(undefined);
    setSelectedStaff(undefined);
    showToast('Payment recorded successfully', 'success');
  };

  const handleFormCancel = () => {
    setSelectedPayment(undefined);
    setSelectedStaff(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
              <p className="text-gray-600 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{totalPending}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500">
              <p className="text-gray-600 text-sm font-medium">Partial</p>
              <p className="text-2xl font-bold text-yellow-600">{totalPartial}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-medium">Paid</p>
              <p className="text-2xl font-bold text-green-600">{totalPaid}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
              <p className="text-gray-600 text-sm font-medium">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search by staff name, event, or client..."
              onSearch={setSearchQuery}
              className="flex-1"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending ({totalPending})</option>
              <option value="partial">Partial ({totalPartial})</option>
              <option value="paid">Paid ({totalPaid})</option>
              <option value="overdue">Overdue ({totalOverdue})</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSummaries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery || filterStatus !== 'all'
                  ? 'No payments found matching your search or filter'
                  : 'No payment records found'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <p className="text-gray-400 text-sm mt-2">
                  Payment records will appear here once staff are assigned to events
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-2">
                Showing {filteredSummaries.length} staff member{filteredSummaries.length !== 1 ? 's' : ''}
              </div>
              {filteredSummaries.map((summary) => (
                <StaffPaymentCard
                  key={summary.staff_id}
                  summary={summary}
                  onEditStaff={handleEditStaff}
                  onAddPayment={handleAddPayment}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {selectedPayment && (
        <Modal
          isOpen={!!selectedPayment}
          onClose={handleFormCancel}
          title={`Add Payment for ${selectedPayment.staff?.name}`}
          size="lg"
        >
          <AddPaymentModal
            payment={selectedPayment}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Modal>
      )}

      {selectedStaff && (
        <Modal
          isOpen={!!selectedStaff}
          onClose={handleFormCancel}
          title={`Manage Payments for ${selectedStaff.staff_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Staff Payment Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Agreed</p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹{selectedStaff.total_agreed.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Paid</p>
                  <p className="text-xl font-bold text-green-600">
                    ₹{selectedStaff.total_paid.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Balance</p>
                  <p className={`text-xl font-bold ${selectedStaff.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{selectedStaff.total_balance.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {selectedStaff.payment_records.map((payment) => {
                const event = payment.event_id ? events.find((e) => e.id === payment.event_id) : null;
                const balanceDue = payment.agreed_amount - payment.amount_paid;

                return (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {payment.is_non_event_payment ? (
                          <h4 className="font-semibold text-gray-900">Non-Event Payment</h4>
                        ) : (
                          <h4 className="font-semibold text-gray-900">{event?.event_name}</h4>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          balanceDue === 0
                            ? 'bg-green-100 text-green-800'
                            : balanceDue < payment.agreed_amount
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {balanceDue === 0 ? 'Paid' : balanceDue < payment.agreed_amount ? 'Partial' : 'Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Agreed</p>
                        <p className="font-semibold">₹{payment.agreed_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Paid</p>
                        <p className="font-semibold text-green-600">₹{payment.amount_paid.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Balance</p>
                        <p className={`font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{balanceDue.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {balanceDue > 0 && (
                      <button
                        onClick={() => {
                          setSelectedStaff(undefined);
                          setSelectedPayment(payment);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Plus size={14} />
                        Add Payment
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={handleFormCancel}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {ToastComponent}
    </div>
  );
}
