// ========================================
// STEP REFERENCE RESOLUTION
// ========================================

/**
 * Resolve {{step_N}} references in tool arguments
 * Allows steps to reference results from previous steps
 * 
 * Example: {{step_1}} gets replaced with the ID of the shape created in step 1
 * 
 * @param {Object} args - Tool arguments that may contain references
 * @param {Array} previousResults - Results from previous steps
 * @returns {Object} Resolved arguments with references replaced
 */
export function resolveStepReferences(args, previousResults) {
  const resolved = {};
  
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.match(/\{\{step_(\d+)\}\}/)) {
      const stepNum = parseInt(value.match(/\{\{step_(\d+)\}\}/)[1]);
      const result = previousResults[stepNum - 1];
      
      if (!result) {
        throw new Error(`Cannot reference {{step_${stepNum}}} - step not yet executed`);
      }
      
      // If result is a shape, extract its ID
      resolved[key] = result.id || result;
    } else {
      resolved[key] = value;
    }
  }
  
  return resolved;
}

