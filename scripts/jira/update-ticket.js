#!/usr/bin/env node

/**
 * Update Jira Ticket Script
 * 
 * Updates the status or properties of a Jira ticket.
 * Useful for agents to update their progress.
 * 
 * Usage:
 *   node scripts/jira/update-ticket.js CC-123 --status="In Progress"
 *   node scripts/jira/update-ticket.js CC-123 --comment="Working on this now"
 *   node scripts/jira/update-ticket.js CC-123 --assign=me
 *   node scripts/jira/update-ticket.js CC-123 --status="Done" --comment="Completed!"
 */

import dotenv from 'dotenv';
dotenv.config();

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const args = process.argv.slice(2);
const ticketKey = args[0];

if (!ticketKey) {
  console.error('❌ Please provide a ticket key (e.g., CRM-123)');
  console.error('Usage: node scripts/jira/update-ticket.js CRM-123 --status="In Progress"');
  process.exit(1);
}

const statusArg = args.find(a => a.startsWith('--status='))?.split('=')[1]?.replace(/['"]/g, '');
const commentArg = args.find(a => a.startsWith('--comment='))?.split('=')[1]?.replace(/['"]/g, '');
const assignArg = args.find(a => a.startsWith('--assign='))?.split('=')[1]?.replace(/['"]/g, '');

class JiraClient {
  constructor() {
    this.baseUrl = `https://${JIRA_HOST}/rest/api/2`;
    this.auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  }

  async request(method, endpoint, body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Basic ${this.auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    if (method === 'GET' || method === 'POST') {
      return response.json();
    }
  }

  async getTransitions(issueKey) {
    return this.request('GET', `/issue/${issueKey}/transitions`);
  }

  async transitionIssue(issueKey, transitionId) {
    const url = `${this.baseUrl}/issue/${issueKey}/transitions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transition: { id: transitionId } })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }
    // Successful transition returns 204 No Content
    return;
  }

  async addComment(issueKey, comment) {
    return this.request('POST', `/issue/${issueKey}/comment`, {
      body: comment
    });
  }

  async assignIssue(issueKey, assignee) {
    return this.request('PUT', `/issue/${issueKey}/assignee`, {
      name: assignee === 'me' ? JIRA_EMAIL : assignee
    });
  }

  async getIssue(issueKey) {
    return this.request('GET', `/issue/${issueKey}?fields=summary,status`);
  }
}

async function updateTicket() {
  console.log(`🎫 Updating ticket ${ticketKey}...\n`);

  const jira = new JiraClient();

  // Get current ticket info
  const issue = await jira.getIssue(ticketKey);
  console.log(`📋 ${issue.fields.summary}`);
  console.log(`   Current status: ${issue.fields.status.name}\n`);

  // Update status
  if (statusArg) {
    console.log(`🔄 Changing status to "${statusArg}"...`);
    const transitions = await jira.getTransitions(ticketKey);
    const transition = transitions.transitions.find(
      t => t.name.toLowerCase() === statusArg.toLowerCase() || 
           t.to.name.toLowerCase() === statusArg.toLowerCase() ||
           t.to.name.toLowerCase().includes(statusArg.toLowerCase())
    );

    if (!transition) {
      console.error(`❌ Could not find transition to "${statusArg}"`);
      console.error('Available transitions:');
      transitions.transitions.forEach(t => console.error(`   - ${t.name} → ${t.to.name}`));
      process.exit(1);
    }

    await jira.transitionIssue(ticketKey, transition.id);
    console.log(`   ✅ Status updated to "${transition.to.name}"\n`);
  }

  // Add comment
  if (commentArg) {
    console.log('💬 Adding comment...');
    await jira.addComment(ticketKey, commentArg);
    console.log('   ✅ Comment added\n');
  }

  // Assign ticket
  if (assignArg) {
    console.log(`👤 Assigning to ${assignArg}...`);
    await jira.assignIssue(ticketKey, assignArg);
    console.log('   ✅ Ticket assigned\n');
  }

  console.log(`✅ Update complete!`);
  console.log(`🔗 View ticket: https://${JIRA_HOST}/browse/${ticketKey}\n`);
}

updateTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

