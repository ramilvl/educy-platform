#!/bin/bash

# Script to fix input visibility issues - add text-gray-900 bg-white to form inputs
# This fixes white-on-white text visibility problems

echo "🔧 Fixing input text visibility issues..."

# Function to add text color to a file
fix_file() {
  local file=$1
  echo "  Processing: $file"

  # Replace className patterns that have border but no text color
  sed -i.bak \
    -e 's/className="w-full \(px-[0-9] py-[0-9] \)*border border-gray-300 rounded-xl \(focus:[^"]*\)"/className="w-full \1border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none \2"/g' \
    -e 's/className="w-full \(px-[0-9] py-[0-9] \)*border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"/className="w-full \1border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"/g' \
    -e 's/className="w-full \(px-[0-9] py-[0-9] \)*border border-gray-300 rounded-xl focus:ring-2 focus:ring-\[#5C2482\] focus:border-\[#5C2482\]"/className="w-full \1border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C2482] focus:border-[#5C2482]"/g' \
    "$file"

  # Remove backup file
  rm -f "${file}.bak"
}

# Fix instructor pages
fix_file "app/instructor/courses/[id]/assignments/new/page.tsx"
fix_file "app/instructor/courses/[id]/lessons/new/page.tsx"
fix_file "app/instructor/assignments/[id]/grade-form.tsx"

# Fix moderator pages
fix_file "app/moderator/courses/page.tsx"

# Fix student pages
fix_file "app/student/assignments/[id]/page.tsx"

echo "✅ Fixed all input visibility issues!"
