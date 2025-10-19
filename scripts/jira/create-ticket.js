#!/usr/bin/env node

/**
 * Create Jira Ticket Script
 * 
 * Quickly creates a Jira ticket with auto-detected labels and complexity.
 * 
 * Usage:
 *   node scripts/jira/create-ticket.js "Fix minimap circles" "Circles rendering as ovals due to scaling"
 *   node scripts/jira/create-ticket.js "Add keyboard shortcuts" "Implement Ctrl+C/V/Z" --complexity=Low
 *   node scripts/jira/create-ticket.js "Title" "Description" --labels=frontend,ai
 */

import dotenv from 'dotenv';
dotenv.config();

const JIRA_HOST = process.env.JIRA_HOST;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'CRM';
const JIRA_ISSUE_TYPE = process.env.JIRA_ISSUE_TYPE || 'Task';

// Parse command line arguments
const args = process.argv.slice(2);
const title = args[0];
const description = args[1];
const complexityOverride = args.find(a => a.startsWith('--complexity='))?.split('=')[1];
const labelsOverride = args.find(a => a.startsWith('--labels='))?.split('=')[1]?.split(',');

if (!title || !description) {
  console.error('❌ Missing required arguments\n');
  console.error('Usage: node scripts/jira/create-ticket.js <title> <description> [options]\n');
  console.error('Example:');
  console.error('  node scripts/jira/create-ticket.js "Fix bug" "Description here"\n');
  console.error('Options:');
  console.error('  --complexity=Low|Medium|High  Override auto-detected complexity');
  console.error('  --labels=label1,label2        Override auto-detected labels');
  process.exit(1);
}

if (!JIRA_HOST || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing Jira credentials in .env file\n');
  console.error('Required environment variables:');
  console.error('  JIRA_HOST');
  console.error('  JIRA_EMAIL');
  console.error('  JIRA_API_TOKEN');
  process.exit(1);
}

// Label detection rules
const LABEL_RULES = {
  frontend: ['ui', 'component', 'react', 'button', 'jsx', 'styling', 'css', 'toolbar', 'panel', 'modal'],
  backend: ['service', 'firebase', 'database', 'api', 'firestore', 'rtdb', 'server'],
  ai: ['ai', 'llm', 'prompt', 'model', 'gpt', 'openai', 'anthropic', 'agent'],
  canvas: ['canvas', 'konva', 'shape', 'render', 'draw', 'minimap', 'zoom', 'pan'],
  collaboration: ['cursor', 'presence', 'real-time', 'realtime', 'multiplayer', 'sync', 'collaborative'],
  testing: ['test', 'e2e', 'validation', 'playwright', 'unit test', 'integration'],
  performance: ['optimize', 'cache', 'performance', 'speed', 'latency', 'slow', 'profil'],
  auth: ['auth', 'login', 'security', 'permission', 'sign-in', 'authentication'],
  infra: ['deploy', 'ci/cd', 'build', 'config', 'vite', 'webpack', 'tooling']
};

// Complexity indicators
const COMPLEXITY_INDICATORS = {
  high: ['refactor', 'redesign', 'rewrite', 'multiple files', 'architecture', 'migration', 'breaking change'],
  medium: ['add', 'implement', 'create', 'build', 'integrate', 'update', 'enhance'],
  low: ['fix', 'bug', 'typo', 'update text', 'adjust', 'tweak', 'polish']
};

function detectLabels(text) {
  const lowerText = text.toLowerCase();
  const matches = [];

  for (const [label, keywords] of Object.entries(LABEL_RULES)) {
    const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matchCount > 0) {
      matches.push({ label, count: matchCount });
    }
  }

  // Sort by match count and take top 2
  matches.sort((a, b) => b.count - a.count);
  const labels = matches.slice(0, 2).map(m => m.label);

  return labels.length > 0 ? labels : ['general'];
}

function detectComplexity(text) {
  const lowerText = text.toLowerCase();

  // Check for high complexity indicators
  for (const indicator of COMPLEXITY_INDICATORS.high) {
    if (lowerText.includes(indicator)) {
      return 'High';
    }
  }

  // Check for low complexity indicators
  for (const indicator of COMPLEXITY_INDICATORS.low) {
    if (lowerText.includes(indicator)) {
      return 'Low';
    }
  }

  // Default to medium
  return 'Medium';
}

class JiraClient {
  constructor() {
    this.baseUrl = `https://${JIRA_HOST}/rest/api/3`;
    this.auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  }

  async createIssue(issueData) {
    const url = `${this.baseUrl}/issue`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(issueData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    return response.json();
  }
}

async function createTicket() {
  console.log('🎫 Creating Jira ticket...\n');

  // Detect labels and complexity
  const combinedText = `${title} ${description}`;
  const labels = labelsOverride || detectLabels(combinedText);
  const complexity = complexityOverride || detectComplexity(combinedText);

  console.log(`📋 Title: ${title}`);
  console.log(`📝 Description: ${description}`);
  console.log(`🏷️  Detected labels: ${labels.join(', ')}`);
  console.log(`⚡ Complexity: ${complexity}\n`);

  // Build description with complexity
  const descriptionWithComplexity = `${description}\n\n**Complexity:** ${complexity}`;

  // Format description as Atlassian Document Format
  const descriptionDoc = {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{
          type: "text",
          text: description
        }]
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Complexity: ",
            marks: [{ type: "strong" }]
          },
          {
            type: "text",
            text: complexity
          }
        ]
      }
    ]
  };

  const issueData = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: title,
      description: descriptionDoc,
      issuetype: { name: JIRA_ISSUE_TYPE },
      labels: labels
    }
  };

  const jira = new JiraClient();
  const result = await jira.createIssue(issueData);

  console.log('━'.repeat(60));
  console.log(`✅ Created: ${result.key}`);
  console.log(`🏷️  Labels: ${labels.join(', ')}`);
  console.log(`⚡ Complexity: ${complexity}`);
  console.log(`🔗 ${result.self.replace('/rest/api/3/issue/' + result.id, '/browse/' + result.key)}`);
  console.log('━'.repeat(60));
}

createTicket().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

