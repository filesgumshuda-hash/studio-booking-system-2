import { useState } from 'react';
import { Staff, Event, StaffAssignment, Booking, Client } from '../../context/AppContext';
import { StaffSummary, formatCurrency } from '../../utils/paymentCalculations';
import { formatEventForDropdown } from '../../utils/displayHelpers';
import { Button } from '../common/Button';

interface AddPaymentFormProps {
  staff: Staff;
  events: Event[];
  staffAssignments: StaffAssignment[];
  bookings: Booking[];
  clients: Client[];
  currentSummary: StaffSummary;
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
}

export interface PaymentFormData {
  type: 'agreed' | 'made';
  eventId: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  remarks: string;
}

export function AddPaymentForm({
  staff,
  events,
  staffAssignments,
  bookings,
  clients,
  currentSummary,
  onSubmit,
  onCancel,
}: AddPaymentFormProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    type: 'made',
    eventId: null,
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    remarks: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const staffEventIds = staffAssignments
    .filter((sa) => sa.staff_id === staff.id)
    .map((sa) => sa.event_id);

  const staffEvents = events
    .filter((e) => staffEventIds.includes(e.id))
    .map((event) => {
      const booking = bookings.find((b) => b.id === event.booking_id);
      const client = booking ? clients.find((c) => c.id === booking.client_id) : undefined;

      return {
        ...event,
        booking: booking ? {
          ...booking,
          client: client,
        } : undefined,
      };
    });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0 || formData.amount > 999999) {
      newErrors.amount = 'Amount must be between ₹1 and ₹9,99,999';
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

    if (formData.type === 'made' && !formData.paymentMethod) {
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Type <span className="text-red-600">*</span>
        </label>
        <div className="flex gap-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="type"
              value="agreed"
              checked={formData.type === 'agreed'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'agreed' | 'made' })}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm text-gray-700">Payment Agreed</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="type"
              value="made"
              checked={formData.type === 'made'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'agreed' | 'made' })}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm text-gray-700">Payment Made</span>
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
          Link to Event
        </label>
        <select
          id="eventId"
          value={formData.eventId || ''}
          onChange={(e) => setFormData({ ...formData, eventId: e.target.value || null })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">(None - General Payment)</option>
          {staffEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {formatEventForDropdown(event)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          Amount <span className="text-red-600">*</span>
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
            max="999999"
            className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {errors.paymentDate && <p className="mt-1 text-sm text-red-600">{errors.paymentDate}</p>}
      </div>

      {formData.type === 'made' && (
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method <span className="text-red-600">*</span>
          </label>
          <select
            id="paymentMethod"
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="others">Others</option>
          </select>
          {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
        </div>
      )}

      <div>
        <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
          Remarks
        </label>
        <input
          type="text"
          id="remarks"
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value.slice(0, 200) })}
          placeholder="e.g., Advance, Final payment, For October events"
          maxLength={200}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">{formData.remarks.length}/200 characters</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Summary for this Staff:</h4>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-600">Total Agreed: </span>
            <span className="font-semibold text-gray-900">{formatCurrency(currentSummary.totalAgreed)}</span>
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button type="submit">Save Payment</Button>
      </div>
    </form>
  );
}
