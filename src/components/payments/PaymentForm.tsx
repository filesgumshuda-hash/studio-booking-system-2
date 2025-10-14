import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Payment } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

interface PaymentFormProps {
  payment: Payment;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({ payment, onSuccess, onCancel }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [agreedAmount, setAgreedAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setAgreedAmount(payment.agreed_amount);
    setAmountPaid(payment.amount_paid);
    setPaymentDate(payment.payment_date || '');
    setPaymentMode(payment.payment_mode || '');
    setTransactionRef(payment.transaction_ref || '');
    setNotes(payment.notes || '');
  }, [payment]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (agreedAmount < 0) newErrors.agreedAmount = 'Agreed amount cannot be negative';
    if (amountPaid < 0) newErrors.amountPaid = 'Amount paid cannot be negative';
    if (amountPaid > agreedAmount) newErrors.amountPaid = 'Amount paid cannot exceed agreed amount';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let status: 'pending' | 'partial' | 'paid' | 'overdue' = 'pending';
      if (amountPaid === 0) {
        status = 'pending';
      } else if (amountPaid >= agreedAmount) {
        status = 'paid';
      } else {
        status = 'partial';
      }

      const { error } = await supabase
        .from('payments')
        .update({
          agreed_amount: agreedAmount,
          amount_paid: amountPaid,
          status,
          payment_date: paymentDate || null,
          payment_mode: paymentMode || null,
          transaction_ref: transactionRef || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const balanceDue = agreedAmount - amountPaid;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            <span className="font-medium">Staff:</span> {payment.staff?.name}
          </p>
          <p>
            <span className="font-medium">Role:</span> {payment.role.replace('_', ' ').charAt(0).toUpperCase() + payment.role.replace('_', ' ').slice(1)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agreed Amount <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={agreedAmount}
            onChange={(e) => setAgreedAmount(parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.agreedAmount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.agreedAmount && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.agreedAmount}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount Paid <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountPaid}
            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.amountPaid ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.amountPaid && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.amountPaid}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Balance Due</label>
          <input
            type="text"
            value={`₹${balanceDue.toFixed(2)}`}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Select mode</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="others">Others</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference</label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g., TXN123456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Any additional notes..."
        />
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle size={18} />
            {errors.submit}
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Update Payment'}
        </Button>
      </div>
    </form>
  );
}
