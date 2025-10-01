import React, { useState, useMemo } from 'react';
import { Event, User } from '../types';
import Header from '../components/Header';
import EventFormModal from '../components/EventFormModal';
import ManageableEventCard from '../components/ManageableEventCard';

interface OrganizerDashboardPageProps {
  currentUser: User;
  allEvents: Event[];
  onCreate: (eventData: Omit<Event, 'id' | 'waitlist' | 'seatsAvailable'>) => void;
  onUpdate: (eventData: Event) => void;
  onDelete: (eventId: number) => void;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const OrganizerDashboardPage: React.FC<OrganizerDashboardPageProps> = ({
  currentUser,
  allEvents,
  onCreate,
  onUpdate,
  onDelete,
  onLogout,
  theme,
  setTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const managedEvents = useMemo(() => {
    const events = currentUser.role === 'admin' 
      ? allEvents 
      : allEvents.filter(e => e.organizerId === currentUser.id);
      
    return events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allEvents, currentUser, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = (eventData: Event | Omit<Event, 'id' | 'waitlist' | 'seatsAvailable'>) => {
    if ('id' in eventData) {
      onUpdate(eventData as Event);
    } else {
      onCreate(eventData);
    }
    handleCloseModal();
  };


  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} onLogout={onLogout} theme={theme} setTheme={setTheme} />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                {currentUser.role === 'admin' ? 'Manage All Events' : 'My Events'}
            </h1>
            <button
                onClick={handleOpenCreateModal}
                className="bg-srm-blue hover:bg-srm-blue-dark text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create New Event
            </button>
        </div>
        <div className="mb-6">
          <a href="#/analytics" className="inline-block px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">View Analytics</a>
        </div>
        
        {managedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {managedEvents.map(event => (
                    <ManageableEventCard 
                        key={event.id}
                        event={event}
                        onEdit={handleOpenEditModal}
                        onDelete={onDelete}
                    />
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-semibold">No Events Found</h2>
                <p className="mt-2">{currentUser.role === 'organizer' ? "You haven't created any events yet." : "There are no events in the system."}</p>
            </div>
        )}
      </main>
      {isModalOpen && (
        <EventFormModal 
            event={editingEvent}
            currentUser={currentUser}
            onClose={handleCloseModal}
            onSave={handleSaveEvent}
        />
      )}
    </div>
  );
};

export default OrganizerDashboardPage;