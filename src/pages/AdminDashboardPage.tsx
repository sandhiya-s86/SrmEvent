import React, { useEffect, useState } from 'react';
import { approveEvent, rejectEvent, fetchEvents } from '../api';

interface AdminDashboardPageProps {
  onBack: () => void;
}

const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onBack }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchEvents();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: number) => { await approveEvent(id); await load(); };
  const handleReject = async (id: number) => { await rejectEvent(id); await load(); };

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
        <h1 className="text-2xl font-bold">Admin Approvals</h1>
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Back</button>
      </div>
      <div className="space-y-3">
        {events.map((e) => (
          <div key={e.id} className={`p-4 border rounded ${e.status === 'PENDING' ? 'border-yellow-400' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{e.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{new Date(e.date).toLocaleString()} • {e.venue}</div>
                <div className="text-xs mt-1">Status: <span className="font-medium">{e.status}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(e.id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                <button onClick={() => handleReject(e.id)} className="px-3 py-1 bg-red-600 text-white rounded">Reject</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboardPage;


