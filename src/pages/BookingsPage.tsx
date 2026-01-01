import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { SearchBar } from '../components/common/SearchBar';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../components/common/Toast';
import { RichBookingCard } from '../components/bookings/RichBookingCard';
import { BookingDetailModal } from '../components/bookings/BookingDetailModal';
import { BookingForm } from '../components/bookings/BookingForm';
import { SelectiveDeleteModal, DeletionOptions } from '../components/bookings/SelectiveDeleteModal';
import { useAppData, Booking } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getAccessibleBookings, canManageBookings, canDeleteBookings } from '../utils/accessControl';

export function BookingsPage() {
  const { user } = useAuth();
  const { bookings, events, clients, staff, staffAssignments, workflows, payments, staffPaymentRecords, clientPaymentRecords, refreshData } = useAppData();

  const accessibleBookings = useMemo(() => {
    return getAccessibleBookings(user, bookings, events);
  }, [user, bookings, events]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'active' | 'past'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | undefined>();
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [showSelectiveDelete, setShowSelectiveDelete] = useState(false);
  const [deletingBookingData, setDeletingBookingData] = useState<{ id: string; name: string; clientName: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { showToast, ToastComponent } = useToast();

  const enrichedBookings = useMemo(() => {
    return accessibleBookings.map(booking => {
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
        return hasUpcomingEvents;
      });
    } else {
      result = result.filter(booking => {
        const allPastEvents = booking.events?.every(e => e.event_date < todayString);
        return allPastEvents;
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
    setSelectedBooking(null);
    setEditingBooking(booking);
    setShowForm(true);
  };

  const handleCardEdit = (booking: Booking) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handleEdit(booking);
  };

  const handleCardDelete = (bookingId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDelete(bookingId);
  };

  const handleDelete = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    const client = clients.find(c => c.id === booking?.client_id);
    const bookingEvents = events.filter(e => e.booking_id === bookingId);

    const hasClientPayments = clientPaymentRecords.some(p => p.booking_id === bookingId);
    const hasStaffPayments = staffPaymentRecords.some(p =>
      bookingEvents.some(e => e.id === p.event_id)
    );

    if (hasClientPayments || hasStaffPayments) {
      setDeletingBookingData({
        id: bookingId,
        name: (booking as any)?.booking_name || 'Unnamed Booking',
        clientName: client?.name || 'Unknown Client'
      });
      setShowSelectiveDelete(true);
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

  const handleSelectiveDelete = async (bookingId: string, options: DeletionOptions) => {
    try {
      const deletionSteps: string[] = [];
      const bookingEvents = events.filter(e => e.booking_id === bookingId);
      const eventIds = bookingEvents.map(e => e.id);

      if (options.clientPayments) {
        const { error } = await supabase
          .from('client_payment_records')
          .delete()
          .eq('booking_id', bookingId);
        if (error) throw error;

        const count = clientPaymentRecords.filter(p => p.booking_id === bookingId).length;
        deletionSteps.push(`Deleted ${count} client payment record${count !== 1 ? 's' : ''}`);
      }

      if (options.staffAgreedPayments) {
        const agreedIds = staffPaymentRecords
          .filter(p => eventIds.includes(p.event_id || '') && p.type === 'agreed')
          .map(p => p.id);

        if (agreedIds.length > 0) {
          const { error } = await supabase
            .from('staff_payment_records')
            .delete()
            .in('id', agreedIds);
          if (error) throw error;
          deletionSteps.push(`Deleted ${agreedIds.length} staff agreed payment record${agreedIds.length !== 1 ? 's' : ''}`);
        }
      }

      if (options.staffMadePayments) {
        const madeIds = staffPaymentRecords
          .filter(p => eventIds.includes(p.event_id || '') && p.type === 'made')
          .map(p => p.id);

        if (madeIds.length > 0) {
          const { error } = await supabase
            .from('staff_payment_records')
            .delete()
            .in('id', madeIds);
          if (error) throw error;
          deletionSteps.push(`Deleted ${madeIds.length} staff made payment record${madeIds.length !== 1 ? 's' : ''}`);
        }
      }

      if (options.events && eventIds.length > 0) {
        const { error: workflowError } = await supabase
          .from('workflows')
          .delete()
          .in('event_id', eventIds);
        if (workflowError) throw workflowError;

        const { error: assignmentError } = await supabase
          .from('staff_assignments')
          .delete()
          .in('event_id', eventIds);
        if (assignmentError) throw assignmentError;

        const { error: eventError } = await supabase
          .from('events')
          .delete()
          .in('id', eventIds);
        if (eventError) throw eventError;

        deletionSteps.push(`Deleted ${eventIds.length} event${eventIds.length !== 1 ? 's' : ''} with tracking data`);
      }

      if (options.booking) {
        const { error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', bookingId);
        if (error) throw error;
        deletionSteps.push('Deleted booking');
      }

      await refreshData();
      showToast(
        `Successfully deleted: ${deletionSteps.join(', ')}`,
        'success'
      );
    } catch (error: any) {
      showToast(`Deletion failed: ${error.message}`, 'error');
    } finally {
      setShowSelectiveDelete(false);
      setDeletingBookingData(null);
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
            <h1 className="text-3xl font-bold text-gray-900">{user?.role === 'staff' ? 'My Bookings' : 'Bookings'}</h1>
            {canManageBookings(user) && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus size={20} className="mr-2" />
                New Booking
              </Button>
            )}
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

        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No bookings found' : `No ${filterType} bookings`}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search criteria'
                : filterType === 'active'
                ? 'Create your first booking to get started'
                : 'No past bookings to display'}
            </p>
            {canManageBookings(user) && !searchQuery && filterType === 'active' && (
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus size={20} className="mr-2" />
                New Booking
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBookings.map((booking) => (
              <RichBookingCard
                key={booking.id}
                booking={booking}
                onClick={() => setSelectedBooking(booking)}
                onEdit={handleCardEdit(booking)}
                onDelete={handleCardDelete(booking.id)}
              />
            ))}
          </div>
        )}
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

      {deletingBookingData && (
        <SelectiveDeleteModal
          bookingId={deletingBookingData.id}
          bookingName={deletingBookingData.name}
          clientName={deletingBookingData.clientName}
          isOpen={showSelectiveDelete}
          onClose={() => {
            setShowSelectiveDelete(false);
            setDeletingBookingData(null);
          }}
          onConfirm={handleSelectiveDelete}
        />
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onEdit={() => handleEdit(selectedBooking)}
        />
      )}

      {ToastComponent}
    </div>
  );
}
