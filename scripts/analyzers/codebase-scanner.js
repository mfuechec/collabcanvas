/**
 * Codebase Scanner
 * 
 * Traverses the codebase and extracts code chunks for analysis.
 * Groups files by type and extracts functions/components.
 */

import fg from 'fast-glob';
import { readFile } from 'fs/promises';
import { basename, relative } from 'path';

/**
 * Scan the codebase and extract code chunks
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Scanned code inventory
 */
export async function scanCodebase(config) {
  console.log('🔍 Scanning codebase...');
  
  const startTime = performance.now();
  
  // Find all files matching patterns
  const files = await fg(config.include, {
    ignore: config.exclude,
    absolute: false,
  });

  console.log(`📁 Found ${files.length} files to analyze`);

  // Read and process files
  const inventory = {
    files: [],
    functions: [],
    components: [],
    patterns: [],
    stats: {
      totalFiles: files.length,
      totalLines: 0,
      filesByType: {},
    },
  };

  for (const filePath of files) {
    if (config.reporting.showProgress) {
      process.stdout.write(`\r  Processing: ${relative(process.cwd(), filePath).padEnd(60)}`);
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const fileData = analyzeFile(filePath, content, config);
      
      inventory.files.push(fileData);
      inventory.functions.push(...fileData.functions);
      inventory.components.push(...fileData.components);
      inventory.stats.totalLines += fileData.lineCount;
      
      // Track file types
      const ext = filePath.split('.').pop();
      inventory.stats.filesByType[ext] = (inventory.stats.filesByType[ext] || 0) + 1;
    } catch (error) {
      console.warn(`\n⚠️  Error reading ${filePath}:`, error.message);
    }
  }

  if (config.reporting.showProgress) {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Scanned ${files.length} files in ${elapsed}s`);
  console.log(`📊 Total lines: ${inventory.stats.totalLines.toLocaleString()}`);
  console.log(`🔧 Functions found: ${inventory.functions.length}`);
  console.log(`⚛️  Components found: ${inventory.components.length}`);

  return inventory;
}

/**
 * Analyze a single file
 * @param {string} filePath - Path to the file
 * @param {string} content - File content
 * @param {Object} config - Configuration object
 * @returns {Object} File analysis data
 */
function analyzeFile(filePath, content, config) {
  const lines = content.split('\n');
  const fileName = basename(filePath);
  
  const fileData = {
    path: filePath,
    name: fileName,
    lineCount: lines.length,
    imports: extractImports(content),
    exports: extractExports(content),
    functions: [],
    components: [],
    patterns: detectPatterns(content, config),
    hasFirebase: content.includes('firebase') || content.includes('firestore'),
    hasReact: content.includes('react') || content.includes('useState'),
    hasKonva: content.includes('konva') || content.includes('Shape'),
  };

  // Extract functions and components
  const codeBlocks = extractCodeBlocks(content, filePath, config);
  
  for (const block of codeBlocks) {
    if (block.type === 'component') {
      fileData.components.push(block);
    } else {
      fileData.functions.push(block);
    }
  }

  return fileData;
}

/**
 * Extract imports from file
 * @param {string} content - File content
 * @returns {Array<string>} Import statements
 */
function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * Extract exports from file
 * @param {string} content - File content
 * @returns {Array<string>} Export names
 */
function extractExports(content) {
  const exports = [];
  
  // Named exports: export function/const
  const namedExportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
  let match;
  
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Default exports
  if (content.includes('export default')) {
    exports.push('default');
  }
  
  return exports;
}

/**
 * Detect specific patterns in code
 * @param {string} content - File content
 * @param {Object} config - Configuration object
 * @returns {Object} Detected patterns
 */
function detectPatterns(content, config) {
  const detected = {
    firebaseOps: [],
    shapeOps: [],
    geometryOps: [],
    reactPatterns: [],
    constants: [],
  };

  for (const [category, patterns] of Object.entries(config.patterns)) {
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        detected[category].push(pattern);
      }
    }
  }

  return detected;
}

/**
 * Extract code blocks (functions, components, etc.)
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @param {Object} config - Configuration object
 * @returns {Array<Object>} Code blocks
 */
function extractCodeBlocks(content, filePath, config) {
  const blocks = [];
  const lines = content.split('\n');
  
  // Simple regex-based extraction (could be improved with AST parsing)
  const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/gm;
  const arrowFunctionRegex = /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm;
  const componentRegex = /^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w+)/gm;
  
  let match;
  
  // Extract regular functions
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    const block = extractBlock(content, startIndex, lines, config);
    
    if (block && block.lineCount >= config.thresholds.minLines) {
      blocks.push({
        type: name[0] === name[0].toUpperCase() ? 'component' : 'function',
        name,
        filePath,
        startLine: block.startLine,
        endLine: block.endLine,
        lineCount: block.lineCount,
        code: block.code,
        signature: match[0],
      });
    }
  }
  
  // Extract arrow functions
  arrowFunctionRegex.lastIndex = 0;
  while ((match = arrowFunctionRegex.exec(content)) !== null) {
    const name = match[1];
    const startIndex = match.index;
    const block = extractBlock(content, startIndex, lines, config);
    
    if (block && block.lineCount >= config.thresholds.minLines) {
      blocks.push({
        type: name[0] === name[0].toUpperCase() ? 'component' : 'function',
        name,
        filePath,
        startLine: block.startLine,
        endLine: block.endLine,
        lineCount: block.lineCount,
        code: block.code,
        signature: match[0],
      });
    }
  }
  
  return blocks;
}

/**
 * Extract a code block starting from a position
 * @param {string} content - Full file content
 * @param {number} startIndex - Starting character index
 * @param {Array<string>} lines - File lines
 * @param {Object} config - Configuration object
 * @returns {Object|null} Code block data
 */
function extractBlock(content, startIndex, lines, config) {
  const startLine = content.substring(0, startIndex).split('\n').length;
  
  // Find the opening brace
  let braceStart = content.indexOf('{', startIndex);
  if (braceStart === -1) return null;
  
  // Track brace depth to find matching closing brace
  let depth = 0;
  let i = braceStart;
  let braceEnd = -1;
  
  while (i < content.length) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
    i++;
  }
  
  if (braceEnd === -1) return null;
  
  const endLine = content.substring(0, braceEnd).split('\n').length;
  const lineCount = endLine - startLine + 1;
  
  // Don't extract blocks that are too long
  if (lineCount > config.thresholds.maxLines) {
    return {
      startLine,
      endLine: startLine + config.thresholds.maxLines,
      lineCount: config.thresholds.maxLines,
      code: lines.slice(startLine - 1, startLine - 1 + config.thresholds.maxLines).join('\n') + '\n  // ... (truncated)',
    };
  }
  
  return {
    startLine,
    endLine,
    lineCount,
    code: lines.slice(startLine - 1, endLine).join('\n'),
  };
}

/**
 * Get high-priority files based on config
 * @param {Object} inventory - Code inventory
 * @param {Object} config - Configuration object
 * @returns {Array<Object>} Priority files
 */
export function getPriorityFiles(inventory, config) {
  const priorityFiles = [];
  
  for (const file of inventory.files) {
    for (const priorityDir of config.priorityDirectories) {
      if (file.path.includes(priorityDir)) {
        priorityFiles.push(file);
        break;
      }
    }
  }
  
  return priorityFiles;
}

