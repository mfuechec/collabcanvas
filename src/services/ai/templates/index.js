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
 * Check if message has customization keywords (should use GPT for parsing)
 */
function hasCustomization(userMessage) {
  const customizationKeywords = [
    // Custom text
    /\b(titled?|called?|named?|heading|header|title|subtitle|tagline)\b/i,
    /\b(button|logo|brand|branding)\s*:/i,
    /\bwith\s+(a\s+)?(title|subtitle|button|logo|brand)/i,
    
    // Custom counts/items
    /\b\d+\s+(items?|buttons?|links?|fields?)\b/i,
    /\bwith\s+(a\s+)?\d+/i,
    
    // Multiple features mentioned
    /\bwith\s+(email|password|username|phone|image|description)/i,
    /\band\s+(google|facebook|twitter|github)/i
  ];
  
  return customizationKeywords.some(pattern => pattern.test(userMessage));
}

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
        // If customization detected, fall back to GPT (GPT will call template tool with params)
        if (hasCustomization(userMessage)) {
          console.log(`🎨 [TEMPLATE] Customization detected in "${userMessage.substring(0, 50)}...", routing to GPT`);
          return null;
        }
        
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
 * @param {Object} explicitParams - Explicit params from AI tool (override extracted params)
 * @returns {Object} - Execution plan with operations
 */
export function executeTemplate(templateName, userMessage, canvasShapes = [], userStyleGuide = null, viewport = null, explicitParams = {}) {
  const template = TEMPLATES.find(t => t.name === templateName);
  
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  console.log(`⚡ [TEMPLATE] Executing: ${templateName}`);
  
  try {
    // Step 1: Extract parameters from user message
    let params = template.extract(userMessage, userStyleGuide);
    
    // Step 1.5: Override with explicit params from AI tool (for custom text, etc.)
    if (explicitParams && Object.keys(explicitParams).length > 0) {
      params = {
        ...params,
        ...Object.fromEntries(
          Object.entries(explicitParams).filter(([_, v]) => v !== null && v !== undefined)
        )
      };
    }
    
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

