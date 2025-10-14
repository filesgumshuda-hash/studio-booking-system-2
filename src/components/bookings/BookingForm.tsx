import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useAppData, Booking } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { validatePhoneNumber, validateEmail, ValidationError } from '../../utils/validation';

interface EventFormData {
  id?: string;
  event_name: string;
  event_date: string;
  time_slot: 'morning' | 'afternoon' | 'evening' | 'fullDay';
  venue: string;
  notes: string;
  photographers_required: number;
  videographers_required: number;
  drone_operators_required: number;
  editors_required: number;
  assigned_staff: string[];
}

interface BookingFormProps {
  booking?: Booking;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BookingForm({ booking, onSuccess, onCancel }: BookingFormProps) {
  const { staff, clients, refreshData } = useAppData();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [clientSelectionMode, setClientSelectionMode] = useState<'existing' | 'new'>('new');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const [clientName, setClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [alternateContact, setAlternateContact] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [bookingReference, setBookingReference] = useState('');

  const [originalEventIds, setOriginalEventIds] = useState<string[]>([]);

  const [events, setEvents] = useState<EventFormData[]>([
    {
      event_name: '',
      event_date: '',
      time_slot: 'morning',
      venue: '',
      notes: '',
      photographers_required: 0,
      videographers_required: 0,
      drone_operators_required: 0,
      editors_required: 0,
      assigned_staff: [],
    },
  ]);

  useEffect(() => {
    if (booking) {
      const { client } = booking;
      if (client) {
        setClientName(client.name || '');
        setContactNumber(client.contact_number || '');
        setEmail(client.email || '');
        setAlternateContact(client.alternate_contact || '');
        setClientNotes(client.notes || '');
      }
    }
  }, [booking]);

  useEffect(() => {
    if (booking && booking.events && booking.events.length > 0) {
      const eventIds = booking.events.map(event => event.id);
      setOriginalEventIds(eventIds);

      const loadedEvents: EventFormData[] = booking.events.map(event => {
        const eventAssignments = event.staff_assignments || [];
        return {
          id: event.id,
          event_name: event.event_name,
          event_date: event.event_date,
          time_slot: event.time_slot,
          venue: event.venue,
          notes: event.notes || '',
          photographers_required: event.photographers_required,
          videographers_required: event.videographers_required,
          drone_operators_required: event.drone_operators_required,
          editors_required: event.editors_required,
          assigned_staff: eventAssignments.map(sa => sa.staff_id),
        };
      });
      setEvents(loadedEvents);
    }
  }, [booking]);

  const addEvent = () => {
    setEvents([
      ...events,
      {
        event_name: '',
        event_date: '',
        time_slot: 'morning',
        venue: '',
        notes: '',
        photographers_required: 0,
        videographers_required: 0,
        drone_operators_required: 0,
        editors_required: 0,
        assigned_staff: [],
      },
    ]);
  };

  const removeEvent = (index: number) => {
    if (events.length === 1) {
      setErrors({ ...errors, events: 'At least one event is required' });
      return;
    }
    setEvents(events.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, field: string, value: any) => {
    const newEvents = [...events];
    (newEvents[index] as any)[field] = value;
    setEvents(newEvents);
  };

  const toggleStaffAssignment = (eventIndex: number, staffId: string) => {
    const newEvents = [...events];
    const assignedStaff = newEvents[eventIndex].assigned_staff;
    if (assignedStaff.includes(staffId)) {
      newEvents[eventIndex].assigned_staff = assignedStaff.filter(id => id !== staffId);
    } else {
      newEvents[eventIndex].assigned_staff = [...assignedStaff, staffId];
    }
    setEvents(newEvents);
  };

  const filteredClients = clients.filter((c) => {
    const query = clientSearchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.contact_number.includes(query)
    );
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const generateBookingReference = async () => {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);

    const count = data ? data.length + 1 : 1;
    return `BK-${year}-${count.toString().padStart(3, '0')}`;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (clientSelectionMode === 'existing') {
      if (!selectedClientId) newErrors.selectedClient = 'Please select a client';
    } else {
      if (!clientName.trim()) newErrors.clientName = 'Client name is required';
      else if (clientName.trim().length < 2) newErrors.clientName = 'Client name must be at least 2 characters';

      if (!contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
      else if (!validatePhoneNumber(contactNumber)) newErrors.contactNumber = 'Invalid phone number (must be 10 digits)';

      if (email && !validateEmail(email)) newErrors.email = 'Invalid email format';
      if (alternateContact && !validatePhoneNumber(alternateContact)) newErrors.alternateContact = 'Invalid phone number';
    }

    events.forEach((event, idx) => {
      if (!event.event_name.trim()) newErrors[`event_${idx}_name`] = 'Event name is required';
      if (!event.event_date) newErrors[`event_${idx}_date`] = 'Event date is required';
      else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        if (!booking && event.event_date < todayString) newErrors[`event_${idx}_date`] = 'Event date cannot be in the past';
      }
      if (!event.venue.trim()) newErrors[`event_${idx}_venue`] = 'Venue is required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let clientId = booking?.client_id;

      if (!booking) {
        if (clientSelectionMode === 'existing') {
          clientId = selectedClientId;
        } else {
          const { data: existingClients } = await supabase
            .from('clients')
            .select('id')
            .eq('contact_number', contactNumber);

          if (existingClients && existingClients.length > 0) {
            const confirmDuplicate = window.confirm(
              'A client with this phone number already exists. Do you want to create a duplicate?'
            );
            if (!confirmDuplicate) {
              setLoading(false);
              return;
            }
          }

          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: clientName,
              contact_number: contactNumber,
              email: email || null,
              alternate_contact: alternateContact || null,
              notes: clientNotes || null,
            })
            .select()
            .single();

          if (clientError) throw clientError;
          clientId = newClient.id;
        }
      } else {
        if (clientSelectionMode === 'new') {
          await supabase
            .from('clients')
            .update({
              name: clientName,
              contact_number: contactNumber,
              email: email || null,
              alternate_contact: alternateContact || null,
              notes: clientNotes || null,
            })
            .eq('id', booking.client_id);
        }
      }

      let bookingId = booking?.id;

      if (!booking) {
        const finalBookingReference = bookingReference.trim() || await generateBookingReference();

        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            client_id: clientId,
            notes: clientNotes || null,
          })
          .select()
          .single();

        if (bookingError) throw bookingError;
        bookingId = newBooking.id;
      }

      if (booking && originalEventIds.length > 0) {
        const currentEventIds = events.map(e => e.id).filter(id => id !== undefined) as string[];
        const deletedEventIds = originalEventIds.filter(id => !currentEventIds.includes(id));

        for (const deletedEventId of deletedEventIds) {
          await supabase.from('staff_assignments').delete().eq('event_id', deletedEventId);
          await supabase.from('payments').delete().eq('event_id', deletedEventId);
          await supabase.from('workflows').delete().eq('event_id', deletedEventId);

          const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .eq('id', deletedEventId);

          if (deleteError) throw deleteError;
        }
      }

      for (const event of events) {
        let eventId = event.id;

        if (eventId) {
          const { error: eventError } = await supabase
            .from('events')
            .update({
              event_name: event.event_name,
              event_date: event.event_date,
              time_slot: event.time_slot,
              venue: event.venue,
              notes: event.notes || null,
              photographers_required: event.photographers_required,
              videographers_required: event.videographers_required,
              drone_operators_required: event.drone_operators_required,
              editors_required: event.editors_required,
            })
            .eq('id', eventId);

          if (eventError) throw eventError;

          const { data: existingAssignments } = await supabase
            .from('staff_assignments')
            .select('staff_id')
            .eq('event_id', eventId);

          const existingStaffIds = existingAssignments?.map(a => a.staff_id) || [];
          const newStaffIds = event.assigned_staff.filter(id => !existingStaffIds.includes(id));
          const removedStaffIds = existingStaffIds.filter(id => !event.assigned_staff.includes(id));

          for (const staffId of removedStaffIds) {
            await supabase.from('staff_assignments').delete().eq('event_id', eventId).eq('staff_id', staffId);
            await supabase.from('payments').delete().eq('event_id', eventId).eq('staff_id', staffId);
          }

          for (const staffId of newStaffIds) {
            const staffMember = staff.find(s => s.id === staffId);
            if (staffMember) {
              await supabase.from('staff_assignments').insert({
                event_id: eventId,
                staff_id: staffId,
                role: staffMember.role,
              });

              await supabase.from('payments').insert({
                event_id: eventId,
                staff_id: staffId,
                role: staffMember.role,
                agreed_amount: 0,
                amount_paid: 0,
                status: 'pending',
              });
            }
          }
        } else {
          const { data: newEvent, error: eventError } = await supabase
            .from('events')
            .insert({
              booking_id: bookingId,
              event_name: event.event_name,
              event_date: event.event_date,
              time_slot: event.time_slot,
              venue: event.venue,
              notes: event.notes || null,
              photographers_required: event.photographers_required,
              videographers_required: event.videographers_required,
              drone_operators_required: event.drone_operators_required,
              editors_required: event.editors_required,
            })
            .select()
            .single();

          if (eventError) throw eventError;
          eventId = newEvent.id;

          await supabase.from('workflows').insert({ event_id: eventId });

          for (const staffId of event.assigned_staff) {
            const staffMember = staff.find(s => s.id === staffId);
            if (staffMember) {
              await supabase.from('staff_assignments').insert({
                event_id: eventId,
                staff_id: staffId,
                role: staffMember.role,
              });

              await supabase.from('payments').insert({
                event_id: eventId,
                staff_id: staffId,
                role: staffMember.role,
                agreed_amount: 0,
                amount_paid: 0,
                status: 'pending',
              });
            }
          }
        }
      }

      await refreshData();
      onSuccess();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const activeStaff = staff.filter(s => s.status === 'active');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Client Information</h3>

        {!booking && (
          <div className="mb-4">
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="clientMode"
                  value="existing"
                  checked={clientSelectionMode === 'existing'}
                  onChange={(e) => {
                    setClientSelectionMode('existing');
                    setErrors({});
                  }}
                  className="w-4 h-4 text-gray-900 focus:ring-gray-900 mr-2"
                />
                <span className={`text-sm ${clientSelectionMode === 'existing' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  Select Existing Client
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="clientMode"
                  value="new"
                  checked={clientSelectionMode === 'new'}
                  onChange={(e) => {
                    setClientSelectionMode('new');
                    setSelectedClientId('');
                    setClientSearchQuery('');
                    setErrors({});
                  }}
                  className="w-4 h-4 text-gray-900 focus:ring-gray-900 mr-2"
                />
                <span className={`text-sm ${clientSelectionMode === 'new' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                  Create New Client
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="border-t border-gray-300 pt-4 mt-2" />

        {clientSelectionMode === 'existing' && !booking && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Client <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Search by name or contact number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              {clientSearchQuery && (
                <div className="mt-2 border border-gray-300 rounded-lg max-h-60 overflow-y-auto bg-white">
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No clients found</div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientSearchQuery(`${client.name} - ${client.contact_number}`);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-xs text-gray-600">{client.contact_number}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {errors.selectedClient && (
                <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} /> {errors.selectedClient}
                </p>
              )}
            </div>

            {selectedClient && (
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Client:</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><span className="font-medium">Name:</span> {selectedClient.name}</div>
                  <div><span className="font-medium">Contact:</span> {selectedClient.contact_number}</div>
                  {selectedClient.email && (
                    <div><span className="font-medium">Email:</span> {selectedClient.email}</div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional - Booking Specific)
              </label>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Any specific notes about this booking..."
              />
            </div>
          </div>
        )}

        {(clientSelectionMode === 'new' || booking) && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                errors.clientName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.clientName && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.clientName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="10-digit number"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                errors.contactNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.contactNumber && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.contactNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alternate Contact</label>
            <input
              type="text"
              value={alternateContact}
              onChange={(e) => setAlternateContact(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                errors.alternateContact ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.alternateContact && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle size={14} /> {errors.alternateContact}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Any specific notes about the client..."
          />
        </div>
          </>
        )}
      </div>

      {!booking && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Reference (Optional)
          </label>
          <input
            type="text"
            value={bookingReference}
            onChange={(e) => setBookingReference(e.target.value)}
            placeholder="Auto-generated if empty (e.g., BK-2025-001)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Events Schedule ({events.length} {events.length === 1 ? 'event' : 'events'})
          </h3>
          <Button type="button" variant="success" size="sm" onClick={addEvent}>
            <Plus size={16} className="mr-1" /> Add Event
          </Button>
        </div>

        {errors.events && (
          <p className="text-red-600 text-sm mb-2 flex items-center gap-1">
            <AlertCircle size={14} /> {errors.events}
          </p>
        )}

        <div className="space-y-6">
          {events.map((event, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">
                  Event {idx + 1} {idx === 0 && '(Primary)'}
                </h4>
                {events.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEvent(idx)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={event.event_name}
                    onChange={(e) => updateEvent(idx, 'event_name', e.target.value)}
                    placeholder="e.g., Wedding, Pre-wedding, Haldi"
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                      errors[`event_${idx}_name`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors[`event_${idx}_name`] && (
                    <p className="text-red-600 text-sm mt-1">{errors[`event_${idx}_name`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={event.event_date}
                    onChange={(e) => updateEvent(idx, 'event_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                      errors[`event_${idx}_date`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors[`event_${idx}_date`] && (
                    <p className="text-red-600 text-sm mt-1">{errors[`event_${idx}_date`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Slot <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={event.time_slot}
                    onChange={(e) => updateEvent(idx, 'time_slot', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="fullDay">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={event.venue}
                    onChange={(e) => updateEvent(idx, 'venue', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 ${
                      errors[`event_${idx}_venue`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors[`event_${idx}_venue`] && (
                    <p className="text-red-600 text-sm mt-1">{errors[`event_${idx}_venue`]}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Notes</label>
                <textarea
                  value={event.notes}
                  onChange={(e) => updateEvent(idx, 'notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Venue address, guest count, package details, special requirements..."
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Size Required</label>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Photographers</label>
                    <input
                      type="number"
                      min="0"
                      value={event.photographers_required}
                      onChange={(e) => updateEvent(idx, 'photographers_required', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Videographers</label>
                    <input
                      type="number"
                      min="0"
                      value={event.videographers_required}
                      onChange={(e) => updateEvent(idx, 'videographers_required', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Drone Operators</label>
                    <input
                      type="number"
                      min="0"
                      value={event.drone_operators_required}
                      onChange={(e) => updateEvent(idx, 'drone_operators_required', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Editors</label>
                    <input
                      type="number"
                      min="0"
                      value={event.editors_required}
                      onChange={(e) => updateEvent(idx, 'editors_required', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Staff</label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Staff Member</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Assign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {activeStaff.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-center text-gray-500">
                            No staff available
                          </td>
                        </tr>
                      ) : (
                        activeStaff.map((staffMember) => (
                          <tr key={staffMember.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{staffMember.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 capitalize">{staffMember.role.replace('_', ' ')}</td>
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={event.assigned_staff.includes(staffMember.id)}
                                onChange={() => toggleStaffAssignment(idx, staffMember.id)}
                                className="w-4 h-4 text-gray-900 focus:ring-gray-900 rounded"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-green-600 mt-2">
                  {event.assigned_staff.length} staff member(s) assigned
                </p>
                {event.assigned_staff.length < (event.photographers_required + event.videographers_required + event.drone_operators_required + event.editors_required) && (
                  <p className="text-sm text-yellow-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={14} />
                    Warning: Assigned staff count is less than required team size
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 flex items-center gap-2">
            <AlertCircle size={18} />
            {errors.submit}
          </p>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : booking ? 'Update Booking' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
}
