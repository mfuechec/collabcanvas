#!/usr/bin/env node

/**
 * Delete Jira Ticket Script
 * 
 * Permanently deletes a Jira ticket. Use with caution!
 * 
 * Usage:
 *   node scripts/jira/delete-ticket.js CRM-28
 *   node scripts/jira/delete-ticket.js CRM-28 --force  # Skip confirmation
 */

import dotenv from 'dotenv';
import { createInterface } from 'readline';
dotenv.config();

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const args = process.argv.slice(2);
const ticketKey = args[0];
const forceDelete = args.includes('--force');

if (!ticketKey) {
  console.error('❌ Please provide a ticket key\n');
  console.error('Usage: node scripts/jira/delete-ticket.js CRM-28');
  console.error('       node scripts/jira/delete-ticket.js CRM-28 --force');
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
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Ticket not found');
      }
      throw new Error(`Failed to fetch ticket: ${response.status}`);
    }
    return response.json();
  }

  async deleteIssue(key) {
    const response = await fetch(`${this.baseUrl}/3/issue/${key}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Basic ${this.auth}` }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete: ${error}`);
    }
  }
}

async function confirmDelete() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Are you sure you want to delete this ticket? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function deleteTicket() {
  console.log(`🗑️  Delete Jira Ticket: ${ticketKey}\n`);

  const jira = new JiraClient();

  // Get ticket info
  let ticket;
  try {
    ticket = await jira.getIssue(ticketKey);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  console.log(`📋 ${ticketKey}: ${ticket.fields.summary}`);
  console.log(`   Status: ${ticket.fields.status.name}\n`);
  
  // Confirm deletion
  if (!forceDelete) {
    console.log('⚠️  WARNING: This action cannot be undone!\n');
    const confirmed = await confirmDelete();
    
    if (!confirmed) {
      console.log('\n❌ Deletion cancelled');
      process.exit(0);
    }
    console.log('');
  }

  // Delete ticket
  try {
    await jira.deleteIssue(ticketKey);
    console.log('━'.repeat(60));
    console.log(`✅ ${ticketKey} deleted successfully`);
    console.log('━'.repeat(60));
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

deleteTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

