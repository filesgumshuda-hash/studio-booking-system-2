import { Trash2 } from 'lucide-react';
import { Staff, StaffPaymentRecord } from '../../context/AppContext';
import { StaffSummary, EventAmount, formatCurrency, formatDate } from '../../utils/paymentCalculations';
import { Button } from '../common/Button';

interface StaffDetailSectionProps {
  staff: Staff;
  summary: StaffSummary;
  eventAmounts: EventAmount[];
  paymentHistory: StaffPaymentRecord[];
  onAddPayment?: () => void;
  onDeletePayment?: (paymentId: string) => void;
  isReadOnly?: boolean;
}

export function StaffDetailSection({
  staff,
  summary,
  eventAmounts,
  paymentHistory,
  onAddPayment,
  onDeletePayment,
}: StaffDetailSectionProps) {
  const getPaymentMethodLabel = (method?: string): string => {
    if (!method) return '-';
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
          Selected Staff: <span className="text-gray-700">{staff.name}</span>
        </h2>
        {onAddPayment && (
          <Button onClick={onAddPayment} className="bg-green-600 hover:bg-green-700">
            + Add Payment
          </Button>
        )}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-600 mb-3">Summary:</h3>
        <div className="flex items-center gap-8">
          <div>
            <span className="text-gray-600">Total Amount: </span>
            <span className="text-lg font-semibold text-gray-600">{formatCurrency(summary.totalAgreed)}</span>
          </div>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-600">Paid: </span>
            <span className="text-lg font-semibold text-green-600">{formatCurrency(summary.totalPaid)}</span>
          </div>
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
        <h3 className="text-base font-semibold text-gray-900 mb-3">Event-wise Breakdown:</h3>
        {eventAmounts.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No events assigned yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '40%' }}>
                    Event Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '25%' }}>
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '20%' }}>
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600" style={{ width: '15%' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {eventAmounts.map((ea) => (
                  <tr key={ea.eventId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{ea.eventName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ea.clientName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ea.eventDate)}</td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold text-right ${
                        ea.amount > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {formatCurrency(ea.amount)}
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
        {paymentHistory.filter((p) => p.type === 'made').length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            No payments yet. Click &apos;+ Add Payment&apos; to record one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Method</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Remarks</th>
                  {onDeletePayment && (
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentHistory
                  .filter((p) => p.type === 'made')
                  .map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Made
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        {formatCurrency(Number(payment.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.remarks || '-'}</td>
                      {onDeletePayment && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => onDeletePayment(payment.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete payment"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      )}
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
