# Educy Design System

## Table of Contents
1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Form Components](#form-components)
4. [Buttons & CTAs](#buttons--ctas)
5. [Layout & Spacing](#layout--spacing)
6. [Common Patterns](#common-patterns)
7. [Accessibility](#accessibility)
8. [Common Pitfalls](#common-pitfalls)

---

## Color Palette

### Primary Brand Colors

Our design uses a purple and orange color scheme to create a modern, educational aesthetic.

#### Primary Purple
- **Main Purple**: `#5C2482`
  - Use for: Headers, primary text, navigation elements
  - Tailwind: `text-[#5C2482]` or `bg-[#5C2482]`

```tsx
// Example
<h1 className="text-3xl font-bold text-[#5C2482]">Dashboard</h1>
```

- **Light Purple**: `#7B3FA3`
  - Use for: Gradients, hover states
  - Tailwind: `bg-[#7B3FA3]`

- **Purple Gradients**:
  ```tsx
  // Purple gradient background
  className="bg-gradient-to-br from-[#5C2482] via-purple-700 to-[#7B3FA3]"

  // Purple button gradient
  className="bg-gradient-to-r from-purple-600 to-pink-600"
  ```

#### Primary Orange
- **Main Orange**: `#F95B0E`
  - Use for: CTAs, important actions, highlights
  - Tailwind: `text-[#F95B0E]` or `bg-[#F95B0E]`

- **Hover Orange**: `#d94f0c`
  - Use for: Button hover states
  - Tailwind: `hover:bg-[#d94f0c]`

```tsx
// Primary CTA button
<button className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white px-6 py-3 rounded-xl">
  Get Started
</button>
```

### Neutral Colors

#### Text Colors (CRITICAL)
**⚠️ ALWAYS specify text color on form inputs!**

- **Primary Text**: `text-gray-900` (dark gray, almost black)
  - Use for: Body text, form inputs, most readable text
  - **REQUIRED** for all input, select, textarea elements

- **Secondary Text**: `text-gray-600`
  - Use for: Descriptions, helper text, labels

- **Muted Text**: `text-gray-500`
  - Use for: Placeholder text, disabled states

- **Light Text**: `text-gray-400`
  - Use for: Very subtle text, decorative elements

```tsx
// ✅ CORRECT - Text is visible
<input className="text-gray-900 bg-white border border-gray-300" />

// ❌ WRONG - Text might be invisible
<input className="border border-gray-300" />
```

#### Background Colors

- **White Background**: `bg-white`
  - Use for: Cards, modals, form inputs
  - **REQUIRED** for all form elements

- **Light Gray**: `bg-gray-50`
  - Use for: Table headers, subtle section backgrounds

- **Medium Gray**: `bg-gray-100`
  - Use for: Hover states on white backgrounds

```tsx
// Card/Modal background
<div className="bg-white rounded-xl shadow p-6">
  {/* Content */}
</div>
```

#### Border Colors

- **Default Border**: `border-gray-300`
  - Use for: Input borders, dividers

- **Light Border**: `border-gray-200`
  - Use for: Subtle dividers

- **Focus Border**: Use focus rings instead (see Form Components)

### Status Colors

#### Success (Green)
```tsx
// Success message
className="bg-green-50 border border-green-200 text-green-700"

// Success button
className="bg-green-600 hover:bg-green-700 text-white"
```

#### Error (Red)
```tsx
// Error message
className="bg-red-50 border border-red-200 text-red-700"

// Error text
className="text-red-600"
```

#### Warning (Yellow/Orange)
```tsx
// Warning banner
className="bg-yellow-50 border border-yellow-200 text-yellow-800"
```

#### Info (Blue)
```tsx
// Info banner
className="bg-blue-50 border border-blue-200 text-blue-800"
```

---

## Typography

### Font Sizes

```tsx
// Page Titles
className="text-3xl font-bold text-[#5C2482]"

// Section Headers
className="text-2xl font-semibold text-gray-900"

// Subsection Headers
className="text-xl font-semibold text-gray-900"

// Body Text
className="text-base text-gray-600"

// Small Text
className="text-sm text-gray-500"

// Extra Small Text
className="text-xs text-gray-400"
```

### Font Weights

- `font-bold` - Page titles, important headers
- `font-semibold` - Section headers, button text
- `font-medium` - Labels, emphasized text
- `font-normal` - Body text (default)

### Responsive Typography

```tsx
// Responsive heading
className="text-2xl sm:text-3xl lg:text-4xl font-bold"

// Responsive body text
className="text-base sm:text-lg"
```

---

## Form Components

### Input Fields (TEXT, EMAIL, NUMBER, etc.)

**⚠️ CRITICAL: Always include text-gray-900 and bg-white**

#### Standard Input Pattern
```tsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Enter value"
/>
```

**Required Classes:**
- `w-full` - Full width
- `px-4 py-2` - Padding (horizontal 16px, vertical 8px)
- `border border-gray-300` - Border styling
- `rounded-xl` - Rounded corners (12px radius)
- ⚠️ `text-gray-900` - **REQUIRED** - Dark text
- ⚠️ `bg-white` - **REQUIRED** - White background
- `focus:outline-none` - Remove default outline
- `focus:ring-2 focus:ring-blue-500` - Custom focus ring
- `focus:border-transparent` - Hide border on focus

#### Purple Focus Ring (For Brand-Specific Forms)
```tsx
<input
  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482] focus:border-transparent"
/>
```

### Textarea

```tsx
<textarea
  rows={4}
  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
  placeholder="Enter description"
/>
```

**Additional Classes:**
- `resize-vertical` - Allow only vertical resize
- `resize-none` - Disable resize

### Select Dropdown

```tsx
<select
  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
>
  <option value="">Select an option</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### Checkbox

```tsx
<input
  type="checkbox"
  className="w-4 h-4 text-[#5C2482] border-gray-300 rounded focus:ring-blue-500"
/>
```

### Labels

```tsx
<label className="block text-sm font-medium text-gray-700 mb-2">
  Field Name *
</label>
```

**Label Guidelines:**
- Always use `block` for labels above inputs
- Use `text-sm font-medium text-gray-700`
- Add `mb-2` for spacing below label
- Add `*` for required fields

### Helper Text

```tsx
<p className="mt-1 text-sm text-gray-500">
  This field is required for account activation
</p>
```

### Error Messages

```tsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
    {error}
  </div>
)}
```

---

## Buttons & CTAs

### Primary Button (Orange)

```tsx
<button className="px-6 py-3 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl font-semibold transition shadow-lg hover:shadow-xl">
  Submit
</button>
```

### Secondary Button (Purple)

```tsx
<button className="px-6 py-3 bg-[#5C2482] hover:bg-[#7B3FA3] text-white rounded-xl font-semibold transition">
  View Details
</button>
```

### Gradient Button

```tsx
<button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg font-medium">
  Get Started
</button>
```

### Outline Button

```tsx
<button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition">
  Cancel
</button>
```

### Disabled State

```tsx
<button
  disabled={loading}
  className="px-6 py-3 bg-[#F95B0E] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? 'Processing...' : 'Submit'}
</button>
```

### Button Sizes

```tsx
// Small
className="px-4 py-2 text-sm"

// Medium (default)
className="px-6 py-3 text-base"

// Large
className="px-8 py-4 text-lg"
```

---

## Layout & Spacing

### Container Widths

```tsx
// Full page container
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

// Content container (narrower)
className="max-w-3xl mx-auto"

// Form container
className="max-w-2xl mx-auto"
```

### Spacing Scale

Use Tailwind's spacing scale (4px increments):
- `p-2` = 8px padding
- `p-4` = 16px padding
- `p-6` = 24px padding
- `p-8` = 32px padding

```tsx
// Card padding
className="p-6"

// Section spacing
className="space-y-6"

// Gap in flex/grid
className="gap-4"
```

### Cards & Modals

```tsx
// Card
<div className="bg-white rounded-xl shadow p-6">
  {/* Content */}
</div>

// Modal
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl max-w-md w-full p-6">
    {/* Modal content */}
  </div>
</div>
```

---

## Common Patterns

### Page Header

```tsx
<div className="space-y-6">
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-[#5C2482]">
        Page Title
      </h1>
      <p className="mt-2 text-gray-600">
        Page description
      </p>
    </div>
    <button className="px-6 py-3 bg-[#F95B0E] hover:bg-[#d94f0c] text-white rounded-xl font-medium transition">
      + Add New
    </button>
  </div>
</div>
```

### Data Table

```tsx
<div className="bg-white rounded-xl shadow overflow-hidden">
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Column Name
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-600">Cell content</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Loading State

```tsx
<div className="flex items-center justify-center h-64">
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5C2482]"></div>
    <p className="mt-2 text-gray-600">Loading...</p>
  </div>
</div>
```

### Empty State

```tsx
<div className="text-center py-12">
  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* Icon path */}
  </svg>
  <p className="mt-2 text-gray-500">No items found</p>
  <button className="mt-4 text-[#5C2482] hover:underline">
    Create your first item
  </button>
</div>
```

---

## Accessibility

### Focus States

**Always include visible focus indicators:**

```tsx
// Standard focus ring
focus:ring-2 focus:ring-blue-500 focus:outline-none

// Purple focus ring (brand)
focus:ring-2 focus:ring-[#5C2482] focus:outline-none

// Orange focus ring
focus:ring-2 focus:ring-[#F95B0E] focus:outline-none
```

### Color Contrast

**Minimum contrast ratios (WCAG AA):**
- Normal text: 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

**Approved color combinations:**
✅ `text-gray-900` on `bg-white` (21:1 contrast)
✅ `text-white` on `bg-[#5C2482]` (8.59:1 contrast)
✅ `text-white` on `bg-[#F95B0E]` (4.58:1 contrast)

### Labels & Placeholders

```tsx
// ✅ CORRECT - Label + placeholder
<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
  Email Address *
</label>
<input
  id="email"
  type="email"
  placeholder="you@example.com"
  className="..."
/>

// ❌ WRONG - No label
<input type="email" placeholder="Email" />
```

---

## Common Pitfalls

### ❌ PITFALL #1: Missing Text Color on Inputs

**Problem:**
```tsx
// ❌ Text will be invisible on some browsers
<input className="w-full px-4 py-2 border border-gray-300 rounded-xl" />
```

**Solution:**
```tsx
// ✅ Always add text-gray-900 and bg-white
<input className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
```

**Why it happens:**
- Browsers have different default text colors
- After switching from dark to light mode, some elements retain white text
- Missing explicit colors causes white-on-white text

**Affected elements:**
- `<input>` (all types)
- `<select>`
- `<textarea>`

---

### ❌ PITFALL #2: Inconsistent Focus States

**Problem:**
```tsx
// ❌ Different focus styles across forms
<input className="border focus:ring-2 focus:ring-blue-500" />
<input className="border focus:border-purple-500" />
```

**Solution:**
```tsx
// ✅ Use consistent focus pattern
<input className="border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
```

---

### ❌ PITFALL #3: Wrong Button Colors

**Problem:**
```tsx
// ❌ Random button colors
<button className="bg-blue-500 text-white">Submit</button>
```

**Solution:**
```tsx
// ✅ Use brand colors
<button className="bg-[#F95B0E] hover:bg-[#d94f0c] text-white">Submit</button>
```

---

### ❌ PITFALL #4: Missing Responsive Classes

**Problem:**
```tsx
// ❌ Not responsive
<h1 className="text-6xl">Title</h1>
```

**Solution:**
```tsx
// ✅ Responsive sizing
<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl">Title</h1>
```

---

### ❌ PITFALL #5: Inconsistent Border Radius

**Problem:**
```tsx
// ❌ Different radius values
<button className="rounded-lg">Button</button>
<input className="rounded-md" />
<div className="rounded-2xl">Card</div>
```

**Solution:**
```tsx
// ✅ Use rounded-xl consistently
<button className="rounded-xl">Button</button>
<input className="rounded-xl" />
<div className="rounded-xl">Card</div>
```

---

## Quick Reference Checklist

When creating a new form or page, ensure:

- [ ] All inputs have `text-gray-900 bg-white`
- [ ] All inputs have focus states (`focus:ring-2 focus:ring-blue-500`)
- [ ] All labels have `text-gray-700` and are associated with inputs
- [ ] Primary actions use orange (`bg-[#F95B0E]`)
- [ ] Headers use purple (`text-[#5C2482]`)
- [ ] Cards use `bg-white rounded-xl shadow`
- [ ] Spacing uses `space-y-6` or consistent gap values
- [ ] Responsive breakpoints are included (sm:, md:, lg:)
- [ ] Border radius is `rounded-xl` (12px)
- [ ] Disabled states have `disabled:opacity-50 disabled:cursor-not-allowed`

---

## Need Help?

If you're unsure about a design decision:
1. Check existing similar pages in the app
2. Refer to this guide
3. Use the color palette consistently
4. Test on multiple screen sizes
5. Verify text is readable (never white-on-white!)

**Remember:** Consistency is key. When in doubt, copy patterns from existing, working components.
