'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MdEmail, MdLock } from 'react-icons/md';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import Link from 'next/link';

export default function SignInPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email validation with TLD requirement
  const validateEmail = (email: string): boolean => {
    // Regex requires: localpart@domain.tld (with at least 2 char TLD)
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    if (session?.user) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    // Validate email format
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address with a domain (e.g., user@example.com)');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-[#5C2482]">Educy</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-[#5C2482] transition font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex bg-gradient-to-b from-gray-50 to-white">

        {/* LEFT SIDE - Hero Section */}
        <div className="w-1/2 hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-[#5C2482] via-purple-700 to-[#8B4AB8] p-12">
          <div className="text-white text-center space-y-6 max-w-md">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-4xl font-bold leading-tight">
              Welcome Back to Educy
            </h2>
            <p className="text-lg text-purple-100">
              Sign in to manage your courses, assignments, and connect with your students.
            </p>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20 mt-8">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-xs sm:text-sm text-purple-200">Institutions</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">10K+</div>
                  <div className="text-xs sm:text-sm text-purple-200">Students</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Sign In Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Sign In
              </h1>
              <p className="text-gray-600">
                Enter your credentials to access your account
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-xs sm:text-sm border border-red-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* EMAIL */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-700 font-medium text-xs sm:text-sm">Email Address</label>
                <div className="relative flex items-center">
                  <MdEmail className="absolute left-4 text-gray-400 text-xl" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className={`w-full h-12 border rounded-xl pl-12 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                      emailError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-[#5C2482]'
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    onBlur={() => {
                      if (email && !validateEmail(email)) {
                        setEmailError('Please enter a valid email address with a domain (e.g., user@example.com)');
                      }
                    }}
                    autoComplete="email"
                    required
                  />
                </div>
                {emailError && (
                  <p className="text-xs sm:text-sm text-red-600">{emailError}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-700 font-medium text-xs sm:text-sm">Password</label>
                <div className="relative flex items-center">
                  <MdLock className="absolute left-4 text-gray-400 text-xl" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full h-12 border border-gray-300 rounded-xl pl-12 pr-12 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5C2482] focus:border-transparent transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  {showPassword ? (
                    <AiOutlineEye
                      className="absolute right-4 text-gray-400 text-xl cursor-pointer hover:text-[#5C2482] transition"
                      onClick={() => setShowPassword(false)}
                    />
                  ) : (
                    <AiOutlineEyeInvisible
                      className="absolute right-4 text-gray-400 text-xl cursor-pointer hover:text-[#5C2482] transition"
                      onClick={() => setShowPassword(true)}
                    />
                  )}
                </div>
                <Link
                  href="/auth/forgot-password"
                  className="text-right text-xs sm:text-sm text-[#5C2482] hover:text-[#7B3FA3] transition font-medium"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F95B0E] hover:bg-[#d94f0c] text-white h-12 rounded-xl text-lg font-semibold mt-2 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="w-full mt-8 p-6 bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl border border-purple-200">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="text-2xl">🎯</div>
                <h3 className="text-[#5C2482] font-bold text-lg">Try Demo Accounts</h3>
              </div>
              <p className="text-center text-xs sm:text-sm text-gray-600 mb-4">
                Test different roles without signing up
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">👨‍💼</div>
                    <span className="font-semibold text-[#5C2482]">Admin</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="truncate">admin@educy.com</div>
                    <div className="text-gray-400">Password: admin123</div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">👩‍🏫</div>
                    <span className="font-semibold text-[#F95B0E]">Instructor</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="truncate">alice.instructor@educy.com</div>
                    <div className="text-gray-400">Password: instructor123</div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">👮</div>
                    <span className="font-semibold text-green-600">Moderator</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="truncate">moderator@educy.com</div>
                    <div className="text-gray-400">Password: moderator123</div>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">🎓</div>
                    <span className="font-semibold text-blue-600">Student</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="truncate">bob.student@educy.com</div>
                    <div className="text-gray-400">Password: student123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
