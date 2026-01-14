import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAppData } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Booking } from '../../context/AppContext';

interface AddExpenseModalProps {
  onClose: () => void;
  preSelectedBooking?: Booking | null;
}

export function AddExpenseModal({ onClose, preSelectedBooking }: AddExpenseModalProps) {
  const { bookings, clients, dispatch, refreshData } = useAppData();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: preSelectedBooking ? 'booking' : 'general',
    bookingId: preSelectedBooking?.id || '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.description) {
      alert('Please fill in amount and description');
      return;
    }

    if (formData.type === 'booking' && !formData.bookingId) {
      alert('Please select a booking');
      return;
    }

    setLoading(true);

    try {
      const expenseData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        payment_method: formData.paymentMethod,
        booking_id: formData.type === 'booking' ? formData.bookingId : null,
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select('*, booking:bookings(*, client:clients(*))')
        .single();

      if (error) throw error;

      dispatch({ type: 'ADD_EXPENSE', payload: data });
      onClose();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      alert(error.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const enrichedBookings = bookings.map((booking) => {
    const client = clients.find((c) => c.id === booking.client_id);
    return {
      ...booking,
      clientName: client?.name || 'Unknown Client',
    };
  });

  return (
    <Modal isOpen={true} title="Add Expense" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expense Type *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="general"
                checked={formData.type === 'general'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'general' | 'booking', bookingId: '' })
                }
                disabled={!!preSelectedBooking}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">General Business Expense</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="booking"
                checked={formData.type === 'booking'}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'general' | 'booking' })
                }
                disabled={!!preSelectedBooking}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Booking-Related Expense</span>
            </label>
          </div>
        </div>

        {formData.type === 'booking' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking *
            </label>
            <select
              value={formData.bookingId}
              onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
              required
              disabled={!!preSelectedBooking}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Select booking...</option>
              {enrichedBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.clientName} - {b.booking_name || 'Unnamed Booking'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="5000"
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method *
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Travel costs, equipment rental, etc."
            rows={3}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
