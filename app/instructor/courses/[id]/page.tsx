import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { requireInstructor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DashboardLayout from '@/components/dashboard-layout'
import { ContentAgeIndicator } from '@/components/content-age-indicator'
import { EnrollStudentsButton } from '@/components/enroll-students-button'
import { EnrolledStudentsList } from '@/components/enrolled-students-list'
import { DeleteCourseButton } from '@/components/delete-course-button'
import { PendingEnrollmentActions } from '@/components/pending-enrollment-actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function CourseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  try {
    await requireInstructor()
  } catch {
    redirect('/unauthorized')
  }

  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      sections: {
        include: {
          instructor: {
            select: {
              name: true,
              email: true,
            },
          },
          lessons: {
            include: {
              room: true,
            },
            orderBy: {
              dayOfWeek: 'asc',
            },
            where: {
              isArchived: false,
            },
          },
          assignments: {
            include: {
              _count: {
                select: {
                  submissions: true,
                },
              },
            },
            orderBy: {
              dueDate: 'desc',
            },
            where: {
              isArchived: false,
            },
          },
          enrollments: {
            where: {
              status: 'ENROLLED',
            },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              enrolledAt: 'desc',
            },
          },
        },
      },
    },
  })

  if (!course) {
    notFound()
  }

  const section = course.sections[0] // First section

  // Fetch pending enrollment requests for this course's section
  const pendingEnrollments = section
    ? await prisma.enrollment.findMany({
        where: {
          sectionId: section.id,
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { enrolledAt: 'asc' },
      })
    : []

  // Check access
  const hasAccess =
    course.sections.some((s) => s.instructorId === session.user.id) ||
    course.createdById === session.user.id ||
    session.user.role === 'ADMIN'

  if (!hasAccess) {
    redirect('/unauthorized')
  }

  return (
    <DashboardLayout role={session.user.role}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-[#5C2482] break-words min-w-0">
                {course.code}: {course.title}
              </h1>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  course.visibility
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {course.visibility ? 'Visible' : 'Hidden'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <span className="text-gray-600">{course.term}</span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-500">
                Created {new Date(course.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {course.description && (
              <p className="mt-3 text-gray-700">
                {course.description}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <Link
              href={`/instructor/courses/${course.id}/edit`}
              className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition"
            >
              Edit Course
            </Link>
            <DeleteCourseButton
              courseId={course.id}
              courseCode={course.code}
              courseTitle={course.title}
              hasEnrollments={(section?.enrollments.length || 0) > 0}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Students
            </p>
            <p className="text-3xl font-bold text-[#5C2482] mt-2">
              {section?.enrollments.length || 0}/{section?.capacity || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Lessons
            </p>
            <p className="text-3xl font-bold text-[#5C2482] mt-2">
              {section?.lessons.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Assignments
            </p>
            <p className="text-3xl font-bold text-[#5C2482] mt-2">
              {section?.assignments.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-xs sm:text-sm font-medium text-gray-600">
              Instructor
            </p>
            <p className="text-xs sm:text-sm font-medium text-[#5C2482] mt-2">
              {section?.instructor.name || 'N/A'}
            </p>
          </div>
        </div>

        {/* Lessons */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Lessons
            </h2>
            {section && (
              <Link
                href={`/instructor/courses/${section.id}/lessons/new`}
                className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition text-xs sm:text-sm"
              >
                + Add Lesson
              </Link>
            )}
          </div>
          <div className="p-6">
            {!section || section.lessons.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No lessons yet. Create your first lesson to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {section.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-medium text-[#5C2482]">
                        {lesson.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {lesson.dayOfWeek} • {lesson.startTime} - {lesson.endTime}
                        {lesson.room && ` • ${lesson.room.name}`}
                      </p>
                      {lesson.description && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          {lesson.description}
                        </p>
                      )}
                      <div className="mt-2">
                        <ContentAgeIndicator
                          updatedAt={lesson.updatedAt}
                          createdAt={lesson.createdAt}
                          contentType="lesson"
                          compact={true}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/instructor/courses/${section.id}/lessons/${lesson.id}/edit`}
                      className="px-3 py-2 sm:px-4 border border-[#5C2482] text-[#5C2482] rounded-xl hover:bg-[#5C2482] hover:text-white transition text-xs sm:text-sm font-medium flex-shrink-0"
                    >
                      Edit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assignments */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Assignments
            </h2>
            {section && (
              <Link
                href={`/instructor/courses/${section.id}/assignments/new`}
                className="px-3 py-2 sm:px-4 bg-[#F95B0E] text-white rounded-xl hover:bg-[#d94f0c] transition text-xs sm:text-sm"
              >
                + Create Assignment
              </Link>
            )}
          </div>
          <div className="p-6">
            {!section || section.assignments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No assignments yet.
              </p>
            ) : (
              <div className="space-y-3">
                {section.assignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    href={`/instructor/assignments/${assignment.id}`}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#5C2482]">
                        {assignment.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()} •{' '}
                        {assignment._count.submissions} submissions
                      </p>
                      <div className="mt-2">
                        <ContentAgeIndicator
                          updatedAt={assignment.updatedAt}
                          createdAt={assignment.createdAt}
                          contentType="assignment"
                          compact={true}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Enrollment Requests */}
        {pendingEnrollments.length > 0 && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b border-yellow-200 bg-yellow-50 rounded-t-xl">
              <h2 className="text-xl font-semibold text-yellow-800">
                Pending Enrollment Requests ({pendingEnrollments.length})
              </h2>
              <p className="text-sm text-yellow-700 mt-1">
                Students waiting for your approval to join this course.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {pendingEnrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{enrollment.user.name}</p>
                      <p className="text-sm text-gray-500">{enrollment.user.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Requested {new Date(enrollment.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <PendingEnrollmentActions enrollmentId={enrollment.id} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enrolled Students */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#5C2482]">
              Enrolled Students ({section?.enrollments.length || 0})
            </h2>
            {section && <EnrollStudentsButton sectionId={section.id} />}
          </div>
          <div className="p-6">
            {section && <EnrolledStudentsList enrollments={section.enrollments} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
