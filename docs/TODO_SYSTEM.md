# TODO System Documentation (Compact Format)

> **Status:** ✅ Complete and Tested  
> **Created:** 2025-10-18  
> **Updated:** 2025-10-18 (Refactored for readability)  
> **Location:** Root `TODO.md` + `.todo-analysis/` + `.todo-archive/`

## Overview

The TODO system provides **compact, human-readable** task management with automatic AI-powered analysis. Key insight: **separate detailed analysis from the main TODO list** to keep it scannable.

### Architecture

```
TODO.md                    ← Compact task list (1-2 min read)
├── Task titles
├── Status + estimates
├── 1-2 sentence summaries
└── Links to detailed analysis

.todo-analysis/            ← Detailed AI analysis files
├── task-slug-1.md         ← Full breakdown, approach, dependencies
├── task-slug-2.md
└── task-slug-3.md

.todo-archive/             ← Completed tasks by month
├── 2025-10.md             ← October completions
├── 2025-11.md             ← November completions
└── ...
```

**Design Goal:** TODO.md should be scannable in 1-2 minutes, not 10+ minutes.

---

## Quick Start

### View Tasks
```bash
npm run todo
# Opens TODO.md - scan Quick Stats, read summaries
```

### Add a Task
Edit `TODO.md` under the appropriate priority section:

```markdown
### Fix minimap rendering bug
**Status:** 📋 Needs Analysis | **Est:** ? | **Impact:** ? | **Complexity:** ?
**Added:** 2025-10-18

**Quick Summary:**
Shapes in minimap are offset when zoomed out past 50%. Coordinate system issue.

**Key Files:** (pending analysis)
```

**Keep summary to 1-2 sentences!** Agent will provide detailed analysis.

### Analyze Tasks (Automatic)
```bash
# Start file watcher (recommended - auto-analyzes on changes)
npm run watch-todos

# Or manual one-time analysis
npm run analyze-todos
```

### Archive Old Tasks
```bash
npm run archive-todos
# Moves completed tasks (7+ days old) to .todo-archive/YYYY-MM.md
```

---

## Task Format (Compact)

### Before Analysis
```markdown
### Optimize AI response times
**Status:** 📋 Needs Analysis | **Est:** ? | **Impact:** ? | **Complexity:** ?
**Added:** 2025-10-18

**Quick Summary:**
Creative AI requests take 5-10s. Need caching and prompt optimization.

**Key Files:** (pending analysis)
```

**~6 lines per task** ← Scannable!

### After Analysis
```markdown
### Optimize AI response times
**Status:** 🎯 Ready | **Est:** 15-20h | **Impact:** HIGH | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/optimize-ai-response-times.md)

**Quick Summary:**
Creative AI requests take 5-10s. Need caching and prompt optimization.

**Key Files:** aiAgent.js, AIChat.jsx, tools/index.js
```

**~8 lines per task** ← Still scannable!

Click the analysis link for:
- 3-5 relevant files with detailed explanations
- Complexity reasoning (2-3 paragraphs)
- Step-by-step implementation approach
- Dependencies and risk assessment

---

## Comparison: Old vs New Format

### Old Format (Verbose)
```markdown
### Optimize AI response times
**Status:** 🎯 Ready
**Added:** 2025-10-18

**Description:**
Creative AI requests (like "draw a sunset") are currently slow...

**Context:**
- Users report 5-10 second delays
- Affects user experience significantly
- May need to cache common patterns

**Agent Analysis:** ✅ Completed 2025-10-18

**Relevant Files:**
- src/services/aiAgent.js.backup - Core AI logic for handling requests...
- src/components/AI/AIChat.jsx - Responsible for interfacing with AI...
- src/services/ai/tools/index.js - Contains utility functions...
- src/services/ai/tools/create/circle.js - Represents pattern for...
- src/App.jsx - Might need updates to integrate changes...

**Complexity:** MEDIUM
**Estimated Time:** 20 hours
**Risk Level:** Medium

**Reasoning:**
The task involves multiple aspects of optimization, including caching,
prompt optimization, and potentially integrating a new model...

**Impact:** HIGH
**Impact Reasoning:**
Improving AI response times can significantly enhance user experience...

**Recommended Approach:**
1. Analyze current AI request handling in aiAgent.js.backup
2. Implement caching mechanisms to store and retrieve results
3. Optimize prompts by simplifying or restructuring them
4. Evaluate feasibility of using faster model for simple requests
5. Test thoroughly to ensure optimizations don't degrade quality

**Dependencies:**
- Blocks: None
- Blocked by: None
```

**~45 lines per task** ← Requires scrolling!

### New Format (Compact)
**TODO.md:**
```markdown
### Optimize AI response times
**Status:** 🎯 Ready | **Est:** 15-20h | **Impact:** HIGH | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/optimize-ai-response-times.md)

**Quick Summary:**
Creative AI requests take 5-10s. Need caching and prompt optimization.

**Key Files:** aiAgent.js, AIChat.jsx, tools/index.js
```

**~8 lines per task** ← Scannable!

**Detailed analysis in `.todo-analysis/optimize-ai-response-times.md`:**
- Full context and reasoning
- Step-by-step approach
- All relevant files with explanations
- Dependencies and risks

---

## Task Priorities

### 🔴 Critical (Do First)
- Production bugs
- Security vulnerabilities
- Blockers
- Critical features

### 🟡 Important (Do Soon)
- Major features
- Performance improvements
- Significant tech debt
- Important refactors

### 🟢 Nice to Have (When Free)
- UI polish
- Minor improvements
- Low-priority features
- Code cleanup

### ⏸️ Backlog (Future / Blocked)
- Future considerations
- Blocked by external dependencies
- Ideas for later

---

## Task Statuses

| Status | Emoji | Meaning |
|--------|-------|---------|
| Needs Analysis | 📋 | New task, awaiting agent analysis |
| Ready | 🎯 | Analyzed, ready to start |
| In Progress | 🚧 | Currently being worked on |
| Blocked | ⏸️ | Waiting on dependencies |
| Done | ✅ | Completed (archives after 7 days) |

---

## How the Agent Works

### Workflow

1. **You add task** with status "📋 Needs Analysis"
2. **File watcher detects change** (if running)
3. **Agent analyzes:**
   - Extracts keywords from summary
   - Searches codebase with grep/ripgrep
   - Calls OpenAI GPT-4o for detailed analysis
4. **Agent writes TWO files:**
   - `.todo-analysis/[task-slug].md` ← Detailed analysis
   - Updates `TODO.md` ← Compact summary + link
5. **Status changes to "🎯 Ready"**

### Re-Analysis Prevention

The agent **only analyzes tasks with "📋 Needs Analysis" status**. Once analyzed, status becomes "🎯 Ready" and the task won't be re-analyzed unless you manually change it back.

---

## Example Workflow

### 1. Start the File Watcher
```bash
npm run watch-todos
```

Output:
```
👀 TODO File Watcher Starting...
📁 Watching: /path/to/TODO.md

✅ Watcher active. Press Ctrl+C to stop.
```

### 2. Add a Task (via Cursor or manually)

In Cursor, say: **"Add to task list: improve canvas zoom performance"**

Cursor adds:
```markdown
### Improve canvas zoom performance
**Status:** 📋 Needs Analysis | **Est:** ? | **Impact:** ? | **Complexity:** ?
**Added:** 2025-10-18

**Quick Summary:**
Zooming in/out on large canvases (500+ shapes) causes lag. Need optimization.

**Key Files:** (pending analysis)
```

### 3. Automatic Analysis

File watcher triggers:

```
🔍 TODO.md changed - triggering analysis...

🤖 TODO Analysis Agent Starting...

Found 1 tasks needing analysis

📋 Analyzing: Improve canvas zoom performance
   Found 12 potentially relevant files
   📄 Wrote analysis to .todo-analysis/improve-canvas-zoom-performance.md
   ✅ Analysis complete

✅ Analysis complete. TODO.md updated with compact format.
```

### 4. Review Results

**TODO.md now shows:**
```markdown
### Improve canvas zoom performance
**Status:** 🎯 Ready | **Est:** 8-12h | **Impact:** HIGH | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/improve-canvas-zoom-performance.md)

**Quick Summary:**
Zooming in/out on large canvases (500+ shapes) causes lag. Need optimization.

**Key Files:** Canvas.jsx, useCanvas.js, Shape.jsx
```

**Click analysis link for full details:**
- Recommended approach (implement memoization, virtualization, layer caching)
- Relevant files with explanations
- Dependencies and risks
- Step-by-step implementation plan

### 5. Start Work

Update status:
```markdown
**Status:** 🚧 In Progress | **Est:** 8-12h | **Impact:** HIGH | **Complexity:** MEDIUM
```

### 6. Mark Complete

Move to Done section:
```markdown
## ✅ Done (Last 7 Days)

### Improve canvas zoom performance ✅
**Completed:** 2025-10-20
**Original Priority:** 🟡 Important

Implemented virtualization and layer caching. 10x speedup on large canvases.
```

### 7. Archive (After 7 Days)

```bash
npm run archive-todos
```

Moves to `.todo-archive/2025-10.md`

---

## Cursor Integration

The system integrates with Cursor AI via `.cursor/rules/todo-management.mdc`.

### Natural Language Commands

**Add task:**
- "Add to task list: [description]"
- "Create todo for [description]"

**View tasks:**
- "Show todos"
- "What's on the todo list?"

**Mark complete:**
- "Mark [task] as done"
- "Complete [task]"

### Context-Aware Creation

Cursor will proactively suggest adding tasks when discussing bugs/features.

---

## Agent Configuration

### Environment Variables

Requires `VITE_OPENAI_API_KEY` in `.env`:

```bash
VITE_OPENAI_API_KEY=sk-...
```

### Model Used

- **GPT-4o** for analysis (accurate, detailed)
- Temperature: 0.1 (consistent output)
- Max tokens: 2000

### Rate Limiting

- **2 seconds** between analysis calls
- Processes sequentially to avoid throttling

### File Discovery

Uses **ripgrep** (rg) if available, otherwise **grep**:
- Fast (milliseconds for 1000s of files)
- No AI needed for file discovery
- Smart keyword extraction

---

## File Structure

```
/
├── TODO.md                          # Compact task list (main file)
├── .todo-analysis/                  # Detailed analysis files
│   ├── .gitkeep
│   ├── task-slug-1.md
│   ├── task-slug-2.md
│   └── task-slug-3.md
├── .todo-archive/                   # Monthly archives
│   ├── .gitkeep
│   ├── 2025-10.md
│   └── 2025-11.md
├── .cursor/
│   └── rules/
│       └── todo-management.mdc      # Cursor AI integration
├── scripts/
│   └── agents/
│       ├── analyze-todos.js         # Analysis agent
│       ├── watch-todos.js           # File watcher
│       └── archive-todos.js         # Archival script
└── package.json                     # npm scripts
```

---

## npm Scripts

```json
{
  "scripts": {
    "todo": "code TODO.md",                          // Open in editor
    "analyze-todos": "node scripts/agents/analyze-todos.js",  // Manual analysis
    "watch-todos": "node scripts/agents/watch-todos.js",      // Auto-analysis
    "archive-todos": "node scripts/agents/archive-todos.js"   // Archive old tasks
  }
}
```

---

## Best Practices

### Task Titles
✅ **Good:** Fix minimap shape positioning bug  
❌ **Bad:** Minimap issue (too vague)

### Quick Summaries
✅ **Good:** "Canvas zoom lags with 500+ shapes. Need virtualization."  
❌ **Bad:** 5+ sentences explaining the entire problem (let agent analyze!)

### Adding Tasks
- Keep summary to 1-2 sentences
- Let agent fill in details
- Trust the analysis process

### Reading TODO.md
- Scan Quick Stats first
- Read task summaries (2 minutes max)
- Click analysis links only when starting work

---

## Troubleshooting

### "Could not identify relevant files"

**Cause:** Task summary too vague  
**Fix:** Add more specific keywords or manually list files in summary

### File watcher not triggering

**Cause:** Watcher not running  
**Fix:** `npm run watch-todos`

### "VITE_OPENAI_API_KEY not found"

**Cause:** Missing .env file  
**Fix:** Ensure `.env` exists with valid key

### TODO.md too long

**Cause:** Not archiving completed tasks  
**Fix:** `npm run archive-todos`

---

## Cost Estimate

**Per task analysis:**
- Input: ~500-1000 tokens
- Output: ~800-1200 tokens
- Cost: ~$0.10-0.30 per task (GPT-4o)

**Typical usage:**
- 5-10 tasks/week = $1-3/week
- 20-40 tasks/month = $4-12/month

Very affordable!

---

## Advantages of Compact Format

### Before (Verbose)
- ❌ 40+ lines per task
- ❌ 10+ minutes to scan TODO list
- ❌ Hard to see priorities at a glance
- ❌ Scroll fatigue
- ❌ Analysis mixed with task list

### After (Compact)
- ✅ 6-8 lines per task
- ✅ 1-2 minutes to scan entire list
- ✅ Quick Stats shows everything at a glance
- ✅ No scrolling needed
- ✅ Detailed analysis in separate files
- ✅ Human-readable AND machine-processable
- ✅ Click through only when needed

---

## Success Metrics

A well-maintained TODO system:
- ✅ **Scannable** in 1-2 minutes (not 10+)
- ✅ **Compact** (5-10 lines per task, not 40+)
- ✅ **Actionable** (clear priorities, estimates, impacts)
- ✅ **Up-to-date** (completed tasks archived monthly)
- ✅ **Trustworthy** (agent analysis is accurate and helpful)

---

## Future Enhancements

Once the system proves useful:

- [ ] GitHub Actions (nightly analysis)
- [ ] Weekly auto-archive script
- [ ] Integration with GitHub Issues
- [ ] Slack/Discord notifications
- [ ] Analytics (completion rates, estimate accuracy)
- [ ] AI learning from past estimates

---

## Summary

The TODO system provides:

✅ **Compact, scannable TODO.md** (1-2 min read)  
✅ **Detailed analysis files** (when you need them)  
✅ **Automatic archiving** (keeps list fresh)  
✅ **Smart file discovery** (grep-based, fast)  
✅ **Cursor integration** (natural language)  
✅ **Re-analysis prevention** (no wasted API calls)  

**Philosophy:** TODO.md is a **quick reference**, not a detailed spec document. Analysis lives separately for deep dives.

**Recommended workflow:** Keep `npm run watch-todos` running. Add tasks as needed. Scan TODO.md daily. Click analysis links when starting work.
