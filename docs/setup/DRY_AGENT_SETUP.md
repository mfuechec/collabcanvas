# DRY Analysis Agent Setup

## Overview

The DRY Analysis Agent is an intelligent code quality tool that automatically detects duplication opportunities in your codebase. It uses:

- **OpenAI Embeddings** - Fast similarity pre-filtering (90% cost savings)
- **Claude 3.5 Haiku** - Semantic code analysis
- **Project Rules** - Your specific DRY enforcement guidelines

## Installation

Dependencies are already installed. The agent requires:

```bash
npm install @langchain/anthropic @langchain/openai fast-glob
```

✅ **Already installed in this project**

## Configuration

### Environment Variables

Add to your `.env` file:

```env
# Required - OpenAI API key (for embeddings and analysis)
VITE_OPENAI_API_KEY=your_openai_key_here

# Optional - Only if using Anthropic provider
# VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
```

**Getting API Keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic** (optional): https://console.anthropic.com/

**Note:** By default, the agent uses OpenAI only (GPT-4o-mini). You can switch to Anthropic by editing `scripts/config/dry-agent-config.js`.

### Agent Configuration

Edit `scripts/config/dry-agent-config.js` to customize:

```javascript
export default {
  // Files to analyze
  include: [
    'src/components/**/*.{js,jsx}',
    'src/hooks/**/*.{js,jsx}',
    'src/services/**/*.{js,jsx}',
  ],
  
  // Files to ignore
  exclude: [
    '**/*.test.{js,jsx}',
    '**/node_modules/**',
  ],
  
  // Similarity threshold (0-1)
  thresholds: {
    minSimilarity: 0.75,  // 75% similar = flag for analysis
    minLines: 10,         // Minimum function size
  },
  
  // AI model settings
  ai: {
    model: 'claude-3-5-haiku-20241022',
    temperature: 0.1,
    maxTokens: 4000,
    maxCostPerRun: 2.00,  // Stop if exceeding $2
  },
};
```

## Usage

### Basic Run

```bash
npm run dry-check
```

This will:
1. Scan your codebase for JavaScript/JSX files
2. Generate embeddings for code blocks
3. Find similar code pairs (>75% similarity)
4. Analyze with Claude using your DRY rules
5. Generate `DRY_OPPORTUNITIES.md` report

### Verbose Mode

```bash
npm run dry-check:verbose
```

Shows detailed progress and debugging information.

### Incremental Mode

```bash
npm run dry-check:incremental
```

Analyzes only files changed since last git commit (coming soon).

### Help

```bash
npm run dry-check -- --help
```

## Understanding the Report

### Output: `DRY_OPPORTUNITIES.md`

The report includes:

#### Executive Summary
Quick overview of findings by severity.

```markdown
| Severity | Count | Action Required |
|----------|-------|-----------------|
| 🔴 CRITICAL | 2 | Fix immediately |
| 🟡 HIGH     | 5 | Fix soon |
| 🟢 MEDIUM   | 8 | Refactor when convenient |
```

#### Detailed Findings

Each finding includes:

1. **Priority Score** (0-10) - Calculated from severity, confidence, risk
2. **Locations** - Exact file paths and line numbers
3. **Differences** - Key differences between similar code
4. **Reasoning** - Why it's flagged as duplicate
5. **Recommendation** - Specific refactoring steps
6. **Destination** - Where to extract the code (e.g., `utils/geometry.js`)
7. **Code Snippets** - Actual duplicated code blocks

### Severity Levels

**🔴 CRITICAL** - Fix immediately
- Core logic duplicated 3+ times
- Security/auth logic repeated
- Firebase operations duplicated
- Shape creation in components (should be in utils)

**🟡 HIGH** - Fix soon
- Logic duplicated 2 times
- Geometry/coordinate calculations
- Similar functions with different names

**🟢 MEDIUM** - Refactor when convenient
- Similar component structure
- Repeated event handlers
- Validation patterns

**⚪ LOW** - Nice to have
- Minor standardization opportunities

### Confidence Levels

**🟢 HIGH** - Safe to refactor immediately
- Pure functions
- Identical logic
- No side effects

**🟡 MEDIUM** - Review before refactoring
- Similar logic with variations
- May need parameterization

**🔴 LOW** - Manual review required
- Complex differences
- Different error handling
- Timing/async differences

## Cost Estimates

### Per Run (GPT-4o-mini - Default)

- **Embeddings**: $0.02 per 1M tokens (~$0.10-0.30 per run)
- **GPT-4o-mini Analysis**: $0.15/$0.60 per 1M tokens (~$0.15-0.50 per run)
- **Total**: ~$0.25-0.80 per full codebase analysis

### Per Run (GPT-4o - Better Quality)

- **Embeddings**: $0.02 per 1M tokens (~$0.10-0.30 per run)
- **GPT-4o Analysis**: $2.50/$10 per 1M tokens (~$0.30-1.50 per run)
- **Total**: ~$0.40-1.80 per full codebase analysis

### With Prompt Caching

OpenAI supports prompt caching (reduces repeat costs):
- **First run**: ~$0.30-0.50
- **Subsequent runs**: ~$0.08-0.20 (50% discount)

### Monthly Usage (GPT-4o-mini)

- **Daily runs**: ~$2-4/month
- **Weekly runs**: ~$0.40-0.80/month

**Cheapest option and still very effective!** 💰

Much cheaper than manual code reviews! 💰

## Workflow Integration

### Recommended Schedule

**Manual (On-Demand):**
```bash
npm run dry-check
```
Run when you notice repetition or before major refactors.

**Weekly (Cron):**
```bash
# Run every Monday at 9 AM
0 9 * * 1 cd /path/to/project && npm run dry-check
```

**Pre-Commit Hook (Optional):**
```bash
# .git/hooks/pre-commit
npm run dry-check:incremental
```

**CI/CD Integration (Future):**
```yaml
# .github/workflows/dry-check.yml
- name: Run DRY Analysis
  run: npm run dry-check
  env:
    VITE_ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    VITE_OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Interpreting Results

### Success Criteria

**✅ Ideal State:**
- 0 CRITICAL findings
- <5 HIGH findings
- <10 MEDIUM findings

**⚠️ Needs Attention:**
- 1+ CRITICAL findings
- 5+ HIGH findings

**❌ Poor State:**
- Multiple CRITICAL findings
- 10+ HIGH findings

### Taking Action

1. **Review the report** - Read `DRY_OPPORTUNITIES.md`
2. **Prioritize** - Start with highest priority score
3. **Verify** - Check that refactoring preserves behavior
4. **Implement** - Extract to suggested destination files
5. **Test** - Run tests to ensure nothing broke
6. **Re-run agent** - Verify improvement

## Troubleshooting

### "Missing environment variable"

**Solution**: Add API keys to `.env` file:
```bash
VITE_ANTHROPIC_API_KEY=your_key
VITE_OPENAI_API_KEY=your_key
```

### "No files found to analyze"

**Solution**: Check `include` patterns in `scripts/config/dry-agent-config.js`

### "Rate limit exceeded"

**Solution**: 
- Reduce `maxConcurrentAnalyses` in config
- Add longer delays between API calls
- Upgrade to paid API tier

### "Analysis taking too long"

**Solution**:
- Reduce `thresholds.minSimilarity` to filter more aggressively
- Limit to priority directories only
- Increase `thresholds.minLines` to skip small functions

### "Cost exceeding budget"

**Solution**:
- Decrease `ai.maxCostPerRun` in config
- Run less frequently
- Focus on high-priority directories only
- Use incremental mode

## Advanced Configuration

### Custom Patterns

Add project-specific patterns to detect:

```javascript
patterns: {
  customOps: [
    'myCustomFunction(',
    'specificPattern',
  ],
},
```

### Adjust Sensitivity

More aggressive (finds more duplicates):
```javascript
thresholds: {
  minSimilarity: 0.65,  // Lower = more matches
  minLines: 5,          // Shorter functions included
}
```

Conservative (fewer false positives):
```javascript
thresholds: {
  minSimilarity: 0.85,  // Higher = only very similar
  minLines: 20,         // Longer functions only
}
```

### Change AI Model

**Use better OpenAI model:**
```javascript
ai: {
  provider: 'openai',
  model: 'gpt-4o',  // Better quality, more expensive ($2.50/$10 per M tokens)
}
```

**Switch to Anthropic:**
```javascript
ai: {
  provider: 'anthropic',
  anthropicModel: 'claude-3-5-haiku-20241022',  // $1/$5 per M tokens
}
```
(Requires `VITE_ANTHROPIC_API_KEY` in .env)

**Model Comparison:**
- `gpt-4o-mini`: ⚡ Fastest, 💰 Cheapest ($0.15/$0.60), ⭐ Good quality
- `gpt-4o`: ⭐⭐ Best quality, 💰💰 More expensive ($2.50/$10)
- `claude-3-5-haiku`: ⭐⭐ Excellent quality, 💰 Moderate cost ($1/$5)

## DRY Rules

The agent uses rules from:
- `.cursor/rules/dry-enforcement.mdc` - Comprehensive analysis rules
- `.cursor/rules/general-dry-rules.mdc` - General DRY principles

To modify behavior, edit these files.

## FAQ

**Q: Will this modify my code?**
A: No. It only generates a report. You decide what to refactor.

**Q: How accurate is it?**
A: Very accurate for semantic duplication. May have false positives for intentionally different code.

**Q: Can I run it offline?**
A: No. Requires API calls to OpenAI and Anthropic.

**Q: Does it support TypeScript?**
A: Not yet. Currently JavaScript/JSX only. TypeScript support coming soon.

**Q: How long does it take?**
A: Depends on codebase size:
- Small (50 files): 30-60 seconds
- Medium (200 files): 2-4 minutes
- Large (500+ files): 5-10 minutes

**Q: What about false positives?**
A: The agent is conservative and flags uncertain cases as "LOW confidence" for manual review.

## Support

Issues or questions? Check:
1. This documentation
2. `scripts/config/dry-agent-config.js` comments
3. `.cursor/rules/dry-enforcement.mdc` for rule details
4. Run with `--verbose` flag for debugging

## Version History

- **v1.0** (2025-10-17) - Initial release
  - Embeddings-based pre-filtering
  - Claude 3.5 Haiku analysis
  - Project-specific rule integration
  - Markdown report generation

---

**Happy refactoring! 🚀**

