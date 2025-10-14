import React, { useState, useMemo } from 'react';
import { SearchBar } from '../components/common/SearchBar';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { PaymentCard } from '../components/payments/PaymentCard';
import { PaymentForm } from '../components/payments/PaymentForm';
import { useAppData, Payment } from '../context/AppContext';

export function PaymentsPage() {
  const { payments, refreshData } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const { showToast, ToastComponent } = useToast();

  const filteredPayments = useMemo(() => {
    let result = payments;

    if (filterStatus !== 'all') {
      result = result.filter((p) => p.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const staffMatch = p.staff?.name.toLowerCase().includes(query);
        const roleMatch = p.role.toLowerCase().includes(query);
        const eventMatch = p.event?.event_name.toLowerCase().includes(query);
        return staffMatch || roleMatch || eventMatch;
      });
    }

    return result.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (a.status !== 'overdue' && b.status === 'overdue') return 1;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [payments, searchQuery, filterStatus]);

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
  };

  const handleFormSuccess = async () => {
    await refreshData();
    setEditingPayment(undefined);
    showToast('Payment updated successfully', 'success');
  };

  const handleFormCancel = () => {
    setEditingPayment(undefined);
  };

  const totalPending = payments.filter((p) => p.status === 'pending').length;
  const totalPartial = payments.filter((p) => p.status === 'partial').length;
  const totalPaid = payments.filter((p) => p.status === 'paid').length;
  const totalOverdue = payments.filter((p) => p.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Payments Management</h1>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Partial</p>
              <p className="text-2xl font-bold text-orange-600">{totalPartial}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Paid</p>
              <p className="text-2xl font-bold text-green-600">{totalPaid}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-gray-600 text-sm">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search by staff, role, or event..."
              onSearch={setSearchQuery}
              className="flex-1"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'No payments found matching your search' : 'No payments found'}
              </p>
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} onEdit={handleEdit} />
            ))
          )}
        </div>
      </div>

      {editingPayment && (
        <Modal
          isOpen={!!editingPayment}
          onClose={handleFormCancel}
          title="Update Payment"
          size="md"
        >
          <PaymentForm
            payment={editingPayment}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Modal>
      )}

      {ToastComponent}
    </div>
  );
}
