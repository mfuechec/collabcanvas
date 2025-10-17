/**
 * Semantic Analyzer
 * 
 * Uses embeddings + Claude 3.5 Haiku to analyze code for duplication.
 * Two-stage process:
 * 1. Fast embedding-based similarity filtering
 * 2. Claude analysis for high-similarity pairs
 */

import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { readFile } from 'fs/promises';

/**
 * Analyze code inventory for duplication
 * @param {Object} inventory - Code inventory from scanner
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} Analysis findings
 */
export async function analyzeForDuplication(inventory, config) {
  console.log('\n🧠 Analyzing for duplication...');
  
  const startTime = performance.now();
  
  // Read DRY enforcement rules
  const dryRules = await readFile('.cursor/rules/dry-enforcement.mdc', 'utf-8');
  
  // Stage 1: Generate embeddings and find similar pairs
  console.log('📊 Stage 1: Generating embeddings...');
  const similarPairs = await findSimilarCodePairs(inventory, config);
  
  console.log(`🔍 Found ${similarPairs.length} potentially similar code pairs`);
  
  if (similarPairs.length === 0) {
    console.log('✅ No significant duplication detected!');
    return [];
  }
  
  // Stage 2: Analyze similar pairs with Claude
  console.log('🤖 Stage 2: Analyzing with Claude...');
  const findings = await analyzePairsWithClaude(similarPairs, dryRules, config);
  
  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Analysis complete in ${elapsed}s`);
  console.log(`📋 Generated ${findings.length} findings`);
  
  return findings;
}

/**
 * Find similar code pairs using embeddings
 * @param {Object} inventory - Code inventory
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} Similar code pairs
 */
async function findSimilarCodePairs(inventory, config) {
  const embeddings = new OpenAIEmbeddings({
    modelName: config.ai.embeddingsModel,
    openAIApiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  });
  
  // Combine functions and components
  const codeBlocks = [...inventory.functions, ...inventory.components];
  
  if (codeBlocks.length === 0) {
    return [];
  }
  
  console.log(`  Generating embeddings for ${codeBlocks.length} code blocks...`);
  
  // Generate embeddings for all code blocks
  const texts = codeBlocks.map(block => 
    `${block.name}\n${block.signature}\n${block.code.substring(0, 500)}`
  );
  
  let vectors;
  try {
    vectors = await embeddings.embedDocuments(texts);
  } catch (error) {
    console.error('❌ Error generating embeddings:', error.message);
    return [];
  }
  
  // Find similar pairs using cosine similarity
  const similarPairs = [];
  const minSimilarity = config.thresholds.minSimilarity;
  
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const similarity = cosineSimilarity(vectors[i], vectors[j]);
      
      if (similarity >= minSimilarity) {
        similarPairs.push({
          block1: codeBlocks[i],
          block2: codeBlocks[j],
          similarity: similarity.toFixed(3),
        });
      }
    }
  }
  
  // Sort by similarity (highest first)
  similarPairs.sort((a, b) => b.similarity - a.similarity);
  
  return similarPairs;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vec1 - First vector
 * @param {Array<number>} vec2 - Second vector
 * @returns {number} Cosine similarity (0-1)
 */
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Analyze code pairs with AI (Claude or OpenAI)
 * @param {Array} pairs - Similar code pairs
 * @param {string} dryRules - DRY enforcement rules
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} Analysis findings
 */
async function analyzePairsWithClaude(pairs, dryRules, config) {
  // Create model based on provider
  let model;
  
  if (config.ai.provider === 'openai') {
    model = new ChatOpenAI({
      model: config.ai.model,
      temperature: config.ai.temperature,
      maxTokens: config.ai.maxTokens,
      openAIApiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    });
  } else if (config.ai.provider === 'anthropic') {
    model = new ChatAnthropic({
      model: config.ai.anthropicModel || config.ai.model,
      temperature: config.ai.temperature,
      maxTokens: config.ai.maxTokens,
      apiKey: process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
    });
  } else {
    throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
  }
  
  const findings = [];
  const maxPairs = Math.min(pairs.length, 20); // Limit to avoid excessive API costs
  
  for (let i = 0; i < maxPairs; i++) {
    const pair = pairs[i];
    
    if (config.reporting.showProgress) {
      process.stdout.write(`\r  Analyzing pair ${i + 1}/${maxPairs}...`.padEnd(60));
    }
    
    try {
      const finding = await analyzePair(pair, dryRules, model, config);
      if (finding) {
        findings.push(finding);
      }
    } catch (error) {
      console.warn(`\n⚠️  Error analyzing pair ${i + 1}:`, error.message);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (config.reporting.showProgress) {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }
  
  return findings;
}

/**
 * Analyze a single code pair
 * @param {Object} pair - Code pair to analyze
 * @param {string} dryRules - DRY rules
 * @param {Object} model - Claude model
 * @param {Object} config - Configuration
 * @returns {Promise<Object|null>} Finding or null
 */
async function analyzePair(pair, dryRules, model, config) {
  const prompt = `You are a code quality expert analyzing code for DRY (Don't Repeat Yourself) violations.

Your task: Analyze these two similar code blocks and determine if they should be refactored.

CRITICAL RULE: **Behavior preservation is paramount**. If you're uncertain whether behaviors match exactly, recommend keeping them separate.

Code Block 1:
File: ${pair.block1.filePath}
Function: ${pair.block1.name}
\`\`\`javascript
${pair.block1.code}
\`\`\`

Code Block 2:
File: ${pair.block2.filePath}
Function: ${pair.block2.name}
\`\`\`javascript
${pair.block2.code}
\`\`\`

Similarity Score: ${pair.similarity}

Analyze according to these project-specific rules:
${dryRules.substring(0, 3000)}

Respond in JSON format:
{
  "shouldRefactor": boolean,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "title": "Brief description",
  "reasoning": "Why they are/aren't duplicates",
  "differences": ["List of key differences if any"],
  "recommendation": "Specific refactoring recommendation",
  "destinationFile": "Where to extract (e.g., utils/geometry.js)",
  "estimatedEffort": "S" | "M" | "L",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}`;

  const response = await model.invoke([
    { role: 'user', content: prompt }
  ]);
  
  try {
    // Strip markdown code blocks if present
    let content = response.content;
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const analysis = JSON.parse(content);
    
    // Only include if should refactor and confidence is not LOW
    if (analysis.shouldRefactor && analysis.confidence !== 'LOW') {
      return {
        ...analysis,
        locations: [
          `${pair.block1.filePath}:${pair.block1.startLine}-${pair.block1.endLine}`,
          `${pair.block2.filePath}:${pair.block2.startLine}-${pair.block2.endLine}`,
        ],
        similarity: pair.similarity,
        codeSnippets: [
          { file: pair.block1.filePath, code: pair.block1.code.split('\n').slice(0, 15).join('\n') },
          { file: pair.block2.filePath, code: pair.block2.code.split('\n').slice(0, 15).join('\n') },
        ],
      };
    }
  } catch (error) {
    console.warn(`\n⚠️  Failed to parse Claude response:`, error.message);
  }
  
  return null;
}

/**
 * Calculate priority score for a finding
 * @param {Object} finding - Analysis finding
 * @returns {number} Priority score (0-10)
 */
export function calculatePriorityScore(finding) {
  let score = 0;
  
  // Severity contribution (0-3)
  const severityScores = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
  score += severityScores[finding.severity] || 0;
  
  // Confidence contribution (0-3)
  const confidenceScores = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  score += confidenceScores[finding.confidence] || 0;
  
  // Risk contribution (0-2, inverted)
  const riskScores = { LOW: 2, MEDIUM: 1, HIGH: 0 };
  score += riskScores[finding.riskLevel] || 0;
  
  // Effort contribution (0-2)
  const effortScores = { S: 2, M: 1, L: 0 };
  score += effortScores[finding.estimatedEffort] || 0;
  
  return Math.min(10, score);
}

