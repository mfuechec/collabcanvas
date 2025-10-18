// ========================================
// USE CARD TEMPLATE TOOL
// ========================================
// AI-callable tool for instant card layout generation with custom parameters

import { executeTemplate } from '../../templates/index.js';

export const USE_CARD_TEMPLATE_TOOL = {
  name: 'use_card_template',
  description: 'Generate a professional card layout with customizable parameters (MUCH faster than batch_operations for cards)',
  
  generateJSON(params) {
    return {
      tool: 'use_card_template',
      primaryColor: params.primaryColor || null,
      style: params.style || null,
      hasImage: params.hasImage !== undefined ? params.hasImage : null,
      hasTitle: params.hasTitle !== undefined ? params.hasTitle : null,
      hasDescription: params.hasDescription !== undefined ? params.hasDescription : null,
      hasButton: params.hasButton !== undefined ? params.hasButton : null
    };
  },
  
  async execute(args, context) {
    const { canvasShapes, userStyleGuide } = context;
    
    // Build user message from parameters for extraction
    let userMessage = 'create a card';
    
    if (args.primaryColor) {
      const colorMap = {
        '#EF4444': 'red', '#3B82F6': 'blue', '#10B981': 'green',
        '#8B5CF6': 'purple', '#F59E0B': 'orange', '#EC4899': 'pink'
      };
      const colorName = colorMap[args.primaryColor] || args.primaryColor;
      userMessage += ` ${colorName}`;
    }
    
    if (args.style) {
      userMessage += ` ${args.style}`;
    }
    
    // Add component mentions
    const components = [];
    if (args.hasImage) components.push('image');
    if (args.hasTitle) components.push('title');
    if (args.hasDescription) components.push('description');
    if (args.hasButton) components.push('button');
    
    if (components.length > 0) {
      userMessage += ` with ${components.join(', ')}`;
    }
    
    // Execute template with enriched message
    const plan = executeTemplate('card_layout', userMessage, canvasShapes, userStyleGuide, null);
    
    // Convert plan to batch_operations format for execution
    return {
      action: 'batch_operations',
      data: {
        operations: plan.plan[0].args.operations
      },
      response: plan.reasoning // Human-readable message from template
    };
  }
};

