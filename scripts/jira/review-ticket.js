#!/usr/bin/env node

/**
 * Review Jira Ticket Script
 * 
 * Moves ticket from In Progress → In Review, builds, deploys to Firebase preview, updates Jira.
 * 
 * Usage:
 *   node scripts/jira/review-ticket.js CRM-19
 */

import { execSync } from 'child_process';
import path from 'path';
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

if (!ticketKey) {
  console.error('❌ Please provide a ticket key\n');
  console.error('Usage: node scripts/jira/review-ticket.js CRM-19');
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
    const response = await fetch(`${this.baseUrl}/3/issue/${key}?fields=summary,status,description`, {
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

  async addComment(key, previewUrl, testingInstructions) {
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
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Ready for review! 🚀" }]
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Preview: ", marks: [{ type: "strong" }] },
                { 
                  type: "text", 
                  text: previewUrl,
                  marks: [{ type: "link", attrs: { href: previewUrl } }]
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Manual Testing: ", marks: [{ type: "strong" }] },
                { type: "text", text: testingInstructions }
              ]
            }
          ]
        }
      })
    });
    if (!response.ok) throw new Error(`Failed to add comment: ${response.status}`);
  }
}

function extractTextFromDescription(desc) {
  if (!desc || !desc.content) return '';
  
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

// Helper to detect if we're in a worktree and get paths
function getWorktreeInfo() {
  try {
    // Check if .git is a file (worktree) or directory (main repo)
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    const isWorktree = !gitDir.endsWith('.git');
    
    if (isWorktree) {
      // Get the main repo root (where .git-worktrees lives)
      const commonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim();
      const mainRepoPath = path.dirname(commonDir);
      return {
        isWorktree: true,
        mainRepoPath,
        deployScriptPath: path.join(mainRepoPath, 'scripts/deploy/deploy-test.sh')
      };
    }
    
    return {
      isWorktree: false,
      mainRepoPath: process.cwd(),
      deployScriptPath: './scripts/deploy/deploy-test.sh'
    };
  } catch (error) {
    console.error('❌ Failed to detect git environment:', error.message);
    process.exit(1);
  }
}

function determineTestingInstructions(ticket) {
  const desc = extractTextFromDescription(ticket.fields.description);
  const summary = ticket.fields.summary.toLowerCase();
  
  // Check if it's documentation-only
  const isDocsOnly = desc.toLowerCase().includes('readme') || 
                     desc.toLowerCase().includes('documentation') ||
                     summary.includes('readme') ||
                     summary.includes('documentation') ||
                     summary.includes('docs');
  
  if (isDocsOnly) {
    return 'Documentation-only change, no functional testing required.';
  }
  
  // Extract files from description for code changes
  const filesMatch = desc.match(/Files to Modify:(.*?)(?:Complexity:|$)/s);
  if (filesMatch) {
    const files = filesMatch[1].trim().split('\n').filter(f => f.trim()).map(f => f.trim());
    return `Test the changes in: ${files.join(', ')}. Verify all functionality works as expected.`;
  }
  
  // Generic fallback
  return 'Test the preview environment thoroughly. Verify all changes work as expected.';
}

async function reviewTicket() {
  console.log(`🎫 Preparing ${ticketKey} for review...\n`);

  const jira = new JiraClient();

  // Get ticket info
  const ticket = await jira.getIssue(ticketKey);
  console.log(`📋 ${ticket.fields.summary}`);
  console.log(`   Current status: ${ticket.fields.status.name}\n`);

  // Get current branch
  const branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`🌿 Branch: ${branchName}`);

  // Verify we're on a branch for this ticket
  if (!branchName.startsWith(ticketKey)) {
    console.error(`\n❌ Current branch "${branchName}" doesn't match ticket ${ticketKey}`);
    console.error(`   Expected branch to start with: ${ticketKey}-`);
    console.error(`   Switch to the correct branch or run: node scripts/jira/start-ticket.js ${ticketKey}`);
    process.exit(1);
  }
  console.log('✅ Branch matches ticket\n');

  // Check for uncommitted changes and auto-commit if any
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('📝 Uncommitted changes detected - auto-committing...');
    execSync('git add -A', { stdio: 'inherit' });
    execSync(`git commit -m "Complete ${ticketKey}: ${ticket.fields.summary}"`, { stdio: 'inherit' });
    console.log('✅ Changes committed\n');
  } else {
    console.log('✅ No uncommitted changes\n');
  }

  // Detect worktree environment
  const worktreeInfo = getWorktreeInfo();
  if (worktreeInfo.isWorktree) {
    console.log('📂 Running in worktree\n');
  }

  // Deploy to preview channel using deploy-test.sh
  console.log(`🚀 Deploying to preview channel for ${ticketKey}...\n`);
  
  try {
    const deployOutput = execSync(
      `"${worktreeInfo.deployScriptPath}" ${ticketKey}`,
      { encoding: 'utf8' }
    );
    
    // Extract the actual preview URL from deploy script output
    const channelName = ticketKey.toLowerCase();
    const urlRegex = new RegExp(`https://[^\\s]+--${channelName}[^\\s]+\\.web\\.app`, 'i');
    const urlMatch = deployOutput.match(urlRegex);
    const previewUrl = urlMatch ? urlMatch[0] : `https://collabcanvas-5b9fb--${channelName}.web.app`;
    
    console.log(deployOutput); // Show deploy output

    // Push branch
    console.log(`📤 Pushing branch: ${branchName}...`);
    try {
      execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
    } catch {
      execSync(`git push origin ${branchName} --force-with-lease`, { stdio: 'inherit' });
    }
    console.log('✅ Branch pushed\n');

    // Transition to In Review
    const { transitions } = await jira.getTransitions(ticketKey);
    const reviewTransition = transitions.find(t => 
      t.to.name === "In Review" || 
      t.name.toLowerCase().includes("review")
    );

    if (reviewTransition) {
      await jira.transitionIssue(ticketKey, reviewTransition.id);
      console.log('✅ Status: In Progress → In Review');
    } else {
      console.log('⚠️  No "In Review" transition found');
    }

    // Determine testing instructions and add comment
    const testingInstructions = determineTestingInstructions(ticket);
    await jira.addComment(ticketKey, previewUrl, testingInstructions);
    console.log('✅ Added preview URL and testing instructions to ticket\n');

    console.log('━'.repeat(60));
    console.log(`✅ ${ticketKey} moved to In Review`);
    console.log(`🔗 Preview: ${previewUrl}`);
    console.log(`🔗 Jira: https://${JIRA_HOST}/browse/${ticketKey}`);
    console.log('━'.repeat(60));
    console.log('\nReady for testing! Preview uses production database and auth.');
    
  } catch (error) {
    console.error('❌ Firebase deployment failed:', error.message);
    process.exit(1);
  }
}

reviewTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

