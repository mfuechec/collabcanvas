// ========================================
// TEMPLATE SYSTEM - MAIN ENTRY POINT
// ========================================
// Fast, parameterized UI templates with smart positioning

import { LOGIN_FORM_TEMPLATE } from './loginForm.js';
import { NAVBAR_TEMPLATE } from './navbar.js';
import { CARD_TEMPLATE } from './card.js';
import { calculateOptimalPosition, getDefaultViewport } from './positioning.js';
import { detectMultiTemplate } from './extractors.js';

// All available templates
const TEMPLATES = [
  LOGIN_FORM_TEMPLATE,
  NAVBAR_TEMPLATE,
  CARD_TEMPLATE
];

/**
 * Detect if message matches a template
 * 
 * @param {string} userMessage - User's natural language request
 * @returns {Object|null} - { name, template } or null if no match
 */
export function detectTemplate(userMessage) {
  // Check for multi-template requests first (should fall back to GPT)
  if (detectMultiTemplate(userMessage)) {
    console.log('🔄 [TEMPLATE] Multi-template request detected, falling back to GPT');
    return null;
  }
  
  // Check each template's patterns
  for (const template of TEMPLATES) {
    for (const pattern of template.patterns) {
      if (pattern.test(userMessage)) {
        return { name: template.name, template };
      }
    }
  }
  
  return null;
}

/**
 * Execute a template to generate shapes
 * 
 * @param {string} templateName - Name of template to execute
 * @param {string} userMessage - User's natural language request
 * @param {Array} canvasShapes - Current shapes on canvas
 * @param {Object} userStyleGuide - User's inferred style preferences
 * @param {Object} viewport - Current viewport info (optional)
 * @returns {Object} - Execution plan with operations
 */
export function executeTemplate(templateName, userMessage, canvasShapes = [], userStyleGuide = null, viewport = null) {
  const template = TEMPLATES.find(t => t.name === templateName);
  
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  console.log(`⚡ [TEMPLATE] Executing: ${templateName}`);
  
  try {
    // Step 1: Extract parameters from user message
    const params = template.extract(userMessage, userStyleGuide);
    console.log(`   ├─ Extracted params:`, {
      primaryColor: params.primaryColor,
      style: params.style,
      size: params.cardWidth || params.items?.length
    });
    
    // Step 2: Calculate optimal position
    const position = calculateOptimalPosition({
      width: params.cardWidth || params.width || 800,
      height: params.cardHeight || params.height || 600,
      canvasShapes,
      viewport: viewport || getDefaultViewport()
    });
    console.log(`   ├─ Position: (${position.x}, ${position.y})`);
    
    // Step 3: Generate template with params and position
    const plan = template.generate(params, position);
    console.log(`   └─ Generated: ${plan.plan[0].args.operations.length} shapes`);
    
    return plan;
  } catch (error) {
    console.error(`❌ [TEMPLATE] Error executing ${templateName}:`, error.message);
    throw error;
  }
}

/**
 * Get list of all available templates
 */
export function getAvailableTemplates() {
  return TEMPLATES.map(t => ({
    name: t.name,
    patterns: t.patterns.map(p => p.toString())
  }));
}

