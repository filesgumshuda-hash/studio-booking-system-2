import { Payment, PaymentTransaction, StaffPaymentSummary, Event, Staff } from '../context/AppContext';

export function groupPaymentsByStaff(
  payments: Payment[],
  transactions: PaymentTransaction[],
  events: Event[],
  clients: any[]
): StaffPaymentSummary[] {
  const staffPaymentsMap = new Map<string, Payment[]>();

  payments.forEach((payment) => {
    const staffId = payment.staff_id;
    if (!staffPaymentsMap.has(staffId)) {
      staffPaymentsMap.set(staffId, []);
    }

    const paymentWithTransactions = {
      ...payment,
      transactions: transactions.filter((t) => t.payment_id === payment.id),
    };

    staffPaymentsMap.get(staffId)!.push(paymentWithTransactions);
  });

  const summaries: StaffPaymentSummary[] = [];

  staffPaymentsMap.forEach((paymentRecords, staffId) => {
    if (paymentRecords.length === 0) return;

    const firstPayment = paymentRecords[0];
    const staff = firstPayment.staff;

    if (!staff) return;

    const totalAgreed = paymentRecords.reduce((sum, p) => sum + p.agreed_amount, 0);
    const totalPaid = paymentRecords.reduce((sum, p) => sum + p.amount_paid, 0);
    const totalBalance = totalAgreed - totalPaid;

    const overallStatus = calculateStaffOverallStatus(paymentRecords, events);

    const eventCount = paymentRecords.filter((p) => p.event_id !== null).length;

    summaries.push({
      staff_id: staffId,
      staff_name: staff.name,
      staff,
      total_agreed: totalAgreed,
      total_paid: totalPaid,
      total_balance: totalBalance,
      overall_status: overallStatus,
      payment_records: paymentRecords,
      event_count: eventCount,
    });
  });

  return summaries.sort((a, b) => {
    if (a.overall_status === 'overdue' && b.overall_status !== 'overdue') return -1;
    if (a.overall_status !== 'overdue' && b.overall_status === 'overdue') return 1;
    if (a.overall_status === 'pending' && b.overall_status !== 'pending') return -1;
    if (a.overall_status !== 'pending' && b.overall_status === 'pending') return 1;
    if (a.overall_status === 'partial' && b.overall_status === 'paid') return -1;
    if (a.overall_status === 'paid' && b.overall_status === 'partial') return 1;
    return a.staff_name.localeCompare(b.staff_name);
  });
}

export function calculateStaffOverallStatus(
  paymentRecords: Payment[],
  events: Event[]
): 'pending' | 'partial' | 'paid' | 'overdue' {
  const hasOverdue = paymentRecords.some((p) => {
    if (p.event_id && p.amount_paid < p.agreed_amount) {
      const event = events.find((e) => e.id === p.event_id);
      if (event) {
        const eventDate = new Date(event.event_date);
        const overdueDate = new Date(eventDate);
        overdueDate.setDate(overdueDate.getDate() + 30);
        return new Date() > overdueDate;
      }
    }
    return false;
  });

  if (hasOverdue) return 'overdue';

  const hasPartial = paymentRecords.some(
    (p) => p.amount_paid > 0 && p.amount_paid < p.agreed_amount
  );

  if (hasPartial) return 'partial';

  const hasPending = paymentRecords.some((p) => p.amount_paid === 0 && p.agreed_amount > 0);

  if (hasPending) return 'pending';

  return 'paid';
}

export function isPaymentOverdue(payment: Payment, event?: Event): boolean {
  if (!event || payment.amount_paid >= payment.agreed_amount) return false;

  const eventDate = new Date(event.event_date);
  const overdueDate = new Date(eventDate);
  overdueDate.setDate(overdueDate.getDate() + 30);

  return new Date() > overdueDate;
}

export function calculateRemainingBalance(agreedAmount: number, amountPaid: number): number {
  return Math.max(0, agreedAmount - amountPaid);
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export function getStatusColor(status: 'pending' | 'partial' | 'paid' | 'overdue'): string {
  const colorMap = {
    pending: 'bg-orange-100 text-orange-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  };
  return colorMap[status];
}

export function getStatusLabel(status: 'pending' | 'partial' | 'paid' | 'overdue'): string {
  const labelMap = {
    pending: 'Pending',
    partial: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
  };
  return labelMap[status];
}

export function validatePaymentAmount(
  amount: number,
  agreedAmount: number,
  amountPaid: number
): string | null {
  if (amount <= 0) {
    return 'Amount must be greater than 0';
  }

  const remainingBalance = agreedAmount - amountPaid;
  if (amount > remainingBalance) {
    return `Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`;
  }

  return null;
}

export function validateAgreedAmount(amount: number): string | null {
  if (amount <= 0) {
    return 'Agreed amount must be greater than 0';
  }

  if (amount > 9999999.99) {
    return 'Agreed amount cannot exceed ₹99,99,999.99';
  }

  return null;
}

export function getPaymentModeLabel(mode: string): string {
  const modeMap: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    upi: 'UPI',
    cheque: 'Cheque',
    others: 'Others',
  };
  return modeMap[mode] || mode;
}
