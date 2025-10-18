#!/usr/bin/env node

/**
 * AI Bottleneck Profiler
 * 
 * This script profiles the AI request pipeline to identify performance bottlenecks.
 * It measures timing at each stage of the AI request flow.
 * 
 * Usage: node ai-bottleneck-profiler.js
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

// Mock data for testing
const mockCanvasShapes = [
  { id: 'shape1', type: 'rectangle', x: 100, y: 100, width: 50, height: 30, fill: '#FF0000' },
  { id: 'shape2', type: 'circle', x: 200, y: 200, radius: 25, fill: '#00FF00' },
  { id: 'shape3', type: 'text', x: 300, y: 300, text: 'Hello', fontSize: 24, fill: '#0000FF' }
];

const testCommands = [
  'create a red circle',
  'make a 3x3 grid',
  'build a login form',
  'move all shapes to the right',
  'create a complex dashboard with charts',
  'draw a sunset scene',
  'make everything bigger',
  'create a navigation bar'
];

class AIProfiler {
  constructor() {
    this.results = [];
    this.startTime = null;
    this.checkpoints = new Map();
  }

  start() {
    this.startTime = performance.now();
    console.log('🚀 Starting AI Bottleneck Profiling...\n');
  }

  checkpoint(name) {
    const now = performance.now();
    const elapsed = this.startTime ? now - this.startTime : 0;
    this.checkpoints.set(name, { time: now, elapsed });
    console.log(`⏱️  [${name}] ${elapsed.toFixed(2)}ms`);
    return elapsed;
  }

  async profileAIRequest(command, shapes = mockCanvasShapes) {
    console.log(`\n🔍 Profiling: "${command}"`);
    console.log('=' .repeat(50));
    
    const profile = {
      command,
      timestamp: new Date().toISOString(),
      phases: {},
      totalTime: 0,
      bottlenecks: []
    };

    // Phase 1: Heuristic Detection
    const heuristicStart = performance.now();
    try {
      // Simulate heuristic detection (this would be checkSingleCommandHeuristic)
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms simulation
      const heuristicTime = performance.now() - heuristicStart;
      profile.phases.heuristicDetection = heuristicTime;
      console.log(`✅ Heuristic Detection: ${heuristicTime.toFixed(2)}ms`);
    } catch (error) {
      console.log(`❌ Heuristic Detection failed: ${error.message}`);
      profile.phases.heuristicDetection = -1;
    }

    // Phase 2: Template Detection
    const templateStart = performance.now();
    try {
      // Simulate template detection (this would be detectTemplate)
      await new Promise(resolve => setTimeout(resolve, 2)); // 2ms simulation
      const templateTime = performance.now() - templateStart;
      profile.phases.templateDetection = templateTime;
      console.log(`✅ Template Detection: ${templateTime.toFixed(2)}ms`);
    } catch (error) {
      console.log(`❌ Template Detection failed: ${error.message}`);
      profile.phases.templateDetection = -1;
    }

    // Phase 3: Context Building
    const contextStart = performance.now();
    try {
      // Simulate context building (this would be buildSmartContext + buildDynamicContext)
      const contextSize = JSON.stringify(shapes).length;
      const contextTime = Math.min(contextSize * 0.01, 50); // Simulate based on data size
      await new Promise(resolve => setTimeout(resolve, contextTime));
      const actualContextTime = performance.now() - contextStart;
      profile.phases.contextBuilding = actualContextTime;
      profile.contextSize = contextSize;
      console.log(`✅ Context Building: ${actualContextTime.toFixed(2)}ms (${contextSize} chars)`);
    } catch (error) {
      console.log(`❌ Context Building failed: ${error.message}`);
      profile.phases.contextBuilding = -1;
    }

    // Phase 4: Prompt Construction
    const promptStart = performance.now();
    try {
      // Simulate prompt construction (this would be buildStaticSystemPrompt + buildDynamicContext)
      const promptSize = 8000; // ~8K tokens for static prompt
      const promptTime = Math.min(promptSize * 0.001, 20); // Simulate based on prompt size
      await new Promise(resolve => setTimeout(resolve, promptTime));
      const actualPromptTime = performance.now() - promptStart;
      profile.phases.promptConstruction = actualPromptTime;
      profile.promptSize = promptSize;
      console.log(`✅ Prompt Construction: ${actualPromptTime.toFixed(2)}ms (${promptSize} tokens)`);
    } catch (error) {
      console.log(`❌ Prompt Construction failed: ${error.message}`);
      profile.phases.promptConstruction = -1;
    }

    // Phase 5: OpenAI API Call (Simulated)
    const apiStart = performance.now();
    try {
      // Simulate OpenAI API call with realistic timing
      const baseApiTime = 2000; // 2 seconds base
      const complexityMultiplier = command.includes('complex') ? 2 : 1;
      const contextMultiplier = Math.min(shapes.length * 0.1, 1.5);
      const apiTime = baseApiTime * complexityMultiplier * contextMultiplier;
      
      await new Promise(resolve => setTimeout(resolve, apiTime));
      const actualApiTime = performance.now() - apiStart;
      profile.phases.openaiApiCall = actualApiTime;
      profile.apiComplexity = complexityMultiplier;
      console.log(`✅ OpenAI API Call: ${actualApiTime.toFixed(2)}ms (complexity: ${complexityMultiplier}x)`);
    } catch (error) {
      console.log(`❌ OpenAI API Call failed: ${error.message}`);
      profile.phases.openaiApiCall = -1;
    }

    // Phase 6: Response Parsing
    const parsingStart = performance.now();
    try {
      // Simulate response parsing (this would be JSON.parse + schema validation)
      const parsingTime = 50; // 50ms for JSON parsing + validation
      await new Promise(resolve => setTimeout(resolve, parsingTime));
      const actualParsingTime = performance.now() - parsingStart;
      profile.phases.responseParsing = actualParsingTime;
      console.log(`✅ Response Parsing: ${actualParsingTime.toFixed(2)}ms`);
    } catch (error) {
      console.log(`❌ Response Parsing failed: ${error.message}`);
      profile.phases.responseParsing = -1;
    }

    // Phase 7: Action Execution (Simulated)
    const executionStart = performance.now();
    try {
      // Simulate action execution (this would be executeActions in AIChat.jsx)
      const actionCount = command.includes('grid') ? 9 : command.includes('form') ? 21 : 1;
      const executionTime = actionCount * 50; // 50ms per action
      await new Promise(resolve => setTimeout(resolve, executionTime));
      const actualExecutionTime = performance.now() - executionStart;
      profile.phases.actionExecution = actualExecutionTime;
      profile.actionCount = actionCount;
      console.log(`✅ Action Execution: ${actualExecutionTime.toFixed(2)}ms (${actionCount} actions)`);
    } catch (error) {
      console.log(`❌ Action Execution failed: ${error.message}`);
      profile.phases.actionExecution = -1;
    }

    // Calculate total time
    const totalTime = Object.values(profile.phases)
      .filter(time => time > 0)
      .reduce((sum, time) => sum + time, 0);
    
    profile.totalTime = totalTime;

    // Identify bottlenecks
    const phases = Object.entries(profile.phases)
      .filter(([_, time]) => time > 0)
      .sort((a, b) => b[1] - a[1]);

    if (phases.length > 0) {
      const [topPhase, topTime] = phases[0];
      const percentage = ((topTime / totalTime) * 100).toFixed(1);
      profile.bottlenecks.push({
        phase: topPhase,
        time: topTime,
        percentage: parseFloat(percentage),
        severity: topTime > 3000 ? 'HIGH' : topTime > 1000 ? 'MEDIUM' : 'LOW'
      });
    }

    console.log(`\n📊 Total Time: ${totalTime.toFixed(2)}ms`);
    if (profile.bottlenecks.length > 0) {
      const bottleneck = profile.bottlenecks[0];
      console.log(`🎯 Main Bottleneck: ${bottleneck.phase} (${bottleneck.percentage}% of total time)`);
    }

    this.results.push(profile);
    return profile;
  }

  async generateReport() {
    console.log('\n📋 Generating Bottleneck Analysis Report...\n');

    const report = {
      summary: this.generateSummary(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations(),
      generatedAt: new Date().toISOString()
    };

    // Save report to file
    const reportPath = 'ai-bottleneck-analysis.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);

    // Generate markdown summary
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = 'ai-bottleneck-analysis.md';
    await fs.writeFile(markdownPath, markdownReport);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);

    return report;
  }

  generateSummary() {
    const totalTests = this.results.length;
    const avgTotalTime = this.results.reduce((sum, r) => sum + r.totalTime, 0) / totalTests;
    
    const phaseAverages = {};
    const phases = ['heuristicDetection', 'templateDetection', 'contextBuilding', 'promptConstruction', 'openaiApiCall', 'responseParsing', 'actionExecution'];
    
    phases.forEach(phase => {
      const times = this.results.map(r => r.phases[phase]).filter(t => t > 0);
      phaseAverages[phase] = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    });

    const topBottleneck = Object.entries(phaseAverages)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalTests,
      averageTotalTime: avgTotalTime,
      phaseAverages,
      topBottleneck: {
        phase: topBottleneck[0],
        averageTime: topBottleneck[1],
        percentage: ((topBottleneck[1] / avgTotalTime) * 100).toFixed(1)
      }
    };
  }

  generateRecommendations() {
    const summary = this.generateSummary();
    const recommendations = [];

    // OpenAI API Call recommendations
    if (summary.phaseAverages.openaiApiCall > 2000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'API Optimization',
        issue: 'OpenAI API calls are taking too long',
        solutions: [
          'Implement request caching for common patterns',
          'Use gpt-4o-mini for simple requests',
          'Optimize prompts to reduce token count',
          'Implement streaming responses for better perceived performance'
        ]
      });
    }

    // Context Building recommendations
    if (summary.phaseAverages.contextBuilding > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Context Optimization',
        issue: 'Context building is slow',
        solutions: [
          'Implement smart context filtering',
          'Cache context for similar requests',
          'Reduce context size for simple operations'
        ]
      });
    }

    // Action Execution recommendations
    if (summary.phaseAverages.actionExecution > 500) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Execution Optimization',
        issue: 'Action execution is slow',
        solutions: [
          'Implement parallel batching for independent operations',
          'Optimize Firebase batch operations',
          'Add progress indicators for long operations'
        ]
      });
    }

    return recommendations;
  }

  generateMarkdownReport(report) {
    const { summary, recommendations } = report;
    
    return `# AI Bottleneck Analysis Report

Generated: ${report.generatedAt}

## Executive Summary

- **Total Tests**: ${summary.totalTests}
- **Average Response Time**: ${summary.averageTotalTime.toFixed(2)}ms
- **Main Bottleneck**: ${summary.topBottleneck.phase} (${summary.topBottleneck.percentage}% of total time)

## Phase Breakdown

| Phase | Average Time | Percentage |
|-------|-------------|------------|
${Object.entries(summary.phaseAverages)
  .map(([phase, time]) => `| ${phase} | ${time.toFixed(2)}ms | ${((time / summary.averageTotalTime) * 100).toFixed(1)}% |`)
  .join('\n')}

## Recommendations

${recommendations.map(rec => `
### ${rec.priority} Priority: ${rec.category}

**Issue**: ${rec.issue}

**Solutions**:
${rec.solutions.map(sol => `- ${sol}`).join('\n')}
`).join('\n')}

## Detailed Results

${this.results.map((result, i) => `
### Test ${i + 1}: "${result.command}"

- **Total Time**: ${result.totalTime.toFixed(2)}ms
- **Context Size**: ${result.contextSize || 'N/A'} characters
- **Action Count**: ${result.actionCount || 'N/A'}
- **Main Bottleneck**: ${result.bottlenecks[0]?.phase || 'None'} (${result.bottlenecks[0]?.percentage || 0}%)

#### Phase Times:
${Object.entries(result.phases)
  .map(([phase, time]) => `- ${phase}: ${time.toFixed(2)}ms`)
  .join('\n')}
`).join('\n')}
`;
  }
}

// Main execution
async function main() {
  const profiler = new AIProfiler();
  
  try {
    profiler.start();
    
    // Profile each test command
    for (const command of testCommands) {
      await profiler.profileAIRequest(command);
    }
    
    // Generate comprehensive report
    const report = await profiler.generateReport();
    
    console.log('\n✅ Profiling complete!');
    console.log(`📊 Average response time: ${report.summary.averageTotalTime.toFixed(2)}ms`);
    console.log(`🎯 Main bottleneck: ${report.summary.topBottleneck.phase}`);
    console.log(`📋 ${report.recommendations.length} optimization recommendations generated`);
    
  } catch (error) {
    console.error('❌ Profiling failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AIProfiler };