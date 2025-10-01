import React, { useState, useMemo, useCallback } from 'react';
import { Event, User } from '../types';
import Header from '../components/Header';
import FilterSidebar from '../components/FilterSidebar';
import EventCard from '../components/EventCard';
import EventDetailsModal from '../components/EventDetailsModal';
import useCountdown from '../hooks/useCountdown';
import ThemeSwitcher from '../components/ThemeSwitcher';

// --- Start: New Components for Public Page ---

const WeatherWidget: React.FC<{ venue: string }> = ({ venue }) => {
    const getMockWeather = () => {
        if (venue.toLowerCase().includes('ground') || venue.toLowerCase().includes('gate')) {
            return { temp: 28, condition: 'Sunny', icon: '☀️' };
        }
        if (venue.toLowerCase().includes('grounds')) {
            return { temp: 26, condition: 'Partly Cloudy', icon: '⛅️' };
        }
        return { temp: 27, condition: 'Clear Skies', icon: '☀️' };
    };
    const weather = getMockWeather();
    return (
        <div>
            <h3 className="text-xl font-bold mt-8 mb-4 text-gray-800 dark:text-white">Venue Weather Forecast</h3>
            <div className="flex items-center bg-blue-100 dark:bg-srm-blue-dark/30 p-4 rounded-lg">
                <span className="text-4xl mr-4">{weather.icon}</span>
                <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{weather.temp}°C</p>
                    <p className="text-gray-600 dark:text-gray-300">{weather.condition}</p>
                </div>
            </div>
        </div>
    );
};

const ShareButtons: React.FC<{ eventTitle: string; eventUrl: string }> = ({ eventTitle, eventUrl }) => {
    const encodedUrl = encodeURIComponent(eventUrl);
    const encodedTitle = encodeURIComponent(`Check out this event: ${eventTitle}`);
    return (
        <div>
            <h3 className="text-xl font-bold mt-8 mb-4 text-gray-800 dark:text-white">Share this Event</h3>
            <div className="flex space-x-4">
                <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className="bg-[#1DA1F2] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#0c85d0] transition-colors">Twitter</a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="bg-[#4267B2] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#365899] transition-colors">Facebook</a>
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="bg-[#0077B5] text-white py-2 px-4 rounded-lg font-semibold hover:bg-[#005582] transition-colors">LinkedIn</a>
            </div>
        </div>
    );
};

const CountdownSegment: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center">
        <span className="text-4xl font-bold text-srm-blue dark:text-srm-blue-light">{value.toString().padStart(2, '0')}</span>
        <span className="text-sm uppercase text-gray-500 dark:text-gray-400">{label}</span>
    </div>
);

interface PublicEventPageProps {
  event: Event;
  onRegister: (event: Event) => void;
  onUnregister: (event: Event) => void;
  isRegistered: boolean;
  isWaitlisted: boolean;
  theme: string;
  setTheme: (theme: string) => void;
}
export const PublicEventPage: React.FC<PublicEventPageProps> = ({ event, onRegister, onUnregister, isRegistered, isWaitlisted, theme, setTheme }) => {
  const { days, hours, minutes, seconds } = useCountdown(event.date);
  
  const getButtonState = () => {
    if (isRegistered) return { text: 'Successfully Registered', disabled: true, className: 'bg-green-600 hover:bg-green-700' };
    if (isWaitlisted) return { text: 'You are on the Waitlist', disabled: true, className: 'bg-yellow-500 hover:bg-yellow-600' };
    if (event.seatsAvailable <= 0) return { text: 'Join Waitlist', disabled: false, className: 'bg-orange-500 hover:bg-orange-600' };
    return { text: 'Register Now', disabled: false, className: 'bg-srm-blue hover:bg-srm-blue-dark text-white' };
  };
  const buttonState = getButtonState();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-between sticky top-0 z-10">
        <a href="#" className="flex items-center text-srm-blue dark:text-srm-blue-light font-semibold hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to All Events
        </a>
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden shadow-lg">
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white">{event.title}</h1>
            <p className="text-lg text-gray-200 mt-2 font-semibold">{event.organizer}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Event Details</h2>
            <div className="flex flex-wrap items-center space-x-6 text-gray-600 dark:text-gray-400 mb-6">
              <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> {new Date(event.date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</span>
              <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg> {event.venue}</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{event.description}</p>
            {event.isOutdoor && <WeatherWidget venue={event.venue} />}
            <ShareButtons eventTitle={event.title} eventUrl={window.location.href} />
          </div>
          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">Starts In</h2>
              <div className="flex justify-around bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg">
                <CountdownSegment value={days} label="Days" />
                <CountdownSegment value={hours} label="Hours" />
                <CountdownSegment value={minutes} label="Mins" />
                <CountdownSegment value={seconds} label="Secs" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-800 dark:text-white">Get Your Ticket</h2>
              <div className="text-5xl font-bold text-center text-srm-blue dark:text-srm-blue-light mb-4">{event.price > 0 ? `$${event.price.toFixed(2)}` : 'FREE'}</div>
              <div className="text-center text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
                <span className={event.seatsAvailable > 0 ? "text-green-500" : "text-red-500"}>{event.seatsAvailable}</span> / {event.capacity} seats available
              </div>
               <div className="space-y-2">
                 <button onClick={() => onRegister(event)} disabled={buttonState.disabled} className={`w-full py-3 px-6 text-lg font-bold rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${buttonState.className}`}>
                   {buttonState.text}
                 </button>
                 {isRegistered && (
                    <button onClick={() => onUnregister(event)} className="w-full py-2 text-sm font-semibold text-red-500 bg-transparent rounded-lg hover:bg-red-500/10 transition-colors">
                      Cancel Registration
                    </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- End: New Components for Public Page ---

interface DashboardPageProps {
  events: Event[];
  onRegister: (event: Event) => void;
  onUnregister: (event: Event) => void;
  registeredEventIds: Set<number>;
  waitlistedEventIds: Set<number>;
  currentUser: User;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ events, onRegister, onUnregister, registeredEventIds, waitlistedEventIds, currentUser, onLogout, theme, setTheme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(event.category);
      return matchesSearch && matchesCategory;
    });
  }, [events, searchQuery, selectedCategories]);

  const handleSelectEvent = useCallback((event: Event) => setSelectedEvent(event), []);
  const handleCloseModal = useCallback(() => setSelectedEvent(null), []);

  const handleRegisterFromModal = useCallback((eventToRegister: Event) => {
    onRegister(eventToRegister);
    setSelectedEvent(null);
  }, [onRegister]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} onLogout={onLogout} theme={theme} setTheme={setTheme} />
      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories} />
        <main className="flex-1 p-6 overflow-y-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Upcoming Events</h1>
            {filteredEvents.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredEvents.map(event => (
                    <EventCard 
                        key={event.id} 
                        event={event} 
                        onSelectEvent={handleSelectEvent}
                        isRegistered={registeredEventIds.has(event.id)}
                        isWaitlisted={waitlistedEventIds.has(event.id)}
                    />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-semibold">No Events Found</h2>
                    <p className="mt-2">Try adjusting your search or filters.</p>
                </div>
            )}
        </main>
      </div>
      {selectedEvent && (
        <EventDetailsModal 
            event={selectedEvent} 
            onClose={handleCloseModal} 
            onRegister={handleRegisterFromModal}
            onUnregister={onUnregister}
            isRegistered={registeredEventIds.has(selectedEvent.id)}
            isWaitlisted={waitlistedEventIds.has(selectedEvent.id)}
        />
      )}
    </div>
  );
};

export default DashboardPage;