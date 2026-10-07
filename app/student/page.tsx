import { redirect } from 'next/navigation'

export default async function StudentPage() {
  // Redirect to new dashboard
  redirect('/student/dashboard')
}
