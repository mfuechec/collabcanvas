/**
 * TODO Analysis Agent (Compact Format)
 * 
 * Analyzes tasks in TODO.md:
 * 1. Identifies relevant files
 * 2. Estimates complexity
 * 3. Assesses impact
 * 4. Writes detailed analysis to .todo-analysis/
 * 5. Updates TODO.md with compact summary
 * 
 * Only analyzes tasks with status "📋 Needs Analysis"
 * Updates status to "🎯 Ready" after analysis to prevent re-analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuration
const TODO_PATH = path.join(__dirname, '../../TODO.md');
const ANALYSIS_DIR = path.join(__dirname, '../../.todo-analysis');
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ VITE_OPENAI_API_KEY not found in environment');
  process.exit(1);
}

// Create slug from task title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

// Simple OpenAI API call (no LangChain dependency)
async function callOpenAI(prompt, model = 'gpt-4o') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Parse compact TODO.md format
function parseTodoList(markdown) {
  const tasks = [];
  const lines = markdown.split('\n');
  
  let currentPriority = null;
  let currentTask = null;
  let inSummary = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track priority sections
    if (line.startsWith('## 🔴')) currentPriority = 'critical';
    else if (line.startsWith('## 🟡')) currentPriority = 'important';
    else if (line.startsWith('## 🟢')) currentPriority = 'nice-to-have';
    else if (line.startsWith('## ⏸️')) currentPriority = 'backlog';
    else if (line.startsWith('## ✅')) currentPriority = 'done';
    
    // New task (### Title)
    if (line.startsWith('### ') && currentPriority && currentPriority !== 'done') {
      if (currentTask) tasks.push(currentTask);
      
      currentTask = {
        title: line.replace('### ', '').trim(),
        priority: currentPriority,
        status: '',
        added: '',
        estimated: '',
        impact: '',
        complexity: '',
        summary: '',
        keyFiles: '',
        analysisLink: '',
        startLine: i,
        endLine: i
      };
      inSummary = false;
    }
    
    // Parse compact metadata line
    else if (currentTask && line.startsWith('**Status:**')) {
      // Format: **Status:** 🎯 Ready | **Est:** 20h | **Impact:** HIGH | **Complexity:** MEDIUM
      const statusMatch = line.match(/\*\*Status:\*\*\s+([^|]+)/);
      const estMatch = line.match(/\*\*Est:\*\*\s+([^|]+)/);
      const impactMatch = line.match(/\*\*Impact:\*\*\s+([^|]+)/);
      const complexityMatch = line.match(/\*\*Complexity:\*\*\s+(.+)/);
      
      if (statusMatch) currentTask.status = statusMatch[1].trim();
      if (estMatch) currentTask.estimated = estMatch[1].trim();
      if (impactMatch) currentTask.impact = impactMatch[1].trim();
      if (complexityMatch) currentTask.complexity = complexityMatch[1].trim();
    }
    
    // Parse added/analysis link line
    else if (currentTask && line.includes('**Added:**')) {
      const addedMatch = line.match(/\*\*Added:\*\*\s+([^|]+)/);
      const linkMatch = line.match(/\[📋 Analysis\]\(([^)]+)\)/);
      
      if (addedMatch) currentTask.added = addedMatch[1].trim();
      if (linkMatch) currentTask.analysisLink = linkMatch[1].trim();
    }
    
    // Parse quick summary
    else if (currentTask && line.startsWith('**Quick Summary:**')) {
      inSummary = true;
    }
    else if (inSummary && line.trim() && !line.startsWith('**')) {
      currentTask.summary += line.trim() + ' ';
    }
    
    // Parse key files
    else if (currentTask && line.startsWith('**Key Files:**')) {
      currentTask.keyFiles = line.replace('**Key Files:**', '').trim();
      inSummary = false;
    }
    
    // Track legacy format for migration
    else if (currentTask && line.startsWith('**Description:**')) {
      // This is old format - still parse it for migration
      currentTask.isLegacy = true;
    }
    
    if (currentTask) {
      currentTask.endLine = i;
    }
  }
  
  if (currentTask) tasks.push(currentTask);
  return tasks;
}

// Find relevant files using grep
function findRelevantFiles(taskTitle, taskSummary) {
  const keywords = extractKeywords(taskTitle + ' ' + taskSummary);
  const foundFiles = new Set();
  
  for (const keyword of keywords) {
    try {
      let command;
      try {
        execSync('which rg', { stdio: 'ignore' });
        command = `rg -l "${keyword}" src/ 2>/dev/null || true`;
      } catch {
        command = `grep -r -l "${keyword}" src/ 2>/dev/null || true`;
      }
      
      const result = execSync(command, { encoding: 'utf-8' });
      const files = result.split('\n').filter(f => f.trim());
      files.forEach(f => foundFiles.add(f));
    } catch (error) {
      // Ignore errors
    }
  }
  
  return Array.from(foundFiles);
}

// Extract keywords from task description
function extractKeywords(description) {
  const keywords = new Set();
  const lower = description.toLowerCase();
  
  // Shape-related
  if (lower.includes('shape')) {
    keywords.add('shape');
    keywords.add('Shape');
  }
  
  // AI-related
  if (lower.includes('ai') || lower.includes('gpt') || lower.includes('prompt')) {
    keywords.add('aiAgent');
    keywords.add('AI');
    keywords.add('gpt');
  }
  
  // Canvas-related
  if (lower.includes('canvas') || lower.includes('viewport')) {
    keywords.add('canvas');
    keywords.add('Canvas');
    keywords.add('viewport');
  }
  
  // Component-specific
  if (lower.includes('minimap')) keywords.add('Minimap');
  if (lower.includes('toolbar')) keywords.add('Toolbar');
  if (lower.includes('sidebar')) keywords.add('Sidebar');
  if (lower.includes('button')) keywords.add('Button');
  if (lower.includes('hover')) keywords.add('hover');
  
  // Coordinate-related
  if (lower.includes('position') || lower.includes('coordinate')) {
    keywords.add('position');
    keywords.add('coordinate');
  }
  
  // Firebase-related
  if (lower.includes('firebase') || lower.includes('firestore') || lower.includes('database')) {
    keywords.add('firebase');
    keywords.add('firestore');
    keywords.add('db.collection');
  }
  
  // UI/CSS
  if (lower.includes('style') || lower.includes('css') || lower.includes('transition')) {
    keywords.add('className');
    keywords.add('style');
    keywords.add('transition');
  }
  
  return Array.from(keywords);
}

// Analyze a single task
async function analyzeTask(task) {
  console.log(`\n📋 Analyzing: ${task.title}`);
  
  const relevantFiles = findRelevantFiles(task.title, task.summary);
  
  console.log(`   Found ${relevantFiles.length} potentially relevant files`);
  
  if (relevantFiles.length === 0) {
    return {
      relevantFiles: [],
      keyFiles: [],
      complexity: 'UNKNOWN',
      estimatedHours: '?',
      impact: 'UNKNOWN',
      riskLevel: 'Unknown',
      reasoning: 'Could not identify relevant files. Task description may be too vague or files may not exist yet.',
      impactReasoning: 'Unable to assess impact without relevant files.',
      approach: ['Add more specific keywords to task summary', 'Manually specify files in context'],
      dependencies: { blocks: 'None', blockedBy: 'None' },
      analyzedAt: new Date().toISOString()
    };
  }
  
  // Get file sizes for top files
  const fileDetails = relevantFiles.slice(0, 10).map(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;
      return `${file} (${lines} lines)`;
    } catch {
      return `${file} (unreadable)`;
    }
  }).join('\n');
  
  // Ask GPT to analyze
  const prompt = `Analyze this development task and provide structured estimates.

**Task:** ${task.title}

**Summary:**
${task.summary || 'No summary provided'}

**Potentially Relevant Files:**
${fileDetails}
${relevantFiles.length > 10 ? `\n...and ${relevantFiles.length - 10} more files` : ''}

Provide analysis in this exact format:

**Relevant Files:** (list 3-5 most relevant files with brief reason)
- src/path/to/file.js - Reason it's relevant

**Complexity:** [LOW / MEDIUM / HIGH]
**Estimated Time:** X hours (or X-Y hours for range)
**Risk Level:** [Low / Medium / High]

**Reasoning:**
Brief explanation of complexity estimate (2-3 sentences)

**Impact:** [LOW / MEDIUM / HIGH / CRITICAL]
**Impact Reasoning:**
Brief explanation of user/technical impact (2-3 sentences)

**Recommended Approach:**
1. Step one
2. Step two
3. Step three
(add more steps if needed)

**Dependencies:**
- Blocks: [Other tasks this blocks, or "None"]
- Blocked by: [Tasks that must be completed first, or "None"]

Be concise and specific. Base estimates on the actual files found.`;

  const analysisText = await callOpenAI(prompt, 'gpt-4o');
  
  // Parse the response to extract key fields
  const complexityMatch = analysisText.match(/\*\*Complexity:\*\*\s+(LOW|MEDIUM|HIGH)/);
  const timeMatch = analysisText.match(/\*\*Estimated Time:\*\*\s+([^\n]+)/);
  const impactMatch = analysisText.match(/\*\*Impact:\*\*\s+(LOW|MEDIUM|HIGH|CRITICAL)/);
  const riskMatch = analysisText.match(/\*\*Risk Level:\*\*\s+([^\n]+)/);
  
  // Extract key files (first 3-5 listed)
  const filesSection = analysisText.match(/\*\*Relevant Files:\*\*[\s\S]*?(?=\n\*\*|$)/);
  const keyFiles = [];
  if (filesSection) {
    const fileLines = filesSection[0].match(/- ([^-\n]+)/g) || [];
    fileLines.slice(0, 3).forEach(line => {
      const fileName = line.replace(/^- /, '').split(' ')[0].replace(/^src\//, '');
      keyFiles.push(fileName);
    });
  }
  
  return {
    fullAnalysis: analysisText,
    complexity: complexityMatch ? complexityMatch[1] : 'MEDIUM',
    estimatedHours: timeMatch ? timeMatch[1].trim() : '?',
    impact: impactMatch ? impactMatch[1] : 'MEDIUM',
    riskLevel: riskMatch ? riskMatch[1].trim() : 'Medium',
    keyFiles: keyFiles.join(', ') || 'See analysis',
    analyzedAt: new Date().toISOString()
  };
}

// Write detailed analysis to separate file
function writeAnalysisFile(task, analysis) {
  const slug = createSlug(task.title);
  const analysisPath = path.join(ANALYSIS_DIR, `${slug}.md`);
  
  const content = `# ${task.title}

**Priority:** ${task.priority}  
**Added:** ${task.added}  
**Analyzed:** ${new Date().toISOString().split('T')[0]}  

---

## Task Summary

${task.summary || 'No summary provided'}

---

## Detailed Analysis

${analysis.fullAnalysis}

---

## Metadata

- **Complexity:** ${analysis.complexity}
- **Estimated Time:** ${analysis.estimatedHours}
- **Impact:** ${analysis.impact}
- **Risk Level:** ${analysis.riskLevel}
- **Analysis Date:** ${new Date().toISOString()}

---

*This analysis was generated automatically. Review and adjust as needed.*
`;

  fs.writeFileSync(analysisPath, content, 'utf-8');
  console.log(`   📄 Wrote analysis to .todo-analysis/${slug}.md`);
  
  return slug;
}

// Update TODO.md with compact format
function updateTodoWithCompactFormat(markdown, task, analysis, slug) {
  const lines = markdown.split('\n');
  
  // Find task section
  let taskStart = -1;
  let taskEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === `### ${task.title}`) {
      taskStart = i;
    }
    if (taskStart !== -1 && (lines[i].startsWith('### ') || lines[i].startsWith('## ')) && i > taskStart) {
      taskEnd = i;
      break;
    }
  }
  
  if (taskStart === -1) {
    console.warn(`   ⚠️  Could not find task "${task.title}" in TODO.md`);
    return markdown;
  }
  
  if (taskEnd === -1) {
    taskEnd = lines.length;
  }
  
  // Build compact task format
  const beforeTask = lines.slice(0, taskStart);
  const afterTask = lines.slice(taskEnd);
  
  const taskLines = [
    `### ${task.title}`,
    `**Status:** 🎯 Ready | **Est:** ${analysis.estimatedHours} | **Impact:** ${analysis.impact} | **Complexity:** ${analysis.complexity}`,
    `**Added:** ${task.added} | [📋 Analysis](/.todo-analysis/${slug}.md)`,
    ``,
    `**Quick Summary:**`,
    task.summary.trim() || 'No summary provided',
    ``,
    `**Key Files:** ${analysis.keyFiles}`,
    ``
  ];
  
  return [...beforeTask, ...taskLines, ...afterTask].join('\n');
}

// Update stats section
function updateStats(markdown, tasks) {
  const stats = {
    total: tasks.filter(t => t.priority !== 'done').length,
    ready: tasks.filter(t => t.status.includes('🎯')).length,
    needsAnalysis: tasks.filter(t => t.status.includes('📋')).length,
    inProgress: tasks.filter(t => t.status.includes('🚧')).length,
    blocked: tasks.filter(t => t.status.includes('⏸️')).length
  };
  
  const statsSection = `## 📊 Quick Stats

- **Total Active:** ${stats.total} | **Ready:** ${stats.ready} | **Needs Analysis:** ${stats.needsAnalysis} | **In Progress:** ${stats.inProgress} | **Blocked:** ${stats.blocked}`;

  // Remove ALL existing Quick Stats sections
  let cleanedMarkdown = markdown;
  while (cleanedMarkdown.includes('## 📊 Quick Stats')) {
    cleanedMarkdown = cleanedMarkdown.replace(/## 📊 Quick Stats[\s\S]*?(?=\n## |$)/m, '');
  }
  
  return cleanedMarkdown.trim() + '\n\n' + statsSection + '\n';
}

// Main execution
async function main() {
  console.log('🤖 TODO Analysis Agent (Compact Format) Starting...\n');
  
  if (!fs.existsSync(TODO_PATH)) {
    console.error(`❌ TODO.md not found at ${TODO_PATH}`);
    process.exit(1);
  }
  
  let markdown = fs.readFileSync(TODO_PATH, 'utf-8');
  
  // Update timestamp
  const now = new Date().toISOString().split('T')[0];
  markdown = markdown.replace(
    /> Last updated: .* \|/,
    `> Last updated: ${now} |`
  );
  
  const tasks = parseTodoList(markdown);
  const needsAnalysis = tasks.filter(t => t.status.includes('📋 Needs Analysis') || t.status === '📋');
  
  console.log(`Found ${tasks.length} total tasks`);
  console.log(`Found ${needsAnalysis.length} tasks needing analysis\n`);
  
  if (needsAnalysis.length === 0) {
    console.log('✅ All tasks are already analyzed!');
    
    // Update stats and timestamp
    markdown = updateStats(markdown, tasks);
    markdown = markdown.replace(
      /Last analyzed: .*/,
      `Last analyzed: ${now}`
    );
    
    fs.writeFileSync(TODO_PATH, markdown, 'utf-8');
    return;
  }
  
  // Analyze each task
  for (const task of needsAnalysis) {
    try {
      const analysis = await analyzeTask(task);
      const slug = writeAnalysisFile(task, analysis);
      markdown = updateTodoWithCompactFormat(markdown, task, analysis, slug);
      
      console.log(`   ✅ Analysis complete`);
      
      // Rate limit: wait 2 seconds between API calls
      if (needsAnalysis.indexOf(task) < needsAnalysis.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }
  
  // Update stats
  markdown = updateStats(markdown, parseTodoList(markdown));
  
  // Update timestamp
  markdown = markdown.replace(
    /Last analyzed: .*/,
    `Last analyzed: ${now}`
  );
  
  // Write updated TODO.md
  fs.writeFileSync(TODO_PATH, markdown, 'utf-8');
  
  console.log('\n✅ Analysis complete. TODO.md updated with compact format.');
  console.log(`📁 Detailed analysis files in .todo-analysis/`);
  console.log(`\n📊 Analyzed ${needsAnalysis.length} task(s)`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
