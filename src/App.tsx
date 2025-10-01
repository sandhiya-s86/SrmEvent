import React, { useState, useEffect, useCallback } from 'react';
import DashboardPage, { PublicEventPage } from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import RegistrationsPage from './pages/RegistrationsPage';
import OrganizerAnalyticsPage from './pages/OrganizerAnalyticsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';
import LoginPage from './pages/LoginPage';
import RegistrationSuccessModal from './components/RegistrationSuccessModal';
import ConflictResolutionModal from './components/ConflictResolutionModal';
import WaitlistSuccessModal from './components/WaitlistSuccessModal';
import PromotionNotificationModal from './components/PromotionNotificationModal';
import { Event, ConflictError, User } from './types';
import { MOCK_USERS } from './constants';
import * as api from './api';


const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<number>>(new Set());
  const [waitlistedEventIds, setWaitlistedEventIds] = useState<Set<number>>(new Set());
  
  const [showQRModal, setShowQRModal] = useState(false);
  const [eventForQR, setEventForQR] = useState<Event | null>(null);

  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [eventForWaitlist, setEventForWaitlist] = useState<Event | null>(null);

  const [promotedEvent, setPromotedEvent] = useState<Event | null>(null);

  const [conflictDetails, setConflictDetails] = useState<ConflictError | null>(null);

  const [theme, rawSetTheme] = useState<string>(() => localStorage.getItem('theme') || 'system');

  const setTheme = (newTheme: string) => {
    rawSetTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark';
    const isSystem = theme === 'system';
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
        if (isDark || (isSystem && mediaQuery.matches)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    };
    
    updateTheme();

    mediaQuery.addEventListener('change', updateTheme);
    return () => {
        mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [theme]);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    api.fetchEvents()
      .then(data => { setEvents(data); setError(null); })
      .catch(err => { console.error(err); setError("Failed to load events."); })
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setRegisteredEventIds(new Set());
    setWaitlistedEventIds(new Set());
    // Potentially clear other user-specific state here
  };
  
  const addUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };


  // Initial data fetch
  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    
    fetchData();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [fetchData]);

  // Poll for promotion notifications
  useEffect(() => {
    if (currentUser?.role !== 'student') return; // Only poll for logged-in students

    const interval = setInterval(async () => {
      const event = await api.checkPromotions(currentUser.id);
      if (event) {
        setWaitlistedEventIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.id);
          return newSet;
        });
        setRegisteredEventIds(prev => new Set(prev).add(event.id));
        setPromotedEvent(event);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleRegister = useCallback(async (eventToRegister: Event) => {
    if (!currentUser) {
      alert("Please log in to register for events.");
      return;
    }
    try {
      const registeredEvents = events.filter(e => registeredEventIds.has(e.id));
      const { event: updatedEvent, status } = await api.register(eventToRegister, registeredEvents, currentUser.id);
      
      setEvents(prevEvents => prevEvents.map(e => e.id === updatedEvent.id ? updatedEvent : e));

      if (status === 'REGISTERED') {
        setRegisteredEventIds(prev => new Set(prev).add(updatedEvent.id));
        setEventForQR(eventToRegister);
        setShowQRModal(true);
      } else if (status === 'WAITLISTED') {
        setWaitlistedEventIds(prev => new Set(prev).add(updatedEvent.id));
        setEventForWaitlist(eventToRegister);
        setShowWaitlistModal(true);
      }
    } catch (err: any) {
      if (err.type === 'CONFLICT') setConflictDetails(err as ConflictError);
      else alert(err.message);
    }
  }, [registeredEventIds, events, currentUser]);

  const handleUnregister = useCallback(async (eventToUnregister: Event) => {
    if (!currentUser) return;
    try {
        const { unregisteredEvent, events: allEvents } = await api.unregister(eventToUnregister, currentUser.id);
        setRegisteredEventIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(unregisteredEvent.id);
            return newSet;
        });
        setEvents(allEvents); // Refresh all events data from API
    } catch (err: any) {
        alert(err.message);
    }
  }, [currentUser]);
  
  const handleConflictResolution = useCallback(async (eventToRegister: Event, conflictingEvent: Event) => {
    if (!currentUser) return;
    try {
        const { registeredEvent, unregisteredEvent } = await api.forceRegister(eventToRegister, conflictingEvent, currentUser.id);
        
        setRegisteredEventIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(unregisteredEvent.id);
            newSet.add(registeredEvent.id);
            return newSet;
        });

        setEvents(prevEvents => prevEvents.map(e => {
            if (e.id === registeredEvent.id) return registeredEvent;
            if (e.id === unregisteredEvent.id) return unregisteredEvent;
            return e;
        }));

        setConflictDetails(null);
        setEventForQR(registeredEvent);
        setShowQRModal(true);

    } catch (err: any) {
        alert(err.message);
        setConflictDetails(null);
    }
  }, [currentUser]);

  // --- Organizer/Admin Actions ---
  const handleCreateEvent = async (eventData: Omit<Event, 'id' | 'waitlist' | 'seatsAvailable'>) => {
    const newEvent = await api.createEvent(eventData);
    setEvents(prev => [newEvent, ...prev]);
  };

  const handleUpdateEvent = async (eventData: Event) => {
    const updatedEvent = await api.updateEvent(eventData);
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };
  
  const handleDeleteEvent = async (eventId: number) => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        await api.deleteEvent(eventId);
        setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  
  const LoadingSpinner: React.FC = () => ( <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-srm-blue"></div></div> );
  const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => ( <div className="flex flex-col items-center justify-center h-screen text-center text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 p-8 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><h2 className="text-2xl font-semibold">An Error Occurred</h2><p>{message}</p></div> );

  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay message={error} />;
    
    // Public event page is accessible to everyone, even if not logged in.
    if (route.startsWith('#/event/')) {
      const eventId = parseInt(route.replace('#/event/', ''), 10);
      const event = events.find(e => e.id === eventId);
      if (event) {
        return <PublicEventPage event={event} onRegister={handleRegister} onUnregister={handleUnregister} isRegistered={registeredEventIds.has(event.id)} isWaitlisted={waitlistedEventIds.has(event.id)} theme={theme} setTheme={setTheme} />;
      }
      window.location.hash = '#';
      return null;
    }

    // If no user, show login page.
    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} users={users} addUser={addUser} theme={theme} setTheme={setTheme} />;
    }

    // Role-based dashboards for logged-in users
    switch (currentUser.role) {
      case 'organizer':
      case 'admin':
        if (currentUser.role === 'admin' && route === '#/admin') {
          return <AdminDashboardPage onBack={() => { window.location.hash = '#'; }} />
        }
        if (route === '#/analytics') {
          return <OrganizerAnalyticsPage onBack={() => { window.location.hash = '#'; }} />
        }
        return <OrganizerDashboardPage 
                  currentUser={currentUser}
                  allEvents={events}
                  onCreate={handleCreateEvent}
                  onUpdate={handleUpdateEvent}
                  onDelete={handleDeleteEvent}
                  onLogout={handleLogout}
                  theme={theme}
                  setTheme={setTheme}
                />;
      case 'student':
      default:
        if (route === '#/registrations') {
          return <RegistrationsPage onBack={() => { window.location.hash = '#'; }} />
        }
        if (route === '#/calendar') {
          return <CalendarPage onBack={() => { window.location.hash = '#'; }} />
        }
        return <DashboardPage 
                  events={events} 
                  onRegister={handleRegister} 
                  onUnregister={handleUnregister} 
                  registeredEventIds={registeredEventIds} 
                  waitlistedEventIds={waitlistedEventIds}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  theme={theme}
                  setTheme={setTheme}
                />;
    }
  };
  
  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-200">
      {renderContent()}
      {showQRModal && eventForQR && ( <RegistrationSuccessModal event={eventForQR} onClose={() => setShowQRModal(false)} /> )}
      {showWaitlistModal && eventForWaitlist && ( <WaitlistSuccessModal event={eventForWaitlist} onClose={() => setShowWaitlistModal(false)} /> )}
      {promotedEvent && ( <PromotionNotificationModal event={promotedEvent} onClose={() => setPromotedEvent(null)} /> )}
      {conflictDetails && ( <ConflictResolutionModal conflict={conflictDetails} onClose={() => setConflictDetails(null)} onResolve={handleConflictResolution} onRegisterNew={handleRegister} /> )}
    </div>
  );
};

export default App;