#!/usr/bin/env node

/**
 * DRY Analysis Agent
 * 
 * Analyzes codebase for DRY (Don't Repeat Yourself) opportunities using:
 * - Fast embedding-based similarity detection
 * - Claude 3.5 Haiku for semantic analysis
 * - Project-specific DRY enforcement rules
 * 
 * Usage:
 *   npm run dry-check
 *   npm run dry-check -- --verbose
 *   npm run dry-check -- --incremental
 */

// Load environment variables from .env file
import { config as loadEnv } from 'dotenv';
loadEnv();

// Ensure OPENAI_API_KEY is set for LangChain (it reads this directly)
if (!process.env.OPENAI_API_KEY && process.env.VITE_OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
}

import { scanCodebase } from './analyzers/codebase-scanner.js';
import { analyzeForDuplication } from './analyzers/semantic-analyzer.js';
import { generateReport } from './analyzers/report-generator.js';
import config from './config/dry-agent-config.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  incremental: args.includes('--incremental') || args.includes('-i'),
  help: args.includes('--help') || args.includes('-h'),
};

// Show help
if (flags.help) {
  console.log(`
DRY Analysis Agent - Intelligent Code Duplication Detector

Usage:
  npm run dry-check                 Run full analysis
  npm run dry-check -- --verbose    Show detailed progress
  npm run dry-check -- --incremental Analyze only changed files (git diff)
  npm run dry-check -- --help       Show this help

Environment Variables Required:
  VITE_OPENAI_API_KEY       - OpenAI API key (for embeddings)
  VITE_ANTHROPIC_API_KEY    - Anthropic API key (for Claude analysis)
  or ANTHROPIC_API_KEY

Configuration:
  Edit scripts/config/dry-agent-config.js to customize:
  - File patterns to analyze
  - Similarity thresholds
  - AI model settings
  - Output format

Rules:
  DRY enforcement rules: .cursor/rules/dry-enforcement.mdc
  General DRY rules: .cursor/rules/general-dry-rules.mdc
  `);
  process.exit(0);
}

// Override config with flags
if (flags.verbose) {
  config.reporting.verbose = true;
  config.reporting.showProgress = true;
  config.reporting.logLevel = 'debug';
}

/**
 * Main execution function
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║      🤖  DRY Analysis Agent v1.0                ║');
  console.log('║      Intelligent Code Duplication Detector      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
  
  const startTime = performance.now();
  
  // Check environment variables
  if (!checkEnvironment()) {
    process.exit(1);
  }
  
  // Check rules file exists
  if (!existsSync('.cursor/rules/dry-enforcement.mdc')) {
    console.error('❌ Error: DRY enforcement rules not found!');
    console.error('   Expected: .cursor/rules/dry-enforcement.mdc');
    process.exit(1);
  }
  
  try {
    // Step 1: Scan codebase
    const inventory = await scanCodebase(config);
    
    if (inventory.files.length === 0) {
      console.log('\n⚠️  No files found to analyze. Check your include/exclude patterns.');
      process.exit(0);
    }
    
    // Step 2: Analyze for duplication
    const findings = await analyzeForDuplication(inventory, config);
    
    // Step 3: Generate report
    await generateReport(findings, inventory, config);
    
    // Summary
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`\n╔══════════════════════════════════════════════════╗`);
    console.log(`║  ✅  Analysis Complete in ${elapsed}s`.padEnd(51) + '║');
    console.log(`╚══════════════════════════════════════════════════╝\n`);
    
    if (findings.length > 0) {
      console.log(`📋 Report: ${config.output.file}`);
      console.log(`📊 ${findings.length} opportunities found to improve code quality\n`);
    } else {
      console.log(`✅ No significant duplication detected!`);
      console.log(`   Your codebase follows DRY principles well.\n`);
    }
    
    // Exit with code based on findings
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      console.log(`⚠️  ${criticalCount} CRITICAL issues require immediate attention\n`);
      process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error during analysis:', error.message);
    if (config.reporting.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Check required environment variables
 * @returns {boolean} True if environment is valid
 */
function checkEnvironment() {
  let isValid = true;
  
  // OpenAI is always required (for embeddings)
  if (!process.env.VITE_OPENAI_API_KEY) {
    console.error(`❌ Missing environment variable: VITE_OPENAI_API_KEY`);
    console.error(`   Description: OpenAI API key (required for embeddings and analysis)`);
    isValid = false;
  }
  
  // Check provider-specific requirements
  if (config.ai.provider === 'anthropic') {
    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.error(`❌ Missing environment variable: VITE_ANTHROPIC_API_KEY`);
      console.error(`   (or ANTHROPIC_API_KEY)`);
      console.error(`   Description: Anthropic API key for Claude analysis`);
      console.error(`   Tip: Change config.ai.provider to 'openai' to use OpenAI only`);
      isValid = false;
    }
  }
  
  if (!isValid) {
    console.error('\nPlease set required environment variables in your .env file:');
    console.error('  VITE_OPENAI_API_KEY=your_openai_key');
    if (config.ai.provider === 'anthropic') {
      console.error('  VITE_ANTHROPIC_API_KEY=your_anthropic_key');
    }
    console.error('\nOr edit scripts/config/dry-agent-config.js to change AI provider.\n');
  }
  
  return isValid;
}

/**
 * Handle process signals
 */
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Analysis interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Analysis terminated');
  process.exit(143);
});

process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error.message);
  if (config.reporting.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

// Run main function
main();

