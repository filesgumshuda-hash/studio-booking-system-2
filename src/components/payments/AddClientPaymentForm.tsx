import { useState } from 'react';
import { Client, Booking } from '../../context/AppContext';
import { ClientSummary, formatCurrency, getBookingBalance } from '../../utils/clientPaymentCalculations';
import { Button } from '../common/Button';
import { AlertCircle } from 'lucide-react';

interface AddClientPaymentFormProps {
  client?: Client;
  clients: Client[];
  bookings: Booking[];
  clientPayments: any[];
  currentSummary?: ClientSummary;
  onSubmit: (data: ClientPaymentFormData) => void;
  onCancel: () => void;
}

export interface ClientPaymentFormData {
  clientId: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  paymentStatus: 'agreed' | 'received';
  transactionRef: string;
  remarks: string;
}

export function AddClientPaymentForm({
  client,
  clients,
  bookings,
  clientPayments,
  currentSummary,
  onSubmit,
  onCancel,
}: AddClientPaymentFormProps) {
  const [paymentType, setPaymentType] = useState<'received' | 'agreed'>('received');
  const [formData, setFormData] = useState<ClientPaymentFormData>({
    clientId: client?.id || '',
    bookingId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    paymentStatus: 'received',
    transactionRef: '',
    remarks: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const clientsWithBookings = clients.filter((c) =>
    bookings.some((b) => b.client_id === c.id)
  );

  const selectedClient = clients.find((c) => c.id === formData.clientId);
  const clientBookings = bookings.filter((b) => b.client_id === formData.clientId);

  const selectedBooking = bookings.find((b) => b.id === formData.bookingId);
  const bookingBalance = selectedBooking
    ? getBookingBalance(selectedBooking.id, selectedBooking, clientPayments)
    : 0;

  const bookingsWithBalance = clientBookings.map((booking) => {
    const balance = getBookingBalance(booking.id, booking, clientPayments);
    const eventCount = bookings.filter((b) => b.id === booking.id).length || 0;
    return {
      ...booking,
      balance,
      eventCount,
      displayName: `${booking.booking_name || `Booking ${booking.id.slice(0, 8)}`} - Due: ${formatCurrency(balance)}`,
    };
  }).sort((a, b) => b.balance - a.balance);

  const handlePaymentTypeChange = (type: 'received' | 'agreed') => {
    setPaymentType(type);
    setFormData({
      ...formData,
      paymentStatus: type,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: type === 'received' ? 'cash' : null,
      transactionRef: '',
    });
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Please select a client';
    }

    if (!formData.bookingId) {
      newErrors.bookingId = 'Please select a booking';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    } else {
      const selectedDate = new Date(formData.paymentDate);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (selectedDate > oneYearFromNow) {
        newErrors.paymentDate = 'Date cannot be more than 1 year ahead';
      }
    }

    if (paymentType === 'received' && !formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (paymentType === 'received' && formData.amount > bookingBalance && bookingBalance > 0) {
      newErrors.amount = `Amount exceeds remaining balance (${formatCurrency(bookingBalance)})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleAmountChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) || value === '') {
      setFormData({ ...formData, amount: value === '' ? 0 : num });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Type Selection - TOP OF FORM */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Payment Type <span className="text-red-600">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              paymentType === 'received'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="paymentType"
              value="received"
              checked={paymentType === 'received'}
              onChange={() => handlePaymentTypeChange('received')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                💵 Payment Received
              </div>
              <div className="text-xs text-gray-600 mt-1">Client has paid money</div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              paymentType === 'agreed'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="paymentType"
              value="agreed"
              checked={paymentType === 'agreed'}
              onChange={() => handlePaymentTypeChange('agreed')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                📋 Payment Agreed
              </div>
              <div className="text-xs text-gray-600 mt-1">Setting package amount</div>
            </div>
          </label>
        </div>
      </div>

      {/* Client Selection */}
      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-2">
          Select Client <span className="text-red-600">*</span>
        </label>
        <select
          id="clientId"
          value={formData.clientId}
          onChange={(e) => {
            setFormData({ ...formData, clientId: e.target.value, bookingId: '' });
            setErrors({ ...errors, clientId: '' });
          }}
          disabled={!!client}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
            errors.clientId ? 'border-red-500' : 'border-gray-300'
          } ${client ? 'bg-gray-100' : ''}`}
        >
          <option value="">-- Select a client --</option>
          {clientsWithBookings.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} - {c.contact_number}
            </option>
          ))}
        </select>
        {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>}
      </div>

      {/* Booking Selection */}
      {formData.clientId && (
        <div>
          <label htmlFor="bookingId" className="block text-sm font-medium text-gray-700 mb-2">
            Link to Booking <span className="text-red-600">*</span>
          </label>
          <select
            id="bookingId"
            value={formData.bookingId}
            onChange={(e) => {
              setFormData({ ...formData, bookingId: e.target.value });
              setErrors({ ...errors, bookingId: '' });
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.bookingId ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Select booking --</option>
            {bookingsWithBalance.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.displayName}
              </option>
            ))}
          </select>
          {errors.bookingId && <p className="mt-1 text-sm text-red-600">{errors.bookingId}</p>}
        </div>
      )}

      {/* Payment Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Payment Amount <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-600 text-lg font-semibold">₹</span>
          <input
            type="number"
            id="amount"
            value={formData.amount || ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            max="9999999"
            className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {selectedBooking && bookingBalance > 0 && (
          <p className="mt-1 text-xs text-gray-600">
            Remaining balance for this booking: {formatCurrency(bookingBalance)}
          </p>
        )}
        {formData.amount > bookingBalance && bookingBalance > 0 && paymentType === 'received' && (
          <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle size={14} /> Amount exceeds outstanding balance
          </p>
        )}
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
      </div>

      {/* Conditional Fields - Payment Received Only */}
      {paymentType === 'received' && (
        <>
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Payment Details</h4>

            {/* Payment Date */}
            <div className="mb-4">
              <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                id="paymentDate"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.paymentDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.paymentDate && <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>}
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-600">*</span>
              </label>
              <select
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                  errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="others">Others</option>
              </select>
              {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
            </div>

            {/* Transaction Reference */}
            <div>
              <label htmlFor="transactionRef" className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference
              </label>
              <input
                type="text"
                id="transactionRef"
                value={formData.transactionRef}
                onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value.slice(0, 100) })}
                placeholder="UTR number, Cheque number, Transaction ID"
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </>
      )}

      {/* Remarks - Always Shown */}
      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
          Remarks
        </label>
        <textarea
          id="remarks"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value.slice(0, 200) })}
          placeholder="e.g., First installment, Advance payment"
          maxLength={200}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">{formData.remarks.length}/200 characters</p>
      </div>

      {/* Current Summary */}
      {currentSummary && selectedClient && (
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            Current Summary for {selectedClient.name}:
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Package Amount</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(currentSummary.packageAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Received</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(currentSummary.totalReceived)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Outstanding</div>
              <div
                className={`text-xl font-bold ${
                  currentSummary.outstanding > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(currentSummary.outstanding)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button type="submit">Save Payment</Button>
      </div>
    </form>
  );
}
