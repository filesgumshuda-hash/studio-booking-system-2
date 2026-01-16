import { useState, useMemo } from 'react';
import { Trash2, Check } from 'lucide-react';
import { Staff, StaffPaymentRecord } from '../../context/AppContext';
import { StaffSummary, EventAmount, formatCurrency, formatDate } from '../../utils/paymentCalculations';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';

interface StaffDetailSectionProps {
  staff: Staff;
  summary: StaffSummary;
  eventAmounts: EventAmount[];
  paymentHistory: StaffPaymentRecord[];
  onAddPayment?: () => void;
  onDeletePayment?: (paymentId: string) => void;
  isReadOnly?: boolean;
}

interface EditedAmount {
  eventId: string;
  amount: string;
  isSaving: boolean;
  justSaved: boolean;
}

export function StaffDetailSection({
  staff,
  summary,
  eventAmounts,
  paymentHistory,
  onAddPayment,
  onDeletePayment,
  isReadOnly,
}: StaffDetailSectionProps) {
  const [editedAmounts, setEditedAmounts] = useState<Record<string, EditedAmount>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

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

  const handleAmountChange = (eventId: string, value: string) => {
    setEditedAmounts((prev) => ({
      ...prev,
      [eventId]: {
        eventId,
        amount: value,
        isSaving: false,
        justSaved: false,
      },
    }));
  };

  const getDisplayAmount = (eventId: string, originalAmount: number): string => {
    const edited = editedAmounts[eventId];
    if (edited && edited.amount !== undefined) {
      return edited.amount;
    }
    return originalAmount > 0 ? originalAmount.toString() : '';
  };

  const hasChanged = (eventId: string, originalAmount: number): boolean => {
    const edited = editedAmounts[eventId];
    if (!edited || edited.amount === undefined) return false;
    const newAmount = parseFloat(edited.amount) || 0;
    return newAmount !== originalAmount;
  };

  const updatedSummary = useMemo(() => {
    let totalAgreed = summary.totalAgreed;

    eventAmounts.forEach((ea) => {
      if (hasChanged(ea.eventId, ea.amount)) {
        const edited = editedAmounts[ea.eventId];
        const newAmount = parseFloat(edited.amount) || 0;
        totalAgreed = totalAgreed - ea.amount + newAmount;
      }
    });

    return {
      ...summary,
      totalAgreed,
      totalDue: totalAgreed - summary.totalPaid,
    };
  }, [summary, eventAmounts, editedAmounts]);

  const saveEventAmount = async (eventAmount: EventAmount) => {
    const edited = editedAmounts[eventAmount.eventId];
    if (!edited) return;

    const newAmount = parseFloat(edited.amount) || 0;
    if (newAmount === eventAmount.amount) return;

    setEditedAmounts((prev) => ({
      ...prev,
      [eventAmount.eventId]: { ...prev[eventAmount.eventId], isSaving: true },
    }));

    try {
      const { data: existingPayment } = await supabase
        .from('staff_payment_records')
        .select('id, amount')
        .eq('staff_id', staff.id)
        .eq('event_id', eventAmount.eventId)
        .eq('type', 'agreed')
        .maybeSingle();

      if (newAmount === 0) {
        if (existingPayment) {
          await supabase
            .from('staff_payment_records')
            .delete()
            .eq('id', existingPayment.id);
        }
      } else if (existingPayment) {
        await supabase
          .from('staff_payment_records')
          .update({ amount: newAmount })
          .eq('id', existingPayment.id);
      } else {
        await supabase
          .from('staff_payment_records')
          .insert({
            staff_id: staff.id,
            event_id: eventAmount.eventId,
            type: 'agreed',
            amount: newAmount,
            payment_date: new Date().toISOString().split('T')[0],
          });
      }

      setEditedAmounts((prev) => ({
        ...prev,
        [eventAmount.eventId]: { ...prev[eventAmount.eventId], isSaving: false, justSaved: true },
      }));

      setTimeout(() => {
        setEditedAmounts((prev) => {
          const updated = { ...prev };
          delete updated[eventAmount.eventId];
          return updated;
        });
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error saving payment:', error);
      setEditedAmounts((prev) => ({
        ...prev,
        [eventAmount.eventId]: { ...prev[eventAmount.eventId], isSaving: false, justSaved: false },
      }));
    }
  };

  const saveAllChanges = async () => {
    const changedEvents = eventAmounts.filter((ea) => hasChanged(ea.eventId, ea.amount));
    if (changedEvents.length === 0) return;

    setIsSavingAll(true);

    for (const eventAmount of changedEvents) {
      await saveEventAmount(eventAmount);
    }

    setIsSavingAll(false);
  };

  const hasAnyChanges = eventAmounts.some((ea) => hasChanged(ea.eventId, ea.amount));

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
            <span className="text-lg font-semibold text-gray-600">{formatCurrency(updatedSummary.totalAgreed)}</span>
          </div>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-600">Paid: </span>
            <span className="text-lg font-semibold text-green-600">{formatCurrency(updatedSummary.totalPaid)}</span>
          </div>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <span className="text-gray-600">Due: </span>
            <span
              className={`text-lg font-semibold ${
                updatedSummary.totalDue > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(updatedSummary.totalDue)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Event-wise Breakdown:</h3>
        {eventAmounts.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No events assigned yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '35%' }}>
                      Event Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '22%' }}>
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '18%' }}>
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600" style={{ width: '25%' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {eventAmounts.map((ea) => {
                    const edited = editedAmounts[ea.eventId];
                    const changed = hasChanged(ea.eventId, ea.amount);

                    return (
                      <tr key={ea.eventId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{ea.eventName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ea.clientName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ea.eventDate)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center">
                              <span className="text-gray-600 mr-1">₹</span>
                              <input
                                type="number"
                                value={getDisplayAmount(ea.eventId, ea.amount)}
                                onChange={(e) => handleAmountChange(ea.eventId, e.target.value)}
                                placeholder="0"
                                disabled={isReadOnly || edited?.isSaving}
                                className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            {changed && !edited?.justSaved && (
                              <button
                                onClick={() => saveEventAmount(ea)}
                                disabled={edited?.isSaving || isReadOnly}
                                className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {edited?.isSaving ? 'Saving...' : 'Save'}
                              </button>
                            )}
                            {edited?.justSaved && (
                              <div className="flex items-center gap-1 text-green-600">
                                <Check size={16} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasAnyChanges && !isReadOnly && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={saveAllChanges}
                  disabled={isSavingAll}
                  className="bg-gray-900 hover:bg-gray-800"
                >
                  {isSavingAll ? 'Saving All...' : 'Save All'}
                </Button>
              </div>
            )}
          </>
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
