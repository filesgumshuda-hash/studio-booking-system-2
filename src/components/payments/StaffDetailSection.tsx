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
  onPaymentUpdated?: () => Promise<void>;
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
  onPaymentUpdated,
  isReadOnly,
}: StaffDetailSectionProps) {
  const [editedAmounts, setEditedAmounts] = useState<Record<string, EditedAmount>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'history' | 'agreed' | 'all'>('history');
  const [eventFilter, setEventFilter] = useState<'nonzero' | 'all'>('nonzero');

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
      // Get ALL existing payment records for this staff+event+type combination
      const { data: existingPayments } = await supabase
        .from('staff_payment_records')
        .select('id, amount')
        .eq('staff_id', staff.id)
        .eq('event_id', eventAmount.eventId)
        .eq('type', 'agreed');

      if (newAmount === 0) {
        // Delete all existing records if setting amount to 0
        if (existingPayments && existingPayments.length > 0) {
          await supabase
            .from('staff_payment_records')
            .delete()
            .eq('staff_id', staff.id)
            .eq('event_id', eventAmount.eventId)
            .eq('type', 'agreed');
        }
      } else if (existingPayments && existingPayments.length > 0) {
        // Update the first record and delete any duplicates
        const [firstRecord, ...duplicates] = existingPayments;

        await supabase
          .from('staff_payment_records')
          .update({ amount: newAmount })
          .eq('id', firstRecord.id);

        // Delete any duplicate records
        if (duplicates.length > 0) {
          for (const duplicate of duplicates) {
            await supabase
              .from('staff_payment_records')
              .delete()
              .eq('id', duplicate.id);
          }
        }
      } else {
        // No existing record, create a new one
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

      // Refresh data from parent
      if (onPaymentUpdated) {
        await onPaymentUpdated();
      }

      // Clear the saved indicator after a delay
      setTimeout(() => {
        setEditedAmounts((prev) => {
          const updated = { ...prev };
          delete updated[eventAmount.eventId];
          return updated;
        });
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Event-wise Breakdown:</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setEventFilter('nonzero')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                eventFilter === 'nonzero'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              With Amount
            </button>
            <button
              onClick={() => setEventFilter('all')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                eventFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Events
            </button>
          </div>
        </div>
        {eventAmounts.filter((ea) => {
          if (eventFilter === 'nonzero') {
            const edited = editedAmounts[ea.eventId];
            const currentAmount = edited?.amount !== undefined ? parseFloat(edited.amount) || 0 : ea.amount;
            return currentAmount > 0;
          }
          return true;
        }).length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            {eventFilter === 'nonzero' ? 'No events with agreed amount yet.' : 'No events assigned yet.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '45%' }}>
                      Event Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600" style={{ width: '25%' }}>
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600" style={{ width: '30%' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {eventAmounts
                    .filter((ea) => {
                      if (eventFilter === 'nonzero') {
                        const edited = editedAmounts[ea.eventId];
                        const currentAmount = edited?.amount !== undefined ? parseFloat(edited.amount) || 0 : ea.amount;
                        return currentAmount > 0;
                      }
                      return true;
                    })
                    .map((ea) => {
                    const edited = editedAmounts[ea.eventId];
                    const changed = hasChanged(ea.eventId, ea.amount);

                    return (
                      <tr key={ea.eventId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {ea.eventName} <span className="text-gray-500">({ea.clientName})</span>
                        </td>
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Payment History:</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setPaymentFilter('history')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                paymentFilter === 'history'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setPaymentFilter('agreed')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                paymentFilter === 'agreed'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Agreed
            </button>
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                paymentFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
          </div>
        </div>
        {paymentHistory.filter((payment) => {
          if (paymentFilter === 'history') return payment.type === 'made';
          if (paymentFilter === 'agreed') return payment.type === 'agreed';
          return true;
        }).length === 0 ? (
          <p className="text-gray-500 text-sm py-4">
            {paymentFilter === 'history' && 'No payment history yet. Click \'+ Add Payment\' to record one.'}
            {paymentFilter === 'agreed' && 'No agreed payments yet.'}
            {paymentFilter === 'all' && 'No payment records yet.'}
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
                  .filter((payment) => {
                    if (paymentFilter === 'history') return payment.type === 'made';
                    if (paymentFilter === 'agreed') return payment.type === 'agreed';
                    return true;
                  })
                  .map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.payment_date)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          payment.type === 'made'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {payment.type === 'made' ? 'Made' : 'Agreed'}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${
                        payment.type === 'made' ? 'text-green-600' : 'text-gray-600'
                      }`}
                    >
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
