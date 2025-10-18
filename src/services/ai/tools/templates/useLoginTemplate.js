// ========================================
// USE LOGIN TEMPLATE TOOL
// ========================================
// AI-callable tool for instant login form generation with custom parameters

import { executeTemplate } from '../../templates/index.js';

export const USE_LOGIN_TEMPLATE_TOOL = {
  name: 'use_login_template',
  description: 'Generate a professional login form with customizable parameters (MUCH faster than batch_operations for login forms)',
  
  generateJSON(params) {
    return {
      tool: 'use_login_template',
      primaryColor: params.primaryColor || null,
      size: params.size || null,
      style: params.style || null,
      fields: params.fields || null,
      socialProviders: params.socialProviders || null,
      titleText: params.titleText || null,
      subtitleText: params.subtitleText || null
    };
  },
  
  async execute(args, context) {
    const { canvasShapes, userStyleGuide } = context;
    
    // Build user message from parameters for extraction
    let userMessage = 'create a login form';
    
    if (args.primaryColor) {
      // Convert hex to color name if possible
      const colorMap = {
        '#EF4444': 'red', '#3B82F6': 'blue', '#10B981': 'green',
        '#8B5CF6': 'purple', '#F59E0B': 'orange', '#EC4899': 'pink'
      };
      const colorName = colorMap[args.primaryColor] || args.primaryColor;
      userMessage += ` ${colorName}`;
    }
    
    if (args.size) {
      userMessage += ` ${args.size}`;
    }
    
    if (args.style) {
      userMessage += ` ${args.style}`;
    }
    
    if (args.fields && args.fields.length > 0) {
      userMessage += ` with ${args.fields.join(', ')} fields`;
    }
    
    if (args.socialProviders && args.socialProviders.length > 0) {
      userMessage += ` and ${args.socialProviders.join(', ')} sign-in`;
    }
    
    // Execute template with enriched message
    const plan = executeTemplate('login_form', userMessage, canvasShapes, userStyleGuide, null);
    
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

