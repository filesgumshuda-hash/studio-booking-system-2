import React from 'react';
import { Edit } from 'lucide-react';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Payment, useAppData } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';

interface PaymentCardProps {
  payment: Payment;
  onEdit: (payment: Payment) => void;
}

export function PaymentCard({ payment, onEdit }: PaymentCardProps) {
  const { events, bookings, clients } = useAppData();

  const event = events.find((e) => e.id === payment.event_id);
  const booking = bookings.find((b) => b.id === event?.booking_id);
  const client = clients.find((c) => c.id === booking?.client_id);

  const balanceDue = payment.agreed_amount - payment.amount_paid;

  const statusColorMap: Record<string, string> = {
    pending: 'gray-300',
    partial: 'yellow-500',
    paid: 'green-500',
    overdue: 'red-500',
  };

  return (
    <Card borderColor={statusColorMap[payment.status]} className="hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{payment.staff?.name}</h3>
            <StatusBadge status={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)} />
          </div>

          <div className="space-y-1 text-gray-600">
            <p>
              <span className="font-medium">Event:</span> {event?.event_name} ({client?.name})
            </p>
            <p>
              <span className="font-medium">Role:</span> {payment.role.replace('_', ' ').charAt(0).toUpperCase() + payment.role.replace('_', ' ').slice(1)}
            </p>
            <p>
              <span className="font-medium">Event Date:</span> {event && formatDate(event.event_date)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Agreed Amount</p>
              <p className="text-lg font-semibold text-gray-900">₹{payment.agreed_amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Amount Paid</p>
              <p className="text-lg font-semibold text-green-600">₹{payment.amount_paid.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Balance Due</p>
              <p className="text-lg font-semibold text-red-600">₹{balanceDue.toFixed(2)}</p>
            </div>
          </div>

          {payment.payment_date && (
            <p className="mt-3 text-sm text-gray-500">
              Last Payment: {formatDate(payment.payment_date)}
              {payment.payment_mode && ` (${payment.payment_mode.replace('_', ' ')})`}
            </p>
          )}
        </div>

        <button
          onClick={() => onEdit(payment)}
          className="text-gray-600 hover:text-blue-600 transition-colors ml-4"
          title="Edit"
        >
          <Edit size={18} />
        </button>
      </div>
    </Card>
  );
}
