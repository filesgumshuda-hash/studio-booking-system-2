import { useState, useMemo, useEffect } from 'react';
import { useAppData, StaffPaymentRecord } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { Button } from '../components/common/Button';
import { StaffSummaryCard } from '../components/payments/StaffSummaryCard';
import { StaffDetailSection } from '../components/payments/StaffDetailSection';
import { AddPaymentForm, PaymentFormData } from '../components/payments/AddPaymentForm';
import {
  getTop10Staff,
  calculateStaffSummary,
  getStaffEvents,
  getStaffPayments,
  formatCurrency,
  formatDate,
} from '../utils/paymentCalculations';
import { getAccessiblePayments, canManagePayments } from '../utils/accessControl';

export function NewPaymentsPage() {
  const { user } = useAuth();
  const { staff, events, staffAssignments, staffPaymentRecords, bookings, clients, dispatch, refreshData } = useAppData();
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showOutstanding, setShowOutstanding] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    paymentId: string;
    payment: StaffPaymentRecord | null;
  }>({
    isOpen: false,
    paymentId: '',
    payment: null,
  });
  const { showToast, ToastComponent } = useToast();

  const isAdmin = user?.role === 'admin';
  const isStaffOrManager = user?.role === 'staff' || user?.role === 'manager';

  const accessiblePayments = useMemo(() => {
    return getAccessiblePayments(user, staffPaymentRecords);
  }, [user, staffPaymentRecords]);

  useEffect(() => {
    if (isStaffOrManager && user?.staffId) {
      setSelectedStaffId(user.staffId);
    }
  }, [isStaffOrManager, user]);

  const top10Staff = useMemo(() => {
    if (!isAdmin) return [];
    return getTop10Staff(staff, staffPaymentRecords);
  }, [isAdmin, staff, staffPaymentRecords]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return staff.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, staff]);

  const selectedStaffSummary = useMemo(() => {
    if (!selectedStaffId) return null;
    const staffMember = staff.find((s) => s.id === selectedStaffId);
    if (!staffMember) return null;
    return calculateStaffSummary(selectedStaffId, staffMember.name, accessiblePayments);
  }, [selectedStaffId, staff, accessiblePayments]);

  const selectedStaffEventAmounts = useMemo(() => {
    if (!selectedStaffId) return [];
    return getStaffEvents(selectedStaffId, events, staffAssignments, accessiblePayments);
  }, [selectedStaffId, events, staffAssignments, accessiblePayments]);

  const selectedStaffPaymentHistory = useMemo(() => {
    if (!selectedStaffId) return [];
    return getStaffPayments(selectedStaffId, accessiblePayments);
  }, [selectedStaffId, accessiblePayments]);

  const activeStaff = useMemo(() => {
    return staff.filter((s) => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  }, [staff]);

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleAddPayment = async (formData: PaymentFormData) => {
    if (!selectedStaffId) return;

    try {
      const { data, error } = await supabase
        .from('staff_payment_records')
        .insert({
          staff_id: selectedStaffId,
          type: formData.type,
          amount: formData.amount,
          payment_date: formData.paymentDate,
          payment_method: formData.type === 'made' ? formData.paymentMethod : null,
          remarks: formData.remarks || null,
          event_id: formData.eventId || null,
        })
        .select('*, staff:staff(*), event:events(*)')
        .single();

      if (error) throw error;

      dispatch({ type: 'ADD_STAFF_PAYMENT_RECORD', payload: data });
      setShowAddPaymentModal(false);
      showToast('Payment recorded successfully', 'success');
    } catch (error: any) {
      console.error('Error adding payment:', error);
      showToast(error.message || 'Failed to add payment', 'error');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const payment = staffPaymentRecords.find((p) => p.id === paymentId);
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
        .from('staff_payment_records')
        .delete()
        .eq('id', deleteConfirmation.paymentId);

      if (error) throw error;

      dispatch({ type: 'DELETE_STAFF_PAYMENT_RECORD', payload: deleteConfirmation.paymentId });
      setDeleteConfirmation({ isOpen: false, paymentId: '', payment: null });
      showToast('Payment deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      showToast(error.message || 'Failed to delete payment', 'error');
    }
  };

  const pageTitle = isStaffOrManager ? 'My Payments' : 'Payments Management';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          {isAdmin && (
            <Button
              onClick={() => {
                if (selectedStaffId) {
                  setShowAddPaymentModal(true);
                } else {
                  showToast('Please select a staff member first', 'error');
                }
              }}
              className="bg-gray-900 hover:bg-gray-800"
            >
              + New Payment
            </Button>
          )}
        </div>

        {isAdmin && (
          <>
            <div className="mb-8">
              <label htmlFor="staffSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Search or Select Staff:
              </label>
              <select
                id="staffSelect"
                value={selectedStaffId || ''}
                onChange={(e) => handleStaffSelect(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="">-- Select a staff member --</option>
                {activeStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role.charAt(0).toUpperCase() + s.role.slice(1).replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-8">
              <button
                onClick={() => setShowOutstanding(!showOutstanding)}
                className="w-full flex items-center justify-between mb-4 hover:bg-gray-50 p-2 rounded transition-colors"
              >
                <h2 className="text-lg font-semibold text-gray-900">Top 10 Staff by Outstanding Balance</h2>
                <span className="text-gray-500 text-xl">{showOutstanding ? '−' : '+'}</span>
              </button>

              {showOutstanding && (
                <>
                  {top10Staff.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                      <p className="text-gray-500">No payment records yet. Add a payment to get started.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {top10Staff.map((summary) => (
                        <StaffSummaryCard
                          key={summary.staffId}
                          summary={summary}
                          onClick={() => handleStaffSelect(summary.staffId)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {selectedStaff && selectedStaffSummary && (
          <StaffDetailSection
            staff={selectedStaff}
            summary={selectedStaffSummary}
            eventAmounts={selectedStaffEventAmounts}
            paymentHistory={selectedStaffPaymentHistory}
            onAddPayment={isAdmin ? () => setShowAddPaymentModal(true) : undefined}
            onDeletePayment={isAdmin ? handleDeletePayment : undefined}
            onPaymentUpdated={refreshData}
            isReadOnly={isStaffOrManager}
          />
        )}

        {isStaffOrManager && selectedStaffSummary && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Contact admin to update your payment information.
            </p>
          </div>
        )}
      </div>

      {showAddPaymentModal && selectedStaff && selectedStaffSummary && isAdmin && (
        <Modal
          isOpen={showAddPaymentModal}
          onClose={() => setShowAddPaymentModal(false)}
          title={`Add Payment for ${selectedStaff.name}`}
          size="md"
        >
          <AddPaymentForm
            staff={selectedStaff}
            events={events}
            staffAssignments={staffAssignments}
            bookings={bookings}
            clients={clients}
            currentSummary={selectedStaffSummary}
            onSubmit={handleAddPayment}
            onCancel={() => setShowAddPaymentModal(false)}
          />
        </Modal>
      )}

      {deleteConfirmation.isOpen && deleteConfirmation.payment && isAdmin && (
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
                  <span className="font-medium">Type:</span>{' '}
                  {deleteConfirmation.payment.type === 'agreed' ? 'Payment Agreed' : 'Payment Made'}
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

      {ToastComponent}
    </div>
  );
}
