import { useMemo } from 'react';
import { useAppData, Client, ClientPaymentRecord, Booking, Expense, StaffPaymentRecord } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Trash2, Plus } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/clientPaymentCalculations';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onAddPayment: () => void;
  onAddExpense: () => void;
  onAddStaffPayment: () => void;
  onDeletePayment: (paymentId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteStaffPayment: (staffPaymentId: string) => void;
}

export function ClientDetailModal({
  client,
  onClose,
  onAddPayment,
  onAddExpense,
  onAddStaffPayment,
  onDeletePayment,
  onDeleteExpense,
  onDeleteStaffPayment,
}: ClientDetailModalProps) {
  const { bookings, events, clientPaymentRecords, expenses, staffPaymentRecords, staff } = useAppData();

  const clientBookings = useMemo(() => {
    return bookings.filter(b => b.client_id === client.id);
  }, [bookings, client.id]);

  const clientBookingIds = useMemo(() => {
    return clientBookings.map(b => b.id);
  }, [clientBookings]);

  const clientPayments = useMemo(() => {
    return clientPaymentRecords
      .filter(p => p.client_id === client.id)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [clientPaymentRecords, client.id]);

  const clientExpenses = useMemo(() => {
    return expenses
      .filter(e => e.booking_id && clientBookingIds.includes(e.booking_id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, clientBookingIds]);

  const clientEventIds = useMemo(() => {
    return events
      .filter(e => clientBookingIds.includes(e.booking_id))
      .map(e => e.id);
  }, [events, clientBookingIds]);

  const clientStaffPayments = useMemo(() => {
    return staffPaymentRecords
      .filter(sp => sp.event_id && clientEventIds.includes(sp.event_id))
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [staffPaymentRecords, clientEventIds]);

  const totalAgreed = useMemo(() => {
    return clientPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [clientPayments]);

  const totalReceived = useMemo(() => {
    return clientPayments
      .filter(p => p.payment_status === 'received')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [clientPayments]);

  const totalPending = useMemo(() => {
    return clientPayments
      .filter(p => p.payment_status === 'agreed')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [clientPayments]);

  const totalExpenses = useMemo(() => {
    return clientExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [clientExpenses]);

  const totalStaffPayments = useMemo(() => {
    return clientStaffPayments.reduce((sum, sp) => sum + sp.amount, 0);
  }, [clientStaffPayments]);

  const staffPaymentsPaid = useMemo(() => {
    return clientStaffPayments
      .filter(sp => sp.type === 'made')
      .reduce((sum, sp) => sum + sp.amount, 0);
  }, [clientStaffPayments]);

  const staffPaymentsAgreed = useMemo(() => {
    return clientStaffPayments
      .filter(sp => sp.type === 'agreed')
      .reduce((sum, sp) => sum + sp.amount, 0);
  }, [clientStaffPayments]);

  const getBookingName = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    return booking?.booking_name || 'Unknown Booking';
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.name || 'Unknown Staff';
  };

  const getEventName = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event?.event_name || 'Unknown Event';
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={client.name} size="xl">
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-600 mb-1">Total Agreed</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalAgreed)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Received</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(totalReceived)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Outstanding</div>
              <div className="text-lg font-semibold text-red-600">{formatCurrency(totalPending)}</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Bookings ({clientBookings.length})
          </h3>
          {clientBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No bookings</div>
          ) : (
            <div className="space-y-2">
              {clientBookings.map((booking) => {
                const bookingEvents = events.filter(e => e.booking_id === booking.id);
                return (
                  <div key={booking.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-900">{booking.booking_name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {bookingEvents.length} event(s)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Payment History ({clientPayments.length})
            </h3>
            <Button
              type="button"
              onClick={onAddPayment}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-xs py-2 px-3"
            >
              <Plus size={14} />
              Add Payment
            </Button>
          </div>
          {clientPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No payments recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Booking</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Method</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">{formatDate(payment.payment_date)}</td>
                      <td className="px-3 py-2 text-gray-600">{getBookingName(payment.booking_id)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            payment.payment_status === 'received'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {payment.payment_status === 'received' ? 'Received' : 'Agreed'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 capitalize">
                        {payment.payment_method ? payment.payment_method.replace('_', ' ') : 'N/A'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Expenses ({clientExpenses.length})
            </h3>
            <Button
              type="button"
              onClick={onAddExpense}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-xs py-2 px-3"
            >
              <Plus size={14} />
              Add Expense
            </Button>
          </div>
          {clientExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No expenses recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Booking</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">{formatDate(expense.date)}</td>
                      <td className="px-3 py-2 text-gray-600">{getBookingName(expense.booking_id!)}</td>
                      <td className="px-3 py-2 text-gray-900">{expense.description}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete expense"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-sm text-right text-gray-900">
                      Total Expenses:
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-red-600 font-bold">
                      {formatCurrency(totalExpenses)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Staff Payments ({clientStaffPayments.length})
            </h3>
            <Button
              type="button"
              onClick={onAddStaffPayment}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-xs py-2 px-3"
            >
              <Plus size={14} />
              Add Staff Payment
            </Button>
          </div>
          {clientStaffPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No staff payments recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Staff</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Event</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Amount</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientStaffPayments.map((staffPayment) => (
                    <tr key={staffPayment.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">{formatDate(staffPayment.payment_date)}</td>
                      <td className="px-3 py-2 text-gray-900">{getStaffName(staffPayment.staff_id)}</td>
                      <td className="px-3 py-2 text-gray-600">{getEventName(staffPayment.event_id!)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            staffPayment.type === 'made'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {staffPayment.type === 'made' ? 'Paid' : 'Agreed'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatCurrency(staffPayment.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onDeleteStaffPayment(staffPayment.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete staff payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-3 py-2 text-sm text-gray-900">
                      <div className="flex justify-between">
                        <span>Total Staff Payments:</span>
                        <span className="text-xs text-gray-600">
                          ({formatCurrency(staffPaymentsAgreed)} pending + {formatCurrency(staffPaymentsPaid)} paid)
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-blue-700 font-bold">
                      {formatCurrency(totalStaffPayments)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
