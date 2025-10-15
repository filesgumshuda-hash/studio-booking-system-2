import { Event, Booking, Client } from '../context/AppContext';

export interface EventDisplayInfo {
  eventName: string;
  bookingName: string;
  clientName: string;
  formattedDate: string;
  fullDisplay: string;
}

export function generateBookingName(
  clientName: string,
  primaryEventType: string,
  eventCount: number
): string {
  const firstName = clientName.split(' ')[0];

  let eventDescriptor = primaryEventType;

  if (eventCount > 1) {
    const weddingKeywords = ['wedding', 'pre-wedding', 'reception', 'haldi', 'ring', 'sangeet'];
    const hasWeddingEvent = weddingKeywords.some(keyword =>
      primaryEventType.toLowerCase().includes(keyword)
    );

    if (hasWeddingEvent) {
      eventDescriptor = 'Wedding Package';
    } else {
      eventDescriptor = 'Photography Package';
    }
  }

  const possessive = firstName.endsWith('s') || firstName.endsWith('S')
    ? `${firstName}'`
    : `${firstName}'s`;

  return `${possessive} ${eventDescriptor}`;
}

export function getBookingDisplayName(booking: Booking | undefined, clientName?: string): string {
  if (!booking) {
    return 'Unknown Booking';
  }

  if (booking.booking_name && booking.booking_name.trim() !== '') {
    return booking.booking_name;
  }

  const client = booking.client || (clientName ? { name: clientName } : null);
  if (client && client.name) {
    const firstName = client.name.split(' ')[0];
    const possessive = firstName.endsWith('s') || firstName.endsWith('S')
      ? `${firstName}'`
      : `${firstName}'s`;
    return `${possessive} Booking`;
  }

  return 'Unknown Booking';
}

export function getEventDisplayInfo(event: Event): EventDisplayInfo {
  const eventName = event.event_name || 'Untitled Event';

  const bookingName = getBookingDisplayName(event.booking);

  const clientName = event.booking?.client?.name || 'Unknown Client';

  const formattedDate = new Date(event.event_date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const fullDisplay = `${eventName} (${bookingName}) - ${formattedDate}`;

  return {
    eventName,
    bookingName,
    clientName,
    formattedDate,
    fullDisplay,
  };
}

export function formatEventForDropdown(event: Event): string {
  return getEventDisplayInfo(event).fullDisplay;
}
