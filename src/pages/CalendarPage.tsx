import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { EventDetailsModal } from '../components/calendar/EventDetailsModal';
import { useAppData } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { detectConflicts, getTimeSlotBadge, formatDate, formatDateForStorage } from '../utils/helpers';
import { getAccessibleEvents } from '../utils/accessControl';
import { Event } from '../context/AppContext';
import { supabase } from '../lib/supabase';

export function CalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { events, clients, bookings, staff, staffAssignments, refreshData } = useAppData();

  const accessibleEvents = useMemo(() => {
    return getAccessibleEvents(user, events);
  }, [user, events]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'days'>('month');
  const [filterType, setFilterType] = useState<'all' | 'conflicts' | 'shortages'>('all');

  // Read URL parameters on mount
  useEffect(() => {
    const view = searchParams.get('view');
    const filter = searchParams.get('filter');

    if (view === 'days') {
      setViewMode('days');
    }
    if (filter === 'conflicts' || filter === 'shortages') {
      setFilterType(filter);
    }
  }, [searchParams]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Date range picker state
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 29);
    return thirtyDaysLater;
  });
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [pickerCurrentDate, setPickerCurrentDate] = useState(new Date());

  const { conflicts, shortages } = detectConflicts(accessibleEvents, staffAssignments, staff);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getDateRange = (start: Date, end: Date) => {
    const dates = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleRangeDateClick = (date: Date) => {
    if (!tempStartDate) {
      // First click - set start date
      setTempStartDate(date);
    } else {
      // Second click - set end date and close
      if (date >= tempStartDate) {
        setStartDate(tempStartDate);
        setEndDate(date);
      } else {
        setStartDate(date);
        setEndDate(tempStartDate);
      }
      setTempStartDate(null);
      setShowRangePicker(false);
    }
  };

  const handleCancelRangePicker = () => {
    setShowRangePicker(false);
    setTempStartDate(null);
    setPickerCurrentDate(new Date());
  };

  const goToPickerPreviousMonth = () => {
    setPickerCurrentDate(new Date(pickerCurrentDate.getFullYear(), pickerCurrentDate.getMonth() - 1, 1));
  };

  const goToPickerNextMonth = () => {
    setPickerCurrentDate(new Date(pickerCurrentDate.getFullYear(), pickerCurrentDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (date: Date) => {
    const dateString = formatDateForStorage(date.getFullYear(), date.getMonth(), date.getDate());

    return accessibleEvents
      .filter((event) => event.event_date === dateString)
      .map((event) => {
        const booking = bookings.find((b) => b.id === event.booking_id);
        const client = clients.find((c) => c.id === booking?.client_id);
        const eventAssignments = staffAssignments.filter((sa) => sa.event_id === event.id);

        const hasConflict = conflicts.some((c) => c.eventIds?.includes(event.id));
        const hasShortage = shortages.some((s) => s.eventId === event.id);

        const photographerCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'photographer';
        }).length;
        const videographerCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'videographer';
        }).length;
        const droneCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'drone_operator';
        }).length;
        const editorCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'editor';
        }).length;

        const isFullyStaffed =
          photographerCount >= event.photographers_required &&
          videographerCount >= event.videographers_required &&
          droneCount >= event.drone_operators_required &&
          editorCount >= event.editors_required;

        return {
          ...event,
          clientName: client?.name || 'Unknown',
          hasConflict,
          hasShortage,
          isFullyStaffed,
          eventAssignments,
        };
      });
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const dateRangeDates = getDateRange(startDate, endDate);
  const dateRangeDatesWithEvents = dateRangeDates.filter(date => {
    const dayEvents = getEventsForDate(date);
    if (dayEvents.length === 0) return false;

    // Apply filters
    if (filterType === 'all') return true;
    if (filterType === 'conflicts') {
      return dayEvents.some(event => event.hasConflict);
    }
    if (filterType === 'shortages') {
      return dayEvents.some(event => event.hasShortage);
    }
    return true;
  });

  const eventsInMonth = useMemo(() => {
    return accessibleEvents.filter((event) => {
      const [year, month] = event.event_date.split('-').map(Number);
      return (
        year === currentDate.getFullYear() &&
        month - 1 === currentDate.getMonth()
      );
    });
  }, [accessibleEvents, currentDate]);

  const getEventsForDay = (day: number) => {
    const dateString = formatDateForStorage(currentDate.getFullYear(), currentDate.getMonth(), day);

    return eventsInMonth
      .filter((event) => event.event_date === dateString)
      .map((event) => {
        const booking = bookings.find((b) => b.id === event.booking_id);
        const client = clients.find((c) => c.id === booking?.client_id);
        const eventAssignments = staffAssignments.filter((sa) => sa.event_id === event.id);

        const hasConflict = conflicts.some((c) => c.eventIds?.includes(event.id));
        const hasShortage = shortages.some((s) => s.eventId === event.id);

        const photographerCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'photographer';
        }).length;
        const videographerCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'videographer';
        }).length;
        const droneCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'drone_operator';
        }).length;
        const editorCount = eventAssignments.filter((sa) => {
          const staffMember = staff.find((s) => s.id === sa.staff_id);
          return staffMember?.role === 'editor';
        }).length;

        const isFullyStaffed =
          photographerCount >= event.photographers_required &&
          videographerCount >= event.videographers_required &&
          droneCount >= event.drone_operators_required &&
          editorCount >= event.editors_required;

        return {
          ...event,
          clientName: client?.name || 'Unknown',
          hasConflict,
          hasShortage,
          isFullyStaffed,
          eventAssignments,
        };
      });
  };

  const filteredDays = useMemo(() => {
    if (filterType === 'all') return Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const days: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      if (filterType === 'conflicts') {
        if (dayEvents.some((e) => e.hasConflict)) days.push(day);
      } else if (filterType === 'shortages') {
        if (dayEvents.some((e) => e.hasShortage)) days.push(day);
      }
    }
    return days;
  }, [filterType, daysInMonth, eventsInMonth]);

  const totalConflicts = conflicts.length;
  const totalShortages = shortages.length;

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleAssignStaff = async (eventId: string, staffId: string) => {
    if (!staffId) return;
    try {
      await supabase.from('staff_assignments').insert({
        event_id: eventId,
        staff_id: staffId,
      });
      await refreshData();
    } catch (error) {
      console.error('Failed to assign staff:', error);
    }
  };

  const handleViewBooking = () => {
    handleCloseModal();
    if (selectedEventData?.booking?.id) {
      navigate(`/tracking/${selectedEventData.booking.id}`);
    } else {
      navigate('/bookings');
    }
  };

  const selectedEventData = selectedEvent
    ? {
        event: selectedEvent,
        booking: bookings.find((b) => b.id === selectedEvent.booking_id) || null,
        client:
          clients.find(
            (c) =>
              c.id === bookings.find((b) => b.id === selectedEvent.booking_id)?.client_id
          ) || null,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Event Calendar</h1>
            <Button variant="primary" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {viewMode === 'month' && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className="text-2xl font-semibold text-gray-900">{monthName}</h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              )}

              {viewMode === 'days' && (
                <button
                  onClick={() => setShowRangePicker(true)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </button>
              )}

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'month' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'days' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('days')}
                >
                  Days
                </Button>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                All Events
              </Button>
              <Button
                variant={filterType === 'conflicts' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('conflicts')}
              >
                Conflicts ({totalConflicts})
              </Button>
              <Button
                variant={filterType === 'shortages' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('shortages')}
              >
                Staff Shortages ({totalShortages})
              </Button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Double Booking (same staff, same date/time)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span>Staff Shortage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span>Fully Staffed</span>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-gray-100 p-4 text-center font-semibold text-gray-700"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {Array.from({ length: startingDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="bg-white p-4 min-h-[120px]"></div>
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === currentDate.getMonth() &&
                  new Date().getFullYear() === currentDate.getFullYear();

                const shouldShow = filterType === 'all' || filteredDays.includes(day);

                return (
                  <div
                    key={day}
                    className={`bg-white p-2 min-h-[120px] ${
                      isToday ? 'ring-2 ring-blue-500' : ''
                    } ${!shouldShow ? 'opacity-30' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-semibold ${
                          isToday ? 'text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {dayEvents.map((event) => {
                        const badge = getTimeSlotBadge(event.time_slot);
                        const badgeColor = {
                          morning: 'bg-blue-100 text-blue-800',
                          afternoon: 'bg-green-100 text-green-800',
                          evening: 'bg-orange-100 text-orange-800',
                          fullDay: 'bg-purple-100 text-purple-800',
                        }[event.time_slot];

                        return (
                          <div
                            key={event.id}
                            className="text-xs p-1.5 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                            title={`${event.event_name} - ${event.venue}\n${event.clientName}`}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
                                {badge}
                              </span>
                              <span className="truncate flex-1 font-medium">
                                {event.clientName}
                              </span>
                              {event.hasConflict && (
                                <span className="w-2 h-2 rounded-full bg-red-500" title="Double Booking"></span>
                              )}
                              {!event.hasConflict && event.hasShortage && (
                                <span className="w-2 h-2 rounded-full bg-yellow-500" title="Staff Shortage"></span>
                              )}
                              {!event.hasConflict && !event.hasShortage && event.isFullyStaffed && (
                                <span className="w-2 h-2 rounded-full bg-green-500" title="Fully Staffed"></span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dateRangeDatesWithEvents.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500">No events in this date range</p>
              </div>
            ) : (
              dateRangeDatesWithEvents.map((date) => {
              const allDayEvents = getEventsForDate(date);
              // Filter events based on filter type
              const dayEvents = allDayEvents.filter(event => {
                if (filterType === 'all') return true;
                if (filterType === 'conflicts') return event.hasConflict;
                if (filterType === 'shortages') return event.hasShortage;
                return true;
              });
              const isToday = new Date().toDateString() === date.toDateString();
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const dayNumber = date.getDate();
              const monthName = date.toLocaleDateString('en-US', { month: 'short' });

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-white rounded-lg shadow-md p-3 ${
                    isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className={`flex items-center gap-2 mb-2 pb-2 border-b ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    <span className="text-sm font-semibold">{dayName}</span>
                    <span className="text-xl font-bold">{dayNumber}</span>
                    <span className="text-xs text-gray-500">{monthName}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {dayEvents.length === 0 ? 'No events' : `${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayEvents.map((event) => {
                      const badge = getTimeSlotBadge(event.time_slot);
                      const badgeColor = {
                        morning: 'bg-blue-100 text-blue-800',
                        afternoon: 'bg-green-100 text-green-800',
                        evening: 'bg-orange-100 text-orange-800',
                        fullDay: 'bg-purple-100 text-purple-800',
                      }[event.time_slot];

                      return (
                        <div
                          key={event.id}
                          className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor} flex-shrink-0`}>
                              {badge}
                            </span>
                            {event.hasConflict && (
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" title="Double Booking"></span>
                            )}
                            {!event.hasConflict && event.hasShortage && (
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 flex-shrink-0" title="Staff Shortage"></span>
                            )}
                            {!event.hasConflict && !event.hasShortage && event.isFullyStaffed && (
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" title="Fully Staffed"></span>
                            )}
                            <span className="font-semibold text-sm text-gray-900 flex-shrink-0">{event.clientName}</span>
                            <span className="text-xs text-gray-600 truncate">{event.event_name}</span>
                            <span className="text-xs text-gray-500 truncate">{event.venue}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }))}
          </div>
        )}
      </div>

      {/* Date Range Picker Modal */}
      {showRangePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <h3 className="text-lg font-semibold">
                {tempStartDate ? 'Select End Date' : 'Select Start Date'}
              </h3>
              <button
                onClick={handleCancelRangePicker}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            {tempStartDate && (
              <div className="px-4 pt-4">
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <span className="font-medium">Start: </span>
                  {tempStartDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )}

            <div className="p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={goToPickerPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h4 className="text-base font-semibold text-gray-900">
                  {pickerCurrentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>
                <button
                  onClick={goToPickerNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
                {(() => {
                  const { daysInMonth: pickerDaysInMonth, startingDayOfWeek: pickerStartingDay } = getDaysInMonth(pickerCurrentDate);
                  const today = new Date();

                  return (
                    <>
                      {Array.from({ length: pickerStartingDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: pickerDaysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const date = new Date(pickerCurrentDate.getFullYear(), pickerCurrentDate.getMonth(), day);
                        const isStart = tempStartDate?.toDateString() === date.toDateString();
                        const isToday = today.toDateString() === date.toDateString();
                        const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                        return (
                          <button
                            key={day}
                            onClick={() => handleRangeDateClick(date)}
                            disabled={isPast && !tempStartDate}
                            className={`p-2 rounded-lg text-sm transition-colors ${
                              isStart
                                ? 'bg-blue-600 text-white font-semibold'
                                : isToday
                                ? 'bg-blue-50 text-blue-600 font-semibold'
                                : isPast && !tempStartDate
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <EventDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEventData?.event || null}
        client={selectedEventData?.client || null}
        booking={selectedEventData?.booking || null}
        staffAssignments={staffAssignments}
        staff={staff}
        events={events}
        onViewBooking={handleViewBooking}
        onAssignStaff={handleAssignStaff}
      />
    </div>
  );
}
