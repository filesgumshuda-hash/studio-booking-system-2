import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useAppData } from '../../context/AppContext';

interface SelectiveDeleteModalProps {
  bookingId: string;
  bookingName: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string, options: DeletionOptions) => void;
}

export interface DeletionOptions {
  clientPayments: boolean;
  staffAgreedPayments: boolean;
  staffMadePayments: boolean;
  events: boolean;
  booking: boolean;
}

interface PaymentSummary {
  clientPayments: { count: number; amount: number };
  staffAgreedPayments: { count: number; amount: number };
  staffMadePayments: { count: number; amount: number };
  events: { count: number; hasWorkflowProgress: boolean };
}

export function SelectiveDeleteModal({
  bookingId,
  bookingName,
  clientName,
  isOpen,
  onClose,
  onConfirm,
}: SelectiveDeleteModalProps) {
  const {
    events,
    staffPaymentRecords,
    clientPaymentRecords,
    workflows,
    bookings
  } = useAppData();

  const [options, setOptions] = useState<DeletionOptions>({
    clientPayments: true,
    staffAgreedPayments: true,
    staffMadePayments: true,
    events: true,
    booking: true,
  });

  const summary = useMemo<PaymentSummary>(() => {
    const bookingEvents = events.filter(e => e.booking_id === bookingId);
    const booking = bookings.find(b => b.id === bookingId);

    const clientPayments = clientPaymentRecords.filter(p => p.booking_id === bookingId);
    const clientAmount = clientPayments.reduce((sum, p) => sum + p.amount, 0);

    const staffAgreed = staffPaymentRecords.filter(
      p => bookingEvents.some(e => e.id === p.event_id) && p.type === 'agreed'
    );
    const agreedAmount = staffAgreed.reduce((sum, p) => sum + p.amount, 0);

    const staffMade = staffPaymentRecords.filter(
      p => bookingEvents.some(e => e.id === p.event_id) && p.type === 'made'
    );
    const madeAmount = staffMade.reduce((sum, p) => sum + p.amount, 0);

    const eventWorkflows = workflows.filter(w =>
      bookingEvents.some(e => e.id === w.event_id)
    );

    const hasWorkflowProgress = eventWorkflows.some(w => {
      const hasStillProgress = Object.values(w.still_workflow || {}).some((step: any) => step?.completed);
      const hasReelProgress = Object.values(w.reel_workflow || {}).some((step: any) => step?.completed);
      const hasVideoProgress = Object.values(w.video_workflow || {}).some((step: any) => step?.completed);
      const hasPortraitProgress = Object.values(w.portrait_workflow || {}).some((step: any) => step?.completed);
      return hasStillProgress || hasReelProgress || hasVideoProgress || hasPortraitProgress;
    });

    return {
      clientPayments: { count: clientPayments.length, amount: clientAmount },
      staffAgreedPayments: { count: staffAgreed.length, amount: agreedAmount },
      staffMadePayments: { count: staffMade.length, amount: madeAmount },
      events: { count: bookingEvents.length, hasWorkflowProgress },
    };
  }, [bookingId, events, staffPaymentRecords, clientPaymentRecords, workflows, bookings]);

  const booking = bookings.find(b => b.id === bookingId);
  const packageAmount = (booking as any)?.package_amount || 0;
  const outstanding = packageAmount - summary.clientPayments.amount;

  const toggleOption = (key: keyof DeletionOptions) => {
    if (key === 'booking') return;
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const financialImpact = useMemo(() => {
    let totalRemoved = 0;
    if (options.clientPayments) totalRemoved += summary.clientPayments.amount;
    if (options.staffMadePayments) totalRemoved += summary.staffMadePayments.amount;
    return totalRemoved;
  }, [options, summary]);

  const warnings = useMemo(() => {
    const warns: string[] = [];

    if (!options.events && options.booking) {
      warns.push('Cannot keep events while deleting booking. Events will be automatically deleted.');
    }

    if (options.staffMadePayments && !options.staffAgreedPayments && summary.staffAgreedPayments.count > 0) {
      warns.push('Deleting made payments but keeping agreed payments will show full outstanding balances.');
    }

    if (summary.events.hasWorkflowProgress && options.events) {
      warns.push('Events have workflow progress. Deleting will remove all tracking data.');
    }

    return warns;
  }, [options, summary]);

  const handleDelete = () => {
    if (!options.booking) {
      alert('Booking must be deleted');
      return;
    }

    const confirmOptions = { ...options };
    if (confirmOptions.booking) {
      confirmOptions.events = true;
    }

    const confirmMessage = warnings.length > 0
      ? `${warnings.join('\n\n')}\n\nThis action cannot be undone. Continue?`
      : 'This action cannot be undone. Are you sure?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    onConfirm(bookingId, confirmOptions);
    onClose();
  };

  const hasAnyPayments =
    summary.clientPayments.count > 0 ||
    summary.staffAgreedPayments.count > 0 ||
    summary.staffMadePayments.count > 0;

  if (!hasAnyPayments) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Booking with Existing Payments?" size="xl">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-semibold text-yellow-900 mb-2">
                This booking has associated payment records
              </p>
              <p className="text-sm text-yellow-800">
                Booking: <span className="font-medium">{bookingName || 'Unnamed Booking'}</span>
                <br />
                Client: <span className="font-medium">{clientName}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Payment Summary</h3>

          {summary.clientPayments.count > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">📊</span> Client Payments
              </p>
              <div className="text-sm text-gray-700 space-y-1 ml-7">
                <div className="flex justify-between">
                  <span>Package Amount:</span>
                  <span className="font-medium">₹{packageAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-medium text-green-600">₹{summary.clientPayments.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding:</span>
                  <span className="font-medium text-orange-600">₹{outstanding.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Records:</span>
                  <span className="font-medium">{summary.clientPayments.count}</span>
                </div>
              </div>
            </div>
          )}

          {(summary.staffAgreedPayments.count > 0 || summary.staffMadePayments.count > 0) && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">💼</span> Staff Payments
              </p>
              <div className="text-sm text-gray-700 space-y-1 ml-7">
                {summary.staffAgreedPayments.count > 0 && (
                  <div className="flex justify-between">
                    <span>Agreed Payments:</span>
                    <span className="font-medium">₹{summary.staffAgreedPayments.amount.toLocaleString('en-IN')} ({summary.staffAgreedPayments.count} records)</span>
                  </div>
                )}
                {summary.staffMadePayments.count > 0 && (
                  <div className="flex justify-between">
                    <span>Made Payments:</span>
                    <span className="font-medium">₹{summary.staffMadePayments.amount.toLocaleString('en-IN')} ({summary.staffMadePayments.count} records)</span>
                  </div>
                )}
                {summary.staffAgreedPayments.count > 0 && summary.staffMadePayments.count > 0 && (
                  <div className="flex justify-between pt-1 border-t border-gray-300">
                    <span>Outstanding:</span>
                    <span className="font-medium text-orange-600">
                      ₹{(summary.staffAgreedPayments.amount - summary.staffMadePayments.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {summary.events.count > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <span className="text-lg">📅</span> Events
              </p>
              <div className="text-sm text-gray-700 ml-7">
                <p>{summary.events.count} event{summary.events.count !== 1 ? 's' : ''} with tracking data</p>
                {summary.events.hasWorkflowProgress && (
                  <p className="text-orange-600 mt-1">⚠️ Contains workflow progress</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Select what to delete:</h3>
          <div className="space-y-2">
            {summary.clientPayments.count > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {options.clientPayments ? (
                    <CheckSquare className="text-blue-600" size={20} />
                  ) : (
                    <Square className="text-gray-400" size={20} />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={options.clientPayments}
                  onChange={() => toggleOption('clientPayments')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Delete all client payments ({summary.clientPayments.count} record{summary.clientPayments.count !== 1 ? 's' : ''})
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Removes ₹{summary.clientPayments.amount.toLocaleString('en-IN')} in received payments
                  </p>
                </div>
              </label>
            )}

            {summary.staffAgreedPayments.count > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {options.staffAgreedPayments ? (
                    <CheckSquare className="text-blue-600" size={20} />
                  ) : (
                    <Square className="text-gray-400" size={20} />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={options.staffAgreedPayments}
                  onChange={() => toggleOption('staffAgreedPayments')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Delete all staff agreed payments ({summary.staffAgreedPayments.count} record{summary.staffAgreedPayments.count !== 1 ? 's' : ''})
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Removes ₹{summary.staffAgreedPayments.amount.toLocaleString('en-IN')} in payment agreements
                  </p>
                </div>
              </label>
            )}

            {summary.staffMadePayments.count > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {options.staffMadePayments ? (
                    <CheckSquare className="text-blue-600" size={20} />
                  ) : (
                    <Square className="text-gray-400" size={20} />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={options.staffMadePayments}
                  onChange={() => toggleOption('staffMadePayments')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Delete all staff made payments ({summary.staffMadePayments.count} record{summary.staffMadePayments.count !== 1 ? 's' : ''})
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Removes ₹{summary.staffMadePayments.amount.toLocaleString('en-IN')} in completed payments
                  </p>
                </div>
              </label>
            )}

            {summary.events.count > 0 && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {options.events ? (
                    <CheckSquare className="text-blue-600" size={20} />
                  ) : (
                    <Square className="text-gray-400" size={20} />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={options.events}
                  onChange={() => toggleOption('events')}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Delete all events and tracking data ({summary.events.count} event{summary.events.count !== 1 ? 's' : ''})
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Removes workflow tracking and event details
                  </p>
                </div>
              </label>
            )}

            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-300 bg-gray-50 opacity-75">
              <div className="flex-shrink-0 mt-0.5">
                <CheckSquare className="text-gray-500" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-700">
                  Delete the booking itself
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ℹ️ Required - checked by default, cannot uncheck
                </p>
              </div>
            </div>
          </div>
        </div>

        {financialImpact > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="font-semibold text-orange-900">Financial Impact</p>
            <p className="text-sm text-orange-800 mt-1">
              This will remove ₹{financialImpact.toLocaleString('en-IN')} from your financial records.
            </p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-semibold text-red-900 mb-2">Warnings</p>
            <ul className="text-sm text-red-800 space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <p className="text-sm text-gray-700 flex items-center gap-2">
            <AlertTriangle size={16} className="text-gray-600" />
            <strong>Warning:</strong> Deletion is permanent and cannot be undone
          </p>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Selected
          </Button>
        </div>
      </div>
    </Modal>
  );
}
