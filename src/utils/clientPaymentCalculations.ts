import { ClientPaymentRecord, Client, Booking, Event } from '../context/AppContext';

export interface ClientSummary {
  clientId: string;
  clientName: string;
  packageAmount: number;
  totalAgreed: number;
  totalReceived: number;
  outstanding: number;
  firstEventDate: string | null;
  lastEventDate: string | null;
  dateRange: string | null;
  lastEventPassed: boolean;
}

export interface BookingAmount {
  bookingId: string;
  bookingName: string;
  eventCount: number;
  firstEventDate: string;
  lastEventDate: string | null;
  dateRange: string | null;
  lastEventPassed: boolean;
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

export function getClientDateRange(
  clientId: string,
  bookings: Booking[],
  events: Event[]
): { firstDate: Date | null; lastDate: Date | null; dateRange: string | null } {
  const clientBookings = bookings.filter((b) => b.client_id === clientId);
  const allEventDates: Date[] = [];

  clientBookings.forEach((booking) => {
    const bookingEvents = events.filter((e) => e.booking_id === booking.id);
    bookingEvents.forEach((event) => {
      allEventDates.push(new Date(event.event_date));
    });
  });

  if (allEventDates.length === 0) {
    return { firstDate: null, lastDate: null, dateRange: null };
  }

  const firstDate = new Date(Math.min(...allEventDates.map((d) => d.getTime())));
  const lastDate = new Date(Math.max(...allEventDates.map((d) => d.getTime())));

  const dateRange = `${formatDate(firstDate.toISOString())} - ${formatDate(lastDate.toISOString())}`;

  return { firstDate, lastDate, dateRange };
}

export function hasLastEventPassed(lastEventDate: Date | null): boolean {
  if (!lastEventDate) return false;

  const lastDate = new Date(lastEventDate);
  lastDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return lastDate < today;
}

export function calculateClientSummary(
  clientId: string,
  clientName: string,
  bookings: Booking[],
  payments: ClientPaymentRecord[],
  events: Event[] = [],
  filterByEventDate: boolean = true
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

  let outstanding: number;
  if (filterByEventDate) {
    const bookingAmounts = getClientBookings(clientId, bookings, events, payments);
    outstanding = bookingAmounts
      .filter(ba => ba.lastEventPassed)
      .reduce((sum, ba) => sum + ba.due, 0);
  } else {
    outstanding = totalAgreed - totalReceived;
  }

  const dateRangeInfo = getClientDateRange(clientId, bookings, events);
  const lastEventPassed = hasLastEventPassed(dateRangeInfo.lastDate);

  return {
    clientId,
    clientName,
    packageAmount,
    totalAgreed,
    totalReceived,
    outstanding,
    firstEventDate: dateRangeInfo.firstDate ? dateRangeInfo.firstDate.toISOString() : null,
    lastEventDate: dateRangeInfo.lastDate ? dateRangeInfo.lastDate.toISOString() : null,
    dateRange: dateRangeInfo.dateRange,
    lastEventPassed,
  };
}

export type OutstandingFilter = 'past' | 'future' | 'all';

export function getTop10Clients(
  clients: Client[],
  bookings: Booking[],
  payments: ClientPaymentRecord[],
  events: Event[] = [],
  filter: OutstandingFilter = 'past'
): ClientSummary[] {
  const clientsWithPayments = clients
    .filter(c => {
      return bookings.some(b => b.client_id === c.id);
    })
    .map((c) => calculateClientSummary(c.id, c.name, bookings, payments, events))
    .filter((summary) => summary.totalAgreed > 0 || summary.totalReceived > 0)
    .filter((summary) => summary.outstanding > 0);

  let filteredClients = clientsWithPayments;

  if (filter === 'past') {
    filteredClients = clientsWithPayments.filter(c => c.lastEventPassed);
  } else if (filter === 'future') {
    filteredClients = clientsWithPayments.filter(c => !c.lastEventPassed);
  }

  return filteredClients
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
    const lastEvent = sortedEvents[sortedEvents.length - 1];

    const firstEventDate = firstEvent?.event_date || booking.created_at;
    const lastEventDate = lastEvent?.event_date || null;

    let dateRange: string | null = null;
    if (firstEvent && lastEvent) {
      if (firstEvent.event_date === lastEvent.event_date) {
        dateRange = formatDate(firstEvent.event_date);
      } else {
        dateRange = `${formatDate(firstEvent.event_date)} - ${formatDate(lastEvent.event_date)}`;
      }
    } else if (firstEvent) {
      dateRange = formatDate(firstEvent.event_date);
    }

    const lastEventPassed = lastEventDate ? hasLastEventPassed(new Date(lastEventDate)) : false;

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
      firstEventDate,
      lastEventDate,
      dateRange,
      lastEventPassed,
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
