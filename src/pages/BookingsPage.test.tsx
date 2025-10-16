import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { BookingsPage } from './BookingsPage';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe('BookingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the bookings page', () => {
    renderWithProviders(<BookingsPage />);

    expect(screen.getByText('Bookings')).toBeInTheDocument();
  });

  it('displays "New Booking" button for admin users', () => {
    renderWithProviders(<BookingsPage />, {
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        staff_id: null,
      },
    });

    expect(screen.getByText('New Booking')).toBeInTheDocument();
  });

  it('shows empty state when no bookings exist', () => {
    renderWithProviders(<BookingsPage />, {
      appData: {
        bookings: [],
        events: [],
        clients: [],
      },
    });

    expect(screen.getByText(/No active bookings/)).toBeInTheDocument();
  });

  it('allows filtering between active and past bookings', () => {
    renderWithProviders(<BookingsPage />);

    const filterSelect = screen.getByRole('combobox');
    expect(filterSelect).toHaveValue('active');

    fireEvent.change(filterSelect, { target: { value: 'past' } });
    expect(filterSelect).toHaveValue('past');
  });

  it('allows searching for bookings', () => {
    renderWithProviders(<BookingsPage />);

    const searchInput = screen.getByPlaceholderText(/Search by client/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    expect(searchInput).toHaveValue('John');
  });

  it('opens booking detail modal when card is clicked', async () => {
    const mockBooking = {
      id: 'booking-1',
      client_id: 'client-1',
      booking_name: 'Test Wedding',
      package_amount: 100000,
      notes: 'Test notes',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      client: {
        id: 'client-1',
        name: 'Jane Smith',
        contact_number: '1234567890',
        email: 'jane@example.com',
        notes: '',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    };

    renderWithProviders(<BookingsPage />, {
      appData: {
        bookings: [mockBooking],
        events: [],
        clients: [mockBooking.client],
      },
    });

    const bookingCard = screen.getByText('Jane Smith');
    fireEvent.click(bookingCard);

    await waitFor(() => {
      expect(screen.getByText(/Booking Details:/)).toBeInTheDocument();
    });
  });

  it('opens booking form when "New Booking" button is clicked', async () => {
    renderWithProviders(<BookingsPage />, {
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        staff_id: null,
      },
    });

    const newBookingButton = screen.getByText('New Booking');
    fireEvent.click(newBookingButton);

    await waitFor(() => {
      expect(screen.getByText(/New Booking/)).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    const mockBooking = {
      id: 'booking-1',
      client_id: 'client-1',
      booking_name: 'Test Wedding',
      package_amount: 100000,
      notes: 'Test notes',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      client: {
        id: 'client-1',
        name: 'Jane Smith',
        contact_number: '1234567890',
        email: 'jane@example.com',
        notes: '',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    };

    renderWithProviders(<BookingsPage />, {
      appData: {
        bookings: [mockBooking],
        events: [],
        clients: [mockBooking.client],
      },
    });

    const bookingCard = screen.getByText('Jane Smith');
    fireEvent.click(bookingCard);

    await waitFor(() => {
      expect(screen.getByText(/Booking Details:/)).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/Booking Details:/)).not.toBeInTheDocument();
    });
  });
});
