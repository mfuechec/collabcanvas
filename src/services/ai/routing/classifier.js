import { checkSingleCommandHeuristic } from './heuristics.js';
import { gpt4oMini } from '../config/models.js';

// ========================================
// REQUEST COMPLEXITY CLASSIFICATION
// ========================================

/**
 * Classify request complexity to route to appropriate model
 * Uses fast heuristics first, falls back to GPT-4o-mini for ambiguous cases
 * 
 * @param {string} userMessage - User's natural language request
 * @param {Array} canvasShapes - Current shapes on canvas
 * @returns {string|Object} - Complexity ('simple', 'creative', 'complex', or direct execution type)
 *                             or { compound: true, commands: [...] } for compound heuristics
 */
export async function classifyRequestComplexity(userMessage, canvasShapes = []) {
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
  
  // Creative: Artistic tasks and composite objects (use optimized creative prompt)
  const creativePatterns = [
    // Artistic/creative requests (enhanced patterns)
    /(draw|create|make|design)\s+(sunset|galaxy|face|tree|house|flower|sun|moon|star|smiley|emoji)/i,
    /(draw|create|make|design)\s+(a|an)?\s*(beautiful|pretty|cool|awesome|amazing|artistic)/i,
    /(create|make)\s+(art|abstract|composition|pattern|design)/i,
    /(draw|paint|sketch)\s+(something|anything)\s+(beautiful|pretty|cool|nice)/i,
    /(design|create)\s+(something|anything)\s+(beautiful|pretty|cool|nice|amazing)/i,
    
    // Composite objects (multiple shapes aligned, requires spatial reasoning)
    /(face|smiley|emoji|person|stick\s+figure|character)/i,
    /(tree|flower|plant|sun|moon|star|nature|landscape)/i,
    /(house|building|car|vehicle|boat|ship|architecture)/i,
    
    // UI/Form elements (structured layouts) - keep for template tools
    /(form|login|signup|register|sign\s+in|sign\s+up)/i,
    /(button|input|card|panel|modal|dialog)/i,
    /(dashboard|layout|screen|interface|ui|page)/i,
    /(navbar|sidebar|menu|header|footer)/i,
    /(profile|settings|checkout|contact|pricing)/i,
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

