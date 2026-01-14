import { ClientPaymentRecord, Client, Booking, Event } from '../context/AppContext';

export interface ClientSummary {
  clientId: string;
  clientName: string;
  packageAmount: number;
  totalAgreed: number;
  totalReceived: number;
  outstanding: number;
}

export interface BookingAmount {
  bookingId: string;
  bookingName: string;
  eventCount: number;
  firstEventDate: string;
  agreed: number;
  received: number;
  due: number;
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

export function getTotalReceived(clientId: string, payments: ClientPaymentRecord[]): number {
  return payments
    .filter((p) => p.client_id === clientId && p.payment_status === 'received')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function getTotalAgreed(clientId: string, payments: ClientPaymentRecord[]): number {
  return payments
    .filter((p) => p.client_id === clientId && p.payment_status === 'agreed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function getDue(clientId: string, bookings: Booking[], payments: ClientPaymentRecord[]): number {
  return getTotalOwed(clientId, bookings) - getTotalReceived(clientId, payments);
}

export function getBookingBalance(bookingId: string, booking: Booking, payments: ClientPaymentRecord[]): number {
  const received = payments
    .filter((p) => p.booking_id === bookingId && p.payment_status === 'received')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  return Number(booking.package_amount || 0) - received;
}

export function calculateClientSummary(
  clientId: string,
  clientName: string,
  bookings: Booking[],
  payments: ClientPaymentRecord[]
): ClientSummary {
  const packageAmount = bookings
    .filter(b => b.client_id === clientId)
    .reduce((sum, b) => sum + Number(b.package_amount || 0), 0);

  const totalAgreed = payments
    .filter(p => p.client_id === clientId && p.payment_status === 'agreed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalReceived = payments
    .filter(p => p.client_id === clientId && p.payment_status === 'received')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const outstanding = totalAgreed - totalReceived;

  return {
    clientId,
    clientName,
    packageAmount,
    totalAgreed,
    totalReceived,
    outstanding,
  };
}

export function getTop10Clients(
  clients: Client[],
  bookings: Booking[],
  payments: ClientPaymentRecord[]
): ClientSummary[] {
  const clientsWithPayments = clients
    .filter(c => {
      return bookings.some(b => b.client_id === c.id);
    })
    .map((c) => calculateClientSummary(c.id, c.name, bookings, payments))
    .filter((summary) => summary.totalAgreed > 0 || summary.totalReceived > 0);

  return clientsWithPayments
    .sort((a, b) => {
      if (b.outstanding !== a.outstanding) {
        return b.outstanding - a.outstanding;
      }
      if (b.totalAgreed !== a.totalAgreed) {
        return b.totalAgreed - a.totalAgreed;
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

    const sortedEvents = bookingEvents.sort((a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    const firstEvent = sortedEvents[0];

    const agreed = payments
      .filter((p) => p.booking_id === booking.id && p.payment_status === 'agreed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const received = payments
      .filter((p) => p.booking_id === booking.id && p.payment_status === 'received')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const due = agreed - received;

    return {
      bookingId: booking.id,
      bookingName: booking.booking_name || `Booking ${booking.id.slice(0, 8)}`,
      eventCount,
      firstEventDate: firstEvent?.event_date || booking.created_at,
      agreed,
      received,
      due,
    };
  });

  return bookingAmounts.sort((a, b) => {
    const dateA = new Date(a.firstEventDate);
    const dateB = new Date(b.firstEventDate);
    return dateA.getTime() - dateB.getTime();
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

export function getOutstandingColorClass(outstanding: number): string {
  if (outstanding <= 0) {
    return 'text-green-600';
  } else if (outstanding > 0 && outstanding <= 50000) {
    return 'text-orange-600';
  } else {
    return 'text-red-600';
  }
}
