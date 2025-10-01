import React, { useEffect, useState } from 'react';
import { fetchMyRegistrations } from '../api';

interface CalendarPageProps {
  onBack: () => void;
}

type CalendarEvent = { id: number; title: string; start: Date; venue: string };

const CalendarPage: React.FC<CalendarPageProps> = ({ onBack }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const regs = await fetchMyRegistrations();
      const mapped: CalendarEvent[] = (regs || []).map((r: any) => ({
        id: r.event?.id ?? r.id,
        title: r.event?.title ?? 'Event',
        start: new Date(r.event?.date ?? new Date()),
        venue: r.event?.venue ?? ''
      }));
      setEvents(mapped);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-srm-blue"></div>
      </div>
    );
  }

  // Group events by date (day)
  const byDay = events.reduce((acc: Record<string, CalendarEvent[]>, ev) => {
    const key = ev.start.toDateString();
    acc[key] = acc[key] || [];
    acc[key].push(ev);
    return acc;
  }, {});

  const days = Object.keys(byDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Back</button>
      </div>
      {days.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-300">No upcoming events.</div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day}>
              <div className="text-lg font-semibold mb-2">{day}</div>
              <div className="space-y-2">
                {byDay[day].map((ev) => (
                  <div key={ev.id} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{ev.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ev.venue}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarPage;


