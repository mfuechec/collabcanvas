// ========================================
// CARD LAYOUT TEMPLATE
// ========================================

import { createCard, createButton } from './helpers.js';
import { extractColor, extractStyle } from './extractors.js';

export const CARD_TEMPLATE = {
  name: 'card_layout',
  
  patterns: [
    /\b(create|make|build|design|generate|add)\s+(a|an)?\s*card(\s+(layout|component|element))?\b/i,
  ],
  
  defaults: {
    primaryColor: '#0D99FF',
    cardWidth: 360,
    cardHeight: 480,
    hasImage: true,
    hasTitle: true,
    hasDescription: true,
    hasButton: true,
    cornerRadius: 12,
    style: 'modern'
  },
  
  extract(message, userStyleGuide = null) {
    const params = { ...this.defaults };
    
    // Extract color
    const color = extractColor(message, userStyleGuide);
    if (color) params.primaryColor = color;
    
    // Check for components
    const lower = message.toLowerCase();
    params.hasImage = lower.includes('image') || lower.includes('picture') || lower.includes('photo');
    params.hasTitle = lower.includes('title') || lower.includes('heading');
    params.hasDescription = lower.includes('description') || lower.includes('text') || lower.includes('body');
    params.hasButton = lower.includes('button') || lower.includes('cta') || lower.includes('action');
    
    // If nothing specified, include all
    if (!lower.match(/\b(image|title|description|button|photo|picture|heading|text|body|cta|action)\b/)) {
      params.hasImage = params.hasTitle = params.hasDescription = params.hasButton = true;
    }
    
    // Extract style
    const style = extractStyle(message, userStyleGuide);
    params.style = style;
    
    return params;
  },
  
  generate(params, position) {
    const operations = [];
    const cardX = position.x;
    let cardY = position.y;
    
    // Calculate actual card height based on components
    let actualHeight = 40; // Padding
    if (params.hasImage) actualHeight += 200;
    if (params.hasTitle) actualHeight += 60;
    if (params.hasDescription) actualHeight += 80;
    if (params.hasButton) actualHeight += 80;
    
    // Card with shadows and border
    const cardOps = createCard({
      x: cardX,
      y: cardY,
      width: params.cardWidth,
      height: actualHeight,
      cornerRadius: params.cornerRadius,
      shadowLayers: 3
    });
    operations.push(...cardOps.map(shape => ({ type: 'create', shape })));
    
    let contentY = cardY + 20;
    
    // Image placeholder
    if (params.hasImage) {
      operations.push({
        type: 'create',
        shape: {
          type: 'rectangle',
          x: cardX + 20,
          y: contentY,
          width: params.cardWidth - 40,
          height: 180,
          fill: '#F0F0F0',
          cornerRadius: 8
        }
      });
      
      operations.push({
        type: 'create',
        shape: {
          type: 'text',
          x: cardX + (params.cardWidth / 2) - 25,
          y: contentY + 80,
          text: 'Image',
          fontSize: 16,
          fill: '#CCCCCC'
        }
      });
      
      contentY += 200;
    }
    
    // Title
    if (params.hasTitle) {
      operations.push({
        type: 'create',
        shape: {
          type: 'text',
          x: cardX + 20,
          y: contentY,
          text: 'Card Title',
          fontSize: 24,
          fill: '#1A1A1A'
        }
      });
      
      contentY += 50;
    }
    
    // Description
    if (params.hasDescription) {
      operations.push({
        type: 'create',
        shape: {
          type: 'text',
          x: cardX + 20,
          y: contentY,
          text: 'This is a description text that explains',
          fontSize: 16,
          fill: '#666666'
        }
      });
      
      operations.push({
        type: 'create',
        shape: {
          type: 'text',
          x: cardX + 20,
          y: contentY + 22,
          text: 'what the card is about.',
          fontSize: 16,
          fill: '#666666'
        }
      });
      
      contentY += 70;
    }
    
    // Button
    if (params.hasButton) {
      const { operations: buttonOps } = createButton({
        x: cardX + 20,
        y: contentY,
        width: params.cardWidth - 40,
        text: 'Learn More',
        color: params.primaryColor,
        style: params.style,
        withShadow: false
      });
      operations.push(...buttonOps);
    }
    
    const components = [
      params.hasImage && 'image',
      params.hasTitle && 'title',
      params.hasDescription && 'description',
      params.hasButton && 'button'
    ].filter(Boolean);
    
    return {
      plan: [{
        step: 1,
        tool: 'batch_operations',
        args: {
          tool: 'batch_operations',
          operations
        },
        description: `Create ${params.style} card with ${components.join(', ')}`
      }],
      reasoning: `I've created a ${params.style} card with ${components.join(', ')}!`
    };
  }
};

