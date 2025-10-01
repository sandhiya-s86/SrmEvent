export interface Event {
  id: number;
  title: string;
  category: string;
  venue: string;
  date: string; // ISO 8601 format: "YYYY-MM-DDTHH:mm:ss.sssZ"
  capacity: number;
  seatsAvailable: number;
  price: number;
  description: string;
  imageUrl: string;
  organizer: string;
  organizerId: number;
  isOutdoor?: boolean;
  waitlist: number[]; // Array of user IDs
}

export interface Category {
  id: string;
  name: string;
}

export interface User {
  id: number;
  name: string;
  role: 'student' | 'organizer' | 'admin';
  username?: string;
  password?: string;
}

export interface ConflictError extends Error {
  type: 'CONFLICT';
  eventToRegister: Event;
  conflictingEvent: Event;
  suggestedEvents: Event[];
  travelTimeMinutes: number;
}