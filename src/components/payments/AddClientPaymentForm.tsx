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
  paymentMethod: string;
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
  const [formData, setFormData] = useState<ClientPaymentFormData>({
    clientId: client?.id || '',
    bookingId: '',
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
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
      displayName: `${booking.booking_name || `Booking ${booking.id.slice(0, 8)}`} (${eventCount} ${
        eventCount === 1 ? 'event' : 'events'
      }) - Due: ${formatCurrency(balance)}`,
    };
  }).sort((a, b) => b.balance - a.balance);

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

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
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
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Payment Amount <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-600">₹</span>
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
        {selectedBooking && (
          <p className="mt-1 text-xs text-gray-500">
            Remaining balance for this booking: {formatCurrency(bookingBalance)}
          </p>
        )}
        {formData.amount > bookingBalance && bookingBalance > 0 && (
          <p className="mt-1 text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle size={14} /> Amount exceeds outstanding balance
          </p>
        )}
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
      </div>

      <div>
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

      <div>
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

      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
          Remarks
        </label>
        <input
          type="text"
          id="remarks"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value.slice(0, 200) })}
          placeholder="e.g., First installment, Advance payment"
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">{formData.remarks.length}/200 characters</p>
      </div>

      {currentSummary && selectedClient && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Summary for this Client:</h4>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total Owed: </span>
              <span className="font-semibold text-gray-900">{formatCurrency(currentSummary.totalOwed)}</span>
            </div>
            <div>
              <span className="text-gray-600">Paid: </span>
              <span className="font-semibold text-green-600">{formatCurrency(currentSummary.totalPaid)}</span>
            </div>
            <div>
              <span className="text-gray-600">Due: </span>
              <span
                className={`font-semibold ${
                  currentSummary.totalDue > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatCurrency(currentSummary.totalDue)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button type="submit">Save Payment</Button>
      </div>
    </form>
  );
}
