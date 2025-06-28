/**
 * Generate a unique ID to prevent React key conflicts
 * Format: prefix-timestamp-randomString
 */
export function generateUniqueId(prefix: string = 'id'): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9);
  return `${prefix}-${timestamp}-${randomString}`;
}

/**
 * Helper function for generating content IDs
 */
export function generateContentId(): string {
  return generateUniqueId('content');
}

/**
 * Helper function for generating list IDs
 */
export function generateListId(): string {
  return generateUniqueId('list');
}

/**
 * Helper function for generating tag IDs
 */
export function generateTagId(): string {
  return generateUniqueId('tag');
}

/**
 * Helper function for generating user IDs
 */
export function generateUserId(): string {
  return generateUniqueId('user');
} 