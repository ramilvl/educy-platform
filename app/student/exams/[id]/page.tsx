'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/dashboard-layout'

interface Question {
  id: string
  questionText: string
  questionType: string
  options: string[]
  points: number
  orderIndex: number
}

interface Exam {
  id: string
  title: string
  durationMinutes: number
  startTime: string
  endTime: string
  isGroupExam: boolean
  questions: Question[]
  section: {
    course: {
      code: string
      title: string
    }
  }
}

interface Attempt {
  id: string
  startedAt: string
  submittedAt: string | null
  timeRemaining: number | null
  isCompleted: boolean
  score: number | null
}

export default function ExamTakingPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      loadExam()
    }
  }, [status, params.id])

  // Timer countdown
  useEffect(() => {
    if (!attempt || attempt.isCompleted || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          autoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [attempt, timeLeft])

  // Warn before leaving page
  useEffect(() => {
    if (!attempt || attempt.isCompleted) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to leave? Your exam is in progress.'
      return 'Are you sure you want to leave? Your exam is in progress.'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [attempt])

  async function loadExam() {
    try {
      const response = await fetch(`/api/exams/${params.id}`)
      if (!response.ok) throw new Error('Failed to load exam')

      const data = await response.json()
      setExam(data.exam)

      if (data.exam.existingAttempt) {
        setAttempt(data.exam.existingAttempt)

        if (data.exam.existingAttempt.isCompleted) {
          // Show results
          setLoading(false)
          return
        }

        // Calculate time left
        const startedAt = new Date(data.exam.existingAttempt.startedAt).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startedAt) / 1000)
        const totalSeconds = data.exam.durationMinutes * 60
        const remaining = Math.max(0, totalSeconds - elapsedSeconds)

        setTimeLeft(remaining)
      }

      setLoading(false)
    } catch (err) {
      setError('Failed to load exam')
      setLoading(false)
    }
  }

  async function startExam() {
    try {
      setLoading(true)
      const response = await fetch(`/api/exams/${params.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })

      if (!response.ok) throw new Error('Failed to start exam')

      const data = await response.json()
      setAttempt(data.attempt)
      setTimeLeft(exam!.durationMinutes * 60)
      setLoading(false)
    } catch (err) {
      setError('Failed to start exam')
      setLoading(false)
    }
  }

  async function submitExam() {
    try {
      setSubmitting(true)

      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }))

      const response = await fetch(`/api/exams/${params.id}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          answers: answersArray,
        }),
      })

      if (!response.ok) throw new Error('Failed to submit exam')

      const data = await response.json()
      setAttempt(data.attempt)
      setShowConfirmSubmit(false)

      // Reload to show results
      await loadExam()
    } catch (err) {
      setError('Failed to submit exam')
      setSubmitting(false)
    }
  }

  async function autoSubmit() {
    if (submitting || !attempt || attempt.isCompleted) return
    await submitExam()
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  function getTimerColor(): string {
    if (timeLeft > 300) return 'text-green-600' // > 5 min
    if (timeLeft > 60) return 'text-yellow-600' // > 1 min
    return 'text-red-600' // < 1 min
  }

  if (loading || status === 'loading') {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading exam...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !exam) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Exam not found'}</p>
            <button
              onClick={() => router.push('/student/exams')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Back to Exams
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Check if exam is available
  const now = new Date()
  const startTime = new Date(exam.startTime)
  const endTime = new Date(exam.endTime)

  if (now < startTime) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Exam Not Yet Available</h2>
            <p className="text-gray-600 mb-6">
              This exam will be available starting {startTime.toLocaleString()}
            </p>
            <button
              onClick={() => router.push('/student/exams')}
              className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg"
            >
              Back to Exams
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (now > endTime && (!attempt || !attempt.isCompleted)) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Exam Closed</h2>
            <p className="text-gray-600 mb-6">
              This exam closed on {endTime.toLocaleString()}
            </p>
            <button
              onClick={() => router.push('/student/exams')}
              className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg"
            >
              Back to Exams
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show results if completed
  if (attempt?.isCompleted) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="bg-gradient-to-br from-green-50 via-white to-blue-50 -my-8 p-4 md:p-8 min-h-screen">
          <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Completed!</h1>
              <p className="text-gray-600">{exam.title}</p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Your Score</p>
                <p className="text-5xl font-bold text-gray-900">
                  {attempt.score?.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Submitted:</span>
                <span className="font-medium text-gray-900">
                  {new Date(attempt.submittedAt!).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-600">Time Remaining:</span>
                <span className="font-medium text-gray-900">
                  {formatTime(attempt.timeRemaining || 0)}
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push('/student/exams')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Back to Exams
            </button>
          </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show start screen
  if (!attempt) {
    return (
      <DashboardLayout role={session?.user?.role || 'STUDENT'}>
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 -my-8 p-4 md:p-8 min-h-screen">
          <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            <p className="text-gray-600 mb-8">
              {exam.section.course.code}: {exam.section.course.title}
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Exam Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{exam.durationMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium text-gray-900">{exam.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">
                    {exam.isGroupExam ? 'Group Exam' : 'Individual Exam'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-yellow-900 mb-2">Important Instructions:</h3>
              <ul className="text-xs sm:text-sm text-yellow-800 space-y-2">
                <li>• Once started, the timer will count down continuously</li>
                <li>• You cannot pause the exam once started</li>
                <li>• Do not close or refresh this page during the exam</li>
                <li>• Your exam will auto-submit when time runs out</li>
                <li>• Make sure you have a stable internet connection</li>
              </ul>
            </div>

            <button
              onClick={startExam}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              Start Exam
            </button>
          </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Show exam questions
  const sortedQuestions = [...exam.questions].sort((a, b) => a.orderIndex - b.orderIndex)
  const answeredCount = Object.keys(answers).length
  const progressPercent = (answeredCount / exam.questions.length) * 100

  return (
    <DashboardLayout role={session?.user?.role || 'STUDENT'}>
      <div className="bg-gray-50 -my-8 p-0 min-h-screen pb-24">
        {/* Fixed header with timer */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">{exam.title}</h1>
              <p className="text-xs md:text-xs sm:text-sm text-gray-600">
                {answeredCount} of {exam.questions.length} answered
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl md:text-3xl font-bold ${getTimerColor()}`}>
                {formatTime(timeLeft)}
              </div>
              <p className="text-xs text-gray-600">Time Remaining</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {sortedQuestions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start mb-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm mr-3 flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium mb-1">{question.questionText}</p>
                  <p className="text-xs text-gray-500">{question.points} {question.points === 1 ? 'point' : 'points'}</p>
                </div>
              </div>

              {question.questionType === 'multiple_choice' && (
                <div className="space-y-2 ml-11">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="w-4 h-4 text-blue-600 mr-3"
                      />
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.questionType === 'true_false' && (
                <div className="space-y-2 ml-11">
                  {['True', 'False'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                        className="w-4 h-4 text-blue-600 mr-3"
                      />
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {(question.questionType === 'short_answer' || question.questionType === 'essay') && (
                <div className="ml-11">
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    rows={question.questionType === 'essay' ? 6 : 3}
                    placeholder="Type your answer here..."
                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed submit button - account for sidebar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t shadow-lg z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => setShowConfirmSubmit(true)}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg"
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Submit Exam?</h3>
            <p className="text-gray-600 mb-6">
              You have answered {answeredCount} out of {exam.questions.length} questions.
              Are you sure you want to submit your exam?
            </p>
            <p className="text-xs sm:text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              This action cannot be undone. Once submitted, you cannot change your answers.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                disabled={submitting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitExam}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  )
}
