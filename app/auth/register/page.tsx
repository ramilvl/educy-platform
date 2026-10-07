'use client'

import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#5C2482] to-white">
      {/* LEFT SIDE */}
      <div className="w-1/2 hidden md:flex items-center justify-center bg-gradient-to-br from-[#5C2482] to-[#8B4AB8] rounded-br-[100px]">
        <img src="/login.png" className="w-3/5 h-3/5 object-contain" alt="Register" />
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white rounded-tl-[100px] p-8">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-10 h-10 text-[#5C2482]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-[#5C2482] text-4xl font-semibold mb-4">
              Access by Invitation Only
            </h1>
            <p className="text-gray-600 leading-relaxed">
              This platform is available to enrolled students only. If you've been enrolled in the course, you will receive an email with your login credentials.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <p className="text-xs sm:text-sm text-purple-800">
              <strong>Already have credentials?</strong>
              <br />
              Use the sign-in button below to access your account.
            </p>
          </div>

          <Link
            href="/auth/signin"
            className="block w-3/5 mx-auto bg-[#F95B0E] hover:bg-[#d94f0c] text-white py-3 rounded-xl font-medium text-lg transition"
          >
            Sign In
          </Link>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-500">
              Need help? Contact your course administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
