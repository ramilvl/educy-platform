import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-b from-[#5C2482] to-white">
      {/* LEFT SIDE */}
      <div className="w-1/2 hidden md:flex items-center justify-center bg-gradient-to-br from-[#5C2482] to-[#8B4AB8] rounded-br-[100px]">
        <img src="/login.png" className="w-3/5 h-3/5 object-contain" alt="Unauthorized" />
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-white rounded-tl-[100px] p-8">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="text-8xl mb-6">🚫</div>

          <div>
            <h1 className="text-[#5C2482] text-4xl font-semibold mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 text-lg">
              You don't have permission to access this page.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block w-3/5 bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-8 py-3 rounded-xl font-medium text-lg transition"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="block text-xs sm:text-sm text-gray-500 hover:text-[#5C2482] transition"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
