/**
 * Report Generator
 * 
 * Generates DRY_OPPORTUNITIES.md report with findings
 */

import { writeFile } from 'fs/promises';
import { calculatePriorityScore } from './semantic-analyzer.js';

/**
 * Generate markdown report
 * @param {Array} findings - Analysis findings
 * @param {Object} inventory - Code inventory
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
export async function generateReport(findings, inventory, config) {
  console.log('\n📄 Generating report...');
  
  // Calculate priority scores and sort
  const scoredFindings = findings.map(finding => ({
    ...finding,
    priorityScore: calculatePriorityScore(finding),
  }));
  
  // Sort by priority (highest first)
  scoredFindings.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Group by severity
  const grouped = {
    CRITICAL: scoredFindings.filter(f => f.severity === 'CRITICAL'),
    HIGH: scoredFindings.filter(f => f.severity === 'HIGH'),
    MEDIUM: scoredFindings.filter(f => f.severity === 'MEDIUM'),
    LOW: scoredFindings.filter(f => f.severity === 'LOW'),
  };
  
  // Generate markdown
  const markdown = generateMarkdown(grouped, inventory, config);
  
  // Write to file
  const outputFile = config.output.file;
  await writeFile(outputFile, markdown, 'utf-8');
  
  console.log(`✅ Report saved to ${outputFile}`);
  console.log(`📊 Summary:`);
  console.log(`   🔴 CRITICAL: ${grouped.CRITICAL.length}`);
  console.log(`   🟡 HIGH:     ${grouped.HIGH.length}`);
  console.log(`   🟢 MEDIUM:   ${grouped.MEDIUM.length}`);
  console.log(`   ⚪ LOW:      ${grouped.LOW.length}`);
}

/**
 * Generate markdown content
 * @param {Object} grouped - Findings grouped by severity
 * @param {Object} inventory - Code inventory
 * @param {Object} config - Configuration
 * @returns {string} Markdown content
 */
function generateMarkdown(grouped, inventory, config) {
  const totalFindings = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
  const timestamp = new Date().toISOString().split('T')[0];
  
  let md = `# DRY Opportunities Report\n\n`;
  md += `**Generated:** ${timestamp}\n`;
  md += `**Files Analyzed:** ${inventory.stats.totalFiles}\n`;
  md += `**Total Lines:** ${inventory.stats.totalLines.toLocaleString()}\n`;
  md += `**Findings:** ${totalFindings}\n\n`;
  
  md += `---\n\n`;
  
  // Executive Summary
  md += `## Executive Summary\n\n`;
  md += `| Severity | Count | Action Required |\n`;
  md += `|----------|-------|------------------|\n`;
  md += `| 🔴 CRITICAL | ${grouped.CRITICAL.length} | Fix immediately |\n`;
  md += `| 🟡 HIGH | ${grouped.HIGH.length} | Fix soon |\n`;
  md += `| 🟢 MEDIUM | ${grouped.MEDIUM.length} | Refactor when convenient |\n`;
  md += `| ⚪ LOW | ${grouped.LOW.length} | Nice to have |\n\n`;
  
  if (totalFindings === 0) {
    md += `✅ **No significant duplication detected!** Your codebase follows DRY principles well.\n\n`;
    return md;
  }
  
  // High-Impact Recommendations
  const topFindings = [...grouped.CRITICAL, ...grouped.HIGH].slice(0, 5);
  if (topFindings.length > 0) {
    md += `### 🎯 Top Priority Recommendations\n\n`;
    topFindings.forEach((finding, index) => {
      md += `${index + 1}. **${finding.title}** (Priority: ${finding.priorityScore}/10)\n`;
      md += `   - Confidence: ${finding.confidence}\n`;
      md += `   - Effort: ${finding.estimatedEffort} (${getEffortDescription(finding.estimatedEffort)})\n`;
      md += `   - Locations: ${finding.locations.length} occurrences\n\n`;
    });
  }
  
  md += `---\n\n`;
  
  // Detailed Findings by Severity
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severityEmojis = { CRITICAL: '🔴', HIGH: '🟡', MEDIUM: '🟢', LOW: '⚪' };
  
  for (const severity of severities) {
    const findings = grouped[severity];
    if (findings.length === 0) continue;
    
    md += `## ${severityEmojis[severity]} ${severity} Priority (${findings.length})\n\n`;
    
    findings.forEach((finding, index) => {
      md += generateFindingSection(finding, index + 1, config);
      md += `\n---\n\n`;
    });
  }
  
  // Appendix
  md += `## Appendix\n\n`;
  md += `### Methodology\n\n`;
  md += `This report was generated using:\n`;
  md += `1. **Embeddings-based pre-filtering** - OpenAI ${config.ai.embeddingsModel}\n`;
  md += `2. **Semantic analysis** - Claude ${config.ai.model}\n`;
  md += `3. **Project-specific rules** - .cursor/rules/dry-enforcement.mdc\n\n`;
  
  md += `### Success Criteria\n\n`;
  md += `**Ideal State:**\n`;
  md += `- ✅ No CRITICAL findings\n`;
  md += `- ✅ <5 HIGH findings\n`;
  md += `- ✅ <10 MEDIUM findings\n\n`;
  
  md += `**Current Status:**\n`;
  md += `- ${grouped.CRITICAL.length === 0 ? '✅' : '❌'} CRITICAL: ${grouped.CRITICAL.length}\n`;
  md += `- ${grouped.HIGH.length < 5 ? '✅' : '⚠️'} HIGH: ${grouped.HIGH.length}\n`;
  md += `- ${grouped.MEDIUM.length < 10 ? '✅' : '⚠️'} MEDIUM: ${grouped.MEDIUM.length}\n\n`;
  
  md += `### Files Analyzed\n\n`;
  md += `\`\`\`\n`;
  for (const [ext, count] of Object.entries(inventory.stats.filesByType)) {
    md += `.${ext}: ${count} files\n`;
  }
  md += `\`\`\`\n\n`;
  
  md += `---\n\n`;
  md += `*Report generated by DRY Analysis Agent*\n`;
  
  return md;
}

/**
 * Generate a single finding section
 * @param {Object} finding - Finding data
 * @param {number} index - Finding index
 * @param {Object} config - Configuration
 * @returns {string} Markdown section
 */
function generateFindingSection(finding, index, config) {
  let md = `### ${index}. ${finding.title}\n\n`;
  
  md += `**Priority Score:** ${finding.priorityScore}/10\n\n`;
  
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Confidence | ${getConfidenceEmoji(finding.confidence)} ${finding.confidence} |\n`;
  md += `| Risk Level | ${getRiskEmoji(finding.riskLevel)} ${finding.riskLevel} |\n`;
  md += `| Effort | ${finding.estimatedEffort} (${getEffortDescription(finding.estimatedEffort)}) |\n`;
  md += `| Similarity | ${(finding.similarity * 100).toFixed(1)}% |\n\n`;
  
  md += `**Locations** (${finding.locations.length} occurrences):\n`;
  finding.locations.forEach(loc => {
    md += `- \`${loc}\`\n`;
  });
  md += `\n`;
  
  if (finding.differences && finding.differences.length > 0) {
    md += `**Differences:**\n`;
    finding.differences.forEach(diff => {
      md += `- ${diff}\n`;
    });
    md += `\n`;
  }
  
  md += `**Reasoning:**\n`;
  md += `${finding.reasoning}\n\n`;
  
  md += `**Recommendation:**\n`;
  md += `${finding.recommendation}\n\n`;
  
  if (finding.destinationFile) {
    md += `**Extract to:** \`${finding.destinationFile}\`\n\n`;
  }
  
  // Code snippets
  if (config.output.includeCodeSnippets && finding.codeSnippets) {
    md += `<details>\n`;
    md += `<summary>📝 View Code Snippets</summary>\n\n`;
    
    finding.codeSnippets.forEach((snippet, i) => {
      md += `**${snippet.file}:**\n`;
      md += `\`\`\`javascript\n`;
      md += snippet.code;
      if (snippet.code.split('\n').length >= 15) {
        md += `\n// ... (truncated)`;
      }
      md += `\n\`\`\`\n\n`;
    });
    
    md += `</details>\n\n`;
  }
  
  return md;
}

/**
 * Get effort description
 * @param {string} effort - S, M, or L
 * @returns {string} Description
 */
function getEffortDescription(effort) {
  const descriptions = {
    S: '<15 minutes',
    M: '15-45 minutes',
    L: '>45 minutes',
  };
  return descriptions[effort] || 'Unknown';
}

/**
 * Get confidence emoji
 * @param {string} confidence - HIGH, MEDIUM, or LOW
 * @returns {string} Emoji
 */
function getConfidenceEmoji(confidence) {
  const emojis = {
    HIGH: '🟢',
    MEDIUM: '🟡',
    LOW: '🔴',
  };
  return emojis[confidence] || '⚪';
}

/**
 * Get risk emoji
 * @param {string} risk - LOW, MEDIUM, or HIGH
 * @returns {string} Emoji
 */
function getRiskEmoji(risk) {
  const emojis = {
    LOW: '✅',
    MEDIUM: '⚠️',
    HIGH: '❌',
  };
  return emojis[risk] || '⚪';
}

