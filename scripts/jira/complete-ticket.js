#!/usr/bin/env node

/**
 * Complete Jira Ticket Script
 * 
 * Moves ticket from In Review → Done, deletes preview channel, merges to main, 
 * deploys to production, cleans up branch.
 * 
 * Usage:
 *   node scripts/jira/complete-ticket.js CRM-19
 *   node scripts/jira/complete-ticket.js  # Auto-detects from current branch
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
let ticketKey = args[0];

// If no ticket provided, try to extract from current branch
if (!ticketKey) {
  try {
    const branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const match = branchName.match(/^([A-Z]+-\d+)/);
    if (match) {
      ticketKey = match[1];
      console.log(`🔍 Detected ticket from branch: ${ticketKey}\n`);
    }
  } catch (error) {
    // Ignore
  }
}

if (!ticketKey) {
  console.error('❌ Please provide a ticket key or run from a ticket branch\n');
  console.error('Usage: node scripts/jira/complete-ticket.js CRM-19');
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
    const response = await fetch(`${this.baseUrl}/3/issue/${key}?fields=summary,status`, {
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

  async addComment(key, prodUrl) {
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
              content: [
                { type: "text", text: "✅ Deployed to Production", marks: [{ type: "strong" }] }
              ]
            },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Production URL: " },
                { 
                  type: "text", 
                  text: prodUrl,
                  marks: [{ type: "link", attrs: { href: prodUrl } }]
                }
              ]
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Merged to main and preview channel deleted." }]
            }
          ]
        }
      })
    });
    if (!response.ok) throw new Error(`Failed to add comment: ${response.status}`);
  }
}

async function completeTicket() {
  console.log(`🎫 Completing ${ticketKey}...\n`);

  const jira = new JiraClient();

  // Get ticket info
  const ticket = await jira.getIssue(ticketKey);
  console.log(`📋 ${ticket.fields.summary}`);
  console.log(`   Current status: ${ticket.fields.status.name}\n`);

  if (ticket.fields.status.name !== "In Review") {
    console.error(`❌ Ticket is in ${ticket.fields.status.name}, not "In Review"`);
    console.error('Can only move to Done from In Review');
    process.exit(1);
  }

  // Detect if we're in a worktree
  let isWorktree = false;
  let worktreePath = null;
  let mainRepoPath = null;
  
  try {
    const gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
    isWorktree = !gitDir.endsWith('.git');
    
    if (isWorktree) {
      worktreePath = process.cwd();
      const commonDir = execSync('git rev-parse --git-common-dir', { encoding: 'utf8' }).trim();
      mainRepoPath = path.dirname(commonDir);
      console.log('📂 Running in worktree\n');
    }
  } catch (error) {
    console.error('❌ Failed to detect git environment:', error.message);
    process.exit(1);
  }

  // Get current branch
  const branchName = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`🌿 Branch: ${branchName}\n`);

  // Check for uncommitted changes
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim()) {
    console.log('📝 Committing final changes...');
    execSync('git add -A');
    execSync(`git commit -m "Final changes for ${ticketKey}"`, { stdio: 'inherit' });
    execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
    console.log('✅ Changes committed and pushed\n');
  }

  // Delete preview channel
  const channelName = ticketKey.toLowerCase();
  console.log(`🗑️  Deleting preview channel: ${channelName}...`);
  try {
    execSync(`firebase hosting:channel:delete ${channelName} --force`, { stdio: 'pipe' });
    console.log('✅ Preview channel deleted\n');
  } catch {
    console.log('⚠️  Preview channel not found or already deleted\n');
  }

  // Switch to main repo if in worktree
  if (isWorktree) {
    console.log(`📂 Switching to main repo: ${mainRepoPath}\n`);
    process.chdir(mainRepoPath);
  }

  // Merge to main (squash all commits into one)
  console.log('🔀 Squash merging to main...');
  execSync('git checkout main', { stdio: 'inherit' });
  execSync('git pull origin main', { stdio: 'inherit' });
  
  const mergeMessage = `${ticketKey}: ${ticket.fields.summary}\n\nCloses ${ticketKey}`;
  execSync(`git merge ${branchName} --squash`, { stdio: 'inherit' });
  execSync(`git commit -m "${mergeMessage}"`, { stdio: 'inherit' });
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✅ Squash merged to main (single commit)\n');

  // Deploy to production
  console.log('🚀 Deploying to production...');
  execSync('npm run build', { stdio: 'inherit' });
  const firebaseProject = process.env.FIREBASE_PROJECT_ID || 'collabcanvas-5b9fb';
  execSync(`firebase deploy --only hosting --project ${firebaseProject}`, { stdio: 'inherit' });
  console.log('✅ Deployed to production\n');

  const prodUrl = 'https://collabcanvas-5b9fb.web.app';

  // Transition to Done
  const { transitions } = await jira.getTransitions(ticketKey);
  const doneTransition = transitions.find(t => 
    t.to.name === "Done" || 
    t.name.toLowerCase().includes("done") ||
    t.name.toLowerCase().includes("complete")
  );

  if (doneTransition) {
    await jira.transitionIssue(ticketKey, doneTransition.id);
    console.log('✅ Status: In Review → Done');
  } else {
    console.log('⚠️  No "Done" transition found');
  }

  // Add comment
  await jira.addComment(ticketKey, prodUrl);
  console.log('✅ Added completion comment\n');

  // Clean up branch/worktree (force delete since we squashed)
  console.log('🧹 Cleaning up...');
  
  if (isWorktree && worktreePath) {
    // Remove worktree (this also deletes the branch)
    try {
      execSync(`git worktree remove "${worktreePath}" --force`, { stdio: 'inherit' });
      console.log('✅ Worktree removed');
    } catch (error) {
      console.log('⚠️  Worktree cleanup may require manual action');
    }
  }
  
  // Delete branch locally and remotely
  try {
    execSync(`git branch -D ${branchName}`, { stdio: 'pipe' });
    console.log('✅ Local branch deleted');
  } catch {
    console.log('⚠️  Local branch already deleted');
  }
  
  try {
    execSync(`git push origin --delete ${branchName}`, { stdio: 'inherit' });
    console.log('✅ Remote branch deleted\n');
  } catch {
    console.log('⚠️  Remote branch already deleted\n');
  }

  console.log('━'.repeat(60));
  console.log(`✅ ${ticketKey} completed and deployed to production`);
  console.log(`🔗 Production: ${prodUrl}`);
  console.log(`🔗 Jira: https://${JIRA_HOST}/browse/${ticketKey}`);
  console.log('━'.repeat(60));
  console.log("\nYou're now on main branch. Ready for the next ticket!");
}

completeTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

