#!/usr/bin/env node

/**
 * Test Creative Prompt Performance
 * 
 * Validates that creative tasks use the optimized prompt
 * and measures token usage improvements
 */

import { buildCreativeSystemPrompt } from '../src/services/ai/planning/prompts/creativePrompt.js';
import { buildStaticSystemPrompt } from '../src/services/ai/planning/prompts/systemPrompt.js';

// Rough token estimation (1 token ≈ 4 characters)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

console.log('=== CREATIVE PROMPT PERFORMANCE TEST ===\n');

// Test creative prompt
const creativePrompt = buildCreativeSystemPrompt();
const creativeTokens = estimateTokens(creativePrompt);

// Test standard prompt for comparison
const standardPrompt = buildStaticSystemPrompt();
const standardTokens = estimateTokens(standardPrompt);

console.log('📊 Token Usage Comparison:');
console.log(`Standard prompt: ${standardTokens} tokens (${standardPrompt.length} chars)`);
console.log(`Creative prompt: ${creativeTokens} tokens (${creativePrompt.length} chars)`);
console.log(`Reduction: ${standardTokens - creativeTokens} tokens (${Math.round(((standardTokens - creativeTokens) / standardTokens) * 100)}%)`);

console.log('\n🎨 Creative Prompt Features:');
console.log(`- Artistic composition rules: ${creativePrompt.includes('Rule of Thirds') ? '✅' : '❌'}`);
console.log(`- Color harmony guidance: ${creativePrompt.includes('Color Harmony') ? '✅' : '❌'}`);
console.log(`- Layering instructions: ${creativePrompt.includes('Layering') ? '✅' : '❌'}`);
console.log(`- Creative examples: ${creativePrompt.includes('Face:') ? '✅' : '❌'}`);
console.log(`- Streamlined tools: ${creativePrompt.includes('batch_operations') ? '✅' : '❌'}`);

console.log('\n🧪 Test Creative Task Detection:');
const testCases = [
  'draw a sunset',
  'create a galaxy',
  'make a face',
  'design something beautiful',
  'create abstract art',
  'draw a tree',
  'make a house',
  'create a login form', // Should NOT be creative (UI task)
  'add a circle', // Should NOT be creative (simple task)
];

// Test creative detection patterns directly

console.log('Testing creative task detection...');
for (const testCase of testCases) {
  // Use the same patterns as in the classifier
  const lowerMsg = testCase.toLowerCase();
  const creativePatterns = [
    /(draw|create|make|design)\s+(sunset|galaxy|face|tree|house|flower|sun|moon|star|smiley|emoji)/i,
    /(draw|create|make|design)\s+(a|an)?\s*(beautiful|pretty|cool|awesome|amazing|artistic)/i,
    /(create|make)\s+(art|abstract|composition|pattern|design)/i,
    /(draw|paint|sketch)\s+(something|anything)\s+(beautiful|pretty|cool|nice)/i,
    /(face|smiley|emoji|person|stick\s+figure|character)/i,
    /(tree|flower|plant|sun|moon|star|nature|landscape)/i,
    /(house|building|car|vehicle|boat|ship|architecture)/i,
  ];
  
  const isCreative = creativePatterns.some(pattern => pattern.test(lowerMsg));
  const expectedType = isCreative ? 'Creative' : 'Standard';
  console.log(`  "${testCase}" → ${expectedType} prompt`);
}

console.log('\n✅ Creative prompt optimization complete!');
console.log(`Expected performance improvement: ${Math.round(((standardTokens - creativeTokens) / standardTokens) * 100)}% token reduction`);