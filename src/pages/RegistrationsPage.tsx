import React, { useEffect, useState } from 'react';
import { fetchMyRegistrations, cancelRegistration, checkInRegistration } from '../api';

interface RegistrationsPageProps {
  onBack: () => void;
}

const RegistrationsPage: React.FC<RegistrationsPageProps> = ({ onBack }) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyRegistrations();
      setRegistrations(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await cancelRegistration(id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to cancel');
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      await checkInRegistration(id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Failed to check in');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-srm-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 px-4 py-2 bg-gray-200 rounded">Back</button>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Registrations</h1>
        <button onClick={onBack} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Back</button>
      </div>
      {registrations.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-300">No registrations yet.</div>
      ) : (
        <div className="space-y-4">
          {registrations.map((r) => (
            <div key={r.id} className="p-4 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="font-semibold">{r?.event?.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{new Date(r?.event?.date).toLocaleString()} • {r?.event?.venue}</div>
                <div className="text-sm mt-1">Status: <span className="font-medium">{r.status}</span></div>
              </div>
              <div className="flex items-center gap-2">
                {r.status === 'REGISTERED' && !r.checkInTime && (
                  <button onClick={() => handleCheckIn(r.id)} className="px-3 py-1 bg-green-600 text-white rounded">Check In</button>
                )}
                {r.status !== 'CANCELLED' && (
                  <button onClick={() => handleCancel(r.id)} className="px-3 py-1 bg-red-600 text-white rounded">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationsPage;


