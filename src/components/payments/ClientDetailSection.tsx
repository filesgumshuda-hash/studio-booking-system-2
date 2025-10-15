import { Trash2 } from 'lucide-react';
import { Client, ClientPaymentRecord } from '../../context/AppContext';
import { ClientSummary, BookingAmount, formatCurrency, formatDate } from '../../utils/clientPaymentCalculations';
import { getBookingDisplayName } from '../../utils/displayHelpers';
import { Button } from '../common/Button';

interface ClientDetailSectionProps {
  client: Client;
  summary: ClientSummary;
  bookingAmounts: BookingAmount[];
  paymentHistory: ClientPaymentRecord[];
  onAddPayment: () => void;
  onDeletePayment: (paymentId: string) => void;
}

export function ClientDetailSection({
  client,
  summary,
  bookingAmounts,
  paymentHistory,
  onAddPayment,
  onDeletePayment,
}: ClientDetailSectionProps) {
  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      others: 'Others',
    };
    return labels[method] || method;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Selected Client: <span className="text-gray-700">{client.name}</span>
        </h2>
        <Button onClick={onAddPayment} className="bg-green-600 hover:bg-green-700">
          + Add Payment
        </Button>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Summary:</h3>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <span className="text-gray-600">Total Amount: </span>
            <span className="text-lg font-semibold text-gray-600">{formatCurrency(summary.totalOwed)}</span>
          </div>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-600">Received: </span>
            <span className="text-lg font-semibold text-green-600">{formatCurrency(summary.totalReceived)}</span>
          </div>
          {summary.totalAgreed > 0 && (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <span className="text-gray-600">Agreed (Pending): </span>
                <span className="text-lg font-semibold text-amber-600">{formatCurrency(summary.totalAgreed)}</span>
              </div>
            </>
          )}
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-600">Due: </span>
            <span
              className={`text-lg font-semibold ${
                summary.totalDue > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(summary.totalDue)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Booking-wise Breakdown:</h3>
        {bookingAmounts.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No bookings found for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '40%' }}>
                    Booking Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '20%' }}>
                    Events Count
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '20%' }}>
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600" style={{ width: '20%' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookingAmounts.map((ba) => (
                  <tr key={ba.bookingId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{ba.bookingName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ba.eventCount} {ba.eventCount === 1 ? 'event' : 'events'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ba.bookingDate)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right text-gray-600">
                      {formatCurrency(ba.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Payment History:</h3>
        {paymentHistory.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            No payments yet. Click &apos;+ Add Payment&apos; to record one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Booking Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Remarks</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {formatCurrency(Number(payment.amount))}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payment.payment_status === 'received'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {payment.payment_status === 'received' ? 'Received' : 'Agreed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getBookingDisplayName(payment.booking)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{payment.remarks || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onDeletePayment(payment.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete payment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
