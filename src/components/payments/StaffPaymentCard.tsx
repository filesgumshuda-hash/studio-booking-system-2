import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Plus } from 'lucide-react';
import { StaffPaymentSummary, Payment, useAppData } from '../../context/AppContext';
import { formatCurrency, getStatusColor, getStatusLabel, isPaymentOverdue } from '../../utils/paymentHelpers';
import { formatDate } from '../../utils/helpers';

interface StaffPaymentCardProps {
  summary: StaffPaymentSummary;
  onEditStaff: (summary: StaffPaymentSummary) => void;
  onAddPayment: (payment: Payment) => void;
}

export function StaffPaymentCard({ summary, onEditStaff, onAddPayment }: StaffPaymentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { events, bookings, clients } = useAppData();

  const statusColorClass = getStatusColor(summary.overall_status);
  const statusLabel = getStatusLabel(summary.overall_status);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">{summary.staff_name}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColorClass}`}>
              {statusLabel}
            </span>
          </div>
          <button
            onClick={() => onEditStaff(summary)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Manage payments"
          >
            <Edit size={18} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3 font-medium">Total Across All Events:</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Agreed Amount</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.total_agreed)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Amount Paid</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(summary.total_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Balance Due</p>
              <p className={`text-lg font-semibold ${summary.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(summary.total_balance)}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          {isExpanded ? 'Collapse' : `Expand to see ${summary.payment_records.length} payment${summary.payment_records.length !== 1 ? 's' : ''}`}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isExpanded && (
          <div className="mt-6 space-y-4">
            {summary.payment_records.map((payment, index) => {
              const event = payment.event_id ? events.find((e) => e.id === payment.event_id) : null;
              const booking = event ? bookings.find((b) => b.id === event.booking_id) : null;
              const client = booking ? clients.find((c) => c.id === booking.client_id) : null;
              const balanceDue = payment.agreed_amount - payment.amount_paid;
              const isOverdue = event ? isPaymentOverdue(payment, event) : false;

              return (
                <div key={payment.id}>
                  {index > 0 && <hr className="my-4 border-gray-200" />}

                  <div>
                    {payment.is_non_event_payment ? (
                      <>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">Non-Event Payment</h4>
                        <p className="text-sm text-gray-600 mb-3">Note: {payment.notes}</p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-base font-semibold text-gray-900 mb-1">
                          {event?.event_name} {client && `(${client.name})`}
                        </h4>
                        <div className="text-sm text-gray-600 mb-3 space-y-1">
                          <p>Role: {payment.role.replace('_', ' ').charAt(0).toUpperCase() + payment.role.replace('_', ' ').slice(1)}</p>
                          {event && <p>Event Date: {formatDate(event.event_date)}</p>}
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-500">Agreed Amount</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(payment.agreed_amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount Paid</p>
                        <p className="font-semibold text-green-600">{formatCurrency(payment.amount_paid)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Balance Due</p>
                        <p className={`font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(balanceDue)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      {balanceDue > 0 ? (
                        <button
                          onClick={() => onAddPayment(payment)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Plus size={14} />
                          Add Payment
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-md font-medium">
                          ✓ Paid
                        </span>
                      )}
                    </div>

                    {isOverdue && balanceDue > 0 && (
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        ⚠ Payment overdue (event was {event && formatDate(event.event_date)})
                      </div>
                    )}

                    {payment.transactions && payment.transactions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-2">Payment History:</p>
                        <div className="space-y-1">
                          {payment.transactions.map((txn) => (
                            <div key={txn.id} className="text-xs text-gray-600 flex justify-between">
                              <span>{formatDate(txn.payment_date)} - {txn.payment_mode.replace('_', ' ')}</span>
                              <span className="font-medium text-green-600">{formatCurrency(txn.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
