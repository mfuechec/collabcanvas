// ========================================
// UI COMPONENT HELPER FUNCTIONS
// ========================================
// Reusable functions for building consistent UI components

/**
 * Create a shadow layer for depth effect
 */
export function createShadow({ x, y, width, height, cornerRadius = 0, offset = 2, opacity = 0.08 }) {
  return {
    type: 'rectangle',
    x,
    y: y + offset,
    width,
    height,
    fill: '#1E1E1E',
    opacity,
    cornerRadius
  };
}

/**
 * Create a border layer
 */
export function createBorder({ x, y, width, height, cornerRadius = 0, color = '#E5E5E5', opacity = 0.15 }) {
  return {
    type: 'rectangle',
    x: x + 1,
    y: y + 1,
    width: width - 2,
    height: height - 2,
    fill: color,
    opacity,
    cornerRadius
  };
}

/**
 * Create an input field with label and placeholder
 */
export function createInputField({ x, y, width, label, placeholder, style = 'modern' }) {
  const operations = [];
  let currentY = y;
  
  // Field label
  operations.push({
    type: 'create',
    shape: {
      type: 'text',
      x,
      y: currentY,
      text: label,
      fontSize: 12,
      fill: '#666666'
    }
  });
  currentY += 20;
  
  // Field background
  const bgColor = style === 'minimal' ? '#FFFFFF' : '#F8F9FA';
  operations.push({
    type: 'create',
    shape: {
      type: 'rectangle',
      x,
      y: currentY,
      width,
      height: 52,
      fill: bgColor,
      cornerRadius: style === 'minimal' ? 4 : 8
    }
  });
  
  // Field border
  operations.push({
    type: 'create',
    shape: createBorder({
      x,
      y: currentY,
      width,
      height: 52,
      cornerRadius: style === 'minimal' ? 4 : 8,
      opacity: 0.3
    })
  });
  
  // Placeholder text
  operations.push({
    type: 'create',
    shape: {
      type: 'text',
      x: x + 16,
      y: currentY + 18,
      text: placeholder,
      fontSize: 15,
      fill: '#999999'
    }
  });
  
  return { operations, height: 72 }; // Total height including label
}

/**
 * Create a button
 */
export function createButton({ x, y, width, text, color = '#0D99FF', style = 'modern', withShadow = true }) {
  const operations = [];
  
  // Button shadow (if enabled)
  if (withShadow) {
    operations.push({
      type: 'create',
      shape: createShadow({
        x,
        y: y - 2,
        width,
        height: 52,
        cornerRadius: style === 'minimal' ? 4 : 8,
        opacity: 0.15
      })
    });
  }
  
  // Button background
  operations.push({
    type: 'create',
    shape: {
      type: 'rectangle',
      x,
      y,
      width,
      height: 52,
      fill: color,
      cornerRadius: style === 'minimal' ? 4 : 8
    }
  });
  
  // Button text (centered)
  const textWidth = text.length * 10; // Rough estimate
  operations.push({
    type: 'create',
    shape: {
      type: 'text',
      x: x + (width / 2) - (textWidth / 2),
      y: y + 18,
      text,
      fontSize: 18,
      fill: '#FFFFFF'
    }
  });
  
  return { operations, height: 52 };
}

/**
 * Create a card container with shadow and border
 */
export function createCard({ x, y, width, height, cornerRadius = 12, shadowLayers = 3 }) {
  const operations = [];
  
  // Shadow layers
  for (let i = 0; i < shadowLayers; i++) {
    operations.push({
      type: 'create',
      shape: createShadow({
        x,
        y: y + 2 + (i * 2),
        width,
        height,
        cornerRadius,
        opacity: 0.08 - (i * 0.02)
      })
    });
  }
  
  // Main card
  operations.push({
    type: 'create',
    shape: {
      type: 'rectangle',
      x,
      y,
      width,
      height,
      fill: '#FFFFFF',
      cornerRadius
    }
  });
  
  // Card border
  operations.push({
    type: 'create',
    shape: createBorder({ x, y, width, height, cornerRadius })
  });
  
  return operations;
}

/**
 * Create an accent strip
 */
export function createAccentStrip({ x, y, height, color }) {
  return {
    type: 'rectangle',
    x,
    y,
    width: 4,
    height,
    fill: color
  };
}

/**
 * Create a divider line
 */
export function createDivider({ x, y, width, text = null }) {
  const operations = [];
  
  // Divider line
  operations.push({
    type: 'create',
    shape: {
      type: 'rectangle',
      x,
      y: y + 12,
      width,
      height: 1,
      fill: '#E5E5E5',
      opacity: 0.5
    }
  });
  
  // Optional divider text
  if (text) {
    const textWidth = text.length * 7;
    operations.push({
      type: 'create',
      shape: {
        type: 'text',
        x: x + (width / 2) - (textWidth / 2),
        y: y + 2,
        text,
        fontSize: 14,
        fill: '#666666'
      }
    });
  }
  
  return { operations, height: 40 };
}

/**
 * Create a social auth button
 */
export function createSocialButton({ x, y, width, provider, config }) {
  const operations = [];
  
  // Social button background
  operations.push({
    type: 'create',
    shape: {
      type: 'rectangle',
      x,
      y,
      width,
      height: 48,
      fill: config.color,
      cornerRadius: 8
    }
  });
  
  // Button text
  const textWidth = config.text.length * 9;
  operations.push({
    type: 'create',
    shape: {
      type: 'text',
      x: x + (width / 2) - (textWidth / 2),
      y: y + 16,
      text: config.text,
      fontSize: 16,
      fill: '#FFFFFF'
    }
  });
  
  return { operations, height: 60 }; // Includes spacing
}

