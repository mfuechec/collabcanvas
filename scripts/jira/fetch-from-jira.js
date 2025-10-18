#!/usr/bin/env node

/**
 * Fetch Jira Tickets Script
 * 
 * Fetches tickets from your Jira board.
 * Useful for agents to query their assigned tasks.
 * 
 * Usage:
 *   node scripts/jira/fetch-from-jira.js                    # All open tickets
 *   node scripts/jira/fetch-from-jira.js --agent=AGENT-1    # Agent-specific tickets
 *   node scripts/jira/fetch-from-jira.js --status=TODO      # Filter by status
 *   node scripts/jira/fetch-from-jira.js --export           # Export to JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'CRM';

// Parse command line arguments
const args = process.argv.slice(2);
const agentFilter = args.find(a => a.startsWith('--agent='))?.split('=')[1];
const statusFilter = args.find(a => a.startsWith('--status='))?.split('=')[1];
const shouldExport = args.includes('--export');

class JiraClient {
  constructor() {
    this.baseUrl = `https://${JIRA_HOST}/rest/api/3`;
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

    return response.json();
  }

  async searchIssues(jql) {
    const body = {
      jql: jql,
      fields: ['summary', 'description', 'status', 'priority', 'assignee', 'labels', 'created', 'updated'],
      maxResults: 100
    };
    return this.request('POST', `/search/jql`, body);
  }
}

async function fetchTickets() {
  console.log('🔍 Fetching tickets from Jira...\n');

  const jira = new JiraClient();

  // Build JQL query
  let jql = `project = ${JIRA_PROJECT_KEY}`;

  if (statusFilter) {
    jql += ` AND status = "${statusFilter}"`;
  } else {
    jql += ` AND status != Done`;
  }

  if (agentFilter) {
    jql += ` AND labels = "${agentFilter.toLowerCase()}"`;
  }

  jql += ` ORDER BY priority DESC, created DESC`;

  console.log(`📋 Query: ${jql}\n`);

  const result = await jira.searchIssues(jql);
  const tickets = result.issues;

  if (tickets.length === 0) {
    console.log('No tickets found matching criteria.');
    return;
  }

  console.log(`Found ${tickets.length} ticket(s):\n`);
  console.log('═══════════════════════════════════════════\n');

  const ticketData = [];

  for (const ticket of tickets) {
    const fields = ticket.fields;
    const assignee = fields.assignee ? fields.assignee.displayName : 'Unassigned';
    const labels = fields.labels;

    console.log(`🎫 ${ticket.key}: ${fields.summary}`);
    console.log(`   Status:   ${fields.status.name}`);
    console.log(`   Priority: ${fields.priority.name}`);
    console.log(`   Assignee: ${assignee}`);
    if (labels.length > 0) {
      console.log(`   Labels:   ${labels.join(', ')}`);
    }
    console.log(`   Link:     https://${JIRA_HOST}/browse/${ticket.key}`);
    console.log('');

    ticketData.push({
      key: ticket.key,
      summary: fields.summary,
      status: fields.status.name,
      priority: fields.priority.name,
      assignee: assignee,
      labels: labels,
      created: fields.created,
      updated: fields.updated,
      link: `https://${JIRA_HOST}/browse/${ticket.key}`,
    });
  }

  if (shouldExport) {
    const exportFile = path.join(rootDir, '.jira-tickets.json');
    fs.writeFileSync(exportFile, JSON.stringify({ tickets: ticketData, fetched: new Date().toISOString() }, null, 2));
    console.log(`✅ Exported to .jira-tickets.json\n`);
  }

  console.log('═══════════════════════════════════════════');
}

fetchTickets().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

