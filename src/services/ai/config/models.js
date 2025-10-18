import { ChatOpenAI } from '@langchain/openai';
import { executionPlanSchema } from '../planning/schemas.js';

// Get API key from environment
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ VITE_OPENAI_API_KEY is not set in .env file');
  throw new Error('OpenAI API key is required. Please add VITE_OPENAI_API_KEY to your .env file.');
}

// Initialize OpenAI models
export const gpt4o = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.2,
  apiKey: OPENAI_API_KEY,
  configuration: {
    apiKey: OPENAI_API_KEY,
  },
});

export const gpt4oMini = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.2,
  apiKey: OPENAI_API_KEY,
  configuration: {
    apiKey: OPENAI_API_KEY,
  },
});

// Structured output models (with schema validation)
// ⚠️ IMPORTANT: Use includeRaw: true to preserve response_metadata for cache monitoring
export const gpt4oStructured = gpt4o.withStructuredOutput(executionPlanSchema, { 
  includeRaw: true  // Preserves response_metadata with usage stats
});
export const gpt4oMiniStructured = gpt4oMini.withStructuredOutput(executionPlanSchema, { 
  includeRaw: true  // Preserves response_metadata with usage stats
});

