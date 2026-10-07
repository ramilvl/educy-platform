'use client'

import { useState, useMemo } from 'react'
import { ContentAgeIndicator, ContentAgeStats } from '@/components/content-age-indicator'
import {
  getContentAgeStatus,
  getContentAgeStatsUI,
  sortByAgeStatus,
  filterByAgeStatus,
  type ContentAgeStatus,
} from '@/lib/content-aging'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type ContentItem = {
  id: string
  title: string
  type: 'lesson' | 'assignment' | 'announcement'
  sectionId: string
  courseCode: string
  courseTitle: string
  createdAt: Date | string
  updatedAt: Date | string
  isArchived: boolean
}

interface ContentOverviewClientProps {
  content: ContentItem[]
  sections: Array<{
    id: string
    courseCode: string
    courseTitle: string
  }>
}

export default function ContentOverviewClient({
  content,
  sections,
}: ContentOverviewClientProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'all' | 'lesson' | 'assignment' | 'announcement'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | ContentAgeStatus>('all')
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [archiving, setArchiving] = useState<string | null>(null)

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let filtered = content

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((item) => item.type === selectedType)
    }

    // Filter by section
    if (selectedSection !== 'all') {
      filtered = filtered.filter((item) => item.sectionId === selectedSection)
    }

    // Filter by age status
    if (selectedStatus !== 'all') {
      filtered = filterByAgeStatus(filtered, selectedStatus)
    }

    // Sort by age status (needsattention first)
    return sortByAgeStatus(filtered)
  }, [content, selectedType, selectedSection, selectedStatus])

  // Calculate statistics
  const stats = useMemo(() => getContentAgeStatsUI(filteredContent), [filteredContent])

  const handleArchive = async (itemId: string, itemType: string) => {
    if (!confirm('Are you sure you want to archive this content? It will be hidden from students.')) {
      return
    }

    setArchiving(itemId)
    try {
      const endpoints = {
        lesson: `/api/sections/${filteredContent.find(i => i.id === itemId)?.sectionId}/lessons/${itemId}`,
        assignment: `/api/assignments/${itemId}`,
        announcement: `/api/announcements/${itemId}`,
      }

      const response = await fetch(endpoints[itemType as keyof typeof endpoints], {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        alert('Failed to archive content')
      }
    } catch (error) {
      alert('Error archiving content')
    } finally {
      setArchiving(null)
    }
  }

  const getItemLink = (item: ContentItem) => {
    if (item.type === 'lesson') {
      return `/instructor/courses/${item.sectionId}/lessons/${item.id}/edit`
    }
    if (item.type === 'assignment') {
      return `/instructor/assignments/${item.id}`
    }
    return null // Announcements don't have detail pages yet
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#5C2482]">
          Content Overview
        </h1>
        <p className="mt-2 text-gray-600">
          Monitor and manage the age and relevance of your course materials
        </p>
      </div>

      {/* Statistics */}
      <ContentAgeStats stats={stats} />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Content Type Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Content Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482]"
            >
              <option value="all">All Types</option>
              <option value="lesson">Lessons</option>
              <option value="assignment">Assignments</option>
              <option value="announcement">Announcements</option>
            </select>
          </div>

          {/* Age Status Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Age Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482]"
            >
              <option value="all">All Status</option>
              <option value="outdated">⚠️ Outdated</option>
              <option value="aging">⏰ Aging</option>
              <option value="recent">✓ Recent</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Course
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482]"
            >
              <option value="all">All Courses</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.courseCode}: {section.courseTitle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white rounded-xl shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Content Materials ({filteredContent.length})
          </h2>
          {stats.needsReview > 0 && (
            <p className="text-xs sm:text-sm text-yellow-600 mt-1">
              {stats.needsReview} item{stats.needsReview !== 1 ? 's' : ''} need{stats.needsReview === 1 ? 's' : ''} review
            </p>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {filteredContent.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No content found matching your filters
            </div>
          ) : (
            filteredContent.map((item) => {
              const status = getContentAgeStatus(item.updatedAt)
              const link = getItemLink(item)

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="p-6 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Content Info */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.type}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-600">
                          {item.courseCode}
                        </span>
                      </div>

                      <h3 className="font-medium text-lg text-[#5C2482] mb-1">
                        {item.title}
                      </h3>

                      {/* Age Indicator */}
                      <ContentAgeIndicator
                        updatedAt={item.updatedAt}
                        createdAt={item.createdAt}
                        contentType={item.type}
                        showMessage={status !== 'recent'}
                        className="mt-3"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {link && (
                        <Link
                          href={link}
                          className="px-3 py-2 sm:px-4 border border-[#5C2482] text-[#5C2482] rounded-xl hover:bg-[#5C2482] hover:text-white transition text-xs sm:text-sm font-medium"
                        >
                          Edit
                        </Link>
                      )}
                      <button
                        onClick={() => handleArchive(item.id, item.type)}
                        disabled={archiving === item.id}
                        className="px-3 py-2 sm:px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-xs sm:text-sm font-medium disabled:opacity-50"
                      >
                        {archiving === item.id ? 'Archiving...' : 'Archive'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
