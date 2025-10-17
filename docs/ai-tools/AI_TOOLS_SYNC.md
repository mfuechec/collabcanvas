# AI Tools Synchronization Guide

**Created:** January 16, 2025  
**Purpose:** Ensure AI tools, their handlers, and documentation stay in sync

---

## 🎯 The Problem You Identified

When AI tools are updated, the AI assistant needs to know about these changes. Currently:
- Tool implementations are in `aiAgent.js`
- Tool handlers are in `AIChat.jsx`
- Documentation is in `AI_TOOLS_AUDIT.md`
- The AI's "knowledge" comes from the **planning prompt** in `aiAgent.js`

If these get out of sync, the AI won't know about new tools or will generate incorrect parameters.

---

## ✅ Solution Implemented

### 1. **Created Cursor Rule**
**File:** `.cursor/rules/ai-tools-maintenance.mdc`

This rule will automatically remind the AI assistant (me) to update ALL related files whenever AI tools are modified.

**What it covers:**
- 5-location update checklist
- Common mistakes to avoid
- Testing protocol
- Architecture principles
- Quick reference for line numbers

### 2. **Updated `AI_TOOLS_AUDIT.md`**
- ✅ Reflects all recent improvements (radius, relative transforms, batch_operations)
- ✅ Updated tool count: 18 → 19
- ✅ Marked completed issues as ✅ FIXED
- ✅ Upgraded assessment: A- (90%) → A+ (95%)
- ✅ Added "Last Updated" timestamps

---

## 📋 The 5 Files That Must Stay in Sync

When modifying AI tools, **ALL** must be updated:

### 1. **`src/services/aiAgent.js`**
```javascript
// Tool implementation
const myTool = tool(...);

// Tools array
const tools = [..., myTool];

// Planning prompt (~line 607)
**Available Tools with Parameters:**
N. **my_tool** - Description
   Args: { param1: type, param2: type }
```

### 2. **`src/components/AI/AIChat.jsx`**
```javascript
case 'my_action': {
  // Handle the action
  await someOperation(data);
  break;
}
```

### 3. **`AI_TOOLS_AUDIT.md`**
```markdown
**Total Tools:** 19  <!-- Update count -->
**Last Updated:** [Date]

## 🎉 Recent Improvements
- Added my_tool
```

### 4. **`AI_TOOLS_IMPROVEMENTS.md`** (for significant changes)
- Problem statement
- Solution approach
- Performance impact

### 5. **This Rule File** `.cursor/rules/ai-tools-maintenance.mdc`
- Referenced automatically when editing AI tools
- Provides checklist and guidelines

---

## 🔄 Workflow Example

### Scenario: Adding a new `create_triangle` tool

**Step 1: Implementation**
```javascript
// src/services/aiAgent.js
const createTriangleTool = tool(
  async ({ x, y, size, fill }) => {
    return JSON.stringify({
      action: 'create_triangle',
      data: { x, y, size, fill, type: 'triangle' }
    });
  },
  {
    name: 'create_triangle',
    description: 'Creates an equilateral triangle.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH),
      y: z.number().min(0).max(CANVAS_HEIGHT),
      size: z.number().min(20).max(500),
      fill: z.string(),
    }),
  }
);

// Add to tools array
const tools = [
  // ... existing tools
  createTriangleTool, // ✅ NEW
];
```

**Step 2: Planning Prompt**
```javascript
// src/services/aiAgent.js (~line 607)
**Available Tools with Parameters:**

// ... existing tools ...

20. **create_triangle** - Create an equilateral triangle
   Args: { x: number(0-5000), y: number(0-5000), size: number(20-500), fill: string (hex color) }
```

**Step 3: Action Handler**
```javascript
// src/components/AI/AIChat.jsx
case 'create_triangle': {
  await addShape(data); // Use existing shape system
  break;
}
```

**Step 4: Documentation**
```markdown
<!-- AI_TOOLS_AUDIT.md -->
**Total Tools:** 20  <!-- Increment -->
**Last Updated:** January 16, 2025

## 🎉 Recent Improvements (January 16, 2025)
- ✅ Added `create_triangle` tool - Creates equilateral triangles

### Creation Tools (8)  <!-- Increment category -->
1. `create_rectangle`
2. `create_circle`
3. `create_text`
4. `create_line`
5. `create_grid`
6. `create_row`
7. `create_circle_row`
8. `create_triangle` ✨ **NEW**
```

**Step 5: Test**
```
AI: "Create a red triangle at the center"
→ Should generate: create_triangle({ x: 2500, y: 2500, size: 100, fill: "#FF0000" })
→ Should execute: Triangle appears on canvas
```

---

## 🚨 Red Flags

### If you see these, synchronization is broken:

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| AI says "I don't have that tool" | Planning prompt not updated | Add tool to planning prompt |
| AI generates plan but nothing happens | Handler not implemented | Add case to `AIChat.jsx` |
| AI generates wrong parameters | Schema mismatch | Update planning prompt |
| Doc says 18 tools, code has 19 | Audit not updated | Update `AI_TOOLS_AUDIT.md` |
| Tool works but with old params | Stale planning prompt | Sync prompt with schema |

---

## 📊 Current State

### All Files Are Now in Sync ✅

| File | Status | Last Updated |
|------|--------|--------------|
| `aiAgent.js` | ✅ Up to date | Jan 16, 2025 |
| `AIChat.jsx` | ✅ Up to date | Jan 16, 2025 |
| `AI_TOOLS_AUDIT.md` | ✅ Up to date | Jan 16, 2025 |
| `AI_TOOLS_IMPROVEMENTS.md` | ✅ Up to date | Jan 16, 2025 |
| `.cursor/rules/ai-tools-maintenance.mdc` | ✅ Created | Jan 16, 2025 |

**Tool Count:** 19 (consistent across all files)  
**Planning Prompt:** Lists all 19 tools with correct parameters  
**Action Handlers:** All 19 tools have handlers implemented

---

## 🎓 How the Cursor Rule Works

### Automatic Activation
The rule is triggered when you edit any of these files:
- `src/services/aiAgent.js`
- `src/components/AI/AIChat.jsx`
- `AI_TOOLS_AUDIT.md`
- `AI_TOOLS_IMPROVEMENTS.md`

### What the AI Assistant Will Do
1. **Recognize** that you're modifying AI tools
2. **Reference** the `.cursor/rules/ai-tools-maintenance.mdc` file
3. **Remind** about the 5-location update checklist
4. **Verify** consistency across all files
5. **Suggest** testing before committing

---

## 💡 Best Practices

### When Adding Tools
1. Start with `aiAgent.js` (implementation + planning prompt)
2. Add handler to `AIChat.jsx`
3. Test manually with AI commands
4. Update documentation only after testing
5. Commit all 5 files together

### When Modifying Tools
1. Update tool schema in `aiAgent.js`
2. Immediately update planning prompt in same file
3. Update handler if behavior changes
4. Mark as "✨ UPDATED" in `AI_TOOLS_AUDIT.md`
5. Test edge cases

### When Removing Tools
1. Remove from `tools` array
2. Remove from planning prompt
3. Remove handler (or mark as deprecated)
4. Document removal in `AI_TOOLS_AUDIT.md`
5. Provide migration path in `AI_TOOLS_IMPROVEMENTS.md`

---

## 📚 Quick Reference

### File Locations
```
/Users/mfuechec/Desktop/collab canvas/
├── src/
│   ├── services/
│   │   └── aiAgent.js              # Tools + Planning Prompt
│   └── components/
│       └── AI/
│           └── AIChat.jsx           # Action Handlers
├── .cursor/
│   └── rules/
│       └── ai-tools-maintenance.mdc # This Rule
├── AI_TOOLS_AUDIT.md                # Comprehensive Documentation
├── AI_TOOLS_IMPROVEMENTS.md         # Implementation Notes
└── AI_TOOLS_SYNC.md                 # This File
```

### Key Line Numbers (Approximate)
- **aiAgent.js:**
  - Tool definitions: lines 26-544
  - Tools array: line 547
  - Planning prompt: lines 607-742
  
- **AIChat.jsx:**
  - Action handlers: lines 85-310

---

## ✅ Success Criteria

You'll know synchronization is working when:

1. **AI knows about all tools**
   - Try: "What tools do you have?"
   - AI should list all 19 tools

2. **AI generates correct parameters**
   - Try: "Create a circle with radius 100"
   - AI should use `radius` param (not width/height)

3. **Tools actually work**
   - Every AI command should execute successfully
   - No "Unknown action" warnings in console

4. **Documentation is accurate**
   - `AI_TOOLS_AUDIT.md` matches reality
   - Tool count is consistent everywhere

---

## 🔮 Future Enhancements

The cursor rule can be extended to:
- Auto-generate planning prompt from tool schemas
- Validate planning prompt against tool schemas
- Generate documentation from tool definitions
- Create unit tests for new tools automatically

---

## 📞 Questions?

If you're unsure whether files are in sync:

1. **Check tool count:**
   - `aiAgent.js` tools array: 19
   - Planning prompt: Lists 19 tools
   - `AI_TOOLS_AUDIT.md`: Says "Total Tools: 19"

2. **Test a recent tool:**
   ```
   "Make the blue circle twice as big"
   ```
   Should work (uses new `radius` parameter)

3. **Check for consistency:**
   - Every tool in `tools` array has a case in `AIChat.jsx`
   - Every tool has an entry in planning prompt
   - Every tool is documented in `AI_TOOLS_AUDIT.md`

---

**Summary:** The cursor rule ensures that whenever you modify AI tools, all related files are updated together. This prevents the AI from getting confused or generating invalid plans. Think of it as a "contract" between the tool implementation, the AI's knowledge, and the documentation. 🤝

