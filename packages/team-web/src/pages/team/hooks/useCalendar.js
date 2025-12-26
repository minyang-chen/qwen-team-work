import { useState } from 'react';
export function useCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [eventForm, setEventForm] = useState({ title: '', date: '', time: '', description: '' });
    const addCalendarEvent = () => {
        if (eventForm.title && eventForm.date) {
            setCalendarEvents([...calendarEvents, { ...eventForm, _id: Date.now().toString() }]);
            setEventForm({ title: '', date: '', time: '', description: '' });
        }
    };
    const deleteCalendarEvent = (id) => {
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
