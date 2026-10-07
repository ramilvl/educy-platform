import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { RoleName } from '@prisma/client'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Role-based route protection
    if (path.startsWith('/admin') && token?.role !== RoleName.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/instructor') &&
        token?.role !== RoleName.INSTRUCTOR &&
        token?.role !== RoleName.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/student') &&
        token?.role !== RoleName.STUDENT &&
        token?.role !== RoleName.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    if (path.startsWith('/moderator') &&
        token?.role !== RoleName.MODERATOR &&
        token?.role !== RoleName.ADMIN) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
)

// Protect these routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/instructor/:path*',
    '/moderator/:path*',
    '/student/:path*',
    '/dashboard/:path*',
    '/api/admin/:path*',
    '/api/instructor/:path*',
    '/api/moderator/:path*',
    '/api/student/:path*',
  ],
}
