// ========================================
// AI AGENT MAIN ENTRY POINT
// ========================================
// Orchestrates the entire AI execution flow
// from user message to canvas actions

// Import modules
import { inferUserStyle } from './context/styleInference.js';
import { classifyRequestComplexity } from './routing/classifier.js';
import { generateExecutionPlan } from './planning/planner.js';

/**
 * Main entry point for AI command execution
 * Handles the complete flow: classify → plan → execute
 * 
 * @param {string} userMessage - User's natural language command
 * @param {Array} chatHistory - Previous chat messages (for context)
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @param {string} currentUserId - Current user's ID (for style inference)
 * @returns {Object} { response: string, actions: Array }
 */
export async function executeAICommandWithPlanAndExecute(userMessage, chatHistory = [], canvasShapes = [], currentUserId = null) {
  try {
    // Filter shapes to only those created by current user (for style inference)
    const userShapes = currentUserId 
      ? canvasShapes.filter(s => s.createdBy === currentUserId)
      : [];
    
    // Infer user's personal style from their shapes
    const userStyleGuide = inferUserStyle(userShapes);
    
    // Log for debugging
    console.log(`🎨 [AI-AGENT] Processing request: "${userMessage}" with ${canvasShapes.length} shapes on canvas`);
    
    // Step 1: Classify task complexity for routing (with heuristic detection)
    const complexity = await classifyRequestComplexity(userMessage, canvasShapes);
    
    // Step 1.5a: Handle compound heuristic commands
    if (typeof complexity === 'object' && complexity.compound) {
      console.log(`⚡ [COMPOUND-EXECUTION] Executing ${complexity.commands.length} heuristic commands`);
      
      // Recursively execute each command and collect results
      const allActions = [];
      let combinedResponse = '';
      
      for (const { command, type } of complexity.commands) {
        // Recursively call executeAICommandWithPlanAndExecute for each sub-command
        const result = await executeAICommandWithPlanAndExecute(command, chatHistory, canvasShapes, currentUserId);
        allActions.push(...result.actions);
        combinedResponse += result.response + ' ';
      }
      
      return {
        response: combinedResponse.trim(),
        actions: allActions
      };
    }
    
    // Step 1.5b: Handle direct execution for heuristic commands
    if (typeof complexity === 'string' && complexity.startsWith('direct_')) {
      console.log(`⚡ [DIRECT-EXECUTION] Executing heuristic command: ${complexity}`);
      
      let plan, response;
      
      if (complexity === 'direct_clear') {
        plan = {
          plan: [{ step: 1, tool: 'clear_canvas', args: { tool: 'clear_canvas' }, description: 'Clear all shapes' }],
          reasoning: 'Done! I\'ve cleared the canvas.'
        };
        response = 'Done! I\'ve cleared the canvas.';
      } else if (complexity === 'direct_move_all') {
        const match = userMessage.toLowerCase().match(/^(move|shift)\s+((everything|all|all shapes)\s+)?(up|down|left|right)(\s+by\s+(\d+))?/i);
        const direction = match[4].toLowerCase();
        const distance = match[6] ? parseInt(match[6]) : 100;
        const delta = direction === 'up' ? { deltaY: -distance } 
                    : direction === 'down' ? { deltaY: distance }
                    : direction === 'left' ? { deltaX: -distance }
                    : { deltaX: distance };
        
        plan = {
          plan: [{
            step: 1,
            tool: 'batch_update_shapes',
            args: { tool: 'batch_update_shapes', shapeIds: canvasShapes.map(s => s.id), updates: null, deltaX: null, deltaY: null, deltaRotation: null, scaleX: null, scaleY: null, ...delta },
            description: `Move all shapes ${direction}`
          }],
          reasoning: `Done! I've moved all shapes ${direction}.`
        };
        response = `Done! I've moved all shapes ${direction}.`;
      } else if (complexity === 'direct_rotate_all') {
        const match = userMessage.toLowerCase().match(/^(rotate|turn|spin)\s+((everything|all|all shapes)\s+)?(\s+by)?\s*(\d+)\s*(degrees?|°)?/i);
        const angle = parseInt(match[5]);
        
        plan = {
          plan: [{
            step: 1,
            tool: 'batch_update_shapes',
            args: { tool: 'batch_update_shapes', shapeIds: canvasShapes.map(s => s.id), updates: null, deltaX: null, deltaY: null, deltaRotation: angle, scaleX: null, scaleY: null },
            description: `Rotate all shapes by ${angle} degrees`
          }],
          reasoning: `Done! I've rotated all shapes by ${angle} degrees.`
        };
        response = `Done! I've rotated all shapes by ${angle} degrees.`;
      } else if (complexity === 'direct_scale_all') {
        const lowerMsg = userMessage.toLowerCase();
        let scaleFactor, description;
        
        if (lowerMsg.includes('double')) {
          scaleFactor = 2;
          description = 'twice as big';
        } else if (lowerMsg.includes('triple')) {
          scaleFactor = 3;
          description = 'three times as big';
        } else if (lowerMsg.includes('half') || lowerMsg.includes('halve')) {
          scaleFactor = 0.5;
          description = 'half the size';
        } else {
          scaleFactor = 2;
          description = 'bigger';
        }
        
        plan = {
          plan: [{
            step: 1,
            tool: 'batch_update_shapes',
            args: { tool: 'batch_update_shapes', shapeIds: canvasShapes.map(s => s.id), updates: null, deltaX: null, deltaY: null, deltaRotation: null, scaleX: scaleFactor, scaleY: scaleFactor },
            description: `Scale all shapes by ${scaleFactor}x`
          }],
          reasoning: `Done! I've made everything ${description}.`
        };
        response = `Done! I've made everything ${description}.`;
      } else if (complexity === 'direct_create_shape') {
        const lowerMsg = userMessage.toLowerCase();
        const match = lowerMsg.match(/^(create|draw|make|add)\s+(a|an)?\s*((red|green|blue|yellow|orange|purple|pink|black|white)\s+)?(circle|rectangle|square|text|line)$/i);
        const shapeType = match[5];
        const colorName = match[4];
        const colorMap = {
          red: '#FF0000', green: '#00FF00', blue: '#0000FF', yellow: '#FFFF00',
          orange: '#FFA500', purple: '#800080', pink: '#FFC0CB', black: '#000000', white: '#FFFFFF'
        };
        const fill = colorName ? colorMap[colorName] : '#3B82F6';
        
        let tool, args, shapeDescription;
        const centerX = 2500, centerY = 2500;
        
        if (shapeType === 'circle') {
          tool = 'create_circle';
          const radius = 50;
          args = { tool: 'create_circle', x: centerX, y: centerY, radius, fill };
          shapeDescription = colorName ? `${colorName} circle` : 'circle';
        } else if (shapeType === 'rectangle' || shapeType === 'square') {
          tool = 'create_rectangle';
          const size = shapeType === 'square' ? 100 : null;
          args = { tool: 'create_rectangle', x: centerX, y: centerY, width: size || 150, height: size || 100, fill, cornerRadius: null };
          shapeDescription = colorName ? `${colorName} ${shapeType}` : shapeType;
        } else if (shapeType === 'text') {
          tool = 'create_text';
          args = { tool: 'create_text', x: centerX, y: centerY, text: 'Text', fontSize: 48, fill };
          shapeDescription = colorName ? `${colorName} text` : 'text';
        } else if (shapeType === 'line') {
          tool = 'create_line';
          args = { tool: 'create_line', x1: centerX - 50, y1: centerY, x2: centerX + 50, y2: centerY, stroke: fill, strokeWidth: 2 };
          shapeDescription = colorName ? `${colorName} line` : 'line';
        }
        
        plan = {
          plan: [{ step: 1, tool, args, description: `Create ${shapeDescription}` }],
          reasoning: `Done! I've created a ${shapeDescription}.`
        };
        response = `Done! I've created a ${shapeDescription}.`;
      }
      
      // Return actions for AIChat.jsx to execute (preserves React state management)
      // Convert plan format to action format
      // Note: step.args includes 'tool' field from discriminated union, strip it out
      const actions = plan.plan.map(step => {
        const { tool, ...data } = step.args;
        return {
          action: step.tool,
          data
        };
      });
      
      return {
        response,
        actions,
        plan
      };
    }
    
    // Step 2: Generate execution plan (smart prompt, intelligent routing)
    const plan = await generateExecutionPlan(userMessage, canvasShapes, complexity, userStyleGuide);
    
    // Step 3: Convert plan to actions for AIChat.jsx to execute
    // Don't execute here - let React components handle it for proper state management
    // Note: step.args includes 'tool' field from discriminated union, strip it out
    const actions = plan.plan?.map(step => {
      const { tool, ...data } = step.args;
      return {
        action: step.tool,
        data
      };
    }) || [];
    
    // Step 4: Return response with actions
    return {
      response: plan.reasoning,
      actions
    };
  } catch (error) {
    console.error('❌ [AI-AGENT] Error:', error);
    throw error;
  }
}

// Re-export inferUserStyle for backward compatibility
export { inferUserStyle };

