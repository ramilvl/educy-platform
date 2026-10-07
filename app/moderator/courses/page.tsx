'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'

interface Course {
  id: string
  code: string
  title: string
  description: string | null
  term: string
  visibility: boolean
  sections: {
    id: string
    capacity: number
    instructor: {
      name: string
      email: string
    }
    _count: {
      enrollments: number
      lessons: number
      assignments: number
    }
  }[]
}

export default function ModeratorCourses() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/moderator/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses)
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(
    (course) =>
      course.code.toLowerCase().includes(filter.toLowerCase()) ||
      course.title.toLowerCase().includes(filter.toLowerCase()) ||
      course.term.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <DashboardLayout role={session?.user?.role || 'MODERATOR'}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#5C2482]">All Courses</h1>
            <p className="mt-2 text-gray-600">Browse and view all courses in the system</p>
          </div>
        </div>

        {/* Search/Filter */}
        <div className="bg-white rounded-xl shadow p-4">
          <input
            type="text"
            placeholder="Search courses by code, title, or term..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-xs sm:text-sm font-medium text-[#5C2482]">No courses found</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {filter ? 'Try adjusting your search criteria.' : 'No courses available in the system.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-xl font-bold text-[#5C2482]">{course.code}</h3>
                        <span className="ml-3 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {course.term}
                        </span>
                        {!course.visibility && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-lg text-gray-600">{course.title}</p>
                      {course.description && (
                        <p className="mt-2 text-xs sm:text-sm text-gray-500 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="mt-6 space-y-4">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-700 uppercase">Sections</h4>
                    {course.sections.map((section) => (
                      <div key={section.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-[#5C2482]">
                              Instructor: {section.instructor.name}
                            </p>
                            <p className="text-xs text-gray-500">{section.instructor.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm text-gray-600">
                              Capacity: <span className="font-medium">{section._count.enrollments}/{section.capacity}</span>
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-4 text-xs text-gray-500">
                          <span>{section._count.lessons} lessons</span>
                          <span>•</span>
                          <span>{section._count.assignments} assignments</span>
                          <span>•</span>
                          <span>{section._count.enrollments} enrolled</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
