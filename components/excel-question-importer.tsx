'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

interface Question {
  questionText: string
  questionType: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  options: string[]
  correctAnswer: string
  points: number
}

interface ExcelQuestionImporterProps {
  isOpen: boolean
  onClose: () => void
  onImport: (questions: Question[]) => void
}

export function ExcelQuestionImporter({ isOpen, onClose, onImport }: ExcelQuestionImporterProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Question[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setPreview([])
    setShowPreview(false)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty')
      }

      // Parse and validate questions
      const questions: Question[] = jsonData.map((row, index) => {
        const questionText = row['Question'] || row['question'] || row['QuestionText'] || ''
        const questionType = (row['Type'] || row['type'] || row['QuestionType'] || 'multiple_choice').toLowerCase()
        const points = parseFloat(row['Points'] || row['points'] || '1') || 1

        if (!questionText.trim()) {
          throw new Error(`Row ${index + 2}: Question text is required`)
        }

        // Validate question type
        const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'essay']
        const normalizedType = questionType.replace(/[_\s-]/g, '_')

        let finalType: Question['questionType'] = 'multiple_choice'
        if (validTypes.includes(normalizedType)) {
          finalType = normalizedType as Question['questionType']
        } else if (questionType.includes('choice') || questionType.includes('mcq')) {
          finalType = 'multiple_choice'
        } else if (questionType.includes('true') || questionType.includes('false') || questionType.includes('tf')) {
          finalType = 'true_false'
        } else if (questionType.includes('short') || questionType.includes('brief')) {
          finalType = 'short_answer'
        } else if (questionType.includes('essay') || questionType.includes('long')) {
          finalType = 'essay'
        }

        let options: string[] = []
        let correctAnswer = ''

        if (finalType === 'multiple_choice') {
          // Try different column naming conventions
          options = [
            row['Option1'] || row['option1'] || row['OptionA'] || row['A'] || '',
            row['Option2'] || row['option2'] || row['OptionB'] || row['B'] || '',
            row['Option3'] || row['option3'] || row['OptionC'] || row['C'] || '',
            row['Option4'] || row['option4'] || row['OptionD'] || row['D'] || '',
          ].filter(opt => opt.trim())

          if (options.length < 2) {
            throw new Error(`Row ${index + 2}: Multiple choice questions need at least 2 options`)
          }

          correctAnswer = row['CorrectAnswer'] || row['correctAnswer'] || row['Answer'] || row['Correct'] || ''

          if (!correctAnswer.trim()) {
            throw new Error(`Row ${index + 2}: Correct answer is required for multiple choice questions`)
          }

          // Check if correct answer is one of the options
          if (!options.includes(correctAnswer)) {
            // Maybe they provided the index (A, B, C, D or 1, 2, 3, 4)
            const answerUpper = correctAnswer.toUpperCase()
            if (answerUpper === 'A' || answerUpper === '1') correctAnswer = options[0]
            else if (answerUpper === 'B' || answerUpper === '2') correctAnswer = options[1]
            else if (answerUpper === 'C' || answerUpper === '3') correctAnswer = options[2]
            else if (answerUpper === 'D' || answerUpper === '4') correctAnswer = options[3]
            else {
              throw new Error(`Row ${index + 2}: Correct answer must match one of the options`)
            }
          }
        } else if (finalType === 'true_false') {
          correctAnswer = row['CorrectAnswer'] || row['correctAnswer'] || row['Answer'] || row['Correct'] || ''
          const answerLower = correctAnswer.toLowerCase()

          if (answerLower.includes('true') || answerLower === 't' || answerLower === '1') {
            correctAnswer = 'True'
          } else if (answerLower.includes('false') || answerLower === 'f' || answerLower === '0') {
            correctAnswer = 'False'
          } else {
            throw new Error(`Row ${index + 2}: True/False answer must be "True" or "False"`)
          }
        }

        return {
          questionText: questionText.trim(),
          questionType: finalType,
          options,
          correctAnswer,
          points,
        }
      })

      setPreview(questions)
      setShowPreview(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    onImport(preview)
    handleReset()
    onClose()
  }

  const handleReset = () => {
    setPreview([])
    setShowPreview(false)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        Question: 'What is the capital of France?',
        Type: 'multiple_choice',
        Option1: 'London',
        Option2: 'Paris',
        Option3: 'Berlin',
        Option4: 'Madrid',
        CorrectAnswer: 'Paris',
        Points: 1
      },
      {
        Question: 'The Earth is flat',
        Type: 'true_false',
        CorrectAnswer: 'False',
        Points: 1
      },
      {
        Question: 'Explain the process of photosynthesis',
        Type: 'short_answer',
        Points: 2
      },
      {
        Question: 'Write an essay about climate change',
        Type: 'essay',
        Points: 5
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions')
    XLSX.writeFile(workbook, 'exam-questions-template.xlsx')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import from Excel</h2>
                <p className="text-sm text-gray-600">Upload an Excel file with exam questions</p>
              </div>
            </div>
            <button
              onClick={() => {
                handleReset()
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600 transition"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-500 text-red-900 px-4 py-3 rounded-xl">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {!showPreview ? (
            <>
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                  disabled={loading}
                />
                <label
                  htmlFor="excel-upload"
                  className="cursor-pointer block"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    {loading ? 'Processing...' : 'Click to upload Excel file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </label>
              </div>

              {/* Template Download */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Need help formatting your Excel file?
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-blue-700 hover:text-blue-800 font-medium underline"
                    >
                      Download Template File
                    </button>
                  </div>
                </div>
              </div>

              {/* Format Guide */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Excel Format Guide:</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Required columns:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="bg-white px-1.5 py-0.5 rounded">Question</code> - The question text</li>
                    <li><code className="bg-white px-1.5 py-0.5 rounded">Type</code> - Question type (multiple_choice, true_false, short_answer, essay)</li>
                    <li><code className="bg-white px-1.5 py-0.5 rounded">Points</code> - Points for the question</li>
                  </ul>
                  <p className="mt-3"><strong>For Multiple Choice questions:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="bg-white px-1.5 py-0.5 rounded">Option1, Option2, Option3, Option4</code> - Answer options</li>
                    <li><code className="bg-white px-1.5 py-0.5 rounded">CorrectAnswer</code> - The correct answer text or index (A/B/C/D or 1/2/3/4)</li>
                  </ul>
                  <p className="mt-3"><strong>For True/False questions:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><code className="bg-white px-1.5 py-0.5 rounded">CorrectAnswer</code> - "True" or "False"</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Preview ({preview.length} question{preview.length !== 1 ? 's' : ''})
                  </h3>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Choose different file
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                  {preview.map((question, index) => (
                    <div key={index} className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            {question.questionType.replace('_', ' ')}
                          </span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                            {question.points} {question.points === 1 ? 'point' : 'points'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{question.questionText}</p>
                      {question.questionType === 'multiple_choice' && question.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((option, oIndex) => (
                            <div
                              key={oIndex}
                              className={`text-xs px-2 py-1 rounded ${
                                option === question.correctAnswer
                                  ? 'bg-green-100 text-green-800 font-medium'
                                  : 'bg-white text-gray-600'
                              }`}
                            >
                              {String.fromCharCode(65 + oIndex)}. {option}
                              {option === question.correctAnswer && ' ✓'}
                            </div>
                          ))}
                        </div>
                      )}
                      {question.questionType === 'true_false' && (
                        <p className="text-xs mt-1 text-green-700 font-medium">
                          Correct: {question.correctAnswer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-800">
                    <strong>Total Points:</strong> {preview.reduce((sum, q) => sum + q.points, 0)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {showPreview && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex gap-3">
            <button
              onClick={() => {
                handleReset()
                onClose()
              }}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-white transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Import {preview.length} Question{preview.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
