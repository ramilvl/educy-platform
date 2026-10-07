# Troubleshooting Guide

Common issues developers encounter and how to fix them.

## Table of Contents
1. [Form & Input Issues](#form--input-issues)
2. [Styling Issues](#styling-issues)
3. [Layout Issues](#layout-issues)
4. [TypeScript Errors](#typescript-errors)
5. [Build & Deploy Issues](#build--deploy-issues)

---

## Form & Input Issues

### Issue: Text is invisible in form inputs

**Symptoms:**
- Can't see what you're typing in input fields
- Input appears empty even when it has value
- White text on white background

**Cause:**
Missing text color classes. Browser defaults to white text in some cases.

**Fix:**
Add `text-gray-900 bg-white` to ALL input, select, and textarea elements:

```tsx
// ❌ BEFORE (broken)
<input className="w-full px-4 py-2 border border-gray-300 rounded-xl" />

// ✅ AFTER (fixed)
<input className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
```

**Prevention:**
- Always use the standard input pattern from [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md)
- Copy the complete className, don't type it manually
- Use a code snippet in your editor

---

### Issue: Form validation doesn't work

**Symptoms:**
- Form submits with empty fields
- Required fields not enforced

**Cause:**
Missing `required` attribute or form not using `onSubmit`.

**Fix:**
```tsx
// ✅ Add required attribute
<input type="email" required />

// ✅ Use onSubmit handler
<form onSubmit={handleSubmit}>
  {/* inputs */}
  <button type="submit">Submit</button>
</form>

// ✅ Validate in handler
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault() // Prevent default form submission

  if (!formData.email) {
    setError('Email is required')
    return
  }

  // Submit data
}
```

---

### Issue: Input loses focus when typing

**Symptoms:**
- Cursor jumps out of input after one character
- Component re-renders on every keystroke

**Cause:**
Component is being recreated on every render (usually in a map function).

**Fix:**
```tsx
// ❌ WRONG - Component recreated every render
{items.map((item) => (
  <input
    key={item.id}
    value={item.value}
    onChange={(e) => updateItem(item.id, e.target.value)}
  />
))}

// ✅ CORRECT - Use stable component or key
{items.map((item, index) => (
  <input
    key={`input-${item.id}`} // Stable key
    value={item.value}
    onChange={(e) => updateItem(item.id, e.target.value)}
  />
))}
```

---

## Styling Issues

### Issue: Tailwind classes not working

**Symptoms:**
- Classes in className don't apply styles
- Some classes work, others don't

**Cause:**
1. Typo in class name
2. Conflicting classes
3. Dynamic class names not in safelist

**Fix:**

```tsx
// ❌ WRONG - Typo
<div className="bg-purpl-500">

// ✅ CORRECT
<div className="bg-purple-500">

// ❌ WRONG - Dynamic classes won't work
<div className={`bg-${color}-500`}>

// ✅ CORRECT - Use full class names
<div className={color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}>
```

**Check:**
1. Verify class name spelling
2. Check Tailwind docs for correct syntax
3. Inspect element in browser DevTools
4. Run `npm run build` to ensure Tailwind picks up classes

---

### Issue: Focus ring not showing

**Symptoms:**
- No visual feedback when input is focused
- Tab navigation unclear

**Cause:**
Missing focus classes or `outline-none` without replacement.

**Fix:**
```tsx
// ❌ WRONG - No focus indicator
<input className="... outline-none" />

// ✅ CORRECT - Custom focus ring
<input className="... focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
```

---

### Issue: Hover state not working on mobile

**Symptoms:**
- Hover effects appear on mobile tap
- Sticky hover states on touch devices

**Cause:**
Hover states don't work well on touch devices.

**Fix:**
Use `active:` or `focus:` states for mobile:

```tsx
// ✅ Better for mobile
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 transition">
  Button
</button>
```

---

## Layout Issues

### Issue: Content not responsive on mobile

**Symptoms:**
- Horizontal scrolling on mobile
- Text too small or too large
- Layout breaks on small screens

**Cause:**
Missing responsive breakpoints or fixed widths.

**Fix:**
```tsx
// ❌ WRONG - Fixed size
<div className="w-800">

// ✅ CORRECT - Responsive width
<div className="w-full max-w-4xl mx-auto px-4">

// ❌ WRONG - No responsive text
<h1 className="text-6xl">

// ✅ CORRECT - Responsive text
<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl">

// ❌ WRONG - Fixed columns
<div className="grid grid-cols-4">

// ✅ CORRECT - Responsive columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
```

---

### Issue: Modal not centered

**Symptoms:**
- Modal appears at top or bottom of screen
- Not centered horizontally or vertically

**Cause:**
Missing flexbox centering classes.

**Fix:**
```tsx
// ✅ CORRECT - Centered modal
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl max-w-md w-full p-6">
    {/* Modal content */}
  </div>
</div>
```

Key classes:
- `fixed inset-0` - Full screen overlay
- `flex items-center justify-center` - Center content
- `max-w-md w-full` - Responsive modal width

---

### Issue: Z-index conflicts

**Symptoms:**
- Modal behind other content
- Dropdown menu hidden
- Navigation covered by content

**Cause:**
Incorrect or missing z-index values.

**Fix:**
```tsx
// Z-index scale
// 0   - Normal content
// 10  - Dropdowns
// 20  - Fixed navigation
// 30  - Sticky headers
// 40  - Modals backdrop
// 50  - Modal content

// ✅ Navigation
<nav className="fixed top-0 w-full z-20">

// ✅ Modal backdrop
<div className="fixed inset-0 z-40">

// ✅ Modal content
<div className="fixed inset-0 z-50">
```

---

## TypeScript Errors

### Issue: Type 'string' is not assignable to type...

**Symptoms:**
```tsx
const [role, setRole] = useState('STUDENT')
// Error: Type 'string' is not assignable to type 'ADMIN' | 'STUDENT' | 'INSTRUCTOR'
```

**Fix:**
```tsx
// ✅ CORRECT - Specify type
const [role, setRole] = useState<'ADMIN' | 'STUDENT' | 'INSTRUCTOR' | 'MODERATOR'>('STUDENT')

// OR use type assertion for select
<select
  value={formData.role}
  onChange={(e) => setFormData({
    ...formData,
    role: e.target.value as 'ADMIN' | 'STUDENT' | 'INSTRUCTOR' | 'MODERATOR'
  })}
>
```

---

### Issue: Object is possibly 'null' or 'undefined'

**Symptoms:**
```tsx
const user = await getCurrentUser()
console.log(user.id) // Error: Object is possibly 'null'
```

**Fix:**
```tsx
// ✅ CORRECT - Check for null
const user = await getCurrentUser()

if (!user) {
  return <div>Not authenticated</div>
}

// Now safe to use user.id
console.log(user.id)

// OR use optional chaining
console.log(user?.id)

// OR use nullish coalescing
const userId = user?.id ?? 'default-id'
```

---

## Build & Deploy Issues

### Issue: Build fails with "Module not found"

**Symptoms:**
```
Error: Cannot find module '@/components/...'
```

**Cause:**
1. File doesn't exist
2. Wrong import path
3. Case sensitivity issue

**Fix:**
```tsx
// Check file exists
// Check import path matches actual path
// Check capitalization (case-sensitive)

// ❌ WRONG
import Component from '@/components/MyComponent'

// ✅ CORRECT (if file is my-component.tsx)
import Component from '@/components/my-component'
```

---

### Issue: Environment variables not working

**Symptoms:**
- `process.env.VARIABLE_NAME` is undefined
- Works locally but not in production

**Cause:**
1. Variable not prefixed with `NEXT_PUBLIC_` for client-side
2. Not added to Vercel environment variables
3. Not in `.env.local` file

**Fix:**

**For client-side variables:**
```tsx
// ❌ WRONG - Won't work in client components
const apiKey = process.env.API_KEY

// ✅ CORRECT - Use NEXT_PUBLIC_ prefix
const apiKey = process.env.NEXT_PUBLIC_API_KEY
```

**For server-side only:**
```tsx
// ✅ CORRECT - Server components and API routes
const dbUrl = process.env.DATABASE_URL
```

**Vercel setup:**
1. Go to Project Settings → Environment Variables
2. Add variable name and value
3. Select environments (Production, Preview, Development)
4. Redeploy

---

### Issue: CSS not applying in production

**Symptoms:**
- Styles work locally but not after deployment
- Some Tailwind classes missing

**Cause:**
1. Dynamic classes not in Tailwind safelist
2. CSS not purged correctly

**Fix:**

```tsx
// ❌ WRONG - Dynamic classes won't be included
<div className={`bg-${color}-500`}>

// ✅ CORRECT - Use complete class names
<div className={
  color === 'purple' ? 'bg-purple-500' :
  color === 'blue' ? 'bg-blue-500' :
  'bg-gray-500'
}>
```

**Or add to safelist in `tailwind.config.ts`:**
```ts
module.exports = {
  safelist: [
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500',
  ],
  // ...
}
```

---

## Quick Diagnostic Steps

When something doesn't work:

1. **Check browser console** - Look for errors
2. **Inspect element** - Verify classes are applied
3. **Check file exists** - Confirm imports are correct
4. **Verify environment variables** - Check they're set correctly
5. **Test in incognito mode** - Rule out cache issues
6. **Check network tab** - See if API calls are failing
7. **Look at similar working code** - Compare with functioning pages
8. **Restart dev server** - `npm run dev` again
9. **Clear `.next` folder** - `rm -rf .next && npm run dev`

---

## Still Stuck?

1. **Check documentation:**
   - [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
   - [COMPONENT_LIBRARY.md](./COMPONENT_LIBRARY.md)

2. **Look at working examples:**
   - Find a similar page that works
   - Compare code side-by-side
   - Copy working patterns

3. **Search codebase:**
   - Use VS Code search (Cmd/Ctrl + Shift + F)
   - Find similar implementations
   - Learn from existing code

4. **Check Git history:**
   - See how similar issues were fixed before
   - `git log --grep="similar issue"`

5. **Test incrementally:**
   - Comment out code until it works
   - Add back piece by piece
   - Identify what breaks it

Remember: Most issues have been encountered before. Check this guide first!
