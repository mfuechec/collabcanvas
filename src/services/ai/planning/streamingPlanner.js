import { gpt4o } from '../config/models.js';
import { buildSmartContext } from '../context/contextBuilder.js';
import { buildStaticSystemPrompt, buildDynamicContext } from './prompts/systemPrompt.js';
import { executionPlanSchema } from './schemas.js';

// ========================================
// STREAMING EXECUTION PLAN GENERATION
// ========================================

// Cache the static prompt (computed once, reused for all requests)
const STATIC_SYSTEM_PROMPT = buildStaticSystemPrompt();

/**
 * Generate an execution plan with streaming progress updates
 * Shows AI reasoning in real-time for better UX
 * 
 * @param {string} userMessage - User's natural language request
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @param {string} userStyleGuide - User's inferred style preferences
 * @param {Function} onProgress - Callback for streaming updates (text: string) => void
 * @returns {Object} Execution plan with steps and reasoning
 */
export async function generateExecutionPlanStreaming(
  userMessage, 
  canvasShapes, 
  userStyleGuide = '',
  onProgress = null
) {
  const currentCanvasState = buildSmartContext(userMessage, canvasShapes, true);
  
  // Build dynamic context (canvas state + user style)
  const dynamicContext = buildDynamicContext(currentCanvasState, userStyleGuide);
  
  // Prepend dynamic context to user message
  const fullUserMessage = dynamicContext 
    ? `${dynamicContext}User request: ${userMessage}`
    : userMessage;
  
  console.log(`🤖 [STREAMING] Using GPT-4o with streaming`);
  console.log(`🔄 [CACHE] Static prompt (~8K tokens) cacheable, dynamic context (~${Math.round(dynamicContext.length / 4)} tokens)`);
  
  // Stream the response
  const startTime = performance.now();
  let fullContent = '';
  let tokenCount = 0;
  let lastProgressUpdate = 0;
  
  const stream = await gpt4o.stream([
    { role: 'system', content: STATIC_SYSTEM_PROMPT },
    { role: 'user', content: fullUserMessage }
  ]);
  
  console.log(`📡 [STREAMING] Starting stream...`);
  
  // Process stream chunks
  for await (const chunk of stream) {
    const content = chunk.content || '';
    fullContent += content;
    tokenCount++;
    
    // Extract reasoning for real-time progress display
    // Expected format: "REASONING: I'll create a tree...\n\nPLAN:\n{...}"
    const reasoningMatch = fullContent.match(/REASONING:\s*([^\n]+(?:\n(?!PLAN:)[^\n]+)*)/);
    
    // Call progress callback with extracted reasoning (throttle to every 50ms)
    const now = Date.now();
    if (onProgress && (now - lastProgressUpdate > 50)) {
      if (reasoningMatch) {
        // Show the extracted reasoning text
        onProgress(reasoningMatch[1].trim());
      } else if (fullContent.length < 200) {
        // Fallback: show raw content if REASONING not found yet (early in stream)
        onProgress(fullContent.trim());
      }
      lastProgressUpdate = now;
    }
  }
  
  const inferenceTime = performance.now() - startTime;
  console.log(`📡 [STREAMING] Stream complete: ${tokenCount} chunks, ${inferenceTime.toFixed(0)}ms`);
  
  // Final progress update with extracted reasoning
  if (onProgress) {
    const reasoningMatch = fullContent.match(/REASONING:\s*([^\n]+(?:\n(?!PLAN:)[^\n]+)*)/);
    if (reasoningMatch) {
      onProgress(reasoningMatch[1].trim());
    }
  }
  
  // Parse the complete response as structured output
  try {
    // Extract the PLAN section (everything after "PLAN:")
    let jsonContent = fullContent;
    const planMatch = fullContent.match(/PLAN:\s*([\s\S]*?)$/);
    if (planMatch) {
      jsonContent = planMatch[1].trim();
      console.log(`📋 [STREAMING] Extracted PLAN section (${jsonContent.length} chars)`);
    } else {
      console.warn(`⚠️ [STREAMING] No "PLAN:" marker found, attempting to parse full content as JSON`);
    }
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
      console.log(`📋 [STREAMING] Extracted from markdown code block`);
    }
    
    // Strip JSON comments (GPT sometimes adds // comments)
    jsonContent = jsonContent.replace(/\/\/[^\n]*/g, '');
    
    // Parse JSON
    const parsed = JSON.parse(jsonContent);
    
    // Normalize: Convert missing fields to null for validation
    // GPT omits undefined fields, but Zod schema expects null for nullable fields
    if (parsed.plan) {
      parsed.plan.forEach(step => {
        if (step.tool === 'batch_operations' && step.args?.operations) {
          step.args.operations.forEach(op => {
            if (op.type === 'create' && op.shape) {
              // Add missing nullable fields as null
              const shape = op.shape;
              if (shape.width === undefined) shape.width = null;
              if (shape.height === undefined) shape.height = null;
              if (shape.radius === undefined) shape.radius = null;
              if (shape.text === undefined) shape.text = null;
              if (shape.fontSize === undefined) shape.fontSize = null;
              if (shape.fill === undefined) shape.fill = null;
              if (shape.stroke === undefined) shape.stroke = null;
              if (shape.strokeWidth === undefined) shape.strokeWidth = null;
              if (shape.cornerRadius === undefined) shape.cornerRadius = null;
              if (shape.x1 === undefined) shape.x1 = null;
              if (shape.y1 === undefined) shape.y1 = null;
              if (shape.x2 === undefined) shape.x2 = null;
              if (shape.y2 === undefined) shape.y2 = null;
            }
          });
        }
      });
    }
    
    // Validate against schema
    const validated = executionPlanSchema.parse(parsed);
    
    console.log(`✅ [STREAMING] Parsed plan: ${validated.plan?.length || 0} step(s)`);
    
    return validated;
  } catch (error) {
    console.error(`❌ [STREAMING] Failed to parse response:`, error.message);
    console.error(`Raw content (first 500 chars):`, fullContent.substring(0, 500));
    
    // Fallback: Try to extract reasoning at least
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

