import { gpt4oStructured } from '../config/models.js';
import { buildSmartContext } from '../context/contextBuilder.js';
import { buildStaticSystemPrompt, buildDynamicContext } from './prompts/systemPrompt.js';
import { buildCreativeSystemPrompt } from './prompts/creativePrompt.js';

// ========================================
// EXECUTION PLAN GENERATION
// ========================================

// Cache the static prompts (computed once, reused for all requests)
const STATIC_SYSTEM_PROMPT = buildStaticSystemPrompt();
const CREATIVE_SYSTEM_PROMPT = buildCreativeSystemPrompt();

/**
 * Check if a request is a creative task that should use the optimized creative prompt
 * @param {string} userMessage - User's natural language request
 * @returns {boolean} True if this is a creative task
 */
function isCreativeTask(userMessage) {
  const lowerMsg = userMessage.toLowerCase();
  
  // Enhanced creative patterns for artistic tasks
  const creativePatterns = [
    // Artistic/creative requests
    /(draw|create|make|design)\s+(sunset|galaxy|face|tree|house|flower|sun|moon|star|smiley|emoji)/i,
    /(draw|create|make|design)\s+(a|an)?\s*(beautiful|pretty|cool|awesome|amazing|artistic)/i,
    /(create|make)\s+(art|abstract|composition|pattern|design)/i,
    /(draw|paint|sketch)\s+(something|anything)\s+(beautiful|pretty|cool|nice)/i,
    
    // Composite objects
    /(face|smiley|emoji|person|stick\s+figure|character)/i,
    /(tree|flower|plant|sun|moon|star|nature|landscape)/i,
    /(house|building|car|vehicle|boat|ship|architecture)/i,
  ];
  
  return creativePatterns.some(pattern => pattern.test(lowerMsg));
}

/**
 * Generate an execution plan for a user request
 * Uses optimized prompts based on task type for maximum efficiency
 * 
 * CREATIVE TASKS: Use streamlined creative prompt (~1,500 tokens vs 3,767)
 * OTHER TASKS: Use full system prompt for comprehensive guidance
 * 
 * CACHING STRATEGY:
 * - Static prompts → cached by OpenAI
 * - Dynamic context → prepended to user message
 * - Result: Creative tasks ~1.5-2.5s, other tasks ~2-4s
 * 
 * @param {string} userMessage - User's natural language request
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @param {string} userStyleGuide - User's inferred style preferences
 * @returns {Object} Execution plan with steps and reasoning
 */
export async function generateExecutionPlan(userMessage, canvasShapes, userStyleGuide = '') {
  // Check if this is a creative task
  const isCreative = isCreativeTask(userMessage);
  
  // Build smart context (only includes relevant canvas information)
  const currentCanvasState = buildSmartContext(userMessage, canvasShapes, true);
  
  // Build dynamic context (canvas state + user style)
  const dynamicContext = buildDynamicContext(currentCanvasState, userStyleGuide);
  
  // Prepend dynamic context to user message
  const fullUserMessage = dynamicContext 
    ? `${dynamicContext}User request: ${userMessage}`
    : userMessage;
  
  // Select appropriate prompt and model
  const selectedModel = gpt4oStructured;
  const systemPrompt = isCreative ? CREATIVE_SYSTEM_PROMPT : STATIC_SYSTEM_PROMPT;
  const promptType = isCreative ? 'creative' : 'standard';
  const estimatedTokens = isCreative ? '~1.5K' : '~3.8K';
  
  console.log(`🤖 [MODEL] Using GPT-4o with ${promptType} prompt (${estimatedTokens} tokens)`);
  console.log(`🔄 [CACHE] ${promptType} prompt cacheable, dynamic context (~${Math.round(dynamicContext.length / 4)} tokens)`);
  
  // Generate plan using structured output with raw response metadata
  // OpenAI automatically caches the static system message across requests
  const startTime = performance.now();
  const rawResponse = await selectedModel.invoke([
    { role: 'system', content: systemPrompt }, // ← Cached!
    { role: 'user', content: fullUserMessage }          // ← Fresh each time
  ]);
  const inferenceTime = performance.now() - startTime;
  
  // With includeRaw: true, response structure is { parsed: {...}, raw: {...} }
  const response = rawResponse.parsed || rawResponse;  // Fallback for compatibility
  const raw = rawResponse.raw || rawResponse;
  
  // Debug: Log response structure
  console.log(`🔍 [CACHE-DEBUG] Response type:`, typeof rawResponse);
  console.log(`🔍 [CACHE-DEBUG] Has 'raw' field:`, 'raw' in rawResponse);
  console.log(`🔍 [CACHE-DEBUG] Has 'parsed' field:`, 'parsed' in rawResponse);
  
  // Access metadata from raw response
  const metadata = raw.response_metadata || raw.usage_metadata || {};
  
  if (metadata.usage || metadata.token_usage) {
    const usage = metadata.usage || metadata.token_usage;
    const promptTokens = usage.prompt_tokens || usage.input_tokens || 0;
    const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 
                        usage.cached_tokens || 
                        usage.prompt_cache_hit_tokens || 0;
    
    console.log(`📊 [CACHE-DEBUG] Usage info:`, JSON.stringify(usage, null, 2));
    
    if (cachedTokens > 0) {
      const cachePercent = Math.round((cachedTokens / promptTokens) * 100);
      const savedTime = Math.round((cachedTokens / promptTokens) * inferenceTime);
      console.log(`✅ [CACHE-HIT] ${cachedTokens}/${promptTokens} tokens cached (${cachePercent}%)`);
      console.log(`   ├─ Inference time: ${Math.round(inferenceTime)}ms`);
      console.log(`   └─ Estimated time saved: ~${savedTime}ms`);
    } else {
      console.log(`❌ [CACHE-MISS] 0/${promptTokens} tokens cached`);
      console.log(`   ├─ Inference time: ${Math.round(inferenceTime)}ms`);
      console.log(`   └─ Next request should be ~50% faster with cache`);
    }
  } else {
    console.log(`⚠️ [CACHE] No usage metadata found → ${Math.round(inferenceTime)}ms`);
    console.log(`   Available keys:`, Object.keys(metadata));
  }
  
  return response;
}

