/**
 * Formats a snake_case or slug string into Title Case
 * Example: 'get_free_quote' -> 'Get Free Quote'
 */
export const formatSlug = (slug) => {
  if (!slug) return '';
  // Replace underscores and hyphens with spaces
  const text = slug.replace(/[_-]/g, ' ');
  // Title Case each word
  return text
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Extract initial for avatar
 * If name exists, uses first letter
 * If only phone exists, uses last digit or first digit after country code
 */
export const getInitial = (name, phone) => {
  if (name && name !== 'Anonymous') {
    return name[0].toUpperCase();
  }
  if (phone) {
    // If it's a long number (likely with country code), take the 3rd digit (skip 91)
    // or just take the first digit and hope for the best, but let's try to be smart.
    const clean = phone.replace(/\D/g, '');
    if (clean.length >= 12) return clean[2]; // Skip 91
    return clean[0] || '?';
  }
  return '?';
};
