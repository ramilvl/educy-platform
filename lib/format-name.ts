/**
 * Format name/surname with proper capitalization and whitespace cleaning
 *
 * Requirements:
 * 1. Trim leading/trailing whitespace
 * 2. Normalize multiple spaces between words to single space
 * 3. Capitalize first letter of each word, lowercase the rest
 * 4. Handle multi-word names (2-4 words)
 * 5. Support Azerbaijani characters (ə, ğ, ı, ö, ü, ç, ş)
 *
 * @param name - The name to format
 * @returns Formatted name or null if input is null/undefined/empty
 *
 * @example
 * formatName('  john  paul   ') => 'John Paul'
 * formatName('MƏHƏMMƏD') => 'Məhəmməd'
 * formatName('ali    rəsul     ') => 'Ali Rəsul'
 */
export function formatName(name: string | null | undefined): string | null {
  // Return null for null/undefined/empty values
  if (!name || typeof name !== 'string') {
    return null
  }

  // 1. Trim leading/trailing whitespace
  let formatted = name.trim()

  // 2. Return null if empty after trimming
  if (formatted.length === 0) {
    return null
  }

  // 3. Normalize multiple spaces between words to single space
  formatted = formatted.replace(/\s+/g, ' ')

  // 4. Capitalize first letter of each word, lowercase the rest
  // This works with both ASCII and Unicode (Azerbaijani) characters
  formatted = formatted
    .split(' ')
    .map(word => {
      if (word.length === 0) return ''

      // Get first character (may be multi-byte Unicode)
      const firstChar = word.charAt(0).toLocaleUpperCase('az-AZ')
      // Get remaining characters
      const rest = word.slice(1).toLocaleLowerCase('az-AZ')

      return firstChar + rest
    })
    .join(' ')

  return formatted
}

/**
 * Format multiple name fields in an object
 * Useful for cleaning user input before saving to database
 *
 * @example
 * formatNameFields({ name: '  john  ', surname: 'DOE  ' })
 * => { name: 'John', surname: 'Doe' }
 */
export function formatNameFields<T extends { name?: string | null; surname?: string | null }>(
  data: T
): T {
  return {
    ...data,
    name: data.name ? formatName(data.name) : data.name,
    surname: data.surname ? formatName(data.surname) : data.surname,
  } as T
}
