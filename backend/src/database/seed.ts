import { PrismaClient, UserRole, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Technical Workshop',
        description: 'Hands-on technical learning sessions',
        icon: '💻',
        color: '#3B82F6'
      }
    }),
    prisma.category.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Cultural Event',
        description: 'Cultural performances and celebrations',
        icon: '🎭',
        color: '#EF4444'
      }
    }),
    prisma.category.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Sports Tournament',
        description: 'Competitive sports events',
        icon: '⚽',
        color: '#10B981'
      }
    }),
    prisma.category.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Academic Seminar',
        description: 'Educational seminars and lectures',
        icon: '🎓',
        color: '#8B5CF6'
      }
    }),
    prisma.category.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'Social Event',
        description: 'Social gatherings and networking events',
        icon: '🎉',
        color: '#F59E0B'
      }
    }),
    prisma.category.upsert({
      where: { id: 6 },
      update: {},
      create: {
        name: 'Career Development',
        description: 'Career guidance and development sessions',
        icon: '💼',
        color: '#6366F1'
      }
    })
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    // Students
    prisma.user.upsert({
      where: { email: 'alex.student@srmuniv.ac.in' },
      update: {},
      create: {
        email: 'alex.student@srmuniv.ac.in',
        password: hashedPassword,
        firstName: 'Alex',
        lastName: 'Johnson',
        role: UserRole.STUDENT,
        studentId: 'RA123456',
        phoneNumber: '+91 9876543210'
      }
    }),
    prisma.user.upsert({
      where: { email: 'sarah.student@srmuniv.ac.in' },
      update: {},
      create: {
        email: 'sarah.student@srmuniv.ac.in',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Williams',
        role: UserRole.STUDENT,
        studentId: 'RA123457',
        phoneNumber: '+91 9876543211'
      }
    }),
    // Organizers
    prisma.user.upsert({
      where: { email: 'ben.organizer@srmuniv.ac.in' },
      update: {},
      create: {
        email: 'ben.organizer@srmuniv.ac.in',
        username: 'ben_organizer',
        password: hashedPassword,
        firstName: 'Ben',
        lastName: 'Smith',
        role: UserRole.ORGANIZER,
        phoneNumber: '+91 9876543212'
      }
    }),
    prisma.user.upsert({
      where: { email: 'priya.organizer@srmuniv.ac.in' },
      update: {},
      create: {
        email: 'priya.organizer@srmuniv.ac.in',
        username: 'priya_organizer',
        password: hashedPassword,
        firstName: 'Priya',
        lastName: 'Sharma',
        role: UserRole.ORGANIZER,
        phoneNumber: '+91 9876543213'
      }
    }),
    // Admin
    prisma.user.upsert({
      where: { email: 'admin@srmuniv.ac.in' },
      update: {},
      create: {
        email: 'admin@srmuniv.ac.in',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        phoneNumber: '+91 9876543214'
      }
    })
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create events
  const now = new Date();
  const getFutureDate = (days: number, hours: number = 0) => {
    const date = new Date(now.getTime() + days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000);
    return date;
  };

  const events = await Promise.all([
    prisma.event.upsert({
      where: { id: 1 },
      update: {},
      create: {
        title: 'React Horizon: State of the Art',
        description: 'Dive deep into the latest features of React 19, concurrent rendering, and server components. A hands-on workshop for aspiring frontend developers.',
        categoryId: 1, // Technical Workshop
        venue: 'Dr. T.P. Ganesan Auditorium',
        date: getFutureDate(5, 14), // 2 PM in 5 days
        endDate: getFutureDate(5, 17), // 5 PM
        capacity: 500,
        currentRegistrations: 150,
        price: 0,
        imageUrl: 'https://picsum.photos/seed/react/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: false,
        contactEmail: 'react-workshop@srmuniv.ac.in',
        organizerId: users[2].id // Ben's event
      }
    }),
    prisma.event.upsert({
      where: { id: 2 },
      update: {},
      create: {
        title: 'Milan \'24 - Cultural Extravaganza',
        description: 'The annual cultural festival of SRM University. Featuring dance, music, drama, and art from across the country. A celebration of diversity and talent.',
        categoryId: 2, // Cultural Event
        venue: 'Main Campus Grounds',
        date: getFutureDate(10, 9), // 9 AM in 10 days
        endDate: getFutureDate(10, 22), // 10 PM
        capacity: 5000,
        currentRegistrations: 2500,
        price: 10,
        imageUrl: 'https://picsum.photos/seed/milan/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: true,
        contactEmail: 'milan@srmuniv.ac.in',
        organizerId: users[4].id // Admin's event
      }
    }),
    prisma.event.upsert({
      where: { id: 3 },
      update: {},
      create: {
        title: 'Inter-Departmental Cricket Tournament',
        description: 'Witness the thrill of cricket as departments battle for the coveted championship trophy. Cheer for your favorite teams!',
        categoryId: 3, // Sports Tournament
        venue: 'SRM Cricket Ground',
        date: getFutureDate(1, 9), // 9 AM tomorrow
        endDate: getFutureDate(1, 18), // 6 PM
        capacity: 200,
        currentRegistrations: 180,
        price: 0,
        imageUrl: 'https://picsum.photos/seed/cricket/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: true,
        contactEmail: 'sports@srmuniv.ac.in',
        organizerId: users[2].id // Ben's event
      }
    }),
    prisma.event.upsert({
      where: { id: 4 },
      update: {},
      create: {
        title: 'Future Forward: Tech Career Fair',
        description: 'Connect with leading tech companies, explore internship and full-time opportunities. Bring your resume and dress for success.',
        categoryId: 6, // Career Development
        venue: 'UB Auditorium Complex',
        date: getFutureDate(20, 9), // 9 AM in 20 days
        endDate: getFutureDate(20, 17), // 5 PM
        capacity: 1000,
        currentRegistrations: 0,
        price: 0,
        imageUrl: 'https://picsum.photos/seed/career/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: false,
        contactEmail: 'career@srmuniv.ac.in',
        organizerId: users[4].id // Admin's event
      }
    }),
    prisma.event.upsert({
      where: { id: 5 },
      update: {},
      create: {
        title: 'HackSRM 2024: 36-Hour Hackathon',
        description: 'Build innovative solutions to real-world problems in this 36-hour coding marathon. Prizes, mentorship, and a lot of caffeine await you.',
        categoryId: 1, // Technical Workshop
        venue: 'Tech Park',
        date: getFutureDate(15, 9), // 9 AM in 15 days
        endDate: getFutureDate(16, 21), // 9 PM next day
        capacity: 300,
        currentRegistrations: 299, // Almost full for testing waitlist
        price: 0,
        imageUrl: 'https://picsum.photos/seed/hackathon/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: false,
        requirements: 'Laptop required, basic programming knowledge',
        contactEmail: 'hacksrm@srmuniv.ac.in',
        organizerId: users[4].id // Admin's event
      }
    }),
    prisma.event.upsert({
      where: { id: 6 },
      update: {},
      create: {
        title: 'Symphony of Strings: Classical Music Night',
        description: 'An enchanting evening of classical music featuring renowned artists. A perfect getaway for music lovers.',
        categoryId: 2, // Cultural Event
        venue: 'Mini Hall 1',
        date: getFutureDate(7, 19), // 7 PM in 7 days
        endDate: getFutureDate(7, 22), // 10 PM
        capacity: 250,
        currentRegistrations: 200,
        price: 15,
        imageUrl: 'https://picsum.photos/seed/symphony/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: false,
        contactEmail: 'music@srmuniv.ac.in',
        organizerId: users[3].id // Priya's event
      }
    }),
    prisma.event.upsert({
      where: { id: 7 },
      update: {},
      create: {
        title: 'Introduction to Quantum Computing',
        description: 'A beginner-friendly session on the principles of quantum computing and its potential applications, delivered by Dr. Anand from the Physics Dept.',
        categoryId: 4, // Academic Seminar
        venue: 'Tech Park',
        date: getFutureDate(5, 16), // 4 PM in 5 days (same day as React workshop)
        endDate: getFutureDate(5, 18), // 6 PM
        capacity: 150,
        currentRegistrations: 75,
        price: 0,
        imageUrl: 'https://picsum.photos/seed/quantum/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: false,
        contactEmail: 'physics@srmuniv.ac.in',
        organizerId: users[4].id // Admin's event
      }
    }),
    prisma.event.upsert({
      where: { id: 8 },
      update: {},
      create: {
        title: 'Freshers\' Night 2024: Neon Jungle',
        description: 'The official welcome party for all first-year students! Get ready for a night of music, dance, and fun with a vibrant "Neon Jungle" theme.',
        categoryId: 5, // Social Event
        venue: 'Main Campus Grounds',
        date: getFutureDate(22, 19), // 7 PM in 22 days
        endDate: getFutureDate(22, 23), // 11 PM
        capacity: 2000,
        currentRegistrations: 500,
        price: 15,
        imageUrl: 'https://picsum.photos/seed/freshers/800/600',
        status: EventStatus.PUBLISHED,
        isOutdoor: true,
        contactEmail: 'freshers@srmuniv.ac.in',
        organizerId: users[4].id // Admin's event
      }
    })
  ]);

  console.log(`✅ Created ${events.length} events`);

  // Create some registrations
  const registrations = await Promise.all([
    prisma.registration.create({
      data: {
        userId: users[0].id, // Alex
        eventId: events[0].id, // React Workshop
        status: 'REGISTERED'
      }
    }),
    prisma.registration.create({
      data: {
        userId: users[1].id, // Sarah
        eventId: events[0].id, // React Workshop
        status: 'REGISTERED'
      }
    }),
    prisma.registration.create({
      data: {
        userId: users[0].id, // Alex
        eventId: events[4].id, // Hackathon (waitlisted)
        status: 'WAITLISTED'
      }
    })
  ]);

  console.log(`✅ Created ${registrations.length} registrations`);

  // Create promo codes
  const promoCodes = await Promise.all([
    prisma.promoCode.upsert({
      where: { code: 'EARLYBIRD20' },
      update: {},
      create: {
        code: 'EARLYBIRD20',
        description: 'Early bird discount for tech events',
        discountType: 'percentage',
        discountValue: 20,
        maxUses: 100,
        validFrom: new Date(),
        validUntil: getFutureDate(30)
      }
    }),
    prisma.promoCode.upsert({
      where: { code: 'STUDENT50' },
      update: {},
      create: {
        code: 'STUDENT50',
        description: 'Student discount for all events',
        discountType: 'percentage',
        discountValue: 50,
        maxUses: 500,
        validFrom: new Date(),
        validUntil: getFutureDate(365)
      }
    })
  ]);

  console.log(`✅ Created ${promoCodes.length} promo codes`);

  // Create some analytics data
  const analyticsData = await Promise.all([
    prisma.analytics.create({
      data: {
        eventId: events[0].id,
        metric: 'view',
        value: 150,
        metadata: { source: 'homepage' }
      }
    }),
    prisma.analytics.create({
      data: {
        eventId: events[0].id,
        metric: 'registration',
        value: 1,
        metadata: { userId: users[0].id }
      }
    })
  ]);

  console.log(`✅ Created ${analyticsData.length} analytics records`);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

