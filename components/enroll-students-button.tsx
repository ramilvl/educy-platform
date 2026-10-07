'use client'

import { useState } from 'react'
import { AddStudentsDialog } from './add-students-dialog'
import { useRouter } from 'next/navigation'

interface EnrollStudentsButtonProps {
  sectionId: string
}

export function EnrollStudentsButton({ sectionId }: EnrollStudentsButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    // Refresh the page to show newly enrolled students
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        className="px-3 py-2 sm:px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-medium text-xs sm:text-sm"
      >
        + Add Students
      </button>

      <AddStudentsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        sectionId={sectionId}
        onSuccess={handleSuccess}
      />
    </>
  )
}
