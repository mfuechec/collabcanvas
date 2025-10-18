// ========================================
// USE NAVBAR TEMPLATE TOOL
// ========================================
// AI-callable tool for instant navigation bar generation with custom parameters

import { executeTemplate } from '../../templates/index.js';

export const USE_NAVBAR_TEMPLATE_TOOL = {
  name: 'use_navbar_template',
  description: 'Generate a professional navigation bar with customizable parameters (MUCH faster than batch_operations for navbars)',
  
  generateJSON(params) {
    return {
      tool: 'use_navbar_template',
      primaryColor: params.primaryColor || null,
      backgroundColor: params.backgroundColor || null,
      items: params.items || null,
      itemCount: params.itemCount || null,
      height: params.height || null,
      style: params.style || null
    };
  },
  
  async execute(args, context) {
    const { canvasShapes, userStyleGuide } = context;
    
    // Build user message from parameters for extraction
    let userMessage = 'create a navbar';
    
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
    
    if (args.itemCount) {
      userMessage += ` with ${args.itemCount} items`;
    } else if (args.items && args.items.length > 0) {
      userMessage += ` with ${args.items.length} items`;
    }
    
    // Execute template with enriched message
    const plan = executeTemplate('navigation_bar', userMessage, canvasShapes, userStyleGuide, null);
    
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

