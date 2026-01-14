import { useState, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAppData, Booking, Event, Staff } from '../../context/AppContext';

interface AddStaffPaymentModalProps {
  clientBookings: Booking[];
  onClose: () => void;
  onSave: (staffPayment: any) => Promise<void>;
}

export function AddStaffPaymentModal({ clientBookings, onClose, onSave }: AddStaffPaymentModalProps) {
  const { events, staff, staffAssignments } = useAppData();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bookingId: clientBookings[0]?.id || '',
    eventId: '',
    staffId: '',
    amount: '',
    status: 'agreed' as 'agreed' | 'paid',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    remarks: '',
  });

  const bookingEvents = useMemo(() => {
    if (!formData.bookingId) return [];
    return events.filter((e) => e.booking_id === formData.bookingId);
  }, [formData.bookingId, events]);

  const availableStaff = useMemo(() => {
    if (!formData.eventId) {
      return staff.filter((s) => s.status === 'active');
    }

    const eventAssignments = staffAssignments.filter((sa) => sa.event_id === formData.eventId);
    const assignedStaffIds = eventAssignments.map((sa) => sa.staff_id);
    return staff.filter((s) => assignedStaffIds.includes(s.id) && s.status === 'active');
  }, [formData.eventId, staff, staffAssignments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bookingId || !formData.staffId || !formData.amount) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      await onSave({
        booking_id: formData.bookingId,
        event_id: formData.eventId || null,
        staff_id: formData.staffId,
        amount: parseFloat(formData.amount),
        status: formData.status,
        date: formData.date,
        payment_method: formData.status === 'paid' ? formData.paymentMethod : null,
        remarks: formData.remarks || null,
      });

      onClose();
    } catch (error) {
      console.error('Error saving staff payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} title="Add Staff Payment" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booking *</label>
          <select
            value={formData.bookingId}
            onChange={(e) =>
              setFormData({ ...formData, bookingId: e.target.value, eventId: '', staffId: '' })
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            {clientBookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.booking_name || 'Unnamed Booking'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event (Optional)</label>
          <select
            value={formData.eventId}
            onChange={(e) => setFormData({ ...formData, eventId: e.target.value, staffId: '' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">All Events</option>
            {bookingEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.event_name} - {e.event_date}
              </option>
            ))}
          </select>
          {formData.eventId && (
            <p className="text-xs text-gray-500 mt-1">
              Staff list filtered to members assigned to this event
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
          <select
            value={formData.staffId}
            onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Select staff...</option>
            {availableStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} - {s.role}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="3000"
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="agreed"
                checked={formData.status === 'agreed'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'agreed' | 'paid' })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Agreed (Not Paid Yet)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="paid"
                checked={formData.status === 'paid'}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'agreed' | 'paid' })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Paid</span>
            </label>
          </div>
        </div>

        {formData.status === 'paid' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
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
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks (Optional)
          </label>
          <textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
