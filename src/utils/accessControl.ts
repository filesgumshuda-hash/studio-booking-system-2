import { User } from '../context/AuthContext';
import { Booking, Event, StaffPaymentRecord } from '../context/AppContext';

export function getAccessibleBookings(user: User | null, allBookings: Booking[], allEvents: Event[]): Booking[] {
  if (!user) return [];

  if (user.role === 'admin' || user.role === 'manager') {
    return allBookings;
  }

  if (user.role === 'staff' && user.staffId) {
    return allBookings.filter(booking => {
      const bookingEvents = allEvents.filter(e => e.booking_id === booking.id);
      return bookingEvents.some(event => {
        return event.staff_assignments?.some(assignment => assignment.staff_id === user.staffId);
      });
    });
  }

  return [];
}

export function getAccessibleEvents(user: User | null, allEvents: Event[]): Event[] {
  if (!user) return [];

  if (user.role === 'admin' || user.role === 'manager') {
    return allEvents;
  }

  if (user.role === 'staff' && user.staffId) {
    return allEvents.filter(event => {
      return event.staff_assignments?.some(assignment => assignment.staff_id === user.staffId);
    });
  }

  return [];
}

export function getAccessiblePayments(user: User | null, allPayments: StaffPaymentRecord[]): StaffPaymentRecord[] {
  if (!user) return [];

  if (user.role === 'admin') {
    return allPayments;
  }

  if ((user.role === 'manager' || user.role === 'staff') && user.staffId) {
    return allPayments.filter(payment => payment.staff_id === user.staffId);
  }

  return [];
}

export function canManagePayments(user: User | null): boolean {
  return user?.role === 'admin';
}

export function canManageBookings(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'manager';
}

export function canDeleteBookings(user: User | null): boolean {
  return user?.role === 'admin';
}

export function canViewAllStaff(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'manager';
}

export function canUpdateEventTracking(user: User | null, event: Event): boolean {
  if (!user) return false;

  if (user.role === 'admin' || user.role === 'manager') {
    return true;
  }

  if (user.role === 'staff' && user.staffId) {
    return event.staff_assignments?.some(assignment => assignment.staff_id === user.staffId) || false;
  }

  return false;
}
