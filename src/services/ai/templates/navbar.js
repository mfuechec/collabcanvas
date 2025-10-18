// ========================================
// NAVIGATION BAR TEMPLATE
// ========================================

import { extractColor, extractCount, extractStyle } from './extractors.js';

export const NAVBAR_TEMPLATE = {
  name: 'navigation_bar',
  
  patterns: [
    // Matches: "create a navbar", "create a red navigation bar", "make a modern nav menu", etc.
    /\b(create|make|build|design|generate|add)\s+(a|an)?\s*(?:\w+\s+)*(nav|navbar|navigation)(\s+(?:bar|menu))?\b/i,
  ],
  
  defaults: {
    primaryColor: '#0D99FF',
    backgroundColor: '#FFFFFF',
    items: ['Home', 'About', 'Services', 'Contact'],
    height: 80,
    cornerRadius: 0,
    style: 'modern'
  },
  
  extract(message, userStyleGuide = null) {
    const params = { ...this.defaults };
    
    // Extract color
    const color = extractColor(message, userStyleGuide);
    if (color) params.primaryColor = color;
    
    // Extract item count
    const count = extractCount(message);
    if (count) {
      params.items = Array.from({ length: count }, (_, i) => `Item ${i + 1}`);
    }
    
    // Extract style
    const style = extractStyle(message, userStyleGuide);
    params.style = style;
    
    return params;
  },
  
  generate(params, position) {
    const operations = [];
    const navWidth = 1200;
    const navX = position.x;
    const navY = position.y;
    
    // Background
    operations.push({
      type: 'create',
      shape: {
        type: 'rectangle',
        x: navX,
        y: navY,
        width: navWidth,
        height: params.height,
        fill: params.backgroundColor,
        cornerRadius: params.cornerRadius
      }
    });
    
    // Bottom border
    operations.push({
      type: 'create',
      shape: {
        type: 'rectangle',
        x: navX,
        y: navY + params.height - 1,
        width: navWidth,
        height: 1,
        fill: '#E5E5E5',
        opacity: 0.5
      }
    });
    
    // Logo/Brand
    operations.push({
      type: 'create',
      shape: {
        type: 'text',
        x: navX + 40,
        y: navY + 28,
        text: 'Brand',
        fontSize: 24,
        fill: params.primaryColor
      }
    });
    
    // Navigation items
    const itemSpacing = Math.min(150, (navWidth - 400) / params.items.length);
    params.items.forEach((item, index) => {
      const itemX = navX + 300 + (index * itemSpacing);
      
      // Nav item text
      operations.push({
        type: 'create',
        shape: {
          type: 'text',
          x: itemX,
          y: navY + 30,
          text: item,
          fontSize: 16,
          fill: index === 0 ? params.primaryColor : '#666666'
        }
      });
      
      // Active indicator for first item
      if (index === 0) {
        operations.push({
          type: 'create',
          shape: {
            type: 'rectangle',
            x: itemX,
            y: navY + params.height - 4,
            width: item.length * 9,
            height: 3,
            fill: params.primaryColor
          }
        });
      }
    });
    
    return {
      plan: [{
        step: 1,
        tool: 'batch_operations',
        args: {
          tool: 'batch_operations',
          operations
        },
        description: `Create ${params.style} navigation bar with ${params.items.length} items`
      }],
      reasoning: `I've created a ${params.style} navigation bar with ${params.items.length} items!`
    };
  }
};

