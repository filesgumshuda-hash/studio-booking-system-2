import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { useAppData } from '../context/AppContext';
import { detectConflicts, getTimeSlotBadge, formatDate, formatDateForStorage } from '../utils/helpers';

export function CalendarPage() {
  const { events, clients, bookings, staff, staffAssignments } = useAppData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'conflicts' | 'shortages'>('all');

  const { conflicts, shortages } = detectConflicts(events, staffAssignments);

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

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const eventsInMonth = useMemo(() => {
    return events.filter((event) => {
      const [year, month] = event.event_date.split('-').map(Number);
      return (
        year === currentDate.getFullYear() &&
        month - 1 === currentDate.getMonth()
      );
    });
  }, [events, currentDate]);

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

        const photographerCount = eventAssignments.filter((sa) => sa.role === 'photographer').length;
        const videographerCount = eventAssignments.filter((sa) => sa.role === 'videographer').length;
        const droneCount = eventAssignments.filter((sa) => sa.role === 'drone_operator').length;
        const editorCount = eventAssignments.filter((sa) => sa.role === 'editor').length;

        const totalRequired =
          event.photographers_required +
          event.videographers_required +
          event.drone_operators_required +
          event.editors_required;
        const totalAssigned = photographerCount + videographerCount + droneCount + editorCount;

        const isFullyStaffed = totalAssigned >= totalRequired;

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

          <div className="flex items-center justify-between mb-6">
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

            <div className="flex gap-2">
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
      </div>
    </div>
  );
}
