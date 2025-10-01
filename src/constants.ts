import { Event, Category, User } from './types';

export const CATEGORIES: Category[] = [
  { id: 'tech', name: 'Technical Workshop' },
  { id: 'cultural', name: 'Cultural Event' },
  { id: 'sports', name: 'Sports Tournament' },
  { id: 'career', name: 'Career Development' },
  { id: 'music_arts', name: 'Music & Arts' },
  { id: 'seminar', name: 'Academic Seminar' },
  { id: 'social', name: 'Social Mixer' },
];

export const MOCK_USERS: User[] = [
    { id: 12345, name: 'Alex', role: 'student' },
    { id: 67890, name: 'Ben', role: 'organizer', username: 'ben', password: 'password123' },
    { id: 11111, name: 'Casey', role: 'admin', username: 'casey', password: 'adminpass' },
];

const now = new Date();
const getFutureDate = (days: number, hours: number = 0) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000).toISOString();

export const MOCK_EVENTS: Event[] = [
  {
    id: 1,
    title: 'React Horizon: State of the Art',
    category: 'Technical Workshop',
    venue: 'Dr. T.P. Ganesan Auditorium',
    date: getFutureDate(5, 14), // 2 PM
    capacity: 500,
    seatsAvailable: 150,
    price: 0,
    description: 'Dive deep into the latest features of React 19, concurrent rendering, and server components. A hands-on workshop for aspiring frontend developers.',
    imageUrl: 'https://picsum.photos/seed/react/800/600',
    organizer: 'SRM ACM Chapter',
    organizerId: 67890, // Ben's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 2,
    title: 'Milan \'24 - Cultural Extravaganza',
    category: 'Cultural Event',
    venue: 'Main Campus Grounds',
    date: getFutureDate(10),
    capacity: 5000,
    seatsAvailable: 2500,
    price: 10,
    description: 'The annual cultural festival of SRM University. Featuring dance, music, drama, and art from across the country. A celebration of diversity and talent.',
    imageUrl: 'https://picsum.photos/seed/milan/800/600',
    organizer: 'Directorate of Student Affairs',
    organizerId: 11111, // Casey's event
    isOutdoor: true,
    waitlist: [],
  },
  {
    id: 3,
    title: 'Inter-Departmental Cricket Tournament',
    category: 'Sports Tournament',
    venue: 'SRM Cricket Ground',
    date: getFutureDate(1, 9), // 9 AM
    capacity: 200,
    seatsAvailable: 20,
    price: 0,
    description: 'Witness the thrill of cricket as departments battle for the coveted championship trophy. Cheer for your favorite teams!',
    imageUrl: 'https://picsum.photos/seed/cricket/800/600',
    organizer: 'Department of Physical Education',
    organizerId: 67890, // Ben's event
    isOutdoor: true,
    waitlist: [],
  },
  {
    id: 4,
    title: 'Future Forward: Tech Career Fair',
    category: 'Career Development',
    venue: 'UB Auditorium Complex',
    date: getFutureDate(20),
    capacity: 1000,
    seatsAvailable: 1000,
    price: 0,
    description: 'Connect with leading tech companies, explore internship and full-time opportunities. Bring your resume and dress for success.',
    imageUrl: 'https://picsum.photos/seed/career/800/600',
    organizer: 'Corporate Relations & Career Services',
    organizerId: 11111, // Casey's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 5,
    title: 'Aaruush \'24: Techno-Management Fest',
    category: 'Cultural Event',
    venue: 'Multiple Venues',
    date: getFutureDate(30),
    capacity: 2000,
    seatsAvailable: 800,
    price: 5,
    description: 'A national level techno-management fest with a plethora of events, workshops, and guest lectures from industry experts.',
    imageUrl: 'https://picsum.photos/seed/aaruush/800/600',
    organizer: 'Team Aaruush',
    organizerId: 67890, // Ben's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 6,
    title: 'Symphony of Strings: Classical Music Night',
    category: 'Music & Arts',
    venue: 'Mini Hall 1',
    date: getFutureDate(7, 19),
    capacity: 250,
    seatsAvailable: 50,
    price: 15,
    description: 'An enchanting evening of classical music featuring renowned artists. A perfect getaway for music lovers.',
    imageUrl: 'https://picsum.photos/seed/symphony/800/600',
    organizer: 'SRM Music Club',
    organizerId: 67890, // Ben's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 7,
    title: 'HackSRM 2024: 36-Hour Hackathon',
    category: 'Technical Workshop',
    venue: 'Tech Park',
    date: getFutureDate(15),
    capacity: 300,
    seatsAvailable: 1, // Set to 1 for easy waitlist testing
    price: 0,
    description: 'Build innovative solutions to real-world problems in this 36-hour coding marathon. Prizes, mentorship, and a lot of caffeine await you.',
    imageUrl: 'https://picsum.photos/seed/hackathon/800/600',
    organizer: 'SRM Innovation and Incubation Center',
    organizerId: 11111, // Casey's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 8,
    title: 'Annual Marathon for a Cause',
    category: 'Sports Tournament',
    venue: 'Campus Main Gate',
    date: getFutureDate(25),
    capacity: 1500,
    seatsAvailable: 600,
    price: 2,
    description: 'Run for a cause! Participate in our annual campus marathon to support local charities. Every step counts.',
    imageUrl: 'https://picsum.photos/seed/marathon/800/600',
    organizer: 'NSS SRM',
    organizerId: 11111, // Casey's event
    isOutdoor: true,
    waitlist: [],
  },
  {
    id: 9,
    title: 'Drone Racing League',
    category: 'Sports Tournament',
    venue: 'Football Ground',
    date: getFutureDate(1, 11), // 11 AM, same day as Cricket
    capacity: 100,
    seatsAvailable: 100,
    price: 0,
    description: 'Experience high-speed drone racing with professional pilots. An adrenaline-pumping event for all tech enthusiasts.',
    imageUrl: 'https://picsum.photos/seed/drone/800/600',
    organizer: 'SRM Robotics Club',
    organizerId: 67890, // Ben's event
    isOutdoor: true,
    waitlist: [],
  },
  {
    id: 10,
    title: 'Introduction to Quantum Computing',
    category: 'Academic Seminar',
    venue: 'Tech Park',
    date: getFutureDate(5, 16), // 4 PM, same day as React workshop
    capacity: 150,
    seatsAvailable: 75,
    price: 0,
    description: 'A beginner-friendly session on the principles of quantum computing and its potential applications, delivered by Dr. Anand from the Physics Dept.',
    imageUrl: 'https://picsum.photos/seed/quantum/800/600',
    organizer: 'Dept. of Physics',
    organizerId: 11111, // Casey's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 11,
    title: 'Workshop on Machine Learning with Python',
    category: 'Technical Workshop',
    venue: 'Tech Park, 4th Floor Lab',
    date: getFutureDate(12, 13), // 1 PM
    capacity: 60,
    seatsAvailable: 50,
    price: 5,
    description: 'A hands-on workshop covering the fundamentals of Machine Learning using Python libraries like Scikit-learn and Pandas. Laptops required.',
    imageUrl: 'https://picsum.photos/seed/ml/800/600',
    organizer: 'SRM AI/ML Club',
    organizerId: 67890, // Ben's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 12,
    title: 'Alumni Homecoming 2024',
    category: 'Social Mixer',
    venue: 'Dr. T.P. Ganesan Auditorium',
    date: getFutureDate(40, 18), // 6 PM
    capacity: 800,
    seatsAvailable: 750,
    price: 20,
    description: 'Reconnect with old friends, network with fellow alumni, and relive your campus memories. Dinner and entertainment included.',
    imageUrl: 'https://picsum.photos/seed/alumni/800/600',
    organizer: 'SRM Alumni Association',
    organizerId: 11111, // Casey's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 13,
    title: 'Guest Lecture on String Theory',
    category: 'Academic Seminar',
    venue: 'Mini Hall 2',
    date: getFutureDate(18, 11), // 11 AM
    capacity: 150,
    seatsAvailable: 150,
    price: 0,
    description: 'A fascinating guest lecture by a renowned physicist on the complexities and wonders of String Theory. Open to all departments.',
    imageUrl: 'https://picsum.photos/seed/theory/800/600',
    organizer: 'Dept. of Physics',
    organizerId: 11111, // Casey's event
    isOutdoor: false,
    waitlist: [],
  },
  {
    id: 14,
    title: 'Freshers\' Night 2024: Neon Jungle',
    category: 'Social Mixer',
    venue: 'Main Campus Grounds',
    date: getFutureDate(22, 19), // 7 PM
    capacity: 2000,
    seatsAvailable: 1500,
    price: 15,
    description: 'The official welcome party for all first-year students! Get ready for a night of music, dance, and fun with a vibrant "Neon Jungle" theme.',
    imageUrl: 'https://picsum.photos/seed/freshers/800/600',
    organizer: 'Directorate of Student Affairs',
    organizerId: 11111, // Casey's event
    isOutdoor: true,
    waitlist: [],
  },
  {
    id: 15,
    title: 'Cybersecurity: Capture The Flag',
    category: 'Technical Workshop',
    venue: 'UB Auditorium Complex',
    date: getFutureDate(35, 9), // All day event
    capacity: 250,
    seatsAvailable: 200,
    price: 0,
    description: 'Test your hacking skills in a competitive and legal environment. Solve challenges, find vulnerabilities, and capture the flags to win exciting prizes.',
    imageUrl: 'https://picsum.photos/seed/ctf/800/600',
    organizer: 'SRM Cybersecurity Club',
    organizerId: 67890, // Ben's event
    isOutdoor: false,
    waitlist: [],
  },
];