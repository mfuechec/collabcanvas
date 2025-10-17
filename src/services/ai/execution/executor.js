import { executeSmartOperation } from '@/services/canvas';
import { resolveStepReferences } from './referenceResolver.js';

// ========================================
// TOOL EXECUTION
// ========================================

/**
 * Execute a sequence of tool calls from the AI's execution plan
 * @param {Array} plan - Array of steps to execute
 * @param {Object} context - Execution context (canvasId, etc.)
 * @returns {Array} Results from each step
 */
export async function executeToolsSequentially(plan, context) {
  console.log(`🔧 [EXECUTION] Executing ${plan.length} step(s)...`);
  
  const results = [];
  
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    console.log(`  → Step ${step.step}: ${step.tool}`);
    
    try {
      let result;
      
      // Resolve {{step_N}} references in args
      const resolvedArgs = resolveStepReferences(step.args, results);
      
      // Map tool names to actions
      const toolToActionMap = {
        'create_rectangle': 'create_rectangle',
        'create_circle': 'create_circle',
        'create_text': 'create_text',
        'create_line': 'create_line',
        'update_shape': 'update_shape',
        'move_shape': 'move_shape',
        'resize_shape': 'resize_shape',
        'rotate_shape': 'rotate_shape',
        'delete_shape': 'delete_shape',
        'batch_update_shapes': 'batch_update_shapes',
        'batch_operations': 'batch_operations',
        'create_grid': 'create_grid',
        'create_row': 'create_row',
        'create_circle_row': 'create_circle_row',
        'clear_canvas': 'clear_canvas'
      };
      
      const action = toolToActionMap[step.tool];
      if (!action) {
        throw new Error(`Unknown tool: ${step.tool}`);
      }
      
      // Strip the 'tool' field from args before passing to executeSmartOperation
      // (it's part of discriminated union but not needed by canvas.js)
      const { tool, ...data } = resolvedArgs;
      
      result = await executeSmartOperation(action, data, context.canvasId);
      results.push(result);
      
      console.log(`  ✓ Step ${step.step} completed`);
    } catch (error) {
      console.error(`  ✗ Step ${step.step} failed:`, error.message);
      throw new Error(`Step ${step.step} failed: ${error.message}`);
    }
  }
  
  return results;
}

