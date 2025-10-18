/**
 * TODO Archival Script
 * 
 * Moves completed tasks older than 7 days to monthly archive files
 * Format: .todo-archive/YYYY-MM.md
 * 
 * Run manually: npm run archive-todos
 * Or automate: weekly cron job, GitHub Actions, etc.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TODO_PATH = path.join(__dirname, '../../TODO.md');
const ARCHIVE_DIR = path.join(__dirname, '../../.todo-archive');
const DAYS_BEFORE_ARCHIVE = 7;

// Parse completed tasks from TODO.md
function parseCompletedTasks(markdown) {
  const lines = markdown.split('\n');
  const completedTasks = [];
  
  let inDoneSection = false;
  let currentTask = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track Done section
    if (line.startsWith('## ✅ Done')) {
      inDoneSection = true;
      continue;
    }
    
    // Exit Done section when hitting another section
    if (inDoneSection && line.startsWith('## ') && !line.startsWith('## ✅')) {
      inDoneSection = false;
      if (currentTask) completedTasks.push(currentTask);
      currentTask = null;
      continue;
    }
    
    // Parse completed task
    if (inDoneSection && line.startsWith('### ')) {
      if (currentTask) completedTasks.push(currentTask);
      
      // Format: ### Task Title ✅
      currentTask = {
        title: line.replace('### ', '').replace(' ✅', '').trim(),
        completed: '',
        priority: '',
        summary: '',
        startLine: i,
        endLine: i,
        content: []
      };
      currentTask.content.push(line);
    }
    
    // Parse metadata
    else if (inDoneSection && currentTask) {
      currentTask.content.push(line);
      currentTask.endLine = i;
      
      if (line.startsWith('**Completed:**')) {
        currentTask.completed = line.replace('**Completed:**', '').trim();
      }
      else if (line.startsWith('**Original Priority:**')) {
        currentTask.priority = line.replace('**Original Priority:**', '').trim();
      }
    }
  }
  
  if (currentTask && inDoneSection) {
    completedTasks.push(currentTask);
  }
  
  return completedTasks;
}

// Check if task should be archived
function shouldArchive(completedDate) {
  if (!completedDate) return false;
  
  try {
    const completed = new Date(completedDate);
    const now = new Date();
    const daysDiff = (now - completed) / (1000 * 60 * 60 * 24);
    
    return daysDiff > DAYS_BEFORE_ARCHIVE;
  } catch {
    return false;
  }
}

// Get month key from completed date
function getMonthKey(completedDate) {
  try {
    const date = new Date(completedDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return new Date().toISOString().substring(0, 7);
  }
}

// Archive tasks by month
function archiveTasks(tasks) {
  const archived = {};
  
  for (const task of tasks) {
    if (!shouldArchive(task.completed)) continue;
    
    const monthKey = getMonthKey(task.completed);
    
    if (!archived[monthKey]) {
      archived[monthKey] = [];
    }
    
    archived[monthKey].push(task);
  }
  
  return archived;
}

// Write archive file
function writeArchiveFile(monthKey, tasks) {
  const archivePath = path.join(ARCHIVE_DIR, `${monthKey}.md`);
  
  // Read existing archive if it exists
  let existingContent = '';
  if (fs.existsSync(archivePath)) {
    existingContent = fs.readFileSync(archivePath, 'utf-8');
  }
  
  // Build new content
  const [year, month] = monthKey.split('-');
  const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  let newContent = existingContent;
  
  // Add header if new file
  if (!existingContent) {
    newContent = `# Archived Tasks - ${monthName}

> Tasks completed during this month, automatically archived from TODO.md

---

`;
  }
  
  // Append tasks
  for (const task of tasks) {
    const taskContent = task.content.join('\n') + '\n\n';
    
    // Only add if not already in archive
    if (!newContent.includes(task.title)) {
      newContent += taskContent;
    }
  }
  
  fs.writeFileSync(archivePath, newContent, 'utf-8');
  console.log(`   📁 Archived ${tasks.length} task(s) to ${monthKey}.md`);
}

// Remove archived tasks from TODO.md
function removeArchivedTasks(markdown, archivedTasks) {
  const lines = markdown.split('\n');
  const toRemove = new Set();
  
  // Mark lines for removal
  for (const task of archivedTasks) {
    for (let i = task.startLine; i <= task.endLine; i++) {
      toRemove.add(i);
    }
  }
  
  // Rebuild markdown without archived tasks
  const filtered = lines.filter((_, i) => !toRemove.has(i));
  
  // Clean up extra blank lines in Done section
  let cleaned = filtered.join('\n');
  cleaned = cleaned.replace(/## ✅ Done \(Last 7 Days\)\n\n<!-- Recently completed tasks - archived weekly -->\n+/g, 
                            '## ✅ Done (Last 7 Days)\n\n<!-- Recently completed tasks - archived weekly -->\n\n');
  
  return cleaned;
}

// Main execution
function main() {
  console.log('📦 TODO Archival Script Starting...\n');
  
  if (!fs.existsSync(TODO_PATH)) {
    console.error(`❌ TODO.md not found at ${TODO_PATH}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
  
  const markdown = fs.readFileSync(TODO_PATH, 'utf-8');
  const completedTasks = parseCompletedTasks(markdown);
  
  console.log(`Found ${completedTasks.length} completed task(s)\n`);
  
  if (completedTasks.length === 0) {
    console.log('✅ No completed tasks to archive');
    return;
  }
  
  // Group tasks by month for archival
  const toArchive = archiveTasks(completedTasks);
  const allArchivedTasks = Object.values(toArchive).flat();
  
  if (allArchivedTasks.length === 0) {
    console.log(`✅ No tasks older than ${DAYS_BEFORE_ARCHIVE} days. Nothing to archive.`);
    return;
  }
  
  console.log(`Archiving ${allArchivedTasks.length} task(s) older than ${DAYS_BEFORE_ARCHIVE} days:\n`);
  
  // Write archive files
  for (const [monthKey, tasks] of Object.entries(toArchive)) {
    writeArchiveFile(monthKey, tasks);
  }
  
  // Update TODO.md
  const updatedMarkdown = removeArchivedTasks(markdown, allArchivedTasks);
  fs.writeFileSync(TODO_PATH, updatedMarkdown, 'utf-8');
  
  console.log('\n✅ Archive complete. TODO.md updated.');
  console.log(`📂 Archives in .todo-archive/`);
}

main();

