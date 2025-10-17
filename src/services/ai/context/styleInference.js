// ========================================
// STYLE INFERENCE FROM USER'S SHAPES
// ========================================

/**
 * Analyze user's existing shapes to infer their design style
 * @param {Array} userShapes - Shapes created by the current user
 * @returns {string} Style guide based on user's patterns
 */
export function inferUserStyle(userShapes) {
  if (!userShapes || userShapes.length === 0) {
    return '';
  }
  
  // Analyze colors
  const colors = userShapes
    .map(s => s.fill)
    .filter(Boolean)
    .reduce((acc, color) => {
      acc[color] = (acc[color] || 0) + 1;
      return acc;
    }, {});
  
  const topColors = Object.entries(colors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);
  
  // Analyze spacing (distances between shapes)
  const spacings = [];
  for (let i = 0; i < userShapes.length - 1; i++) {
    const dx = Math.abs(userShapes[i + 1].x - userShapes[i].x);
    const dy = Math.abs(userShapes[i + 1].y - userShapes[i].y);
    if (dx > 0 && dx < 200) spacings.push(dx);
    if (dy > 0 && dy < 200) spacings.push(dy);
  }
  const avgSpacing = spacings.length > 0 ? Math.round(spacings.reduce((a, b) => a + b, 0) / spacings.length) : null;
  
  // Analyze sizes
  const sizes = userShapes
    .filter(s => s.width && s.height)
    .map(s => ({ w: s.width, h: s.height }));
  const avgWidth = sizes.length > 0 ? Math.round(sizes.reduce((a, b) => a + b.w, 0) / sizes.length) : null;
  const avgHeight = sizes.length > 0 ? Math.round(sizes.reduce((a, b) => a + b.h, 0) / sizes.length) : null;
  
  // Analyze font sizes
  const fontSizes = userShapes
    .filter(s => s.fontSize)
    .map(s => s.fontSize);
  const topFontSize = fontSizes.length > 0 
    ? fontSizes.reduce((acc, size) => {
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {})
    : {};
  const preferredFontSize = Object.entries(topFontSize).sort((a, b) => b[1] - a[1])[0]?.[0];
  
  // Build style guide (only if user has created at least 3 shapes)
  if (userShapes.length < 3) {
    return ''; // Not enough data to infer style
  }
  
  let styleGuide = `\n**USER'S EXISTING STYLE (Optional - use if creating similar content):**\n`;
  
  if (topColors.length > 0) {
    styleGuide += `- Colors you've used: ${topColors.join(', ')}\n`;
  }
  
  if (avgSpacing) {
    styleGuide += `- Your typical spacing: ~${avgSpacing}px\n`;
  }
  
  if (avgWidth && avgHeight) {
    styleGuide += `- Your common dimensions: ${avgWidth}x${avgHeight}px\n`;
  }
  
  if (preferredFontSize) {
    styleGuide += `- Your preferred font size: ${preferredFontSize}px\n`;
  }
  
  styleGuide += `\n⚠️ **IMPORTANT**: These are just suggestions based on the user's past work. For professional UI requests (login screens, dashboards, etc.), ALWAYS follow the Design System and UI Pattern examples above instead!`;
  
  return styleGuide;
}

