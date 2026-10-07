/**
 * Content Aging System
 * Tracks and analyzes the age of course content to prompt instructors for updates
 */

export type ContentStatus = 'fresh' | 'current' | 'aging' | 'outdated'
export type ContentAgeStatus = 'recent' | 'aging' | 'outdated' // Alias for component compatibility

export interface ContentItem {
  id: string
  title: string
  updatedAt: Date
  type?: 'lesson' | 'assignment' | 'material' | 'announcement'
  section?: {
    id: string
    course: {
      id: string
      code: string
      title: string
    }
  }
}

export interface ContentAgeStats {
  total: number
  fresh: number // < 30 days
  current: number // 30-90 days
  aging: number // 90-180 days
  outdated: number // > 180 days
  needsReview: number // aging + outdated
}

/**
 * Determine content status based on last update date
 */
export function getContentStatus(updatedAt: Date): ContentStatus {
  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceUpdate < 30) return 'fresh'
  if (daysSinceUpdate < 90) return 'current'
  if (daysSinceUpdate < 180) return 'aging'
  return 'outdated'
}

/**
 * Get color indicator for content status
 */
export function getStatusColor(status: ContentStatus): string {
  const colors = {
    fresh: 'text-green-600 bg-green-100',
    current: 'text-blue-600 bg-blue-100',
    aging: 'text-yellow-600 bg-yellow-100',
    outdated: 'text-red-600 bg-red-100',
  }
  return colors[status]
}

/**
 * Get icon for content status
 */
export function getStatusIcon(status: ContentStatus): string {
  const icons = {
    fresh: '✨',
    current: '✓',
    aging: '⏰',
    outdated: '⚠️',
  }
  return icons[status]
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: ContentStatus): string {
  const labels = {
    fresh: 'Fresh',
    current: 'Current',
    aging: 'Needs Review',
    outdated: 'Outdated',
  }
  return labels[status]
}

/**
 * Calculate days since last update
 */
export function getDaysSinceUpdate(updatedAt: Date): number {
  const now = new Date()
  return Math.floor((now.getTime() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get content aging statistics for a collection of content items
 */
export function getContentAgeStats(content: ContentItem[] | any[]): ContentAgeStats {
  const stats: ContentAgeStats = {
    total: content.length,
    fresh: 0,
    current: 0,
    aging: 0,
    outdated: 0,
    needsReview: 0,
  }

  content.forEach((item) => {
    const status = getContentStatus(item.updatedAt)
    stats[status]++
  })

  stats.needsReview = stats.aging + stats.outdated

  return stats
}

/**
 * Get content age statistics for UI components (uses 'recent' instead of 'fresh'/'current')
 */
export function getContentAgeStatsUI<T extends { updatedAt: Date | string }>(content: T[]): {
  total: number
  recent: number
  aging: number
  outdated: number
  needsReview: number
} {
  const stats = {
    total: content.length,
    recent: 0,
    aging: 0,
    outdated: 0,
    needsReview: 0,
  }

  content.forEach((item) => {
    const status = getContentAgeStatus(item.updatedAt)
    stats[status]++
  })

  stats.needsReview = stats.aging + stats.outdated

  return stats
}

/**
 * Filter content by age status
 */
export function filterByAgeStatus<T extends { updatedAt: Date | string }>(
  content: T[],
  statuses: ContentStatus[] | ContentStatus | ContentAgeStatus | ContentAgeStatus[]
): T[] {
  const statusArray = Array.isArray(statuses) ? statuses : [statuses]

  return content.filter((item) => {
    const date = item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt)
    const status = getContentStatus(date)
    const ageStatus = getContentAgeStatus(date)
    return statusArray.some(s => s === status || s === ageStatus)
  })
}

/**
 * Sort content by age (oldest first)
 */
export function sortByAge<T extends { updatedAt: Date | string }>(
  content: T[],
  desc = false
): T[] {
  return [...content].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime()
    const dateB = new Date(b.updatedAt).getTime()
    return desc ? dateB - dateA : dateA - dateB
  })
}

/**
 * Sort content by age status (outdated first, then aging, then recent)
 */
export function sortByAgeStatus<T extends { updatedAt: Date | string }>(content: T[]): T[] {
  const statusPriority: Record<ContentAgeStatus, number> = {
    outdated: 0,
    aging: 1,
    recent: 2,
  }

  return [...content].sort((a, b) => {
    const statusA = getContentAgeStatus(a.updatedAt)
    const statusB = getContentAgeStatus(b.updatedAt)
    const priorityDiff = statusPriority[statusA] - statusPriority[statusB]

    // If same status, sort by update date (oldest first)
    if (priorityDiff === 0) {
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    }

    return priorityDiff
  })
}

/**
 * Group content by status
 */
export function groupByStatus(content: ContentItem[]): Record<ContentStatus, ContentItem[]> {
  const grouped: Record<ContentStatus, ContentItem[]> = {
    fresh: [],
    current: [],
    aging: [],
    outdated: [],
  }

  content.forEach((item) => {
    const status = getContentStatus(item.updatedAt)
    grouped[status].push(item)
  })

  return grouped
}

/**
 * Check if content needs review (aging or outdated)
 */
export function needsReview(updatedAt: Date): boolean {
  const status = getContentStatus(updatedAt)
  return status === 'aging' || status === 'outdated'
}

/**
 * Get recommended update frequency message
 */
export function getUpdateRecommendation(status: ContentStatus): string {
  const recommendations = {
    fresh: 'Content is up to date. Review again in 30 days.',
    current: 'Content is still current. Consider reviewing within 60 days.',
    aging: 'Content is aging. Review and update recommended within 30 days.',
    outdated: 'Content is outdated. Immediate review and update recommended.',
  }
  return recommendations[status]
}

/**
 * Get content age status (component-compatible version)
 * Maps 'fresh' and 'current' to 'recent' for UI consistency
 */
export function getContentAgeStatus(updatedAt: Date | string): ContentAgeStatus {
  const status = getContentStatus(new Date(updatedAt))
  if (status === 'fresh' || status === 'current') return 'recent'
  return status as ContentAgeStatus
}

/**
 * Get human-readable content age labels
 */
export function getContentAgeLabel(
  updatedAt: Date | string,
  createdAt?: Date | string
): { updatedLabel: string; createdLabel: string | null } {
  const updated = new Date(updatedAt)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))

  let updatedLabel = ''
  if (daysSince === 0) updatedLabel = 'today'
  else if (daysSince === 1) updatedLabel = 'yesterday'
  else if (daysSince < 7) updatedLabel = `${daysSince} days ago`
  else if (daysSince < 30) updatedLabel = `${Math.floor(daysSince / 7)} weeks ago`
  else if (daysSince < 365) updatedLabel = `${Math.floor(daysSince / 30)} months ago`
  else updatedLabel = `${Math.floor(daysSince / 365)} years ago`

  let createdLabel = null
  if (createdAt) {
    const created = new Date(createdAt)
    const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceCreated === 0) createdLabel = 'today'
    else if (daysSinceCreated === 1) createdLabel = 'yesterday'
    else if (daysSinceCreated < 7) createdLabel = `${daysSinceCreated} days ago`
    else if (daysSinceCreated < 30) createdLabel = `${Math.floor(daysSinceCreated / 7)} weeks ago`
    else if (daysSinceCreated < 365) createdLabel = `${Math.floor(daysSinceCreated / 30)} months ago`
    else createdLabel = `${Math.floor(daysSinceCreated / 365)} years ago`
  }

  return { updatedLabel, createdLabel }
}

/**
 * Get content review message based on status
 */
export function getContentReviewMessage(
  status: ContentAgeStatus,
  contentType: 'lesson' | 'assignment' | 'announcement' = 'lesson'
): string {
  const messages = {
    recent: `This ${contentType} is up to date and current.`,
    aging: `This ${contentType} is aging and may need review. Consider updating content to ensure accuracy.`,
    outdated: `This ${contentType} is outdated and requires immediate attention. Please review and update as soon as possible.`,
  }
  return messages[status]
}

/**
 * Color constants for content age status
 */
export const CONTENT_AGE_COLORS = {
  recent: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
  },
  aging: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
  },
  outdated: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
  },
}
