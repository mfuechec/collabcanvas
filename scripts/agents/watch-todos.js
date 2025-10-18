/**
 * TODO File Watcher
 * 
 * Watches TODO.md for changes and automatically triggers analysis
 * when new tasks are added (status: 📋 Needs Analysis)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TODO_PATH = path.join(__dirname, '../../TODO.md');
const ANALYZE_SCRIPT = path.join(__dirname, 'analyze-todos.js');

let analyzing = false;
let pendingAnalysis = false;

console.log('👀 TODO File Watcher Starting...');
console.log(`📁 Watching: ${TODO_PATH}\n`);

// Debounce timer
let debounceTimer = null;

// Run analysis
function runAnalysis() {
  if (analyzing) {
    console.log('⏳ Analysis already running, will run again when complete...');
    pendingAnalysis = true;
    return;
  }
  
  analyzing = true;
  pendingAnalysis = false;
  
  console.log('\n🔍 TODO.md changed - triggering analysis...\n');
  
  const child = spawn('node', [ANALYZE_SCRIPT], {
    stdio: 'inherit',
    env: process.env
  });
  
  child.on('close', (code) => {
    analyzing = false;
    
    if (code === 0) {
      console.log('\n✅ Analysis complete. Watching for changes...\n');
    } else {
      console.error(`\n❌ Analysis failed with code ${code}\n`);
    }
    
    // If another change occurred during analysis, run again
    if (pendingAnalysis) {
      console.log('🔄 Running pending analysis...');
      setTimeout(runAnalysis, 1000);
    }
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start analysis:', error);
    analyzing = false;
  });
}

// Watch for file changes
fs.watch(TODO_PATH, (eventType, filename) => {
  if (eventType === 'change') {
    // Debounce: wait 1 second after last change
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runAnalysis();
    }, 1000);
  }
});

console.log('✅ Watcher active. Press Ctrl+C to stop.\n');
console.log('💡 Edit TODO.md to trigger automatic analysis\n');

// Keep process alive
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down watcher...');
  process.exit(0);
});

