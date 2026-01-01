import { ClientSummary, formatCurrency, getOutstandingColorClass } from '../../utils/clientPaymentCalculations';

interface ClientSummaryCardProps {
  summary: ClientSummary;
  onClick: () => void;
}

export function ClientSummaryCard({ summary, onClick }: ClientSummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 text-left w-full"
    >
      <h3 className="font-bold text-base text-gray-900 mb-4">{summary.clientName}</h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Agreed:</span>
          <span className="text-base font-semibold text-gray-600">
            {formatCurrency(summary.totalAgreed)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Received:</span>
          <span className="text-base font-semibold text-green-600">
            {formatCurrency(summary.totalReceived)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Outstanding:</span>
          <span
            className={`text-base font-semibold ${getOutstandingColorClass(summary.outstanding)}`}
          >
            {formatCurrency(summary.outstanding)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <span className="text-sm text-gray-600 hover:text-gray-900">View Details</span>
      </div>
    </button>
  );
}
