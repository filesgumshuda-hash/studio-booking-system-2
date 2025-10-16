import React from 'react';
import { Card } from '../common/Card';
import { useAppData } from '../../context/AppContext';

export function FinancialOverviewWidget() {
  const { bookings, clientPaymentRecords, staffPaymentRecords } = useAppData();

  const calculateClientPayments = () => {
    const packageAmount = bookings.reduce((sum, b) => sum + (b.package_amount || 0), 0);
    const received = clientPaymentRecords
      .filter(p => p.payment_status === 'received')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstanding = packageAmount - received;

    const today = new Date();
    const receivedMTD = clientPaymentRecords
      .filter(p => {
        const date = new Date(p.payment_date);
        return p.payment_status === 'received' &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
      })
      .reduce((sum, p) => sum + p.amount, 0);

    return { outstanding, receivedMTD };
  };

  const calculateStaffPayments = () => {
    const today = new Date();

    const agreedPayments = staffPaymentRecords.filter(p => p.type === 'agreed');
    const madePayments = staffPaymentRecords.filter(p => p.type === 'made');

    const staffWithPending = new Map<string, number>();

    agreedPayments.forEach(agreed => {
      const paid = madePayments
        .filter(made => made.staff_id === agreed.staff_id && made.event_id === agreed.event_id)
        .reduce((sum, p) => sum + p.amount, 0);

      const pending = agreed.amount - paid;
      if (pending > 0) {
        staffWithPending.set(agreed.staff_id, (staffWithPending.get(agreed.staff_id) || 0) + pending);
      }
    });

    const totalPending = Array.from(staffWithPending.values()).reduce((sum, p) => sum + p, 0);

    const paidMTD = madePayments
      .filter(p => {
        const date = new Date(p.payment_date);
        return date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
      })
      .reduce((sum, p) => sum + p.amount, 0);

    return { pending: totalPending, paidMTD };
  };

  const clientPayments = calculateClientPayments();
  const staffPayments = calculateStaffPayments();

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>💰</span> Financial Overview
      </h3>

      {/* Client Payments */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Client Payments</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Outstanding:</span>
            <span className="text-lg font-semibold text-red-600">
              ₹{clientPayments.outstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Received MTD:</span>
            <span className="text-lg font-semibold text-green-600">
              ₹{clientPayments.receivedMTD.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-200 my-4" />

      {/* Staff Payments */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Staff Payments</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pending:</span>
            <span className="text-lg font-semibold text-orange-600">
              ₹{staffPayments.pending.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Paid MTD:</span>
            <span className="text-lg font-semibold text-green-600">
              ₹{staffPayments.paidMTD.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
