#!/usr/bin/env node

/**
 * Scope Jira Ticket Script
 * 
 * Moves a ticket from TO DO → SCOPED and adds implementation plan to description.
 * 
 * Usage:
 *   node scripts/jira/scope-ticket.js CRM-19 --approach="Add keyboard shortcuts" --files="CanvasToolbar.jsx,designSystem.js" --complexity=Low --estimate="2-3 hours"
 */

import dotenv from 'dotenv';
dotenv.config();

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const args = process.argv.slice(2);
const ticketKey = args[0];
const approach = args.find(a => a.startsWith('--approach='))?.split('=')[1]?.replace(/['"]/g, '');
const files = args.find(a => a.startsWith('--files='))?.split('=')[1]?.split(',') || [];
const complexity = args.find(a => a.startsWith('--complexity='))?.split('=')[1];
const estimate = args.find(a => a.startsWith('--estimate='))?.split('=')[1]?.replace(/['"]/g, '');
const risks = args.find(a => a.startsWith('--risks='))?.split('=')[1]?.replace(/['"]/g, '') || 'None identified';
const testing = args.find(a => a.startsWith('--testing='))?.split('=')[1]?.replace(/['"]/g, '') || 'Manual testing';

if (!ticketKey || !approach) {
  console.error('❌ Missing required arguments\n');
  console.error('Usage: node scripts/jira/scope-ticket.js <ticket-key> --approach="..." [options]\n');
  console.error('Required:');
  console.error('  --approach="Implementation approach"');
  console.error('\nOptional:');
  console.error('  --files="file1.js,file2.js"');
  console.error('  --complexity=Low|Medium|High');
  console.error('  --estimate="2-3 hours"');
  console.error('  --risks="Risk description"');
  console.error('  --testing="Testing approach"');
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

  async updateIssue(key, fields) {
    const response = await fetch(`${this.baseUrl}/3/issue/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields })
    });
    if (!response.ok) throw new Error(`Failed to update ticket: ${response.status}`);
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
    if (!response.ok) throw new Error(`Failed to transition ticket: ${response.status}`);
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
            content: [{ type: "text", text }]
          }]
        }
      })
    });
    if (!response.ok) throw new Error(`Failed to add comment: ${response.status}`);
  }
}

async function scopeTicket() {
  console.log(`🎫 Scoping ${ticketKey}...\n`);

  const jira = new JiraClient();

  // Get current ticket
  const ticket = await jira.getIssue(ticketKey);
  console.log(`📋 ${ticket.fields.summary}`);
  console.log(`   Current status: ${ticket.fields.status.name}\n`);

  // Build implementation plan description
  const descriptionContent = [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Implementation Plan" }]
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Approach: ", marks: [{ type: "strong" }] },
        { type: "text", text: approach }
      ]
    }
  ];

  if (files.length > 0) {
    descriptionContent.push({
      type: "paragraph",
      content: [{ type: "text", text: "Files to Modify:", marks: [{ type: "strong" }] }]
    });
    descriptionContent.push({
      type: "bulletList",
      content: files.map(file => ({
        type: "listItem",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: file.trim() }]
        }]
      }))
    });
  }

  if (complexity) {
    descriptionContent.push({
      type: "paragraph",
      content: [
        { type: "text", text: "Complexity: ", marks: [{ type: "strong" }] },
        { type: "text", text: complexity }
      ]
    });
  }

  if (estimate) {
    descriptionContent.push({
      type: "paragraph",
      content: [
        { type: "text", text: "Estimate: ", marks: [{ type: "strong" }] },
        { type: "text", text: estimate }
      ]
    });
  }

  descriptionContent.push({
    type: "paragraph",
    content: [
      { type: "text", text: "Risks: ", marks: [{ type: "strong" }] },
      { type: "text", text: risks }
    ]
  });

  descriptionContent.push({
    type: "paragraph",
    content: [
      { type: "text", text: "Testing: ", marks: [{ type: "strong" }] },
      { type: "text", text: testing }
    ]
  });

  const description = {
    type: "doc",
    version: 1,
    content: descriptionContent
  };

  // Update ticket description
  await jira.updateIssue(ticketKey, { description });
  console.log('✅ Added implementation plan to description');

  // Transition to SCOPED
  const { transitions } = await jira.getTransitions(ticketKey);
  const scopedTransition = transitions.find(t => 
    t.to.name === "SCOPED" || 
    t.name.toLowerCase().includes("scoped") ||
    t.to.name === "Scoped"
  );

  if (scopedTransition) {
    await jira.transitionIssue(ticketKey, scopedTransition.id);
    console.log('✅ Status: TO DO → SCOPED');
  } else {
    console.log('⚠️  No SCOPED transition found - ticket updated but status unchanged');
  }

  // Add comment
  await jira.addComment(ticketKey, 'Moved to SCOPED - implementation plan added to description');
  console.log('✅ Added comment\n');

  console.log('━'.repeat(60));
  console.log(`✅ ${ticketKey} scoped successfully`);
  console.log(`🔗 https://${JIRA_HOST}/browse/${ticketKey}`);
  console.log('━'.repeat(60));
}

scopeTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

