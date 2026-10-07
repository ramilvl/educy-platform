const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== DEBUG EXAMS ===\n')

  // Get all exams
  const allExams = await prisma.exam.findMany({
    include: {
      section: {
        include: {
          course: true,
          instructor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  console.log(`Total exams in database: ${allExams.length}`)
  console.log('\nRecent exams:')

  allExams.forEach((exam, index) => {
    console.log(`\n${index + 1}. ${exam.title}`)
    console.log(`   ID: ${exam.id}`)
    console.log(`   Section: ${exam.section.name} (${exam.section.course.code})`)
    console.log(`   Instructor: ${exam.section.instructor.name} (${exam.section.instructor.email})`)
    console.log(`   Instructor ID: ${exam.section.instructorId}`)
    console.log(`   Questions: ${exam._count.questions}`)
    console.log(`   Start: ${exam.startTime}`)
    console.log(`   End: ${exam.endTime}`)
    console.log(`   Created: ${exam.createdAt}`)
  })

  // Get all sections with instructors
  console.log('\n\n=== SECTIONS ===\n')
  const sections = await prisma.section.findMany({
    include: {
      course: true,
      instructor: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          exams: true,
        },
      },
    },
    take: 10,
  })

  sections.forEach((section, index) => {
    console.log(`\n${index + 1}. ${section.name} - ${section.course.code}`)
    console.log(`   Instructor: ${section.instructor.name} (${section.instructor.email})`)
    console.log(`   Instructor ID: ${section.instructorId}`)
    console.log(`   Exams count: ${section._count.exams}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
