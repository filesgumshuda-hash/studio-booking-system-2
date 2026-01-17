import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Plus, Wallet, Clipboard } from 'lucide-react';
import { useState } from 'react';
import { Modal } from './Modal';
import { BookingForm } from '../bookings/BookingForm';
import { AddPaymentForm, PaymentFormData } from '../payments/AddPaymentForm';
import { AddExpenseModal } from '../expenses/AddExpenseModal';
import { useAppData } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { supabase } from '../../lib/supabase';

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { staff, events, staffAssignments, bookings, clients, dispatch, refreshData } = useAppData();
  const { showToast } = useToast();

  const [moneySheetOpen, setMoneySheetOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);

  // Modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showStaffPaymentModal, setShowStaffPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = user?.role === 'admin';

  // Booking handlers
  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    showToast('Booking created successfully', 'success');
    refreshData();
  };

  const handleBookingCancel = () => {
    setShowBookingModal(false);
  };

  // Staff payment handlers
  const handleAddStaffPayment = async (formData: PaymentFormData, staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_payment_records')
        .insert({
          staff_id: staffId,
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
      setShowStaffPaymentModal(false);
      showToast('Payment recorded successfully', 'success');
    } catch (error: any) {
      console.error('Error adding payment:', error);
      showToast(error.message || 'Failed to add payment', 'error');
    }
  };


  const activeStaff = staff.filter((s) => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50 md:hidden">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center text-xs ${
            isActive('/dashboard') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/tracking')}
          className={`flex flex-col items-center text-xs ${
            isActive('/tracking') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Clipboard size={20} />
          <span>Tracking</span>
        </button>
        <button
          type="button"
          onClick={() => setNewSheetOpen(true)}
          className="flex flex-col items-center text-xs text-gray-600"
        >
          <div className="bg-blue-500 text-white rounded-full p-1">
            <Plus size={20} />
          </div>
          <span>New</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className={`flex flex-col items-center text-xs ${
            isActive('/calendar') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Calendar size={20} />
          <span>Cal</span>
        </button>
        <button
          type="button"
          onClick={() => setMoneySheetOpen(true)}
          className="flex flex-col items-center text-xs text-gray-600"
        >
          <Wallet size={20} />
          <span>Money</span>
        </button>
      </nav>

      {/* New Bottom Sheet */}
      {newSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNewSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button
              type="button"
              onClick={() => {
                setShowBookingModal(true);
                setNewSheetOpen(false);
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              New Booking
            </button>
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setShowStaffPaymentModal(true);
                  setNewSheetOpen(false);
                } else {
                  showToast('Only admins can add staff payments', 'error');
                  setNewSheetOpen(false);
                }
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              New Staff Payment
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExpenseModal(true);
                setNewSheetOpen(false);
              }}
              className="w-full text-left py-3 hover:bg-gray-50 transition-colors"
            >
              New Expense
            </button>
          </div>
        </div>
      )}

      {/* Money Bottom Sheet */}
      {moneySheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoneySheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <button
              type="button"
              onClick={() => {
                navigate('/client-payments');
                setMoneySheetOpen(false);
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              Client Payments
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/staff-payments');
                setMoneySheetOpen(false);
              }}
              className="w-full text-left py-3 border-b hover:bg-gray-50 transition-colors"
            >
              Staff Payments
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/expenses');
                setMoneySheetOpen(false);
              }}
              className="w-full text-left py-3 hover:bg-gray-50 transition-colors"
            >
              Expenses
            </button>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <Modal
          isOpen={showBookingModal}
          onClose={handleBookingCancel}
          title="New Booking"
          size="full"
        >
          <BookingForm
            onSuccess={handleBookingSuccess}
            onCancel={handleBookingCancel}
          />
        </Modal>
      )}

      {/* Staff Payment Modal */}
      {showStaffPaymentModal && isAdmin && (
        <Modal
          isOpen={showStaffPaymentModal}
          onClose={() => setShowStaffPaymentModal(false)}
          title="Add Staff Payment"
          size="md"
        >
          <AddPaymentForm
            allStaff={activeStaff}
            events={events}
            staffAssignments={staffAssignments}
            bookings={bookings}
            clients={clients}
            onSubmit={handleAddStaffPayment}
            onCancel={() => setShowStaffPaymentModal(false)}
          />
        </Modal>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <AddExpenseModal
          onClose={() => setShowExpenseModal(false)}
        />
      )}
    </>
  );
}
