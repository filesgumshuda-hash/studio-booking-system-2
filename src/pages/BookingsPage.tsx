import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { BookingCard } from '../components/bookings/BookingCard';
import { BookingForm } from '../components/bookings/BookingForm';
import { useAppData, Booking } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export function BookingsPage() {
  const { bookings, events, clients, staff, staffAssignments, workflows, payments, refreshData } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'active' | 'past'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | undefined>();
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const { showToast, ToastComponent } = useToast();

  const enrichedBookings = useMemo(() => {
    return bookings.map(booking => {
      const bookingEvents = events.filter(e => e.booking_id === booking.id).map(event => {
        const eventAssignments = staffAssignments.filter(sa => sa.event_id === event.id);
        return {
          ...event,
          staff_assignments: eventAssignments,
        };
      });
      const client = clients.find(c => c.id === booking.client_id);
      return {
        ...booking,
        events: bookingEvents,
        client,
      };
    });
  }, [bookings, events, clients, staffAssignments]);

  const filteredBookings = useMemo(() => {
    let result = enrichedBookings;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    if (filterType === 'active') {
      result = result.filter(booking => {
        const hasUpcomingEvents = booking.events?.some(e => e.event_date >= todayString);
        const bookingWorkflows = workflows.filter(w => booking.events?.some(e => e.id === w.event_id));
        const hasActiveWorkflow = bookingWorkflows.some(w => {
          const allDelivered =
            w.still_workflow?.deliveredToClient?.completed &&
            w.reel_workflow?.reelDelivered?.completed &&
            w.video_workflow?.videoDelivered?.completed &&
            w.portrait_workflow?.portraitDelivered?.completed;
          return !allDelivered;
        });
        return hasUpcomingEvents || hasActiveWorkflow;
      });
    } else {
      result = result.filter(booking => {
        const allPastEvents = booking.events?.every(e => e.event_date < todayString);
        const bookingWorkflows = workflows.filter(w => booking.events?.some(e => e.id === w.event_id));
        const allWorkflowsCompleted = bookingWorkflows.length > 0 && bookingWorkflows.every(w => {
          const allDelivered =
            w.still_workflow?.deliveredToClient?.completed ||
            w.reel_workflow?.reelDelivered?.completed ||
            w.video_workflow?.videoDelivered?.completed ||
            w.portrait_workflow?.portraitDelivered?.completed;
          return allDelivered;
        });
        return allPastEvents && allWorkflowsCompleted;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(booking => {
        const clientMatch = booking.client?.name?.toLowerCase().includes(query);
        const eventTypeMatch = booking.events?.some(e => e.event_name.toLowerCase().includes(query));
        const venueMatch = booking.events?.some(e => e.venue.toLowerCase().includes(query));
        const staffMatch = booking.events?.some(e => {
          const eventAssignments = staffAssignments.filter(sa => sa.event_id === e.id);
          return eventAssignments.some(sa => {
            const staffMember = staff.find(s => s.id === sa.staff_id);
            return staffMember?.name.toLowerCase().includes(query);
          });
        });
        return clientMatch || eventTypeMatch || venueMatch || staffMatch;
      });
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return result;
  }, [enrichedBookings, searchQuery, filterType, workflows, staffAssignments, staff]);

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setShowForm(true);
  };

  const handleDelete = async (bookingId: string) => {
    const bookingPayments = payments.filter(p => {
      const event = events.find(e => e.id === p.event_id);
      return event?.booking_id === bookingId;
    });

    if (bookingPayments.length > 0) {
      showToast('Cannot delete booking with existing payments', 'error');
      setDeletingBookingId(null);
      return;
    }

    setDeletingBookingId(bookingId);
  };

  const confirmDelete = async () => {
    if (!deletingBookingId) return;

    try {
      const { error } = await supabase.from('bookings').delete().eq('id', deletingBookingId);
      if (error) throw error;

      await refreshData();
      showToast('Booking deleted successfully', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBooking(undefined);
    showToast(editingBooking ? 'Booking updated successfully' : 'Booking created successfully', 'success');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBooking(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={20} className="mr-2" />
              New Booking
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search by client, event type, venue, or staff..."
              onSearch={setSearchQuery}
              className="flex-1"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'active' | 'past')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="active">Active Bookings</option>
              <option value="past">Past Bookings</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchQuery ? 'No bookings found matching your search' : `No ${filterType} bookings`}
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={handleFormCancel}
        title={editingBooking ? 'Edit Booking' : 'New Booking'}
        size="full"
      >
        <BookingForm
          key={editingBooking?.id || 'new'}
          booking={editingBooking}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingBookingId}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingBookingId(null)}
      />

      {ToastComponent}
    </div>
  );
}
