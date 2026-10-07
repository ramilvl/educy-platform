'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ScrollToTop from '@/components/scroll-to-top'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const roleRoutes = {
        ADMIN: '/admin',
        INSTRUCTOR: '/instructor',
        MODERATOR: '/moderator',
        STUDENT: '/student/dashboard',
      }
      const route = roleRoutes[session.user.role as keyof typeof roleRoutes] || '/dashboard'
      router.push(route)
    }
  }, [status, session, router])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C2482] mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't show landing page content while redirecting authenticated users
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C2482] mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-[#5C2482] hover:text-[#7B3FA3] transition">
                Educy
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-[#5C2482] transition">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-[#5C2482] transition">How It Works</a>
              <Link
                href="/auth/signin"
                className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 animate-slideDown">
              <div className="flex flex-col space-y-4">
                <a
                  href="#features"
                  className="text-gray-700 hover:text-[#5C2482] transition px-3 py-2 sm:px-4"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-gray-700 hover:text-[#5C2482] transition px-3 py-2 sm:px-4"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </a>
                <Link
                  href="/auth/signin"
                  className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-3 py-2 sm:px-4 rounded-lg font-medium transition text-center mx-4"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-br from-[#5C2482] via-purple-700 to-[#7B3FA3]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-block bg-white/10 backdrop-blur-sm px-3 py-2 sm:px-4 rounded-full mb-6">
                <span className="text-xs sm:text-sm font-medium">🚀 Trusted by 500+ Educational Institutions</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight">
                Stop Drowning in Spreadsheets. Start Teaching.
              </h1>
              <p className="text-lg sm:text-xl text-purple-100 mb-8 leading-relaxed">
                Educy automates the administrative chaos so you can focus on what matters:
                <span className="font-semibold text-white"> delivering exceptional education.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signin"
                  className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-xl hover:shadow-2xl text-center"
                >
                  Start Free Trial →
                </Link>
                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-4 rounded-xl font-semibold text-lg transition border-2 border-white/30"
                >
                  Watch Demo
                </button>
              </div>
              <p className="mt-6 text-xs sm:text-sm text-purple-200">
                ✓ No credit card required  ✓ 14-day free trial  ✓ Setup in 5 minutes
              </p>
            </div>

            {/* Hero Image/Stats Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                    <div className="text-4xl font-bold text-[#5C2482] mb-2">95%</div>
                    <div className="text-xs sm:text-sm text-gray-600">Time Saved on Admin Tasks</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
                    <div className="text-4xl font-bold text-[#F95B0E] mb-2">10K+</div>
                    <div className="text-xs sm:text-sm text-gray-600">Active Students</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                    <div className="text-4xl font-bold text-green-600 mb-2">500+</div>
                    <div className="text-xs sm:text-sm text-gray-600">Courses Running</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                    <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
                    <div className="text-xs sm:text-sm text-gray-600">Support Available</div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-xs sm:text-sm text-gray-500 mb-3">Trusted by leading institutions:</p>
                  <div className="flex items-center gap-6 text-gray-400">
                    <span className="text-lg font-semibold">University X</span>
                    <span className="text-lg font-semibold">College Y</span>
                    <span className="text-lg font-semibold">Academy Z</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 px-4">
              Running a Course Shouldn't Feel Like This
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Traditional course management is broken. You're spending more time on paperwork than teaching.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
              <div className="text-4xl mb-4">😫</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Enrollment Chaos</h3>
              <p className="text-gray-600 mb-4">
                Manually tracking enrollment requests in spreadsheets. Lost emails. Duplicate entries. Students asking "Did you get my request?"
              </p>
              <div className="text-xs sm:text-sm text-red-600 font-semibold">❌ Hours wasted weekly</div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Assignment Nightmare</h3>
              <p className="text-gray-600 mb-4">
                Collecting assignments via email. Files scattered everywhere. No version control. Can't track who submitted what.
              </p>
              <div className="text-xs sm:text-sm text-red-600 font-semibold">❌ Impossible to scale</div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No Visibility</h3>
              <p className="text-gray-600 mb-4">
                Zero insight into student progress. Can't identify struggling students until it's too late. No data-driven decisions.
              </p>
              <div className="text-xs sm:text-sm text-red-600 font-semibold">❌ Students fall through cracks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#5C2482] to-purple-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 px-4">
              Educy Turns Chaos Into Clarity
            </h2>
            <p className="text-lg sm:text-xl text-purple-100 max-w-3xl mx-auto px-4">
              One platform to manage everything. Automated workflows. Real-time insights. Happy students.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-white mb-3">Automated Enrollment</h3>
              <p className="text-purple-100 mb-4">
                Students enroll with one click. Auto-approve or manual review. Instant email notifications. Waitlist management. Zero spreadsheets.
              </p>
              <div className="text-xs sm:text-sm text-green-300 font-semibold">✓ 5 minutes setup, 95% time saved</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-3">Smart Assignment Management</h3>
              <p className="text-purple-100 mb-4">
                Students submit directly in platform. Automatic late detection. File validation. Bulk grading. Feedback loops. All in one place.
              </p>
              <div className="text-xs sm:text-sm text-green-300 font-semibold">✓ Grade 100 assignments in 30 mins</div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-2xl font-bold text-white mb-3">Real-Time Analytics</h3>
              <p className="text-purple-100 mb-4">
                See who's struggling instantly. Track submission rates. Monitor engagement. Export reports. Make data-driven interventions.
              </p>
              <div className="text-xs sm:text-sm text-green-300 font-semibold">✓ Identify at-risk students early</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 px-4">
              Everything You Need to Run World-Class Courses
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 px-4">
              Built for educators, loved by students
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "👥",
                title: "Bulk User Import",
                description: "Import 1000s of students via Excel. Automatic welcome emails. Password setup links. Two-phase import prevents data loss.",
                color: "purple"
              },
              {
                icon: "📝",
                title: "Assignment System",
                description: "Create assignments with file type restrictions. Auto-detect late submissions. Grade with feedback. Track submission rates.",
                color: "orange"
              },
              {
                icon: "📅",
                title: "Course Scheduling",
                description: "Build weekly schedules. Assign rooms. Handle conflicts. Cancel lessons with auto-notifications. Calendar integration.",
                color: "green"
              },
              {
                icon: "🔐",
                title: "Role-Based Access",
                description: "Admin, Moderator, Instructor, Student roles. Granular permissions. Secure file access. Audit logs for compliance.",
                color: "blue"
              },
              {
                icon: "📊",
                title: "Analytics Dashboard",
                description: "Track enrollments, submissions, grades. Identify trends. Export reports. Monitor course health in real-time.",
                color: "purple"
              },
              {
                icon: "🤖",
                title: "AI-Powered Features",
                description: "AI tutoring for students. Auto-grading assistance. Concept explanations. 24/7 virtual teaching assistant.",
                color: "orange"
              },
              {
                icon: "📁",
                title: "File Management",
                description: "Secure cloud storage. Version control. File type validation. Automatic virus scanning. Easy sharing.",
                color: "green"
              },
              {
                icon: "🔔",
                title: "Smart Notifications",
                description: "Assignment due reminders. Grade received alerts. Enrollment approvals. Customizable notification preferences.",
                color: "blue"
              },
              {
                icon: "⚡",
                title: "Blazing Fast",
                description: "Built on Next.js 14. Edge deployment. Sub-second load times. Handles 10,000+ concurrent users effortlessly.",
                color: "purple"
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition border border-gray-100">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 px-4">
              From Chaos to Organized in 3 Simple Steps
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 px-4">
              Launch your first course in under 10 minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="absolute -top-6 left-8 bg-[#F95B0E] text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  1
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Import Your Students</h3>
                  <p className="text-gray-600 mb-4">
                    Upload Excel with student emails. We send welcome emails with password setup links. They're enrolled and ready in minutes.
                  </p>
                  <div className="text-xs sm:text-sm text-[#5C2482] font-semibold">⏱️ 5 minutes</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="absolute -top-6 left-8 bg-[#F95B0E] text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  2
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Your Course</h3>
                  <p className="text-gray-600 mb-4">
                    Add course details, create sections, build weekly schedule. Upload materials. Create assignments. Set grading criteria.
                  </p>
                  <div className="text-xs sm:text-sm text-[#5C2482] font-semibold">⏱️ 10 minutes</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="absolute -top-6 left-8 bg-[#F95B0E] text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  3
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Let It Run</h3>
                  <p className="text-gray-600 mb-4">
                    Students enroll, submit assignments, get grades. You monitor analytics, provide feedback. System handles the rest automatically.
                  </p>
                  <div className="text-xs sm:text-sm text-[#5C2482] font-semibold">⏱️ Automated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Benefits */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 px-4">
              Built for Every Role in Your Institution
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">👨‍💼</div>
              <h3 className="text-xl font-bold text-[#5C2482] mb-3">For Admins</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li>✓ Bulk user management</li>
                <li>✓ System-wide analytics</li>
                <li>✓ Audit logs & compliance</li>
                <li>✓ Role management</li>
                <li>✓ Institution settings</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">👩‍🏫</div>
              <h3 className="text-xl font-bold text-[#F95B0E] mb-3">For Instructors</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li>✓ Course creation</li>
                <li>✓ Assignment grading</li>
                <li>✓ Student progress tracking</li>
                <li>✓ Schedule management</li>
                <li>✓ Easy communication</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">🎓</div>
              <h3 className="text-xl font-bold text-green-600 mb-3">For Students</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li>✓ Easy enrollment</li>
                <li>✓ Assignment submission</li>
                <li>✓ Grade tracking</li>
                <li>✓ AI tutor access</li>
                <li>✓ Course materials</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl">
              <div className="text-4xl mb-3">👮</div>
              <h3 className="text-xl font-bold text-blue-600 mb-3">For Moderators</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
                <li>✓ Enrollment approval</li>
                <li>✓ Content moderation</li>
                <li>✓ Student support</li>
                <li>✓ Course monitoring</li>
                <li>✓ Issue escalation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#5C2482] to-purple-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-purple-200">Educational Institutions</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">10,000+</div>
              <div className="text-purple-200">Active Students</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">95%</div>
              <div className="text-purple-200">Time Saved</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">4.9/5</div>
              <div className="text-purple-200">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by Educators Worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-2xl">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-4 italic">
                "Educy cut our enrollment processing time from 3 hours to 15 minutes. It's literally given me my evenings back."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-xl font-bold text-[#5C2482]">
                  SM
                </div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900">Sarah Miller</div>
                  <div className="text-xs sm:text-sm text-gray-600">Dean, Springfield University</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-2xl">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-4 italic">
                "The assignment management feature is a game-changer. I can grade 100 submissions in the time it used to take for 20."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center text-xl font-bold text-[#F95B0E]">
                  JD
                </div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900">Dr. James Davis</div>
                  <div className="text-xs sm:text-sm text-gray-600">Professor, Tech Institute</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-2xl">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-4 italic">
                "Finally, a platform that actually understands how education works. Our students love how easy it is to use."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-xl font-bold text-green-600">
                  LW
                </div>
                <div className="ml-3">
                  <div className="font-bold text-gray-900">Lisa Wang</div>
                  <div className="text-xs sm:text-sm text-gray-600">Director, Online Academy</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#5C2482] via-purple-700 to-[#7B3FA3]">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl font-bold mb-6">
            Ready to Transform Your Institution?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join 500+ institutions that have already made the switch. Start your 14-day free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-10 py-4 rounded-xl font-bold text-lg transition shadow-xl hover:shadow-2xl"
            >
              Start Free Trial →
            </Link>
            <button
              onClick={() => setDemoModalOpen(true)}
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-10 py-4 rounded-xl font-bold text-lg transition border-2 border-white/30"
            >
              Watch Demo
            </button>
          </div>
          <p className="mt-6 text-xs sm:text-sm text-purple-200">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Demo Credentials */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Try It Now - Demo Accounts</h3>
            <p className="text-gray-600">Experience different roles without signing up</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
              <div className="text-2xl mb-2">👨‍💼</div>
              <div className="font-bold text-[#5C2482] mb-1">Admin</div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">admin@educy.com</div>
              <div className="text-xs text-gray-500">Full system access</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
              <div className="text-2xl mb-2">👩‍🏫</div>
              <div className="font-bold text-[#F95B0E] mb-1">Instructor</div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">alice.instructor@educy.com</div>
              <div className="text-xs text-gray-500">Course management</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
              <div className="text-2xl mb-2">👮</div>
              <div className="font-bold text-green-600 mb-1">Moderator</div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">moderator@educy.com</div>
              <div className="text-xs text-gray-500">Enrollment approval</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
              <div className="text-2xl mb-2">🎓</div>
              <div className="font-bold text-blue-600 mb-1">Student</div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">bob.student@educy.com</div>
              <div className="text-xs text-gray-500">Student experience</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-[#5C2482] mb-2">Educy Platform Demo</h2>
                <p className="text-gray-600">See how Educy transforms course management</p>
              </div>

              {/* Video Container */}
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl mb-6 flex items-center justify-center border-2 border-purple-200">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🎥</div>
                  <h3 className="text-2xl font-bold text-[#5C2482] mb-3">Demo Video Coming Soon</h3>
                  <p className="text-gray-600 mb-6">
                    In the meantime, explore our platform with demo credentials below
                  </p>
                  <Link
                    href="/auth/signin"
                    onClick={() => setDemoModalOpen(false)}
                    className="inline-block bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg"
                  >
                    Try Live Demo →
                  </Link>
                </div>
              </div>

              {/* Demo Credentials */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Demo Login Credentials</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">👨‍💼</div>
                      <div className="font-bold text-[#5C2482]">Admin Account</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><strong>Email:</strong> admin@educy.com</p>
                      <p className="text-gray-700"><strong>Password:</strong> admin123</p>
                      <p className="text-xs text-gray-500 mt-2">Full system access, analytics, user management</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">👩‍🏫</div>
                      <div className="font-bold text-[#F95B0E]">Instructor Account</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><strong>Email:</strong> alice.instructor@educy.com</p>
                      <p className="text-gray-700"><strong>Password:</strong> instructor123</p>
                      <p className="text-xs text-gray-500 mt-2">Course creation, grading, student management</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">👮</div>
                      <div className="font-bold text-green-600">Moderator Account</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><strong>Email:</strong> moderator@educy.com</p>
                      <p className="text-gray-700"><strong>Password:</strong> moderator123</p>
                      <p className="text-xs text-gray-500 mt-2">Enrollment approval, content moderation</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">🎓</div>
                      <div className="font-bold text-blue-600">Student Account</div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><strong>Email:</strong> bob.student@educy.com</p>
                      <p className="text-gray-700"><strong>Password:</strong> student123</p>
                      <p className="text-xs text-gray-500 mt-2">Course enrollment, assignments, grades</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Features Highlight */}
              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl mb-2">⚡</div>
                  <div className="font-semibold text-gray-900">Quick Setup</div>
                  <div className="text-xs text-gray-600 mt-1">Launch in 5 minutes</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-3xl mb-2">🤖</div>
                  <div className="font-semibold text-gray-900">AI-Powered</div>
                  <div className="text-xs text-gray-600 mt-1">Smart grading & tutoring</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="font-semibold text-gray-900">Real-time Analytics</div>
                  <div className="text-xs text-gray-600 mt-1">Track everything</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div>
              <h3 className="text-white text-xl font-bold mb-4">Educy</h3>
              <p className="text-xs sm:text-sm">
                Modern course management platform for forward-thinking educational institutions.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-white transition cursor-pointer">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition cursor-pointer">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Get Started</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <Link href="/auth/signin" className="hover:text-white transition">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="hover:text-white transition">
                    Register
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a href="https://github.com/Ismat-Samadov/educy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a href="https://github.com/Ismat-Samadov/educy/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Report an Issue
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-xs sm:text-sm">
            <p>&copy; 2026 Educy. All rights reserved. Built with Next.js, TypeScript, and passion for education.</p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  )
}
