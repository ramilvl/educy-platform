# Educy Component Library

Ready-to-use component code snippets for common UI patterns.

## Table of Contents
1. [Form Components](#form-components)
2. [Buttons](#buttons)
3. [Cards](#cards)
4. [Modals](#modals)
5. [Tables](#tables)
6. [Notifications](#notifications)
7. [Navigation](#navigation)
8. [Badges & Tags](#badges--tags)

---

## Form Components

### Complete Form Example

```tsx
'use client'

import { useState } from 'react'

export default function ExampleForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    description: '',
    acceptTerms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // API call here
      console.log(formData)
    } catch (err) {
      setError('Failed to submit form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
            <p className="mt-1 text-sm text-gray-500">
              We'll never share your email with anyone else.
            </p>
          </div>

          {/* Select Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="terms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="w-4 h-4 text-[#5C2482] border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
              I accept the terms and conditions
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ name: '', email: '', role: 'STUDENT', description: '', acceptTerms: false })}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## Buttons

### Primary Button (Orange)

```tsx
<button className="px-6 py-3 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl font-semibold transition shadow-lg hover:shadow-xl">
  Primary Action
</button>
```

### Secondary Button (Purple)

```tsx
<button className="px-6 py-3 bg-[#5C2482] hover:bg-[#7B3FA3] text-white rounded-xl font-semibold transition">
  Secondary Action
</button>
```

### Outline Button

```tsx
<button className="px-6 py-3 border-2 border-[#5C2482] text-[#5C2482] hover:bg-[#5C2482] hover:text-white rounded-xl font-semibold transition">
  Outline Button
</button>
```

### Ghost Button

```tsx
<button className="px-6 py-3 text-[#5C2482] hover:bg-purple-50 rounded-xl font-semibold transition">
  Ghost Button
</button>
```

### Gradient Button

```tsx
<button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition shadow-lg">
  Gradient Button
</button>
```

### Disabled Button

```tsx
<button
  disabled
  className="px-6 py-3 bg-[#F95B0E] text-white rounded-xl font-semibold opacity-50 cursor-not-allowed"
>
  Disabled
</button>
```

### Button with Icon

```tsx
<button className="px-6 py-3 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl font-semibold transition flex items-center gap-2">
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
  Add New
</button>
```

### Loading Button

```tsx
<button
  disabled
  className="px-6 py-3 bg-[#F95B0E] text-white rounded-xl font-semibold flex items-center gap-2 opacity-75 cursor-not-allowed"
>
  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
  Processing...
</button>
```

---

## Cards

### Basic Card

```tsx
<div className="bg-white rounded-xl shadow p-6">
  <h3 className="text-xl font-semibold text-gray-900 mb-4">Card Title</h3>
  <p className="text-gray-600">Card content goes here.</p>
</div>
```

### Card with Header and Footer

```tsx
<div className="bg-white rounded-xl shadow overflow-hidden">
  {/* Header */}
  <div className="bg-gradient-to-r from-[#5C2482] to-purple-700 px-6 py-4">
    <h3 className="text-xl font-semibold text-white">Card Title</h3>
  </div>

  {/* Body */}
  <div className="p-6">
    <p className="text-gray-600">Card content goes here.</p>
  </div>

  {/* Footer */}
  <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition">
      Cancel
    </button>
    <button className="px-4 py-2 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl transition">
      Save
    </button>
  </div>
</div>
```

### Hoverable Card

```tsx
<div className="bg-white rounded-xl shadow hover:shadow-xl transition-shadow duration-300 p-6 cursor-pointer">
  <h3 className="text-xl font-semibold text-gray-900 mb-2">Hoverable Card</h3>
  <p className="text-gray-600">Hover over me to see the effect.</p>
</div>
```

### Stats Card

```tsx
<div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600 mb-1">Total Students</p>
      <p className="text-4xl font-bold text-[#5C2482]">1,234</p>
      <p className="text-sm text-green-600 mt-1">↑ 12% from last month</p>
    </div>
    <div className="text-5xl">🎓</div>
  </div>
</div>
```

---

## Modals

### Basic Modal

```tsx
'use client'

import { useState } from 'react'

export default function ModalExample() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-[#F95B0E] text-white rounded-xl"
      >
        Open Modal
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-[#5C2482] mb-4">
              Modal Title
            </h2>
            <p className="text-gray-600 mb-6">
              This is the modal content. You can put anything here.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle action
                  setShowModal(false)
                }}
                className="flex-1 px-4 py-2 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### Confirmation Modal

```tsx
{showDeleteModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Delete Confirmation</h3>
        </div>
      </div>
      <p className="text-gray-600 mb-6">
        Are you sure you want to delete this item? This action cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setShowDeleteModal(false)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Tables

### Basic Table

```tsx
<div className="bg-white rounded-xl shadow overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Name
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Role
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr className="hover:bg-gray-50 transition">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-medium text-gray-900">John Doe</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-600">john@example.com</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Student
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
            <button className="text-[#5C2482] hover:text-purple-900">Edit</button>
            <button className="text-red-600 hover:text-red-900">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## Notifications

### Success Alert

```tsx
<div className="bg-green-50 border border-green-200 rounded-xl p-4">
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <h3 className="text-sm font-medium text-green-800">Success!</h3>
      <p className="mt-1 text-sm text-green-700">Your changes have been saved successfully.</p>
    </div>
  </div>
</div>
```

### Error Alert

```tsx
<div className="bg-red-50 border border-red-200 rounded-xl p-4">
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <h3 className="text-sm font-medium text-red-800">Error</h3>
      <p className="mt-1 text-sm text-red-700">There was a problem with your submission.</p>
    </div>
  </div>
</div>
```

### Warning Alert

```tsx
<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </div>
    <div className="ml-3">
      <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
      <p className="mt-1 text-sm text-yellow-700">Please review your information before submitting.</p>
    </div>
  </div>
</div>
```

---

## Navigation

### Breadcrumbs

```tsx
<nav className="flex items-center space-x-2 text-sm">
  <a href="/dashboard" className="text-gray-500 hover:text-[#5C2482] transition">
    Dashboard
  </a>
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
  <a href="/courses" className="text-gray-500 hover:text-[#5C2482] transition">
    Courses
  </a>
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
  <span className="text-[#5C2482] font-medium">Course Details</span>
</nav>
```

### Tabs

```tsx
<div className="border-b border-gray-200">
  <nav className="flex space-x-8">
    <button className="border-b-2 border-[#5C2482] text-[#5C2482] py-4 px-1 font-medium">
      Overview
    </button>
    <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 font-medium transition">
      Students
    </button>
    <button className="border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 font-medium transition">
      Assignments
    </button>
  </nav>
</div>
```

---

## Badges & Tags

### Status Badges

```tsx
{/* Success */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  Active
</span>

{/* Warning */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
  Pending
</span>

{/* Error */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
  Suspended
</span>

{/* Info */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
  Draft
</span>

{/* Purple (Brand) */}
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
  Student
</span>
```

### Removable Tags

```tsx
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
  Tag Name
  <button className="hover:bg-purple-200 rounded-full p-0.5 transition">
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
</span>
```

---

## Copy and Paste

All components above are production-ready. Simply:
1. Copy the code
2. Paste into your component
3. Adjust props and state as needed
4. Maintain the styling classes

**Remember:** Always keep `text-gray-900 bg-white` on form inputs!
