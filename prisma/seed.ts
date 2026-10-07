import { PrismaClient, RoleName, DayOfWeek, EnrollmentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create users with different roles
  const adminPassword = await bcrypt.hash('admin123', 10)
  const instructorPassword = await bcrypt.hash('instructor123', 10)
  const studentPassword = await bcrypt.hash('student123', 10)
  const moderatorPassword = await bcrypt.hash('moderator123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@educy.com' },
    update: {},
    create: {
      email: 'admin@educy.com',
      hashedPassword: adminPassword,
      name: 'System Administrator',
      role: RoleName.ADMIN,
    },
  })

  const instructor = await prisma.user.upsert({
    where: { email: 'alice.instructor@educy.com' },
    update: {},
    create: {
      email: 'alice.instructor@educy.com',
      hashedPassword: instructorPassword,
      name: 'Alice Johnson',
      role: RoleName.INSTRUCTOR,
    },
  })

  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@educy.com' },
    update: {},
    create: {
      email: 'moderator@educy.com',
      hashedPassword: moderatorPassword,
      name: 'Bob Moderator',
      role: RoleName.MODERATOR,
    },
  })

  const student = await prisma.user.upsert({
    where: { email: 'bob.student@educy.com' },
    update: {},
    create: {
      email: 'bob.student@educy.com',
      hashedPassword: studentPassword,
      name: 'Bob Student',
      role: RoleName.STUDENT,
    },
  })

  console.log('✓ Created users')

  // Create rooms
  const lectureHallA = await prisma.room.upsert({
    where: { name: 'Lecture Hall A' },
    update: {},
    create: {
      name: 'Lecture Hall A',
      location: 'Building 1, Floor 2',
      capacity: 100,
      resources: { projector: true, whiteboard: true, sound_system: true },
    },
  })

  const lab2 = await prisma.room.upsert({
    where: { name: 'Lab 2' },
    update: {},
    create: {
      name: 'Lab 2',
      location: 'Building 2, Floor 1',
      capacity: 30,
      resources: { computers: 30, projector: true, whiteboard: true },
    },
  })

  console.log('✓ Created rooms')

  // Create a course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      title: 'Introduction to Web Development',
      description: 'Learn the fundamentals of web development including HTML, CSS, JavaScript, and modern frameworks.',
      term: 'Spring 2026',
      visibility: true,
      createdById: instructor.id,
    },
  })

  console.log('✓ Created course')

  // Create a section
  const section = await prisma.section.create({
    data: {
      courseId: course.id,
      instructorId: instructor.id,
      capacity: 30,
      term: 'Spring 2026',
    },
  })

  console.log('✓ Created section')

  // Create lessons
  const lesson1 = await prisma.lesson.create({
    data: {
      sectionId: section.id,
      title: 'Introduction to HTML & CSS',
      description: 'Learn the basics of HTML structure and CSS styling',
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '09:00',
      endTime: '11:00',
      roomId: lectureHallA.id,
      materialIds: [],
    },
  })

  const lesson2 = await prisma.lesson.create({
    data: {
      sectionId: section.id,
      title: 'JavaScript Fundamentals',
      description: 'Variables, functions, and control structures',
      dayOfWeek: DayOfWeek.WEDNESDAY,
      startTime: '09:00',
      endTime: '11:00',
      roomId: lectureHallA.id,
      materialIds: [],
    },
  })

  const lesson3 = await prisma.lesson.create({
    data: {
      sectionId: section.id,
      title: 'Lab: Building Your First Website',
      description: 'Hands-on practice building a responsive website',
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: '14:00',
      endTime: '16:00',
      roomId: lab2.id,
      materialIds: [],
    },
  })

  console.log('✓ Created lessons')

  // Create schedules for the next 4 weeks
  const startDate = new Date('2026-01-26') // First Monday of Spring 2026
  const lessons = [lesson1, lesson2, lesson3]

  for (let week = 0; week < 4; week++) {
    for (const lesson of lessons) {
      const dayOffset = {
        MONDAY: 0,
        TUESDAY: 1,
        WEDNESDAY: 2,
        THURSDAY: 3,
        FRIDAY: 4,
        SATURDAY: 5,
        SUNDAY: 6,
      }[lesson.dayOfWeek]

      const scheduleDate = new Date(startDate)
      scheduleDate.setDate(startDate.getDate() + week * 7 + dayOffset)

      await prisma.schedule.create({
        data: {
          lessonId: lesson.id,
          date: scheduleDate,
          isCancelled: false,
        },
      })
    }
  }

  console.log('✓ Created schedules')

  // Enroll the student
  await prisma.enrollment.create({
    data: {
      userId: student.id,
      sectionId: section.id,
      status: EnrollmentStatus.ENROLLED,
    },
  })

  console.log('✓ Created enrollment')

  // Create an assignment
  const assignment = await prisma.assignment.create({
    data: {
      sectionId: section.id,
      title: 'Project 1: Personal Portfolio Website',
      description: 'Create a responsive personal portfolio website using HTML, CSS, and JavaScript',
      dueDate: new Date('2026-02-28'),
      allowedFileTypes: ['zip', 'html', 'pdf'],
      maxSizeBytes: 10485760, // 10MB
      createdById: instructor.id,
    },
  })

  console.log('✓ Created assignment')

  // Create a notification for the student
  await prisma.notification.create({
    data: {
      userId: student.id,
      type: 'ASSIGNMENT_CREATED',
      payload: {
        assignmentId: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate.toISOString(),
      },
    },
  })

  console.log('✓ Created notification')

  // Create an audit log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DATABASE_SEEDED',
      targetType: 'System',
      targetId: null,
      details: { timestamp: new Date().toISOString(), message: 'Initial database seed completed' },
    },
  })

  console.log('✓ Created audit log')

  console.log('\n🎉 Database seed completed successfully!\n')
  console.log('📝 Test credentials:')
  console.log('Admin: admin@educy.com / admin123')
  console.log('Instructor: alice.instructor@educy.com / instructor123')
  console.log('Moderator: moderator@educy.com / moderator123')
  console.log('Student: bob.student@educy.com / student123\n')
}

main()
  .catch((e) => {
    console.error('Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
