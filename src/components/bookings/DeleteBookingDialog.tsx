import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface PaymentSummary {
  clientPayments: {
    total: number;
    paid: number;
    outstanding: number;
    count: number;
  };
  staffPayments: {
    total: number;
    paid: number;
    outstanding: number;
    count: number;
  };
}

interface DeleteBookingDialogProps {
  isOpen: boolean;
  bookingName: string;
  clientName: string;
  eventCount: number;
  paymentSummary: PaymentSummary | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBookingDialog({
  isOpen,
  bookingName,
  clientName,
  eventCount,
  paymentSummary,
  onConfirm,
  onCancel,
}: DeleteBookingDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'delete-all' | 'cancel'>('delete-all');

  const hasPayments = paymentSummary &&
    (paymentSummary.clientPayments.count > 0 || paymentSummary.staffPayments.count > 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleProceed = () => {
    if (selectedOption === 'delete-all') {
      onConfirm();
    } else {
      onCancel();
    }
  };

  if (!hasPayments) {
    return (
      <Modal isOpen={isOpen} onClose={onCancel} title="Delete Booking?" size="sm">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete this booking?</p>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <div>
              <span className="font-medium">Booking:</span> {bookingName}
            </div>
            <div>
              <span className="font-medium">Client:</span> {clientName}
            </div>
            <div>
              <span className="font-medium">Events:</span> {eventCount}
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">This action cannot be undone.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
              Delete Booking
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Delete Booking with Existing Payments?" size="md">
      <div className="space-y-6">
        <p className="text-gray-700 font-medium">This booking has associated payment records:</p>

        <div className="bg-gray-50 p-5 rounded-lg space-y-4">
          {paymentSummary.clientPayments.count > 0 && (
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-xl">📊</span>
                Client Payments:
              </h4>
              <div className="ml-7 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentSummary.clientPayments.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(paymentSummary.clientPayments.paid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding:</span>
                  <span className={`font-semibold ${
                    paymentSummary.clientPayments.outstanding > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(paymentSummary.clientPayments.outstanding)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Records:</span>
                  <span className="font-medium text-gray-700">
                    {paymentSummary.clientPayments.count}
                  </span>
                </div>
              </div>
            </div>
          )}

          {paymentSummary.staffPayments.count > 0 && (
            <div className={paymentSummary.clientPayments.count > 0 ? 'pt-4 border-t border-gray-200' : ''}>
              <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-xl">💼</span>
                Staff Payments:
              </h4>
              <div className="ml-7 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(paymentSummary.staffPayments.total)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(paymentSummary.staffPayments.paid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding:</span>
                  <span className={`font-semibold ${
                    paymentSummary.staffPayments.outstanding > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(paymentSummary.staffPayments.outstanding)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Records:</span>
                  <span className="font-medium text-gray-700">
                    {paymentSummary.staffPayments.count}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-base font-medium text-gray-900 mb-3">What would you like to do?</p>

          <div className="space-y-3">
            <label
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedOption === 'delete-all'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="deleteOption"
                  value="delete-all"
                  checked={selectedOption === 'delete-all'}
                  onChange={(e) => setSelectedOption(e.target.value as 'delete-all' | 'cancel')}
                  className="mt-1 w-4 h-4 text-red-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    Delete booking and all associated payments
                  </div>
                  <div className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>This will permanently remove all payment records for this booking</span>
                  </div>
                </div>
              </div>
            </label>

            <label
              className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedOption === 'cancel'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="deleteOption"
                  value="cancel"
                  checked={selectedOption === 'cancel'}
                  onChange={(e) => setSelectedOption(e.target.value as 'delete-all' | 'cancel')}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">
                    Keep booking, cancel this action
                  </div>
                  <div className="flex items-start gap-2 text-sm text-blue-700">
                    <span className="text-base">ℹ️</span>
                    <span>Return to bookings list without changes</span>
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className={selectedOption === 'delete-all' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            onClick={handleProceed}
          >
            Proceed
          </Button>
        </div>
      </div>
    </Modal>
  );
}
