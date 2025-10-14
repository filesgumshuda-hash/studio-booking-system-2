import { ClientPaymentRecord, Client, Booking, Event } from '../context/AppContext';

export interface ClientSummary {
  clientId: string;
  clientName: string;
  totalOwed: number;
  totalPaid: number;
  totalDue: number;
}

export interface BookingAmount {
  bookingId: string;
  bookingName: string;
  eventCount: number;
  bookingDate: string;
  amount: number;
}

export function getTotalOwed(clientId: string, bookings: Booking[]): number {
  return bookings
    .filter((b) => b.client_id === clientId)
    .reduce((sum, b) => sum + Number(b.package_amount || 0), 0);
}

export function getTotalPaid(clientId: string, payments: ClientPaymentRecord[]): number {
  return payments
    .filter((p) => p.client_id === clientId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function getDue(clientId: string, bookings: Booking[], payments: ClientPaymentRecord[]): number {
  return getTotalOwed(clientId, bookings) - getTotalPaid(clientId, payments);
}

export function getBookingBalance(bookingId: string, booking: Booking, payments: ClientPaymentRecord[]): number {
  const paid = payments
    .filter((p) => p.booking_id === bookingId)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  return Number(booking.package_amount || 0) - paid;
}

export function calculateClientSummary(
  clientId: string,
  clientName: string,
  bookings: Booking[],
  payments: ClientPaymentRecord[]
): ClientSummary {
  const totalOwed = getTotalOwed(clientId, bookings);
  const totalPaid = getTotalPaid(clientId, payments);
  const totalDue = totalOwed - totalPaid;

  return {
    clientId,
    clientName,
    totalOwed,
    totalPaid,
    totalDue,
  };
}

export function getTop10Clients(
  clients: Client[],
  bookings: Booking[],
  payments: ClientPaymentRecord[]
): ClientSummary[] {
  const clientsWithPayments = clients
    .map((c) => calculateClientSummary(c.id, c.name, bookings, payments))
    .filter((summary) => summary.totalOwed > 0 || summary.totalPaid > 0);

  return clientsWithPayments
    .sort((a, b) => {
      if (b.totalDue !== a.totalDue) {
        return b.totalDue - a.totalDue;
      }
      if (b.totalOwed !== a.totalOwed) {
        return b.totalOwed - a.totalOwed;
      }
      return a.clientName.localeCompare(b.clientName);
    })
    .slice(0, 10);
}

export function getClientBookings(
  clientId: string,
  bookings: Booking[],
  events: Event[],
  payments: ClientPaymentRecord[]
): BookingAmount[] {
  const clientBookings = bookings.filter((b) => b.client_id === clientId);

  const bookingAmounts: BookingAmount[] = clientBookings.map((booking) => {
    const bookingEvents = events.filter((e) => e.booking_id === booking.id);
    const eventCount = bookingEvents.length;

    const primaryEvent = bookingEvents.sort((a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )[0];

    return {
      bookingId: booking.id,
      bookingName: booking.booking_name || `Booking ${booking.id.slice(0, 8)}`,
      eventCount,
      bookingDate: primaryEvent?.event_date || booking.created_at,
      amount: Number(booking.package_amount || 0),
    };
  });

  return bookingAmounts.sort((a, b) => {
    const dateA = new Date(a.bookingDate);
    const dateB = new Date(b.bookingDate);
    return dateB.getTime() - dateA.getTime();
  });
}

export function getClientPayments(
  clientId: string,
  payments: ClientPaymentRecord[],
  bookings: Booking[]
): ClientPaymentRecord[] {
  return payments
    .filter((p) => p.client_id === clientId)
    .map((p) => {
      const booking = bookings.find((b) => b.id === p.booking_id);
      return {
        ...p,
        booking: booking ? {
          ...booking,
          booking_name: booking.booking_name || `Booking ${booking.id.slice(0, 8)}`,
        } : p.booking,
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.payment_date);
      const dateB = new Date(b.payment_date);
      return dateB.getTime() - dateA.getTime();
    });
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
