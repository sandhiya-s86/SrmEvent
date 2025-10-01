import { MOCK_EVENTS } from './constants';
import { Event, ConflictError } from './types';

// Backend base URL (use same-origin; Vite proxy forwards /api → backend)
const BASE_URL = '';

const getAuthHeaders = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Simulate network latency
const API_LATENCY = 500;
const EVENT_DURATION_HOURS = 2; // Assume all events are 2 hours long

// In-memory "database" copy
let eventsData: Event[] = JSON.parse(JSON.stringify(MOCK_EVENTS));
// In-memory queue for promotion notifications
let promotionQueue: Map<number, Event[]> = new Map(); // Map<userId, Event[]>


// --- MOCK UTILITY FUNCTIONS ---

const calculateTravelTime = (venue1: string, venue2: string): number => {
    if (venue1 === venue2) return 0;
    const key = [venue1, venue2].sort().join('-');
    const travelTimes: { [key: string]: number } = {
        'Dr. T.P. Ganesan Auditorium-Tech Park': 15,
        'SRM Cricket Ground-Tech Park': 25,
        'Football Ground-SRM Cricket Ground': 10,
        'Main Campus Grounds-SRM Cricket Ground': 20,
    };
    return travelTimes[key] || 20; // Default travel time
};

const findSimilarEvents = (eventToRegister: Event, conflictingEvent: Event): Event[] => {
    return eventsData.filter(e => 
        e.category === eventToRegister.category && 
        e.id !== eventToRegister.id && 
        e.id !== conflictingEvent.id &&
        e.seatsAvailable > 0
    ).slice(0, 2); // Return up to 2 suggestions
};

// --- API FUNCTIONS ---

export const fetchEvents = async (): Promise<Event[]> => {
  try {
    const resp = await fetch(`${BASE_URL}/api/events`, { headers: { ...getAuthHeaders() } });
    if (!resp.ok) throw new Error('Failed to fetch events');
    const json = await resp.json();
    const backendEvents = json.data as any[];

    // Map backend shape to frontend Event type
    const mapped: Event[] = backendEvents.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category || 'General',
      venue: e.venue,
      date: e.date,
      capacity: e.capacity,
      seatsAvailable: Math.max(0, (e.capacity ?? 0) - (e.currentRegistrations ?? 0)),
      price: e.price ?? 0,
      description: e.description ?? '',
      imageUrl: e.imageUrl ?? 'https://picsum.photos/seed/event/800/600',
      organizer: e.organizer ?? 'SRM',
      organizerId: e.organizerId ?? 0,
      isOutdoor: !!e.isOutdoor,
      waitlist: [],
    }));

    // Also refresh our in-memory copy to keep other mock flows working
    eventsData = JSON.parse(JSON.stringify(mapped));
    return mapped;
  } catch (_) {
    // Fallback to mock data if backend not reachable
    return JSON.parse(JSON.stringify(eventsData));
  }
};

export const fetchDynamicPrice = async (eventId: number): Promise<number | null> => {
  try {
    const resp = await fetch(`${BASE_URL}/api/events/${eventId}/price`, { headers: { ...getAuthHeaders() } });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.data?.price ?? null;
  } catch (_) {
    return null;
  }
};

export const register = (
  eventToRegister: Event,
  currentlyRegisteredEvents: Event[],
  userId: number,
): Promise<{ event: Event, status: 'REGISTERED' | 'WAITLISTED' }> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Try real backend first
      const resp = await fetch(`${BASE_URL}/api/registrations/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ eventId: eventToRegister.id, notes: '' })
      });
      if (resp.ok) {
        const json = await resp.json();
        const status = (json?.data?.registration?.status as 'REGISTERED' | 'WAITLISTED') || 'REGISTERED';

        // mirror change locally so UI remains consistent with legacy flows
        const eventInDb = eventsData.find(e => e.id === eventToRegister.id);
        if (eventInDb) {
          const updatedEvent = {
            ...eventInDb,
            seatsAvailable: Math.max(0, eventInDb.seatsAvailable - (status === 'REGISTERED' ? 1 : 0))
          };
          eventsData = eventsData.map(e => e.id === updatedEvent.id ? updatedEvent : e);
          return resolve({ event: updatedEvent, status });
        }
        return resolve({ event: eventToRegister, status });
      }
      // fall through to mock if non-2xx
    } catch (_) {
      // ignore and fallback to mock
    }

    // Fallback to mock behavior
    setTimeout(() => {
      const eventInDb = eventsData.find(e => e.id === eventToRegister.id);

      if (!eventInDb) {
        return reject(new Error('Event not found.'));
      }
      
      // --- Smart Conflict Detection Logic ---
      const newEventStart = new Date(eventToRegister.date).getTime();
      const newEventEnd = newEventStart + EVENT_DURATION_HOURS * 60 * 60 * 1000;

      for (const registeredEvent of currentlyRegisteredEvents) {
        const registeredEventStart = new Date(registeredEvent.date).getTime();
        const registeredEventEnd = registeredEventStart + EVENT_DURATION_HOURS * 60 * 60 * 1000;
        const travelTime = calculateTravelTime(eventToRegister.venue, registeredEvent.venue);
        const travelTimeMs = travelTime * 60 * 1000;
        if ((newEventStart < registeredEventEnd + travelTimeMs) && (registeredEventStart < newEventEnd + travelTimeMs)) {
            const conflictError: ConflictError = {
                name: 'ConflictError',
                message: `Conflict detected with "${registeredEvent.title}".`,
                type: 'CONFLICT',
                eventToRegister: eventToRegister,
                conflictingEvent: registeredEvent,
                suggestedEvents: findSimilarEvents(eventToRegister, registeredEvent),
                travelTimeMinutes: travelTime
            };
            return reject(conflictError);
        }
      }

      // --- Capacity & Waitlist Logic ---
      if (eventInDb.seatsAvailable > 0) {
        const updatedEvent = { ...eventInDb, seatsAvailable: eventInDb.seatsAvailable - 1 };
        eventsData = eventsData.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        resolve({ event: updatedEvent, status: 'REGISTERED' });
      } else {
        // Add to waitlist if not already on it
        if (eventInDb.waitlist.includes(userId)) {
          return reject(new Error("You are already on the waitlist for this event."));
        }
        const updatedEvent = { ...eventInDb, waitlist: [...eventInDb.waitlist, userId] };
        eventsData = eventsData.map(e => e.id === updatedEvent.id ? updatedEvent : e);
        resolve({ event: updatedEvent, status: 'WAITLISTED' });
      }

    }, API_LATENCY);
  });
};

export const unregister = (eventToUnregister: Event, userId: number): Promise<{ unregisteredEvent: Event, events: Event[] }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let eventInDb = eventsData.find(e => e.id === eventToUnregister.id);
            if (!eventInDb) return reject(new Error("Event to unregister not found"));

            // If there's a waitlist, promote the first person
            if (eventInDb.waitlist.length > 0) {
                const promotedUserId = eventInDb.waitlist[0];
                
                // This is a simulation. In a real app, you'd find the user and check for their conflicts before promoting.
                // Here, we just assume they can be registered.
                const updatedEvent = {
                    ...eventInDb,
                    waitlist: eventInDb.waitlist.slice(1) // Remove promoted user from waitlist
                };
                // Seat count doesn't change: one person leaves, one person joins.
                eventsData = eventsData.map(e => e.id === updatedEvent.id ? updatedEvent : e);

                // Add to promotion notification queue for the promoted user
                const userPromotions = promotionQueue.get(promotedUserId) || [];
                userPromotions.push(updatedEvent);
                promotionQueue.set(promotedUserId, userPromotions);

                resolve({ unregisteredEvent: updatedEvent, events: JSON.parse(JSON.stringify(eventsData)) });

            } else {
                // No waitlist, just free up a spot
                const updatedEvent = {
                    ...eventInDb,
                    seatsAvailable: Math.min(eventInDb.capacity, eventInDb.seatsAvailable + 1)
                };
                eventsData = eventsData.map(e => e.id === updatedEvent.id ? updatedEvent : e);
                resolve({ unregisteredEvent: updatedEvent, events: JSON.parse(JSON.stringify(eventsData)) });
            }
        }, API_LATENCY);
    });
}

export const forceRegister = (
    eventToRegister: Event,
    conflictingEvent: Event,
    userId: number,
): Promise<{ registeredEvent: Event, unregisteredEvent: Event }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const newEventInDb = eventsData.find(e => e.id === eventToRegister.id);
                if (!newEventInDb || newEventInDb.seatsAvailable <= 0) {
                    return reject(new Error(`Sorry, "${eventToRegister.title}" sold out while you were deciding.`));
                }
                
                // Unregister logic from the conflicting event
                const oldEventInDb = eventsData.find(e => e.id === conflictingEvent.id);
                if (!oldEventInDb) throw new Error("Conflicting event not found");

                let unregisteredEvent: Event;
                if (oldEventInDb.waitlist.length > 0) {
                    const promotedUserId = oldEventInDb.waitlist[0];
                    unregisteredEvent = { ...oldEventInDb, waitlist: oldEventInDb.waitlist.slice(1) };

                    const userPromotions = promotionQueue.get(promotedUserId) || [];
                    userPromotions.push(unregisteredEvent);
                    promotionQueue.set(promotedUserId, userPromotions);

                } else {
                     unregisteredEvent = { ...oldEventInDb, seatsAvailable: oldEventInDb.seatsAvailable + 1 };
                }
                 eventsData = eventsData.map(e => (e.id === unregisteredEvent.id ? unregisteredEvent : e));

                const registeredEvent = { ...newEventInDb, seatsAvailable: newEventInDb.seatsAvailable - 1 };
                eventsData = eventsData.map(e => e.id === registeredEvent.id ? registeredEvent : e);

                resolve({ registeredEvent, unregisteredEvent });
            } catch (err: any) {
                reject(err);
            }
        }, API_LATENCY);
    });
};

export const createEvent = async (
  eventData: Omit<Event, 'id' | 'waitlist' | 'seatsAvailable'>
): Promise<Event> => {
  // Try backend first
  try {
    const resp = await fetch(`${BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        title: eventData.title,
        description: eventData.description,
        venue: eventData.venue,
        date: eventData.date,
        capacity: eventData.capacity,
        price: eventData.price,
        imageUrl: eventData.imageUrl,
        // Map category name to backend string; backend expects categoryId normally,
        // but our simple backend may accept category name
        category: (eventData as any).category || 'General'
      })
    });
    if (resp.ok) {
      const json = await resp.json();
      const e = json.data || json; // support simple server style
      const created: Event = {
        id: e.id ?? Date.now(),
        title: e.title,
        category: e.category || (eventData as any).category || 'General',
        venue: e.venue,
        date: e.date,
        capacity: e.capacity,
        seatsAvailable: Math.max(0, (e.capacity ?? 0) - (e.currentRegistrations ?? 0)),
        price: e.price ?? 0,
        description: e.description ?? '',
        imageUrl: e.imageUrl ?? eventData.imageUrl,
        organizer: e.organizer || eventData.organizer,
        organizerId: e.organizerId ?? 0,
        isOutdoor: !!e.isOutdoor,
        waitlist: []
      };
      eventsData.unshift(created);
      return created;
    }
  } catch (_) {
    // ignore and fallback to mock
  }

  // Fallback to mock
  return new Promise((resolve) => {
    setTimeout(() => {
      const newEvent: Event = {
        ...eventData,
        id: Date.now(),
        waitlist: [],
        seatsAvailable: eventData.capacity,
      };
      eventsData.unshift(newEvent);
      resolve(newEvent);
    }, API_LATENCY);
  });
};

export const updateEvent = async (eventData: Event): Promise<Event> => {
  try {
    const resp = await fetch(`${BASE_URL}/api/events/${eventData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(eventData)
    });
    if (resp.ok) {
      const json = await resp.json();
      const updated = json.data || eventData;
      // sync local
      const index = eventsData.findIndex(e => e.id === eventData.id);
      if (index !== -1) eventsData[index] = { ...eventsData[index], ...eventData };
      return { ...eventData };
    }
  } catch (_) {}

  // Fallback to mock
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = eventsData.findIndex(e => e.id === eventData.id);
      if (index === -1) {
        return reject(new Error("Event not found for update."));
      }
      eventsData[index] = eventData;
      resolve(eventData);
    }, API_LATENCY);
  });
};

export const deleteEvent = async (eventId: number): Promise<{ success: true }> => {
  try {
    const resp = await fetch(`${BASE_URL}/api/events/${eventId}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    if (resp.ok) {
      // sync local
      eventsData = eventsData.filter(e => e.id !== eventId);
      return { success: true };
    }
  } catch (_) {}

  // Fallback to mock
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const initialLength = eventsData.length;
      eventsData = eventsData.filter(e => e.id !== eventId);
      if (eventsData.length === initialLength) {
        return reject(new Error("Event not found for deletion."));
      }
      resolve({ success: true });
    }, API_LATENCY);
  });
};

// --- ADMIN ---
export const approveEvent = async (eventId: number) => {
  const resp = await fetch(`/api/admin/events/${eventId}/approve`, { method: 'POST', headers: { ...getAuthHeaders() } });
  if (!resp.ok) throw new Error('Failed to approve event');
  const json = await resp.json();
  return json?.data;
};

export const rejectEvent = async (eventId: number) => {
  const resp = await fetch(`/api/admin/events/${eventId}/reject`, { method: 'POST', headers: { ...getAuthHeaders() } });
  if (!resp.ok) throw new Error('Failed to reject event');
  const json = await resp.json();
  return json?.data;
};


/**
 * Simulates a notification system by checking a queue for promotions for a specific user.
 * In a real app, this would be a WebSocket or push notification.
 */
export const checkPromotions = (userId: number): Promise<Event | null> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const userPromotions = promotionQueue.get(userId);
            if (userPromotions && userPromotions.length > 0) {
                const promotedEvent = userPromotions.shift(); // Dequeue the event
                resolve(promotedEvent || null);
            } else {
                resolve(null);
            }
        }, 200);
    });
};

// --- AUTH ---
export const apiLogin = async (emailOrUsername: string, password?: string) => {
  try {
    // Prefer backend email login
    const resp = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername, password: password || '' })
    });
    if (resp.ok) {
      const json = await resp.json();
      const token = json?.data?.token;
      if (token && typeof localStorage !== 'undefined') {
        localStorage.setItem('token', token);
      }
      return json?.data?.user;
    }
  } catch (_) {}
  return null;
};

// --- REGISTRATIONS ---
export const fetchMyRegistrations = async () => {
  try {
    const resp = await fetch(`${BASE_URL}/api/registrations/my-registrations`, {
      headers: { ...getAuthHeaders() }
    });
    if (!resp.ok) throw new Error('Failed to fetch registrations');
    const json = await resp.json();
    return json.data || [];
  } catch (_) {
    return [];
  }
};

export const cancelRegistration = async (registrationId: number) => {
  const resp = await fetch(`${BASE_URL}/api/registrations/${registrationId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  if (!resp.ok) throw new Error('Failed to cancel registration');
  return true;
};

export const checkInRegistration = async (registrationId: number) => {
  const resp = await fetch(`${BASE_URL}/api/registrations/${registrationId}/checkin`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  if (!resp.ok) throw new Error('Failed to check in');
  const json = await resp.json();
  return json?.data;
};

export const apiRegister = async (email: string, password: string, firstName: string, lastName: string) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName })
    });
    if (resp.ok) {
      const json = await resp.json();
      const token = json?.data?.token;
      if (token && typeof localStorage !== 'undefined') {
        localStorage.setItem('token', token);
      }
      return json?.data?.user;
    }
  } catch (_) {}
  return null;
};