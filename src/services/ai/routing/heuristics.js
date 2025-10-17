// ========================================
// HEURISTIC COMMAND DETECTION
// ========================================

/**
 * Check if a command matches a simple heuristic pattern
 * These commands can be executed directly without LLM planning
 * 
 * @param {string} command - User command to check
 * @returns {string|null} - Heuristic type ('direct_clear', 'direct_move_all', etc.) or null
 */
export function checkSingleCommandHeuristic(command) {
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
  
  // Move all - allow "move up" or "move everything up"
  if (/^(move|shift)\s+((everything|all|all shapes)\s+)?(up|down|left|right)(\s+by\s+(\d+))?$/i.test(lowerCmd)) {
    return 'direct_move_all';
  }
  
  // Rotate all - allow "rotate 45" or "rotate everything 45"
  if (/^(rotate|turn|spin)\s+((everything|all|all shapes)\s+)?(\s+by)?\s*(\d+)\s*(degrees?|°)?$/i.test(lowerCmd)) {
    return 'direct_rotate_all';
  }
  
  // Scale all - allow "double", "triple", "halve" alone or with "everything/all"
  if (/^(double|triple|halve|half)(\s+(everything|all|all shapes))?$/i.test(lowerCmd)) {
    return 'direct_scale_all';
  }
  
  // Scale all - longer forms
  if (/^(make|scale)\s+(everything|all|all shapes)\s+(bigger|smaller|larger|double|twice|triple|half|halve|(\d+(\.\d+)?)\s*(times|x))$/i.test(lowerCmd)) {
    return 'direct_scale_all';
  }
  
  // Create single shape
  if (/^(create|draw|make|add)\s+(a|an)?\s*((red|green|blue|yellow|orange|purple|pink|black|white)\s+)?(circle|rectangle|square|text|line)$/i.test(lowerCmd)) {
    return 'direct_create_shape';
  }
  
  return null; // Not a heuristic command
}

