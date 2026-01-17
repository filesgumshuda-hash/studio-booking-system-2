import { StaffSummary, formatCurrency } from '../../utils/paymentCalculations';

interface StaffSummaryCardProps {
  summary: StaffSummary;
  onClick: () => void;
}

export function StaffSummaryCard({ summary, onClick }: StaffSummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left w-full border border-gray-200"
    >
      <h3 className="font-semibold text-sm text-gray-900 mb-2">{summary.staffName}</h3>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Total:</span>
          <span className="text-sm font-semibold text-gray-600">
            {formatCurrency(summary.totalAgreed)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Paid:</span>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(summary.totalPaid)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Due:</span>
          <span
            className={`text-sm font-semibold ${
              summary.totalDue > 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {formatCurrency(summary.totalDue)}
          </span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <span className="text-xs text-gray-500 hover:text-gray-900">View Details</span>
      </div>
    </button>
  );
}
