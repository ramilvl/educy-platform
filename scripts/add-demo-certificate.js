const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🎓 Creating demo certificate...\n')

  // Find demo student
  const demoStudent = await prisma.user.findFirst({
    where: {
      email: 'bob.student@educy.com',
    },
  })

  if (!demoStudent) {
    console.error('❌ Demo student not found (bob.student@educy.com)')
    return
  }

  console.log(`✅ Found demo student: ${demoStudent.name} (${demoStudent.email})`)

  // Find an enrolled section for the demo student
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: demoStudent.id,
      status: 'ENROLLED',
      certificate: null, // No certificate yet
    },
    include: {
      section: {
        include: {
          course: true,
          instructor: true,
        },
      },
    },
  })

  if (!enrollment) {
    console.error('❌ No enrolled course without certificate found for demo student')
    console.log('   Make sure the demo student is enrolled in at least one course')
    return
  }

  console.log(`✅ Found enrollment: ${enrollment.section.course.code} - ${enrollment.section.course.title}`)
  console.log(`   Instructor: ${enrollment.section.instructor.name}`)
  console.log(`   Term: ${enrollment.section.term}\n`)

  // Create certificate
  const certificate = await prisma.certificate.create({
    data: {
      userId: demoStudent.id,
      sectionId: enrollment.sectionId,
      enrollmentId: enrollment.id,
      completionDate: new Date(),
      issuedById: enrollment.section.instructor.id, // Issued by the instructor
    },
  })

  console.log('🎉 Certificate created successfully!')
  console.log(`   Certificate ID: ${certificate.certificateNumber}`)
  console.log(`   Verification URL: https://educy.vercel.app/verify/${certificate.certificateNumber}`)
  console.log(`\n📋 Demo student:`)
  console.log(`   Name: ${demoStudent.name}`)
  console.log(`   Email: ${demoStudent.email}`)
  console.log(`\n👉 Login as the student and navigate to /student/certificates to view the certificate`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
