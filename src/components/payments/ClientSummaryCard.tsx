import { ClientSummary, formatCurrency, getOutstandingColorClass } from '../../utils/clientPaymentCalculations';

interface ClientSummaryCardProps {
  summary: ClientSummary;
  onClick: () => void;
}

export function ClientSummaryCard({ summary, onClick }: ClientSummaryCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left w-full border border-gray-200"
    >
      <h3 className="font-semibold text-sm text-gray-900 mb-1">{summary.clientName}</h3>

      {summary.dateRange && (
        <div className="text-xs text-gray-500 mb-2">
          {summary.dateRange}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Total Agreed:</span>
          <span className="text-sm font-semibold text-gray-600">
            {formatCurrency(summary.totalAgreed)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Received:</span>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(summary.totalReceived)}
          </span>
        </div>

        {summary.lastEventPassed ? (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Outstanding:</span>
            <span
              className={`text-sm font-semibold ${getOutstandingColorClass(summary.outstanding)}`}
            >
              {formatCurrency(summary.outstanding)}
            </span>
          </div>
        ) : (
          <div className="text-xs text-amber-600 font-medium italic">
            Events not completed yet
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <span className="text-xs text-gray-500 hover:text-gray-900">View Details</span>
      </div>
    </button>
  );
}
