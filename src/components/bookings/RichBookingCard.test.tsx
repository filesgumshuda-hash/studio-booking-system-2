import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { RichBookingCard } from './RichBookingCard';
import { Booking } from '../../context/AppContext';

describe('RichBookingCard', () => {
  const mockBooking: Booking = {
    id: 'booking-1',
    client_id: 'client-1',
    booking_name: 'Test Wedding',
    package_amount: 100000,
    notes: 'Test notes',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    client: {
      id: 'client-1',
      name: 'John Doe',
      contact_number: '1234567890',
      email: 'john@example.com',
      notes: '',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
  };

  const mockOnClick = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders booking information correctly', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Test Wedding')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Enter key is pressed', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when Space key is pressed', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('displays payment status', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/₹/)).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Progress:')).toBeInTheDocument();
    expect(screen.getByText(/\d+%/)).toBeInTheDocument();
  });

  it('displays status badge', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const statusBadge = screen.getByText(/Shoot Scheduled|In Progress|Post-Production|Delivered/);
    expect(statusBadge).toBeInTheDocument();
  });

  it('shows "No events scheduled" when there are no events', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
      {
        appData: {
          events: [],
        },
      }
    );

    expect(screen.getByText('No events scheduled')).toBeInTheDocument();
  });

  it('displays photographer count', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/\d+ photographer/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(
      <RichBookingCard
        booking={mockBooking}
        onClick={mockOnClick}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });
});
