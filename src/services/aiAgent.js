import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';

// Get API key from environment
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ VITE_OPENAI_API_KEY is not set in .env file');
  throw new Error('OpenAI API key is required. Please add VITE_OPENAI_API_KEY to your .env file.');
}

// Initialize OpenAI models
const gpt4o = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.2,
  apiKey: OPENAI_API_KEY,
  configuration: {
    apiKey: OPENAI_API_KEY,
  },
});

const gpt4oMini = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.2,
  apiKey: OPENAI_API_KEY,
  configuration: {
    apiKey: OPENAI_API_KEY,
  },
});

// ========================================
// MODEL ROUTING
// ========================================

/**
 * Classify request complexity to route to appropriate model
 * Uses fast heuristics first, falls back to GPT-4o-mini for ambiguous cases
 */
/**
 * Check if a single command matches any direct execution pattern
 * @param {string} command - Single command to check
 * @returns {string|null} - Direct execution type or null if not heuristic
 */
function checkSingleCommandHeuristic(command) {
  const lowerCmd = command.trim().toLowerCase();
  
  // Trivial commands (clear, reset)
  const trivialCommands = {
    'clear': 'direct_clear',
    'clear canvas': 'direct_clear',
    'clear all shapes': 'direct_clear',
    'reset': 'direct_clear',
    'reset canvas': 'direct_clear'
  };
  if (trivialCommands[lowerCmd]) return trivialCommands[lowerCmd];
  
  // Move all
  if (/^(move|shift)\s+(everything|all|all shapes)\s+(up|down|left|right)(\s+by\s+(\d+))?$/i.test(lowerCmd)) {
    return 'direct_move_all';
  }
  
  // Rotate all
  if (/^(rotate|turn|spin)\s+(everything|all|all shapes)(\s+by)?\s+(\d+)\s*(degrees?|°)?$/i.test(lowerCmd)) {
    return 'direct_rotate_all';
  }
  
  // Scale all
  if (/^((make|scale)\s+(everything|all|all shapes)\s+(bigger|smaller|larger|double|twice(\s+as\s+(big|large))?(\s+the\s+size)?|triple|half|halve|(\d+(\.\d+)?)\s*(times|x))|(double|triple|halve)\s+(everything|all|all shapes))$/i.test(lowerCmd)) {
    return 'direct_scale_all';
  }
  
  // Create single shape
  if (/^(create|draw|make|add)\s+(a|an)?\s*((red|green|blue|yellow|orange|purple|pink|black|white)\s+)?(circle|rectangle|square|text|line)$/i.test(lowerCmd)) {
    return 'direct_create_shape';
  }
  
  return null; // Not a heuristic command
}

async function classifyRequestComplexity(userMessage, canvasShapes = []) {
  const startTime = performance.now();
  const lowerMsg = userMessage.toLowerCase();
  
  // ========================================
  // COMPOUND COMMAND DETECTION
  // ========================================
  // Split on "and", "then", or commas
  const commandSeparators = /\s+(and|then)\s+|,\s+/i;
  const subCommands = userMessage.split(commandSeparators).filter(cmd => {
    // Filter out separators themselves
    return cmd && !['and', 'then'].includes(cmd.trim().toLowerCase());
  });
  
  // Check if multiple commands were detected
  if (subCommands.length > 1) {
    console.log(`   └─ Detected ${subCommands.length} sub-commands, checking if all are heuristic...`);
    
    const heuristicTypes = [];
    for (const subCmd of subCommands) {
      const heuristicType = checkSingleCommandHeuristic(subCmd.trim());
      if (!heuristicType) {
        // At least one command is NOT heuristic, fall back to LLM
        console.log(`   └─ Sub-command "${subCmd.trim()}" is not heuristic, using LLM (${(performance.now() - startTime).toFixed(1)}ms)`);
        return 'complex'; // Let AI handle it
      }
      heuristicTypes.push({ command: subCmd.trim(), type: heuristicType });
    }
    
    // All commands are heuristic!
    console.log(`   └─ All ${subCommands.length} commands are heuristic! Direct compound execution (${(performance.now() - startTime).toFixed(1)}ms)`);
    return { compound: true, commands: heuristicTypes };
  }
  
  // ========================================
  // SINGLE COMMAND HEURISTICS
  // ========================================
  const singleHeuristic = checkSingleCommandHeuristic(userMessage);
  if (singleHeuristic) {
    console.log(`   └─ Fast heuristic: ${singleHeuristic} (${(performance.now() - startTime).toFixed(1)}ms)`);
    return singleHeuristic;
  }
  
  // Simple commands that still need planning
  const simpleCommands = ['undo', 'redo'];
  if (simpleCommands.some(cmd => lowerMsg === cmd || lowerMsg === `${cmd} canvas`)) {
    console.log(`   └─ Fast heuristic: simple command (${(performance.now() - startTime).toFixed(1)}ms)`);
    return 'simple';
  }
  
  // Obviously simple: Informational queries
  const questionWords = ['what', 'how many', 'which', 'where', 'tell me', 'show me'];
  if (questionWords.some(q => lowerMsg.startsWith(q))) {
    console.log(`   └─ Fast heuristic: question (${(performance.now() - startTime).toFixed(1)}ms)`);
    return 'simple';
  }
  
  // Obviously simple: Single shape operations (no numbers like "3 circles")
  const singleShapePatterns = [
    /^(create|add|make|draw)\s+(a|an|the)?\s*\w+\s+(circle|rectangle|square|text|line)/,
    /^(move|delete|remove)\s+(the|this|that)?\s*\w+/,
    /^(change|make|set)\s+(it|the|this)?\s*(to|into)?\s*\w+/,
    /^(double|triple|halve)\s+(the\s+)?(size|radius|width|height)/
  ];
  if (singleShapePatterns.some(pattern => pattern.test(lowerMsg))) {
    const hasNumber = /\d+/.test(lowerMsg);
    const hasMultiple = /(and|then|after|multiple|all|every)/i.test(lowerMsg);
    if (!hasNumber && !hasMultiple) {
      console.log(`   └─ Fast heuristic: single shape operation (${(performance.now() - startTime).toFixed(1)}ms)`);
      return 'simple';
    }
  }
  
  // Extended simple patterns (catch more before LLM fallback)
  const extendedSimplePatterns = [
    // Color changes
    /^(make|change|set|turn)\s+(it|the|this|that)?\s+(red|green|blue|yellow|orange|purple|pink|black|white)/i,
    // Size operations
    /^(make|set)\s+(it|the|this|that)?\s+(bigger|smaller|larger|tiny|huge)/i,
    // Property updates
    /^(change|update|set)\s+the\s+(color|size|position|rotation|opacity)/i,
    // Positioning
    /^(move|put)\s+(it|the|this|that)?\s+to\s+(the\s+)?(center|top|bottom|left|right)/i,
  ];
  if (extendedSimplePatterns.some(pattern => pattern.test(lowerMsg))) {
    console.log(`   └─ Fast heuristic: simple property update (${(performance.now() - startTime).toFixed(1)}ms)`);
    return 'simple';
  }
  
  // Creative: Composite objects, UI layouts (use GPT-4o for better spatial reasoning)
  const creativePatterns = [
    // Composite objects (multiple shapes aligned)
    /(face|smiley|emoji|person|stick\s+figure)/i,
    /(tree|flower|plant|sun|moon|star)/i,
    /(house|building|car|vehicle|boat|ship)/i,
    
    // UI/Form elements (structured layouts)
    /(form|login|signup|register|modal|dialog)/i,
    /(button|input|card|panel|navbar|sidebar)/i,
    /(dashboard|layout|interface|ui)/i,
    
    // Creative requests
    /(draw|design|build|create)\s+(a|an)?\s*\w+\s+(with|using|that\s+has)/i,
    /(make|create)\s+(something|anything)\s+(cool|nice|pretty|beautiful|interesting)/i,
  ];
  if (creativePatterns.some(pattern => pattern.test(lowerMsg))) {
    console.log(`   └─ Fast heuristic: creative task → GPT-4o (${(performance.now() - startTime).toFixed(1)}ms)`);
    return 'creative';
  }
  
  // Obviously complex: Multiple shapes, patterns, or large batches
  const complexPatterns = [
    /\d+\s+(circles|rectangles|squares|shapes|lines|text)/,  // "5 circles", "10 rectangles"
    /(grid|row|column|pattern|arrange|align|distribute)/,    // Patterns and layouts
    /(all\s+\w+\s+(circles|rectangles|shapes))/,             // "all red circles"
    /(\d+x\d+)/,                                              // "3x3" grids
    
    // Large numbers (50+ shapes, definitely complex)
    /([5-9]\d|\d{3,})\s+(shapes?|circles?|rectangles?|lines?)/,  // "50 shapes", "100 circles"
    
    // Spatial calculations
    /(evenly|equally)\s+(spaced|distributed)/,                // "evenly spaced"
    /(between|from)\s+\d+\s+(to|and)\s+\d+/,                  // "between 100 and 500"
  ];
  if (complexPatterns.some(pattern => pattern.test(lowerMsg))) {
    console.log(`   └─ Fast heuristic: complex operation → GPT-4o (${(performance.now() - startTime).toFixed(1)}ms)`);
    return 'complex';
  }
  
  // ========================================
  // LLM CLASSIFICATION FOR AMBIGUOUS CASES
  // ========================================
  
  console.log(`   └─ Ambiguous request, using LLM classification...`);
  const llmStart = performance.now();
  
  const classificationPrompt = `Classify as "simple", "creative", or "complex":
"${userMessage}"

**Simple**: Single shape operation, question, basic property update
**Creative**: Composite objects (face, tree, house, person), UI layouts (form, button, dashboard), requires imagination and spatial reasoning
**Complex**: Large batches (10+ shapes), patterns (grids, rows), calculations, filtering, spatial distributions

Answer with ONE WORD ONLY.`;

  const response = await gpt4oMini.invoke([{ role: 'user', content: classificationPrompt }]);
  const classification = response.content.trim().toLowerCase();
  
  console.log(`   └─ LLM classification: ${classification} (${(performance.now() - llmStart).toFixed(0)}ms)`);
  
  // Map to appropriate tier
  if (classification === 'creative' || classification === 'complex') {
    return classification;
  } else {
    return 'simple';
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Format canvas state for AI context (FULL CONTEXT)
 * Extracts and formats shape information for LLM consumption
 */
function formatCanvasState(canvasShapes, maxShapes = 10, includeHeader = true) {
  if (canvasShapes.length === 0) {
    return includeHeader ? '\n\n**Current Canvas Objects:** (empty canvas)\n' : '(empty canvas)';
  }
  
  let formattedState = includeHeader ? '\n\n**Current Canvas Objects:**\n' : '';
  
  canvasShapes.slice(0, maxShapes).forEach((shape, index) => {
    let details = `${shape.type} (ID: ${shape.id}, fill: ${shape.fill || 'none'}`;
    
    // Report size appropriately based on shape type
    if (shape.type === 'circle' && shape.width && shape.height) {
      // For circles, report RADIUS (not diameter/width/height)
      const radius = Math.min(shape.width, shape.height) / 2;
      details += `, radius: ${radius}`;
    } else if (shape.width && shape.height) {
      // For rectangles/text, report width x height
      details += `, size: ${shape.width}x${shape.height}`;
    }
    
    if (shape.text) {
      details += `, text: "${shape.text}"`;
    }
    if (shape.fontSize) {
      details += `, fontSize: ${shape.fontSize}`;
    }
    
    formattedState += includeHeader 
      ? `${index + 1}. ${details})\n`
      : `- ${details})\n`;
  });
  
  if (canvasShapes.length > maxShapes) {
    formattedState += `... and ${canvasShapes.length - maxShapes} more\n`;
  }
  
  return formattedState;
}

/**
 * Build smart context based on query type (OPTIMIZED FOR TOKEN EFFICIENCY)
 * Analyzes the user query and returns only the necessary canvas information
 * 
 * Token Savings Examples:
 * - "Create 50 shapes" → ~5 tokens instead of ~2000 tokens
 * - "Delete blue circles" → ~50 tokens (only matching shapes)
 * - "Move rectangle left" → ~30 tokens (only position data)
 * 
 * @param {string} userQuery - The user's natural language query
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @param {boolean} includeHeader - Include "Current Canvas Objects:" header
 * @returns {string} Optimized context string
 */
function buildSmartContext(userQuery, canvasShapes, includeHeader = true) {
  const lowerQuery = userQuery.toLowerCase();
  const shapeCount = canvasShapes.length;
  
  // ========================================
  // CATEGORY 1: CREATE OPERATIONS (Minimal Context)
  // ========================================
  // Pattern: "create", "add", "draw", "make" + numbers/shapes
  // Only need: shape count
  const isCreateOperation = /^(create|add|draw|make|generate|build)\s+(a\s+|an\s+|the\s+)?\d*\s*(random\s+)?(shape|circle|rectangle|square|line|text|grid|row)/i.test(lowerQuery);
  
  if (isCreateOperation) {
    console.log('🎯 [SMART-CONTEXT] CREATE operation detected → Minimal context (shape count only)');
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    return `${header}${shapeCount} existing shape${shapeCount !== 1 ? 's' : ''}\n`;
  }
  
  // ========================================
  // CATEGORY 2: CLEAR OPERATIONS (No Context)
  // ========================================
  const isClearOperation = /^(clear|reset|delete\s+all|remove\s+all|start\s+fresh)/i.test(lowerQuery);
  
  if (isClearOperation) {
    console.log('🎯 [SMART-CONTEXT] CLEAR operation detected → No context needed');
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    return `${header}${shapeCount} shape${shapeCount !== 1 ? 's' : ''} will be cleared\n`;
  }
  
  // ========================================
  // CATEGORY 3: DELETE/FILTER OPERATIONS (Filtered Context)
  // ========================================
  // Pattern: "delete", "remove" + descriptors
  // Need: IDs + relevant properties of matching shapes only
  const isDeleteOperation = /^(delete|remove|erase)\s+/i.test(lowerQuery);
  
  if (isDeleteOperation) {
    console.log('🎯 [SMART-CONTEXT] DELETE operation detected → Filtered context (matching shapes only)');
    
    // Extract filter criteria
    const colorMatch = lowerQuery.match(/(red|blue|green|yellow|orange|purple|pink|black|white)/i);
    const typeMatch = lowerQuery.match(/(circle|rectangle|square|text|line)/i);
    
    const filtered = canvasShapes.filter(shape => {
      if (colorMatch) {
        const colorMap = {
          red: '#ff0000', blue: '#0000ff', green: '#00ff00', 
          yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
          pink: '#ffc0cb', black: '#000000', white: '#ffffff'
        };
        const targetColor = colorMap[colorMatch[1].toLowerCase()];
        if (!shape.fill?.toLowerCase().includes(targetColor?.toLowerCase().slice(1))) return false;
      }
      if (typeMatch && shape.type !== typeMatch[1].toLowerCase()) return false;
      return true;
    });
    
    if (filtered.length === 0) {
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      return `${header}No matching shapes found (total: ${shapeCount})\n`;
    }
    
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    let context = `${header}Matching shapes (${filtered.length} of ${shapeCount}):\n`;
    
    filtered.forEach((shape, idx) => {
      context += `${idx + 1}. ${shape.type} (ID: ${shape.id}, fill: ${shape.fill || 'none'})\n`;
    });
    
    return context;
  }
  
  // ========================================
  // CATEGORY 4: MOVE/POSITION OPERATIONS (Position Context)
  // ========================================
  // Pattern: "move", "reposition", "shift"
  // Need: IDs + positions only
  const isMoveOperation = /^(move|reposition|shift|drag|place)\s+/i.test(lowerQuery);
  
  if (isMoveOperation) {
    console.log('🎯 [SMART-CONTEXT] MOVE operation detected → Position context only');
    
    // If query mentions "all", include all shapes
    const moveAll = /^(move|shift)\s+(all|every|everything)/i.test(lowerQuery);
    
    if (moveAll) {
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      let context = `${header}All shapes (${shapeCount}):\n`;
      
      canvasShapes.slice(0, 20).forEach((shape, idx) => {
        context += `${idx + 1}. ${shape.type} (ID: ${shape.id}) at (${Math.round(shape.x)}, ${Math.round(shape.y)})\n`;
      });
      
      if (shapeCount > 20) {
        context += `... and ${shapeCount - 20} more\n`;
      }
      
      return context;
    }
    
    // Otherwise, look for specific shape reference
    const typeMatch = lowerQuery.match(/(circle|rectangle|square|text|line)/i);
    const colorMatch = lowerQuery.match(/(red|blue|green|yellow|orange|purple|pink|black|white)/i);
    
    const filtered = canvasShapes.filter(shape => {
      if (typeMatch && shape.type !== typeMatch[1].toLowerCase()) return false;
      if (colorMatch) {
        const colorMap = {
          red: '#ff0000', blue: '#0000ff', green: '#00ff00', 
          yellow: '#ffff00', orange: '#ffa500', purple: '#800080'
        };
        const targetColor = colorMap[colorMatch[1].toLowerCase()];
        if (!shape.fill?.toLowerCase().includes(targetColor?.toLowerCase().slice(1))) return false;
      }
      return true;
    });
    
    const shapesToShow = filtered.length > 0 ? filtered : canvasShapes.slice(0, 5);
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    let context = `${header}${filtered.length > 0 ? 'Matching' : 'Recent'} shapes:\n`;
    
    shapesToShow.slice(0, 5).forEach((shape, idx) => {
      context += `${idx + 1}. ${shape.type} (ID: ${shape.id}) at (${Math.round(shape.x)}, ${Math.round(shape.y)})\n`;
    });
    
    return context;
  }
  
  // ========================================
  // CATEGORY 5: UPDATE/MODIFY OPERATIONS (Property Context)
  // ========================================
  // Pattern: "change", "update", "make bigger/smaller", "resize"
  // Need: IDs + relevant properties only
  const isUpdateOperation = /^(change|update|modify|make|set|resize|rotate|scale|enlarge|shrink)\s+/i.test(lowerQuery);
  
  if (isUpdateOperation) {
    console.log('🎯 [SMART-CONTEXT] UPDATE operation detected → Property context');
    
    // Determine what property is being updated
    const isColorChange = /color|fill|to\s+(red|blue|green|yellow)/i.test(lowerQuery);
    const isSizeChange = /(bigger|smaller|larger|resize|size|width|height|radius)/i.test(lowerQuery);
    const isRotation = /rotate|turn|spin/i.test(lowerQuery);
    
    const updateAll = /(all|every|everything)/i.test(lowerQuery);
    
    if (updateAll) {
      // ✅ OPTIMIZATION: For pure batch transformations (rotate all, scale all, etc.),
      // only send IDs in a compact format - no need for current property values
      const isPureBatchTransform = (isRotation || /scale|enlarge|shrink/i.test(lowerQuery)) && 
                                   !/(by\s+\d+\s*%|based\s+on|depending)/i.test(lowerQuery);
      
      if (isPureBatchTransform && shapeCount > 3) {
        console.log('   └─ Pure batch transform: ultra-minimal context (IDs only)');
        const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
        const ids = canvasShapes.map(s => s.id).join(', ');
        return `${header}${shapeCount} shapes: [${ids}]\n`;
      }
      
      // Standard update-all context (needs current property values)
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      let context = `${header}All shapes (${shapeCount}):\n`;
      
      canvasShapes.slice(0, 15).forEach((shape, idx) => {
        let details = `${idx + 1}. ${shape.type} (ID: ${shape.id}`;
        
        if (isColorChange) details += `, fill: ${shape.fill || 'none'}`;
        if (isSizeChange) {
          if (shape.type === 'circle' && shape.width && shape.height) {
            const radius = Math.min(shape.width, shape.height) / 2;
            details += `, radius: ${radius}`;
          } else if (shape.width && shape.height) {
            details += `, size: ${shape.width}x${shape.height}`;
          }
        }
        if (isRotation && shape.rotation !== undefined) {
          details += `, rotation: ${shape.rotation}°`;
        }
        
        details += ')';
        context += `${details}\n`;
      });
      
      if (shapeCount > 15) {
        context += `... and ${shapeCount - 15} more\n`;
      }
      
      return context;
    }
    
    // Filter for specific shapes
    const typeMatch = lowerQuery.match(/(circle|rectangle|square|text|line)/i);
    const colorMatch = lowerQuery.match(/the\s+(red|blue|green|yellow|orange|purple)/i);
    
    const filtered = canvasShapes.filter(shape => {
      if (typeMatch && shape.type !== typeMatch[1].toLowerCase()) return false;
      if (colorMatch) {
        const colorMap = {
          red: '#ff0000', blue: '#0000ff', green: '#00ff00', 
          yellow: '#ffff00', orange: '#ffa500', purple: '#800080'
        };
        const targetColor = colorMap[colorMatch[1].toLowerCase()];
        if (!shape.fill?.toLowerCase().includes(targetColor?.toLowerCase().slice(1))) return false;
      }
      return true;
    });
    
    const shapesToShow = filtered.length > 0 ? filtered : canvasShapes.slice(0, 5);
    const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
    let context = `${header}${filtered.length > 0 ? 'Matching' : 'Recent'} shapes:\n`;
    
    shapesToShow.slice(0, 10).forEach((shape, idx) => {
      let details = `${idx + 1}. ${shape.type} (ID: ${shape.id}`;
      
      if (isColorChange) details += `, fill: ${shape.fill || 'none'}`;
      if (isSizeChange) {
        if (shape.type === 'circle' && shape.width && shape.height) {
          const radius = Math.min(shape.width, shape.height) / 2;
          details += `, radius: ${radius}`;
        } else if (shape.width && shape.height) {
          details += `, size: ${shape.width}x${shape.height}`;
        }
      }
      if (isRotation && shape.rotation !== undefined) {
        details += `, rotation: ${shape.rotation}°`;
      }
      
      details += ')';
      context += `${details}\n`;
    });
    
    return context;
  }
  
  // ========================================
  // CATEGORY 6: INFORMATIONAL QUERIES (Targeted Context)
  // ========================================
  // Pattern: "what", "how many", "show me", "tell me"
  const isInformationalQuery = /^(what|how\s+many|which|where|tell\s+me|show\s+me|list|count)/i.test(lowerQuery);
  
  if (isInformationalQuery) {
    console.log('🎯 [SMART-CONTEXT] INFORMATIONAL query detected → Targeted context');
    
    // "How many" queries just need counts
    if (/^how\s+many/i.test(lowerQuery)) {
      const header = includeHeader ? '\n\n**Current Canvas State:** ' : '';
      
      const typeCounts = canvasShapes.reduce((acc, shape) => {
        acc[shape.type] = (acc[shape.type] || 0) + 1;
        return acc;
      }, {});
      
      let context = `${header}Total: ${shapeCount} shape${shapeCount !== 1 ? 's' : ''}\n`;
      Object.entries(typeCounts).forEach(([type, count]) => {
        context += `- ${count} ${type}${count !== 1 ? 's' : ''}\n`;
      });
      
      return context;
    }
    
    // Fall through to full context for other informational queries
  }
  
  // ========================================
  // DEFAULT: FULL CONTEXT (Complex/Ambiguous Queries)
  // ========================================
  console.log('🎯 [SMART-CONTEXT] Complex/ambiguous query → Full context');
  return formatCanvasState(canvasShapes, 10, includeHeader);
}

// ========================================
// CANVAS OPERATION TOOLS
// ========================================

// COORDINATE SYSTEM ARCHITECTURE:
// - AI receives: x, y as CENTER coordinates (more intuitive for users)
// - Storage requires: x, y as TOP-LEFT of bounding box for ALL shapes
//   * Rectangles: x, y = top-left corner
//   * Circles: x, y = top-left of bounding box (center = x + radius, y + radius)
//   * Text: x, y = top-left of bounding box
//   * Lines: absolute points array (no bounding box)
// - Conversion happens in these tools to maintain consistent AI interface
// - Shape.jsx handles rendering by calculating centers/positions from bounding boxes

const createRectangleTool = tool(
  async ({ x, y, width, height, fill }) => {
    // Convert center coordinates to top-left corner for storage
    // Rectangle storage: x, y = top-left of bounding box
    const topLeftX = x - (width / 2);
    const topLeftY = y - (height / 2);
    console.log(`📐 [CREATE_RECTANGLE] AI provided center: (${x}, ${y}), converting to top-left: (${topLeftX}, ${topLeftY}), size: ${width}x${height}`);
    return JSON.stringify({
      action: 'create_rectangle',
      data: { x: topLeftX, y: topLeftY, width, height, fill, type: 'rectangle' }
    });
  },
  {
    name: 'create_rectangle',
    description: 'Creates a rectangle on the canvas. Use this when the user asks to create or add a rectangle, box, or square.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      width: z.number().min(10).max(1000).describe('Width in pixels (10-1000)'),
      height: z.number().min(10).max(1000).describe('Height in pixels (10-1000)'),
      fill: z.string().describe('Fill color (hex code like #FF0000 for red, #0000FF for blue, #00FF00 for green)'),
    }),
  }
);

const createCircleTool = tool(
  async ({ x, y, radius, fill }) => {
    // Convert center coordinates to TOP-LEFT of bounding box
    // Circle storage: x, y = top-left, width/height = diameter
    // Shape.jsx calculates center as (x + width/2, y + height/2)
    const diameter = radius * 2;
    const topLeftX = x - radius;
    const topLeftY = y - radius;
    return JSON.stringify({
      action: 'create_circle',
      data: { x: topLeftX, y: topLeftY, width: diameter, height: diameter, fill, type: 'circle' }
    });
  },
  {
    name: 'create_circle',
    description: 'Creates a circle on the canvas. Use this when the user asks to create or add a circle or dot.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      radius: z.number().min(5).max(500).describe('Radius in pixels (5-500)'),
      fill: z.string().describe('Fill color (hex code like #FF0000 for red, #0000FF for blue)'),
    }),
  }
);

const createTextTool = tool(
  async ({ x, y, text, fontSize, fill }) => {
    // Convert center coordinates to top-left corner for storage
    // Text storage: x, y = top-left of bounding box
    // Note: Width estimation is approximate (0.6 * fontSize per character)
    const estimatedWidth = text.length * fontSize * 0.6;
    const height = fontSize + 8;
    
    const topLeftX = x - (estimatedWidth / 2);
    const topLeftY = y - (height / 2);
    
    return JSON.stringify({
      action: 'create_text',
      data: { x: topLeftX, y: topLeftY, text, fontSize, fill, type: 'text', width: estimatedWidth, height }
    });
  },
  {
    name: 'create_text',
    description: 'Creates a text label on the canvas. Use this when the user asks to add text, label, or write something.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      text: z.string().describe('The text content to display'),
      fontSize: z.number().min(8).max(500).default(48).describe('Font size in pixels (8-500, default 48)'),
      fill: z.string().default('#000000').describe('Text color (hex code, default black)'),
    }),
  }
);

const createLineTool = tool(
  async ({ x1, y1, x2, y2, stroke, strokeWidth }) => {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    return JSON.stringify({
      action: 'create_line',
      data: {
        x: minX,
        y: minY,
        width,
        height,
        points: [x1, y1, x2, y2],
        stroke,
        strokeWidth,
        fill: stroke,
        type: 'line'
      }
    });
  },
  {
    name: 'create_line',
    description: 'Creates a straight line on the canvas. Use this when the user asks to draw a line connecting two points.',
    schema: z.object({
      x1: z.number().min(0).max(CANVAS_WIDTH).describe('Start X position (0 to 5000)'),
      y1: z.number().min(0).max(CANVAS_HEIGHT).describe('Start Y position (0 to 5000)'),
      x2: z.number().min(0).max(CANVAS_WIDTH).describe('End X position (0 to 5000)'),
      y2: z.number().min(0).max(CANVAS_HEIGHT).describe('End Y position (0 to 5000)'),
      stroke: z.string().default('#000000').describe('Line color (hex code)'),
      strokeWidth: z.number().min(1).max(20).default(2).describe('Line thickness (1-20)'),
    }),
  }
);

const updateShapeTool = tool(
  async ({ shapeId, fill, fontSize, width, height, radius, text, opacity }) => {
    // Build data object with only defined properties
    const data = { shapeId };
    if (fill !== undefined) data.fill = fill;
    if (fontSize !== undefined) data.fontSize = fontSize;
    if (width !== undefined) data.width = width;
    if (height !== undefined) data.height = height;
    if (radius !== undefined) {
      data.radius = radius;
      data._isCircleRadiusUpdate = true;
    }
    if (text !== undefined) data.text = text;
    if (opacity !== undefined) data.opacity = opacity;
    
    return JSON.stringify({
      action: 'update_shape',
      data
    });
  },
  {
    name: 'update_shape',
    description: 'Updates properties of a specific shape. Use when the user asks to change color, size, font size, radius (for circles), opacity, or other properties of an existing shape. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      fill: z.string().optional().describe('New fill color (hex code like #FF0000)'),
      fontSize: z.number().min(12).max(72).optional().describe('New font size for text (12-72)'),
      width: z.number().min(10).max(1000).optional().describe('New width in pixels (rectangles only)'),
      height: z.number().min(10).max(1000).optional().describe('New height in pixels (rectangles only)'),
      radius: z.number().min(10).max(500).optional().describe('New radius for circles (10-500). Automatically converts to width/height.'),
      text: z.string().optional().describe('New text content (for text shapes)'),
      opacity: z.number().min(0).max(1).optional().describe('Opacity/transparency (0.0 = fully transparent, 1.0 = fully opaque, 0.5 = 50% transparent)'),
    }),
  }
);

const moveShapeTool = tool(
  async ({ shapeId, x, y }) => {
    return JSON.stringify({
      action: 'move_shape',
      data: { shapeId, x, y }
    });
  },
  {
    name: 'move_shape',
    description: 'Moves a shape to a new position. Use this when the user asks to move, reposition, or relocate a shape. You must provide the exact shape ID from the Canvas Objects list. You can provide just x, just y, or both to update position.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      x: z.number().min(0).max(CANVAS_WIDTH).optional().describe('New X position (0 to 5000). Omit to keep current X. Use 2500 for center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).optional().describe('New Y position (0 to 5000). Omit to keep current Y. Use 2500 for center.'),
    }),
  }
);

const resizeShapeTool = tool(
  async ({ shapeId, width, height }) => {
    return JSON.stringify({
      action: 'resize_shape',
      data: { shapeId, width, height }
    });
  },
  {
    name: 'resize_shape',
    description: 'Resizes a shape to new dimensions. Use when the user asks to make something bigger, smaller, or change its size. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      width: z.number().min(10).max(1000).optional().describe('New width in pixels'),
      height: z.number().min(10).max(1000).optional().describe('New height in pixels'),
    }),
  }
);

const rotateShapeTool = tool(
  async ({ shapeId, rotation }) => {
    return JSON.stringify({
      action: 'rotate_shape',
      data: { shapeId, rotation }
    });
  },
  {
    name: 'rotate_shape',
    description: 'Rotates a shape by a specified angle. Use when the user asks to rotate or turn a shape. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      rotation: z.number().min(0).max(360).describe('Rotation angle in degrees (0-360)'),
    }),
  }
);

const deleteShapeTool = tool(
  async ({ shapeId }) => {
    return JSON.stringify({
      action: 'delete_shape',
      data: { shapeId }
    });
  },
  {
    name: 'delete_shape',
    description: 'Deletes a single shape from the canvas. For deleting multiple shapes, use batch_operations instead. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
    }),
  }
);

// Batch operations for efficiency
const batchUpdateShapesTool = tool(
  async ({ shapeIds, updates, deltaX, deltaY, deltaRotation, scaleX, scaleY }) => {
    return JSON.stringify({
      action: 'batch_update_shapes',
      data: { shapeIds, updates, deltaX, deltaY, deltaRotation, scaleX, scaleY }
    });
  },
  {
    name: 'batch_update_shapes',
    description: 'Updates multiple shapes with the same properties OR applies relative transformations in one operation. Much faster than calling update_shape multiple times. Supports both absolute updates (fill, fontSize, opacity) and relative transforms (deltaX, deltaY, scaleX, scaleY, deltaRotation).',
    schema: z.object({
      shapeIds: z.array(z.string()).describe('Array of shape IDs from the Canvas Objects list'),
      // Absolute property updates
      updates: z.object({
        fill: z.string().optional(),
        fontSize: z.number().min(12).max(72).optional(),
        width: z.number().min(10).max(1000).optional(),
        height: z.number().min(10).max(1000).optional(),
        text: z.string().optional(),
        opacity: z.number().min(0).max(1).optional(),
      }).optional().describe('Absolute properties to update on all shapes (e.g., set all to same color or opacity)'),
      // Relative transformations
      deltaX: z.number().optional().describe('Move all shapes by this X amount (e.g., 100 = move 100px right, -50 = move 50px left)'),
      deltaY: z.number().optional().describe('Move all shapes by this Y amount (e.g., 100 = move 100px down, -50 = move 50px up)'),
      deltaRotation: z.number().optional().describe('Rotate all shapes by this many degrees (e.g., 45 = rotate 45° clockwise, -90 = rotate 90° counterclockwise)'),
      scaleX: z.number().min(0.1).max(10).optional().describe('Scale width by this multiplier (e.g., 2 = double width, 0.5 = half width)'),
      scaleY: z.number().min(0.1).max(10).optional().describe('Scale height by this multiplier (e.g., 2 = double height, 0.5 = half height)'),
    }),
  }
);

// REMOVED: batchMoveShapesTool, batchDeleteShapesTool, batchCreateShapesTool
// These are now covered by batchOperationsTool for complex multi-operation commands
// Single-purpose tools (create_rectangle, delete_shape, etc.) remain for LLM clarity

const createGridTool = tool(
  async ({ startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_grid',
      data: { startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill }
    });
  },
  {
    name: 'create_grid',
    description: 'Creates a grid of rectangles. Use when the user asks for a grid, matrix, or multiple shapes arranged in rows and columns.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Grid start X position'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(500).describe('Grid start Y position'),
      rows: z.number().min(1).max(20).describe('Number of rows (1-20)'),
      cols: z.number().min(1).max(20).describe('Number of columns (1-20)'),
      cellWidth: z.number().min(20).max(200).default(80).describe('Width of each cell'),
      cellHeight: z.number().min(20).max(200).default(80).describe('Height of each cell'),
      spacing: z.number().min(0).max(50).default(10).describe('Spacing between cells'),
      fill: z.string().default('#3B82F6').describe('Fill color for cells'),
    }),
  }
);

const createRowTool = tool(
  async ({ startX, startY, count, width, height, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_row',
      data: { startX, startY, count, width, height, spacing, fill }
    });
  },
  {
    name: 'create_row',
    description: 'Creates a horizontal row of RECTANGLES. Use ONLY when the user specifically asks for rectangles in a row.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Row start X position'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(2500).describe('Row Y position'),
      count: z.number().min(2).max(50).describe('Number of shapes in the row (2-50)'),
      width: z.number().min(20).max(200).default(80).describe('Width of each shape'),
      height: z.number().min(20).max(200).default(80).describe('Height of each shape'),
      spacing: z.number().min(0).max(100).default(20).describe('Spacing between shapes'),
      fill: z.string().default('#3B82F6').describe('Fill color'),
    }),
  }
);

const createCircleRowTool = tool(
  async ({ startX, startY, count, radius, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_circle_row',
      data: { startX, startY, count, radius, spacing, fill }
    });
  },
  {
    name: 'create_circle_row',
    description: 'Creates a horizontal row of CIRCLES. Use when the user asks for multiple circles in a row, line, or horizontal arrangement.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Row start X position (center of first circle)'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(2500).describe('Row Y position (center of circles)'),
      count: z.number().min(2).max(50).describe('Number of circles in the row (2-50)'),
      radius: z.number().min(10).max(100).default(40).describe('Radius of each circle'),
      spacing: z.number().min(0).max(200).default(20).describe('Spacing between circle centers'),
      fill: z.string().default('#3B82F6').describe('Fill color'),
    }),
  }
);

const clearCanvasTool = tool(
  async () => {
    return JSON.stringify({
      action: 'clear_canvas',
      data: {}
    });
  },
  {
    name: 'clear_canvas',
    description: 'Clears all shapes from the canvas. Use when the user asks to clear, delete all, remove everything, or start fresh.',
    schema: z.object({}),
  }
);

// UNIFIED BATCH OPERATIONS - Combines multiple operations in a single call
const batchOperationsTool = tool(
  async ({ operations }) => {
    return JSON.stringify({
      action: 'batch_operations',
      data: { operations }
    });
  },
  {
    name: 'batch_operations',
    description: 'Executes multiple mixed operations (create, update, delete) in a single efficient call. MUCH FASTER than separate tool calls. Use for complex requests like "delete all red shapes and create 5 blue circles". Shape types auto-detected: x1/y1/x2/y2 = line, radius = circle, text = text, otherwise rectangle.',
    schema: z.object({
      operations: z.array(z.object({
        type: z.enum(['create', 'update', 'delete']).describe('Operation type'),
        // CREATE operations
        shape: z.object({
          type: z.enum(['rectangle', 'circle', 'text', 'line']).optional().describe('Shape type (optional - auto-detected from properties)'),
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          radius: z.number().optional(),
          text: z.string().optional(),
          fontSize: z.number().optional(),
          fill: z.string().optional(),
          stroke: z.string().optional(),
          strokeWidth: z.number().optional(),
          opacity: z.number().min(0).max(1).optional(),
          x1: z.number().optional(),
          y1: z.number().optional(),
          x2: z.number().optional(),
          y2: z.number().optional(),
        }).optional().describe('Shape data for CREATE operations'),
        // UPDATE operations
        shapeId: z.string().optional().describe('Shape ID for UPDATE/DELETE operations'),
        updates: z.object({
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          fill: z.string().optional(),
          fontSize: z.number().optional(),
          text: z.string().optional(),
          rotation: z.number().optional(),
          opacity: z.number().min(0).max(1).optional(),
        }).optional().describe('Properties to update for UPDATE operations'),
      })).min(1).max(50).describe('Array of operations to execute (max 50)'),
    }),
  }
);

// All tools
const tools = [
  // SINGLE-PURPOSE TOOLS (for LLM clarity, error messages, validation)
  createRectangleTool,
  createCircleTool,
  createTextTool,
  createLineTool,
  updateShapeTool,
  moveShapeTool,
  resizeShapeTool,
  rotateShapeTool,
  deleteShapeTool,
  
  // BATCH TOOLS (for performance)
  batchUpdateShapesTool, // Has unique features: relative transforms (deltaX, deltaY, etc.)
  batchOperationsTool, // UNIFIED: Combines create/update/delete in single call
  
  // CONVENIENCE TOOLS (common patterns)
  createGridTool,
  createRowTool,
  createCircleRowTool,
  clearCanvasTool,
];


// ========================================
// PLAN-AND-EXECUTE PATTERN
// ========================================

/**
 * Generate an execution plan for a user command
 * This makes ONE LLM call to create a structured plan
 * @param {string} userMessage - The user's command
 * @param {Array} canvasShapes - Current canvas shapes
 * @param {string} complexity - Pre-classified complexity ('simple', 'complex', or 'direct_*')
 */
async function generateExecutionPlan(userMessage, canvasShapes, complexity) {
  const planningPrompt = `You are a planning assistant for a canvas design tool. Given a user request, create an execution plan using the available tools.

**Canvas Information:**
- Canvas size: 5000x5000 pixels
- Canvas center: (2500, 2500)
- Valid coordinate range: x[0-5000], y[0-5000]

**Available Tools with Parameters:**

1. **create_rectangle** - Create a rectangle
   Args: {{ x: number(0-5000), y: number(0-5000), width: number(20-500), height: number(20-500), fill: string (hex color) }}

2. **create_circle** - Create a circle
   Args: {{ x: number(0-5000), y: number(0-5000), radius: number(10-250), fill: string (hex color) }}

3. **create_text** - Create text
   Args: {{ x: number(0-5000), y: number(0-5000), text: string, fontSize: number(12-72), fill: string (hex color) }}

4. **create_line** - Create a straight line
   Args: {{ x1: number(0-5000), y1: number(0-5000), x2: number(0-5000), y2: number(0-5000), stroke: string (hex color), strokeWidth: number(1-10) }}

5. **create_grid** - Create a grid of rectangles
   Args: {{ startX: number(0-5000, default 500), startY: number(0-5000, default 500), rows: number(1-20), cols: number(1-20), cellWidth: number(20-200, default 80), cellHeight: number(20-200, default 80), spacing: number(0-50, default 10), fill: string (hex color, default #3B82F6) }}

6. **create_row** - Create a horizontal row of rectangles
   Args: {{ startX: number(0-5000, default 500), startY: number(0-5000, default 500), count: number(1-50), width: number(20-200, default 80), height: number(20-200, default 80), spacing: number(0-50, default 10), fill: string (hex color, default #3B82F6) }}

7. **create_circle_row** - Create a horizontal row of circles
   Args: {{ startX: number(0-5000, default 500), startY: number(0-5000, default 500), count: number(1-50), radius: number(10-100, default 40), spacing: number(0-50, default 10), fill: string (hex color, default #3B82F6) }}

8. **update_shape** - Update a single shape's properties
   Args: {{ shapeId: string (from canvas state), fill: string (optional), fontSize: number (optional), width: number (optional), height: number (optional), radius: number (optional, for circles), text: string (optional), opacity: number 0-1 (optional, 0=transparent, 1=opaque) }}

9. **move_shape** - Move a shape to new coordinates
    Args: {{ shapeId: string (from canvas state), x: number(0-5000, optional), y: number(0-5000, optional) }}

10. **resize_shape** - Resize a shape
    Args: {{ shapeId: string (from canvas state), width: number(10-1000, optional), height: number(10-1000, optional) }}

11. **rotate_shape** - Rotate a shape
    Args: {{ shapeId: string (from canvas state), rotation: number(0-360) }}

12. **delete_shape** - Delete a single shape
    Args: {{ shapeId: string (from canvas state) }}

13. **batch_update_shapes** - Update multiple shapes with same properties OR apply relative transforms
    Args: {{ shapeIds: array of strings, updates: object with fill/fontSize/opacity (optional), deltaX: number (optional), deltaY: number (optional), deltaRotation: number (optional), scaleX: number (optional), scaleY: number (optional) }}
    Examples: Move all 100px right: {{deltaX: 100}}, Double all sizes: {{scaleX: 2, scaleY: 2}}, Rotate all 45°: {{deltaRotation: 45}}, Make all 50% transparent: {{updates: {{opacity: 0.5}}}}

14. **batch_operations** - Execute mixed operations (create/update/delete) in a single call
    Args: {{ operations: [{{type: 'create', shape: {{x, y, width, height, fill, ...}}}}, {{type: 'update', shapeId: 'shape_...', updates: {{...}}}}, {{type: 'delete', shapeId: 'shape_...'}}] }}
    CRITICAL: 
    - ONLY valid types: 'create', 'update', 'delete' (NO 'rotate', 'move', 'resize', etc.!)
    - For rotating/moving ALL shapes → Use batch_update_shapes instead (MUCH FASTER!)
    - For CREATE operations, "shape" must contain DIRECT shape properties (x, y, width, fill), NOT tool references!
    Use for: Creating 3+ shapes, deleting 3+ shapes, mixed operations (create+delete, etc.), or updating SOME shapes (max 50)
    Examples: 
    - Create+Delete: [{{type:'create', shape:{{x:100, y:100, width:50, height:50, fill:'#FF0000'}}}}, {{type:'delete', shapeId:'shape_123'}}]
    - Update some: [{{type:'update', shapeId:'shape_1', updates:{{rotation:90}}}}, {{type:'update', shapeId:'shape_2', updates:{{rotation:45}}}}]

15. **clear_canvas** - Clear all shapes from canvas
    Args: {{}} (no arguments needed)

**Output Format** (JSON only, no other text):
{{
  "plan": [
    {{
      "step": 1,
      "tool": "tool_name",
      "args": {{ ...all required parameters with actual values... }},
      "description": "Brief description"
    }}
  ],
  "reasoning": "For actions: explain the plan. For questions: answer directly to user."
}}

**Example - Informational Query:**
User: "What is the radius of the blue circle?"
{{
  "plan": [],
  "reasoning": "The blue circle has a radius of 100 pixels."
}}

**Example - Action Request:**
User: "Double the size of the blue circle"
{{
  "plan": [
    {{
      "step": 1,
      "tool": "update_shape",
      "args": {{ "shapeId": "shape_123", "radius": 200 }},
      "description": "Update circle radius to 200"
    }}
  ],
  "reasoning": "Done! I've doubled the radius of the circle."
}}

**Example - Random Shapes (CRITICAL - Study This!):**
User: "Create 5 random shapes"
{{
  "plan": [
    {{
      "step": 1,
      "tool": "batch_operations",
      "args": {{
        "operations": [
          {{"type": "create", "shape": {{"type": "rectangle", "x": 450, "y": 1200, "width": 80, "height": 120, "fill": "#FF0000"}}}},
          {{"type": "create", "shape": {{"type": "circle", "x": 2100, "y": 800, "width": 100, "height": 100, "fill": "#00FF00"}}}},
          {{"type": "create", "shape": {{"type": "text", "x": 3500, "y": 2800, "text": "Hello", "fontSize": 32, "fill": "#0000FF"}}}},
          {{"type": "create", "shape": {{"type": "rectangle", "x": 1500, "y": 3900, "width": 150, "height": 60, "fill": "#FFFF00"}}}},
          {{"type": "create", "shape": {{"type": "circle", "x": 4200, "y": 500, "width": 140, "height": 140, "fill": "#FF00FF"}}}}
        ]
      }},
      "description": "Create 5 varied shapes at different positions"
    }}
  ],
  "reasoning": "I've created 5 random shapes with different colors, sizes, and positions across the canvas!"
}}

**Example - Rotate All Shapes (FASTEST METHOD!):**
User: "Rotate everything 90 degrees"
Assume canvas has shape IDs: shape_1, shape_2, shape_3
{{
  "plan": [
    {{
      "step": 1,
      "tool": "batch_update_shapes",
      "args": {{
        "shapeIds": ["shape_1", "shape_2", "shape_3"],
        "deltaRotation": 90
      }},
      "description": "Rotate all shapes by 90 degrees"
    }}
  ],
  "reasoning": "Done! I've rotated all the shapes by 90 degrees."
}}

**Example - Move All Shapes (FASTEST METHOD!):**
User: "Move everything 100 pixels to the right"
Assume canvas has shape IDs: shape_1, shape_2, shape_3
{{
  "plan": [
    {{
      "step": 1,
      "tool": "batch_update_shapes",
      "args": {{
        "shapeIds": ["shape_1", "shape_2", "shape_3"],
        "deltaX": 100
      }},
      "description": "Move all shapes 100px right"
    }}
  ],
  "reasoning": "Done! I've moved all shapes 100 pixels to the right."
}}

**Important Rules:**
1. **INFORMATIONAL QUERIES**: If the user is asking a QUESTION about existing canvas objects, return an EMPTY plan (steps: []) and write a DIRECT ANSWER in the reasoning field (e.g., "The blue circle has a radius of 100 pixels.").
2. **ACTION REQUESTS**: For actions (create, move, delete, update), write the reasoning field as a CONVERSATIONAL CONFIRMATION in first-person (e.g., "Done! I've doubled the radius of the circle." or "I've created 3 red circles in a row."). This will be shown to the user.
3. **TONE**: Always write reasoning as if speaking directly to the user. NO meta-commentary like "The user is asking..." or "Doubling the size by updating...". Be natural and friendly.
4. You MUST provide ALL required parameters for each tool with actual values (not placeholders)
5. Use canvas center (2500, 2500) when user says "center" or doesn't specify position
6. For colors: red=#FF0000, green=#00FF00, blue=#0000FF, yellow=#FFFF00, etc.
7. Use {{step_N}} to reference output from step N if needed
8. Keep plans simple and efficient (maximum 5 steps)
9. **ALIGNMENT**: When creating composite objects (tree, house, person), keep shapes aligned on the SAME x-coordinate (e.g., tree trunk x=2500, leaves also x=2500)
10. **BATCHING**: For multiple shapes, use ONE call (NOT multiple individual calls):
    - Creating 2+ shapes → batch_operations with type='create' operations
    - Deleting 2+ shapes → batch_operations with type='delete' operations
    - Rotating ALL shapes → batch_update_shapes with deltaRotation (FASTEST!)
    - Rotating SOME shapes → batch_operations with type='update', updates={{rotation:X}} operations
    - Moving ALL shapes → batch_update_shapes with deltaX/deltaY (FASTEST!)
    - Updating ALL (same property) → batch_update_shapes with updates object (FASTEST!)
    - Mixed operations (create+delete, update+delete, etc.) → batch_operations
11. **RANDOM SHAPES**: For "create N random shapes" requests, use batch_operations with varied properties:
    - **Positions**: Spread across canvas using DIFFERENT coordinates (e.g., 500, 1200, 2800, 3500, 4200, 800, 2000, 3800, 1500, 4500)
    - **Sizes**: Vary dimensions (rectangles: 50-150 width/height, circles: 25-100 radius, text: 16-48 fontSize)
    - **Colors**: Mix colors (#FF0000, #00FF00, #0000FF, #FFFF00, #FF00FF, #00FFFF, #FFA500, #800080)
    - **Types**: For "random shapes", mix rectangles, circles, and text
    - **Boundaries**: CRITICAL - Keep ALL shapes within canvas (0-5000). For rectangles at (x,y) with width W and height H, ensure x+W≤5000 and y+H≤5000. For circles at (x,y) with radius R stored as width/height 2R, ensure x+2R≤5000 and y+2R≤5000

**Current Canvas State:**
${buildSmartContext(userMessage, canvasShapes, false)}

**User Request:** ${userMessage}

**CRITICAL: Your response MUST be valid JSON ONLY. NO comments, NO explanations, NO markdown.**
- ❌ BAD: {{"x": 100}}  // This is a trunk
- ✅ GOOD: {{"x": 100}}

**Your Plan (JSON only):**`;

  // Route to appropriate model based on pre-classified complexity
  // GPT-4o for creative/complex tasks (faster and better at spatial reasoning)
  // GPT-4o-mini for simple tasks (cheaper and sufficient)
  const selectedModel = (complexity === 'creative' || complexity === 'complex') ? gpt4o : gpt4oMini;
  const modelName = (complexity === 'creative' || complexity === 'complex') ? 'GPT-4o' : 'GPT-4o-mini';
  
  console.log(`🤖 [ROUTING] ${complexity.toUpperCase()} task → Using ${modelName}`);
  
  const response = await selectedModel.invoke([{ role: 'user', content: planningPrompt }]);
  
  // Parse JSON from response
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to generate valid execution plan');
  }
  
  // ✅ FIX: Strip JavaScript-style comments from JSON (AI sometimes adds them)
  // Remove single-line comments: // ...
  // Remove multi-line comments: /* ... */
  let jsonString = jsonMatch[0];
  jsonString = jsonString.replace(/\/\/.*$/gm, '');  // Remove // comments
  jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');  // Remove /* */ comments
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');  // Remove trailing commas
  
  const plan = JSON.parse(jsonString);
  return plan;
}

/**
 * Execute a plan by running tools sequentially
 * No additional LLM calls - pure execution
 */
async function executePlan(plan, canvasShapes = []) {
  const stepOutputs = new Map();
  const actions = [];
  
  console.log(`⚙️ [EXECUTION] Executing ${plan.plan.length} step(s)...`);
  
  for (const step of plan.plan) {
    const stepStart = performance.now();
    console.log(`  ${step.step}. ${step.tool} - ${step.description}`);
    console.log(`     └─ Args:`, JSON.stringify(step.args));
    
    // Resolve references to previous step outputs
    const resolvedArgs = resolveStepReferences(step.args, stepOutputs);
    
    // Find the tool
    const tool = tools.find(t => t.name === step.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${step.tool}`);
    }
    
    // Execute the tool
    const result = await tool.func(resolvedArgs);
    const stepTime = performance.now() - stepStart;
    console.log(`     └─ Completed in ${stepTime.toFixed(0)}ms`);
    
    // Parse the result and store for future steps
    try {
      const parsedResult = JSON.parse(result);
      stepOutputs.set(`step_${step.step}`, parsedResult.data);
      actions.push(parsedResult);
    } catch (e) {
      // If result is not JSON, store it as-is
      stepOutputs.set(`step_${step.step}`, result);
    }
  }
  
  return actions;
}

/**
 * Resolve {{step_N}} references in arguments
 */
function resolveStepReferences(args, stepOutputs) {
  const resolved = {};
  
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.includes('{{step_')) {
      // Extract step number
      const match = value.match(/\{\{step_(\d+)\}\}/);
      if (match) {
        const stepNum = parseInt(match[1]);
        const stepData = stepOutputs.get(`step_${stepNum}`);
        resolved[key] = stepData;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively resolve nested objects
      resolved[key] = resolveStepReferences(value, stepOutputs);
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

/**
 * Execute an AI command using Plan-and-Execute pattern
 * Makes ONE LLM call for planning, then executes tools without additional calls
 * 
 * NOTE: This is the primary execution path for AI commands (stateless planning)
 * 
 * @param {string} userMessage - The user's natural language command
 * @param {Array} chatHistory - Previous conversation messages (NOT CURRENTLY USED - stateless planning)
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @returns {Promise<{response: string, actions: Array, plan: Object}>} - AI response, canvas actions, and execution plan
 */
export async function executeAICommandWithPlanAndExecute(userMessage, chatHistory = [], canvasShapes = []) {
  try {
    // PHASE 0: Check for direct execution (trivial commands)
    const classifyStart = performance.now();
    const complexity = await classifyRequestComplexity(userMessage, canvasShapes);
    const classifyTime = performance.now() - classifyStart;
    
    // ========================================
    // COMPOUND COMMAND EXECUTION
    // ========================================
    if (complexity && typeof complexity === 'object' && complexity.compound) {
      console.log(`⚡⚡ [COMPOUND-EXECUTION] Executing ${complexity.commands.length} heuristic commands without LLM!`);
      
      const allPlans = [];
      const allResponses = [];
      const allActions = [];
      
      for (const { command, type } of complexity.commands) {
        console.log(`   └─ Processing: "${command}" (${type})`);
        
        // Recursively execute each command (they're all heuristic, so they'll hit the direct execution path)
        const result = await executeAICommandWithPlanAndExecute(command, canvasShapes, chatHistory);
        
        // ✅ FIX: result.plan is an object with { plan: [...], reasoning: "..." }
        // We need to access result.plan.plan to get the array of steps
        allPlans.push(...result.plan.plan);
        allResponses.push(result.response);
        allActions.push(...result.actions);
      }
      
      // Combine all plans and responses
      const combinedPlan = {
        plan: allPlans.map((step, i) => ({ ...step, step: i + 1 })),
        reasoning: allResponses.join(' ')
      };
      const response = allResponses.join(' ');
      
      return {
        response,
        actions: allActions,
        plan: combinedPlan
      };
    }
    
    // ========================================
    // SINGLE DIRECT EXECUTION
    // ========================================
    // Handle direct execution for trivial commands
    if (typeof complexity === 'string' && complexity.startsWith('direct_')) {
      console.log(`⚡ [DIRECT-EXECUTION] Bypassing LLM for trivial command (${classifyTime.toFixed(1)}ms)`);
      
      let plan, response;
      
      if (complexity === 'direct_clear') {
        plan = {
          plan: [{ step: 1, tool: 'clear_canvas', args: {}, description: 'Clear all shapes from the canvas' }],
          reasoning: 'Done! I\'ve cleared all shapes from the canvas.'
        };
        response = 'Done! I\'ve cleared all shapes from the canvas.';
        
      } else if (complexity === 'direct_move_all') {
        // Extract direction and optional distance from message
        const match = userMessage.toLowerCase().match(/^(move|shift)\s+(everything|all|all shapes)\s+(up|down|left|right)(\s+by\s+(\d+))?/i);
        const direction = match[3].toLowerCase();
        const distance = match[5] ? parseInt(match[5]) : 100; // Default to 100px
        
        const delta = direction === 'up' ? { deltaY: -distance } 
                    : direction === 'down' ? { deltaY: distance }
                    : direction === 'left' ? { deltaX: -distance }
                    : { deltaX: distance };
        
        plan = {
          plan: [{
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              shapeIds: canvasShapes.map(s => s.id),
              ...delta
            },
            description: `Move all shapes ${direction} by ${distance} pixels`
          }],
          reasoning: `Done! I've moved all shapes ${direction} by ${distance} pixels.`
        };
        response = `Done! I've moved all shapes ${direction} by ${distance} pixels.`;
        
      } else if (complexity === 'direct_rotate_all') {
        // Extract rotation angle from message
        const match = userMessage.toLowerCase().match(/^(rotate|turn|spin)\s+(everything|all|all shapes)(\s+by)?\s+(\d+)\s*(degrees?|°)?/i);
        const angle = parseInt(match[4]);
        
        plan = {
          plan: [{
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              shapeIds: canvasShapes.map(s => s.id),
              deltaRotation: angle
            },
            description: `Rotate all shapes by ${angle} degrees`
          }],
          reasoning: `Done! I've rotated all shapes by ${angle} degrees.`
        };
        response = `Done! I've rotated all shapes by ${angle} degrees.`;
        
      } else if (complexity === 'direct_scale_all') {
        // Extract scale factor from message
        const lowerMsg = userMessage.toLowerCase();
        let scaleFactor;
        let description;
        
        if (lowerMsg.includes('bigger') || lowerMsg.includes('larger')) {
          scaleFactor = 1.5;
          description = 'bigger';
        } else if (lowerMsg.includes('smaller')) {
          scaleFactor = 0.5;
          description = 'smaller';
        } else if (lowerMsg.includes('double') || lowerMsg.includes('twice')) {
          scaleFactor = 2;
          description = 'twice as big';
        } else if (lowerMsg.includes('triple')) {
          scaleFactor = 3;
          description = 'three times as big';
        } else if (lowerMsg.includes('half') || lowerMsg.includes('halve')) {
          scaleFactor = 0.5;
          description = 'half the size';
        } else {
          // Extract numeric scale factor (e.g., "2.5 times" or "scale all 2.5x")
          const timesMatch = lowerMsg.match(/(\d+(?:\.\d+)?)\s*(times|x)/);
          scaleFactor = timesMatch ? parseFloat(timesMatch[1]) : 2;
          description = `${scaleFactor}x the size`;
        }
        
        plan = {
          plan: [{
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              shapeIds: canvasShapes.map(s => s.id),
              scaleX: scaleFactor,
              scaleY: scaleFactor
            },
            description: `Scale all shapes by ${scaleFactor}x`
          }],
          reasoning: `Done! I've made everything ${description}.`
        };
        response = `Done! I've made everything ${description}.`;
        
      } else if (complexity === 'direct_create_shape') {
        // Extract shape type and optional color from message
        const lowerMsg = userMessage.toLowerCase();
        const match = lowerMsg.match(/^(create|draw|make|add)\s+(a|an)?\s*((red|green|blue|yellow|orange|purple|pink|black|white)\s+)?(circle|rectangle|square|text|line)$/i);
        
        const shapeType = match[5].toLowerCase();
        const colorName = match[4]?.toLowerCase();
        
        // Map color names to hex codes
        const colorMap = {
          red: '#FF0000',
          green: '#00FF00',
          blue: '#0000FF',
          yellow: '#FFFF00',
          orange: '#FFA500',
          purple: '#800080',
          pink: '#FFC0CB',
          black: '#000000',
          white: '#FFFFFF'
        };
        const fill = colorName ? colorMap[colorName] : '#3B82F6'; // Default blue
        
        // Create shape at center with default sizes
        const centerX = 2500;
        const centerY = 2500;
        let tool, args, shapeDescription;
        
        if (shapeType === 'circle') {
          tool = 'create_circle';
          args = { x: centerX, y: centerY, radius: 50, fill };
          shapeDescription = colorName ? `${colorName} circle` : 'circle';
        } else if (shapeType === 'rectangle' || shapeType === 'square') {
          tool = 'create_rectangle';
          const size = shapeType === 'square' ? 100 : null;
          args = { x: centerX, y: centerY, width: size || 150, height: size || 100, fill };
          shapeDescription = colorName ? `${colorName} ${shapeType}` : shapeType;
        } else if (shapeType === 'text') {
          tool = 'create_text';
          args = { x: centerX, y: centerY, text: 'Text', fontSize: 48, fill };
          shapeDescription = colorName ? `${colorName} text` : 'text';
        } else if (shapeType === 'line') {
          tool = 'create_line';
          args = { x1: centerX - 50, y1: centerY, x2: centerX + 50, y2: centerY, stroke: fill, strokeWidth: 2 };
          shapeDescription = colorName ? `${colorName} line` : 'line';
        }
        
        plan = {
          plan: [{
            step: 1,
            tool,
            args,
            description: `Create a ${shapeDescription} at center`
          }],
          reasoning: `Done! I've created a ${shapeDescription} at the center of the canvas.`
        };
        response = `Done! I've created a ${shapeDescription} at the center of the canvas.`;
      }
      
      // Execute the direct action
      const actions = await executePlan(plan, canvasShapes);
      
      return {
        response,
        actions,
        plan,
      };
    }
    
    // PHASE 1: Planning (ONE LLM call)
    console.log('🧠 [PLANNING] Generating execution plan...');
    const planStart = performance.now();
    
    const plan = await generateExecutionPlan(userMessage, canvasShapes, complexity);
    
    const planTime = performance.now() - planStart;
    console.log(`⏱️ [PLANNING] Plan generated in ${planTime.toFixed(0)}ms`);
    console.log(`📋 [PLANNING] Plan: ${plan.plan.length} step(s)`);
    if (plan.reasoning) {
      console.log(`💭 [PLANNING] Reasoning: ${plan.reasoning}`);
    }
    
    // PHASE 2: Execution (NO LLM calls)
    const execStart = performance.now();
    const actions = await executePlan(plan, canvasShapes);
    const execTime = performance.now() - execStart;
    
    console.log(`⏱️ [EXECUTION] Completed in ${execTime.toFixed(0)}ms`);
    
    // Generate response message
    // Always use reasoning field for conversational responses (questions AND actions)
    const response = plan.reasoning || (plan.plan.length === 0 ? 'No information available.' : 'Done!');
    
    return {
      response,
      actions,
      plan, // Include plan for debugging/visualization
    };
  } catch (error) {
    console.error(`❌ [PLAN-AND-EXECUTE] Error:`, error.message);
    console.error(`❌ [PLAN-AND-EXECUTE] Stack:`, error.stack);
    
    // Return user-friendly error message
    const errorMessage = error.message?.includes('API key') 
      ? 'API key error. Please check your OpenAI configuration.'
      : error.message?.includes('network') || error.message?.includes('fetch')
      ? 'Network error. Please check your connection and try again.'
      : `Unexpected error: ${error.message}`;
    
    return {
      response: `❌ Sorry, I encountered an error: ${errorMessage}\n\nPlease try again or rephrase your request.`,
      actions: [],
      plan: { plan: [], reasoning: errorMessage }
    };
  }
}

/**
 * Get information about available AI commands
 */
export function getAICapabilities() {
  return {
    categories: {
      creation: ['Create rectangles, circles, text, lines'],
      manipulation: ['Move, resize, rotate shapes'],
      layout: ['Create grids, rows of shapes'],
      deletion: ['Delete shapes by description'],
    },
    examples: [
      'Create a red circle in the center',
      'Add a blue rectangle at position 1000, 1000',
      'Move the red circle to the right',
      'Create a 3x3 grid of squares',
      'Build a login form',
      'Rotate the text 45 degrees',
      'Make the circle twice as big',
      'Delete all blue rectangles',
    ],
  };
}

