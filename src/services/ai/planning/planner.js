import { gpt4oStructured } from '../config/models.js';
import { buildSmartContext } from '../context/contextBuilder.js';
import { buildStaticSystemPrompt, buildDynamicContext } from './prompts/systemPrompt.js';

// ========================================
// EXECUTION PLAN GENERATION
// ========================================

// Cache the static prompt (computed once, reused for all requests)
const STATIC_SYSTEM_PROMPT = buildStaticSystemPrompt();

/**
 * Generate an execution plan for a user request
 * Uses GPT-4o with structured outputs and prompt caching for optimal performance
 * 
 * OPTIMIZATION: No classification overhead - always use GPT-4o for best quality
 * 
 * CACHING STRATEGY:
 * - Static prompt (design system, rules, examples) → cached by OpenAI
 * - Dynamic context (canvas state, user style) → prepended to user message
 * - Result: First request ~3-6s, subsequent requests ~1.5-3s (50% faster with cache!)
 * 
 * @param {string} userMessage - User's natural language request
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @param {string} userStyleGuide - User's inferred style preferences
 * @returns {Object} Execution plan with steps and reasoning
 */
export async function generateExecutionPlan(userMessage, canvasShapes, userStyleGuide = '') {
  // Build smart context (only includes relevant canvas information)
  const currentCanvasState = buildSmartContext(userMessage, canvasShapes, true);
  
  // Build dynamic context (canvas state + user style)
  const dynamicContext = buildDynamicContext(currentCanvasState, userStyleGuide);
  
  // Prepend dynamic context to user message
  const fullUserMessage = dynamicContext 
    ? `${dynamicContext}User request: ${userMessage}`
    : userMessage;
  
  // Always use GPT-4o for best quality (no classification overhead)
  const selectedModel = gpt4oStructured;
  
  console.log(`🤖 [MODEL] Using GPT-4o (best quality, no classification overhead)`);
  console.log(`🔄 [CACHE] Static prompt (~8K tokens) cacheable, dynamic context (~${Math.round(dynamicContext.length / 4)} tokens)`);
  
  // Generate plan using structured output with raw response metadata
  // OpenAI automatically caches the static system message across requests
  const startTime = performance.now();
  const rawResponse = await selectedModel.invoke([
    { role: 'system', content: STATIC_SYSTEM_PROMPT }, // ← Cached!
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

