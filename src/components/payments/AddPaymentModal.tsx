import React, { useState, useEffect } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Payment, useAppData } from '../../context/AppContext';
import { Button } from '../common/Button';
import { validatePaymentAmount, formatCurrency } from '../../utils/paymentHelpers';
import { supabase } from '../../lib/supabase';

interface AddPaymentModalProps {
  payment: Payment;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddPaymentModal({ payment, onSuccess, onCancel }: AddPaymentModalProps) {
  const { events } = useAppData();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentProof, setPaymentProof] = useState<string>('');
  const [proofFileName, setProofFileName] = useState('');

  const remainingBalance = payment.agreed_amount - payment.amount_paid;
  const newBalance = remainingBalance - amount;

  const event = payment.event_id ? events.find((e) => e.id === payment.event_id) : null;

  useEffect(() => {
    const futureDate = new Date(paymentDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (futureDate > thirtyDaysFromNow) {
      setErrors((prev) => ({
        ...prev,
        paymentDate: 'Payment date is more than 30 days in the future. Please verify.',
      }));
    } else {
      setErrors((prev) => {
        const { paymentDate, ...rest } = prev;
        return rest;
      });
    }
  }, [paymentDate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, paymentProof: 'File size must be less than 5MB' }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        paymentProof: 'Only JPG, PNG, and PDF files are allowed',
      }));
      return;
    }

    setErrors((prev) => {
      const { paymentProof, ...rest } = prev;
      return rest;
    });

    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result as string);
      setProofFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!amount || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else {
      const amountError = validatePaymentAmount(amount, payment.agreed_amount, payment.amount_paid);
      if (amountError) {
        newErrors.amount = amountError;
      }
    }

    if (!paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
    }

    if ((paymentMode === 'bank_transfer' || paymentMode === 'cheque') && !transactionRef.trim()) {
      newErrors.transactionRef = 'Transaction reference is required for bank transfers and cheques';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('payment_transactions').insert({
        payment_id: payment.id,
        amount,
        payment_date: paymentDate,
        payment_mode: paymentMode,
        transaction_ref: transactionRef || null,
        payment_proof: paymentProof || null,
        notes: notes || null,
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            <span className="font-medium">Staff:</span> {payment.staff?.name}
          </p>
          {payment.is_non_event_payment ? (
            <p>
              <span className="font-medium">Type:</span> Non-Event Payment
            </p>
          ) : (
            <>
              <p>
                <span className="font-medium">Event:</span> {event?.event_name}
              </p>
              <p>
                <span className="font-medium">Role:</span>{' '}
                {payment.role.replace('_', ' ').charAt(0).toUpperCase() + payment.role.replace('_', ' ').slice(1)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Agreed <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={formatCurrency(payment.agreed_amount)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Previously Paid</label>
          <input
            type="text"
            value={formatCurrency(payment.amount_paid)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount Paying Now <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max={remainingBalance}
            value={amount || ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.amount ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">Remaining balance: {formatCurrency(remainingBalance)}</p>
          {errors.amount && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.paymentDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.paymentDate && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.paymentDate}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Mode <span className="text-red-600">*</span>
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.paymentMode ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select mode</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
            <option value="cheque">Cheque</option>
            <option value="others">Others</option>
          </select>
          {errors.paymentMode && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.paymentMode}
            </p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Reference{' '}
            {(paymentMode === 'bank_transfer' || paymentMode === 'cheque') && (
              <span className="text-red-600">*</span>
            )}
          </label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="UTR/Cheque number/Reference ID"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
              errors.transactionRef ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.transactionRef && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.transactionRef}
            </p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Proof (Optional)</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
              <Upload size={16} />
              <span className="text-sm">Choose File</span>
              <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf" />
            </label>
            {proofFileName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{proofFileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentProof('');
                    setProofFileName('');
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG, PNG, or PDF</p>
          {errors.paymentProof && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle size={14} /> {errors.paymentProof}
            </p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Any additional notes..."
          />
          <p className="text-xs text-gray-500 mt-1">{notes.length}/500 characters</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Agreed:</span>
            <span className="font-medium">{formatCurrency(payment.agreed_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Previously Paid:</span>
            <span className="font-medium text-green-600">{formatCurrency(payment.amount_paid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount Paying Now:</span>
            <span className="font-medium text-blue-600">{formatCurrency(amount)}</span>
          </div>
          <hr className="my-2 border-gray-300" />
          <div className="flex justify-between">
            <span className="text-gray-900 font-medium">New Balance Due:</span>
            <span className={`font-bold ${newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(newBalance)}
            </span>
          </div>
        </div>
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
          {loading ? 'Recording Payment...' : 'Record Payment'}
        </Button>
      </div>
    </form>
  );
}
