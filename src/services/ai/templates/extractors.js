// ========================================
// PARAMETER EXTRACTORS
// ========================================
// Extract customization parameters from natural language

/**
 * Extract color from user message
 */
export function extractColor(message, userStyleGuide = null) {
  const colorMap = {
    blue: '#0D99FF', red: '#EF4444', green: '#10B981',
    purple: '#8B5CF6', orange: '#F59E0B', pink: '#EC4899',
    yellow: '#F59E0B', teal: '#14B8A6', indigo: '#6366F1',
    black: '#1E1E1E', white: '#FFFFFF', gray: '#6B7280', grey: '#6B7280'
  };
  
  // First check user's style guide (if they consistently use a color)
  if (userStyleGuide && userStyleGuide.primaryColor) {
    return userStyleGuide.primaryColor;
  }
  
  // Then check explicit color mentions
  const lower = message.toLowerCase();
  for (const [name, hex] of Object.entries(colorMap)) {
    if (lower.includes(name)) {
      return hex;
    }
  }
  
  return null;
}

/**
 * Extract size preference
 */
export function extractSize(message) {
  const lower = message.toLowerCase();
  if (lower.includes('large') || lower.includes('big')) return 'large';
  if (lower.includes('small') || lower.includes('compact') || lower.includes('tiny')) return 'small';
  return 'normal';
}

/**
 * Extract style preference
 */
export function extractStyle(message, userStyleGuide = null) {
  const lower = message.toLowerCase();
  
  // Check explicit style mentions
  if (lower.includes('minimal') || lower.includes('minimalist') || lower.includes('simple')) return 'minimal';
  if (lower.includes('bold')) return 'bold';
  if (lower.includes('modern')) return 'modern';
  
  // Fall back to user's style guide
  if (userStyleGuide && userStyleGuide.style) {
    return userStyleGuide.style;
  }
  
  return 'modern';
}

/**
 * Extract count/number
 */
export function extractCount(message) {
  const match = message.match(/\b(\d+)\s+(items?|buttons?|links?|cards?|fields?)\b/i);
  return match ? parseInt(match[1]) : null;
}

/**
 * Extract form fields
 */
export function extractFields(message) {
  const lower = message.toLowerCase();
  const fields = [];
  
  if (lower.includes('username')) fields.push('username');
  if (lower.includes('email')) fields.push('email');
  if (lower.includes('password')) fields.push('password');
  if (lower.includes('phone')) fields.push('phone');
  if (lower.includes('name') && !lower.includes('username')) fields.push('name');
  
  // Default for login: email + password
  if (fields.length === 0 && /login|signin|sign-in|sign\s+in/.test(lower)) {
    fields.push('email', 'password');
  }
  
  return fields;
}

/**
 * Extract social auth providers
 */
export function extractSocialAuth(message) {
  const lower = message.toLowerCase();
  const providers = [];
  
  if (lower.includes('google')) providers.push('google');
  if (lower.includes('facebook')) providers.push('facebook');
  if (lower.includes('twitter')) providers.push('twitter');
  if (lower.includes('github')) providers.push('github');
  
  // Generic social login
  if ((lower.includes('social') || lower.includes('sso')) && providers.length === 0) {
    providers.push('google', 'facebook');
  }
  
  return providers;
}

/**
 * Detect multi-template request
 */
export function detectMultiTemplate(message) {
  const lower = message.toLowerCase();
  
  // Look for "and" between template keywords
  // Note: 'form', 'screen', 'page', 'ui' are descriptors, not template types
  const templateKeywords = ['login', 'signin', 'navbar', 'navigation', 'card', 'dashboard', 'footer'];
  
  let matchCount = 0;
  for (const keyword of templateKeywords) {
    if (lower.includes(keyword)) matchCount++;
  }
  
  // Also check for explicit "and" between requests
  if (matchCount > 1 || /\b(and|plus|with a)\b/.test(lower)) {
    return true;
  }
  
  return false;
}

