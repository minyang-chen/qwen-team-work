import { useState } from 'react';
import { CalendarEvent, EventForm } from '../types/team.types';

export function useCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [eventForm, setEventForm] = useState<EventForm>({ title: '', date: '', time: '', description: '' });

  const addCalendarEvent = () => {
    if (eventForm.title && eventForm.date) {
      setCalendarEvents([...calendarEvents, { ...eventForm, _id: Date.now().toString() }]);
      setEventForm({ title: '', date: '', time: '', description: '' });
    }
  };

  const deleteCalendarEvent = (id: string) => {
    setCalendarEvents(calendarEvents.filter(e => e._id !== id));
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return {
    currentMonth,
    setCurrentMonth,
    calendarEvents,
    setCalendarEvents,
    eventForm,
    setEventForm,
    addCalendarEvent,
    deleteCalendarEvent,
    previousMonth,
    nextMonth
  };
}
