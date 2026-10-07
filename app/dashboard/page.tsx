import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/rbac'
import { RoleName } from '@prisma/client'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Redirect based on role
  switch (user.role) {
    case RoleName.ADMIN:
      redirect('/admin')
    case RoleName.INSTRUCTOR:
      redirect('/instructor')
    case RoleName.MODERATOR:
      redirect('/moderator')
    case RoleName.STUDENT:
      redirect('/student')
    default:
      redirect('/auth/signin')
  }
}
