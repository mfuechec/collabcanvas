#!/usr/bin/env node

/**
 * Start Jira Ticket Script
 * 
 * Moves ticket from SCOPED → In Progress, creates git worktree with feature branch, and updates Jira.
 * Creates isolated workspace in ../.git-worktrees/ for parallel development.
 * Automatically copies .env and installs dependencies in the worktree.
 * 
 * Usage:
 *   node scripts/jira/start-ticket.js CRM-19
 *   node scripts/jira/start-ticket.js CRM-19 --branch-name="custom-branch-name"
 *   node scripts/jira/start-ticket.js CRM-19 --skip-install  # Skip npm install (use symlinks)
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const args = process.argv.slice(2);
const ticketKey = args[0];
const branchNameOverride = args.find(a => a.startsWith('--branch-name='))?.split('=')[1];
const skipInstall = args.includes('--skip-install');

if (!ticketKey) {
  console.error('❌ Please provide a ticket key\n');
  console.error('Usage: node scripts/jira/start-ticket.js CRM-19 [--skip-install]');
  process.exit(1);
}

if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing Jira credentials in .env');
  process.exit(1);
}

class JiraClient {
  constructor() {
    this.baseUrl = `https://${JIRA_HOST}/rest/api`;
    this.auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  }

  async getIssue(key) {
    const response = await fetch(`${this.baseUrl}/3/issue/${key}?fields=summary,status,assignee,description`, {
      headers: { 'Authorization': `Basic ${this.auth}` }
    });
    if (!response.ok) throw new Error(`Failed to fetch ticket: ${response.status}`);
    return response.json();
  }

  async getTransitions(key) {
    const response = await fetch(`${this.baseUrl}/2/issue/${key}/transitions`, {
      headers: { 'Authorization': `Basic ${this.auth}` }
    });
    if (!response.ok) throw new Error(`Failed to get transitions: ${response.status}`);
    return response.json();
  }

  async transitionIssue(key, transitionId) {
    const response = await fetch(`${this.baseUrl}/2/issue/${key}/transitions`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transition: { id: transitionId } })
    });
    if (!response.ok) throw new Error(`Failed to transition: ${response.status}`);
  }

  async addComment(key, text) {
    const response = await fetch(`${this.baseUrl}/3/issue/${key}/comment`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: {
          type: "doc",
          version: 1,
          content: [{
            type: "paragraph",
            content: [
              { type: "text", text: "Started work on branch: " },
              { type: "text", text, marks: [{ type: "code" }] }
            ]
          }]
        }
      })
    });
    if (!response.ok) throw new Error(`Failed to add comment: ${response.status}`);
  }
}

function createBranchName(ticketKey, summary) {
  if (branchNameOverride) return branchNameOverride;
  
  // Convert summary to branch-friendly format
  const words = summary.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .slice(0, 4);
  
  return `${ticketKey}-${words.join('-')}`;
}

async function startTicket() {
  console.log(`🎫 Starting work on ${ticketKey}...\n`);

  const jira = new JiraClient();

  // Get ticket info
  const ticket = await jira.getIssue(ticketKey);
  console.log(`📋 ${ticket.fields.summary}`);
  console.log(`   Current status: ${ticket.fields.status.name}\n`);

  // Ensure we're on main and up to date
  console.log('🔄 Ensuring main branch is up to date...');
  try {
    execSync('git checkout main', { stdio: 'inherit' });
    execSync('git pull origin main', { stdio: 'inherit' });
    console.log('✅ Main branch updated\n');
  } catch (error) {
    console.error('❌ Failed to update main branch:', error.message);
    process.exit(1);
  }

  // Create worktree
  const branchName = createBranchName(ticketKey, ticket.fields.summary);
  const worktreePath = path.resolve(__dirname, '../../..', '.git-worktrees', branchName);
  
  console.log(`🌿 Creating worktree: ${branchName}`);
  console.log(`📂 Location: ${worktreePath}\n`);
  
  try {
    // Create worktree with new branch
    execSync(`git worktree add "${worktreePath}" -b ${branchName}`, { stdio: 'inherit' });
    console.log('✅ Worktree created\n');
  } catch (error) {
    console.error('❌ Failed to create worktree:', error.message);
    process.exit(1);
  }

  // Setup worktree environment
  console.log('⚙️  Setting up worktree environment...\n');
  
  // Copy .env file
  const mainRepoPath = path.resolve(__dirname, '../..');
  const mainEnvPath = path.join(mainRepoPath, '.env');
  const worktreeEnvPath = path.join(worktreePath, '.env');
  
  if (fs.existsSync(mainEnvPath)) {
    fs.copyFileSync(mainEnvPath, worktreeEnvPath);
    console.log('✅ Copied .env file');
  } else {
    console.log('⚠️  No .env file found in main repo');
  }
  
  // Install dependencies (unless skipped)
  if (skipInstall) {
    console.log('⏭️  Skipping npm install (--skip-install flag)\n');
  } else {
    console.log('📦 Installing dependencies (this may take a minute)...');
    try {
      execSync('npm install', { 
        cwd: worktreePath,
        stdio: 'inherit'
      });
      console.log('✅ Dependencies installed\n');
    } catch (error) {
      console.error('⚠️  npm install failed:', error.message);
      console.log('   You may need to run npm install manually\n');
    }
  }

  // Set terminal title
  console.log(`\x1b]0;${ticketKey}: ${ticket.fields.summary}\x07`);

  // Transition to In Progress
  const { transitions } = await jira.getTransitions(ticketKey);
  const inProgressTransition = transitions.find(t => 
    t.to.name === "In Progress" || 
    t.name.toLowerCase().includes("in progress") ||
    t.name.toLowerCase().includes("start")
  );

  if (inProgressTransition) {
    await jira.transitionIssue(ticketKey, inProgressTransition.id);
    console.log('✅ Status: SCOPED → In Progress');
  } else {
    console.log('⚠️  No "In Progress" transition found');
  }

  // Add comment with branch info
  await jira.addComment(ticketKey, branchName);
  console.log('✅ Added branch info to ticket\n');

  console.log('━'.repeat(60));
  console.log(`✅ ${ticketKey} ready for implementation`);
  console.log(`🌿 Branch: ${branchName}`);
  console.log(`🔗 https://${JIRA_HOST}/browse/${ticketKey}`);
  console.log('━'.repeat(60));
  console.log('');
  
  // Display task recap
  console.log('📋 Task Recap\n');
  console.log(`**${ticket.fields.summary}**\n`);
  
  // Extract implementation details from description
  const desc = ticket.fields.description;
  if (desc && desc.content) {
    const textContent = extractTextFromDescription(desc);
    
    // Look for key sections
    const sections = {
      approach: extractSection(textContent, 'Approach:', ['Files to Modify:', 'Complexity:']),
      files: extractSection(textContent, 'Files to Modify:', ['Complexity:', 'Estimate:']),
      complexity: extractSection(textContent, 'Complexity:', ['Estimate:', 'Risks:']),
      estimate: extractSection(textContent, 'Estimate:', ['Risks:', 'Testing:']),
    };
    
    if (sections.approach) console.log(`📝 Approach: ${sections.approach}`);
    if (sections.files) console.log(`📁 Files: ${sections.files}`);
    if (sections.complexity) console.log(`⚡ Complexity: ${sections.complexity}`);
    if (sections.estimate) console.log(`⏱️  Estimate: ${sections.estimate}`);
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log('Ready to start implementation? 🚀');
  console.log('─'.repeat(60));
  console.log('\n🚀 To switch to the worktree, run:\n');
  console.log(`   cd "${worktreePath}"`);
  console.log('');
}

// Helper function to extract text from Atlassian Document Format
function extractTextFromDescription(desc) {
  let text = '';
  
  function traverse(node) {
    if (node.text) {
      text += node.text + ' ';
    }
    if (node.content) {
      node.content.forEach(traverse);
    }
  }
  
  traverse(desc);
  return text;
}

// Helper function to extract section content
function extractSection(text, startMarker, endMarkers) {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;
  
  let endIdx = text.length;
  for (const endMarker of endMarkers) {
    const idx = text.indexOf(endMarker, startIdx);
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx;
    }
  }
  
  return text.substring(startIdx + startMarker.length, endIdx).trim();
}

startTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

