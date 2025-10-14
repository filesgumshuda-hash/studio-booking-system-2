import { StaffPaymentRecord, Staff, Event, StaffAssignment } from '../context/AppContext';

export interface StaffSummary {
  staffId: string;
  staffName: string;
  totalAgreed: number;
  totalPaid: number;
  totalDue: number;
}

export interface EventAmount {
  eventId: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  amount: number;
}

export function getTotalAgreed(staffId: string, payments: StaffPaymentRecord[]): number {
  return payments
    .filter((p) => p.staff_id === staffId && p.type === 'agreed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function getTotalPaid(staffId: string, payments: StaffPaymentRecord[]): number {
  return payments
    .filter((p) => p.staff_id === staffId && p.type === 'made')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function getDue(staffId: string, payments: StaffPaymentRecord[]): number {
  return getTotalAgreed(staffId, payments) - getTotalPaid(staffId, payments);
}

export function getEventAmount(staffId: string, eventId: string, payments: StaffPaymentRecord[]): number {
  return payments
    .filter((p) => p.staff_id === staffId && p.event_id === eventId && p.type === 'agreed')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

export function calculateStaffSummary(
  staffId: string,
  staffName: string,
  payments: StaffPaymentRecord[]
): StaffSummary {
  const totalAgreed = getTotalAgreed(staffId, payments);
  const totalPaid = getTotalPaid(staffId, payments);
  const totalDue = totalAgreed - totalPaid;

  return {
    staffId,
    staffName,
    totalAgreed,
    totalPaid,
    totalDue,
  };
}

export function getTop10Staff(
  staff: Staff[],
  payments: StaffPaymentRecord[]
): StaffSummary[] {
  const staffWithPayments = staff
    .map((s) => calculateStaffSummary(s.id, s.name, payments))
    .filter((summary) => summary.totalAgreed > 0 || summary.totalPaid > 0);

  return staffWithPayments
    .sort((a, b) => {
      if (b.totalDue !== a.totalDue) {
        return b.totalDue - a.totalDue;
      }
      if (b.totalAgreed !== a.totalAgreed) {
        return b.totalAgreed - a.totalAgreed;
      }
      return a.staffName.localeCompare(b.staffName);
    })
    .slice(0, 10);
}

export function getStaffEvents(
  staffId: string,
  events: Event[],
  staffAssignments: StaffAssignment[],
  payments: StaffPaymentRecord[]
): EventAmount[] {
  const assignedEventIds = staffAssignments
    .filter((sa) => sa.staff_id === staffId)
    .map((sa) => sa.event_id);

  const uniqueEventIds = [...new Set(assignedEventIds)];

  const eventAmounts: EventAmount[] = uniqueEventIds
    .map((eventId) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return null;

      const amount = getEventAmount(staffId, eventId, payments);

      return {
        eventId: event.id,
        eventName: event.event_name,
        clientName: event.booking?.client?.name || 'Unknown Client',
        eventDate: event.event_date,
        amount,
      };
    })
    .filter((ea): ea is EventAmount => ea !== null);

  return eventAmounts.sort((a, b) => {
    const dateA = new Date(a.eventDate);
    const dateB = new Date(b.eventDate);
    return dateA.getTime() - dateB.getTime();
  });
}

export function getStaffPayments(
  staffId: string,
  payments: StaffPaymentRecord[]
): StaffPaymentRecord[] {
  return payments
    .filter((p) => p.staff_id === staffId)
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
