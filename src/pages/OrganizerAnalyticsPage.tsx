import React, { useEffect, useMemo, useState } from 'react';
import { fetchEvents } from '../api';

interface OrganizerAnalyticsPageProps {
  onBack: () => void;
}

const OrganizerAnalyticsPage: React.FC<OrganizerAnalyticsPageProps> = ({ onBack }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchEvents();
      setEvents(data);
      setLoading(false);
    })();
  }, []);

  const summary = useMemo(() => {
    return (events || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      capacity: e.capacity,
      registered: Math.max(0, (e.capacity ?? 0) - (e.seatsAvailable ?? 0)),
      remaining: e.seatsAvailable ?? 0,
      date: e.date,
      venue: e.venue
    }));
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-srm-blue"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Organizer Analytics</h1>
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Back</button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="text-left p-3">Event</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Venue</th>
              <th className="text-right p-3">Registered</th>
              <th className="text-right p-3">Remaining</th>
              <th className="text-right p-3">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium">{s.title}</td>
                <td className="p-3">{new Date(s.date).toLocaleString()}</td>
                <td className="p-3">{s.venue}</td>
                <td className="p-3 text-right">{s.registered}</td>
                <td className="p-3 text-right">{s.remaining}</td>
                <td className="p-3 text-right">{s.capacity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrganizerAnalyticsPage;


