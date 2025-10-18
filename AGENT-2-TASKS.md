# Agent 2 Tasks: Schema & Validation

## Branch: `feature/agent-2-schema-validation`

## Task Assignment

### 🎯 Primary Tasks (3 tasks)
1. **Audit all AI tool schemas for partial update support** (8-12 hours)
2. **Add AI tool schema validation tests** (10-15 hours)  
3. **Update AI tool definitions with optional field indicators** (6-8 hours)

### 📋 Task 1: Audit AI Tool Schemas
- **Status:** Ready to start
- **Estimate:** 8-12 hours
- **Impact:** MEDIUM
- **Complexity:** MEDIUM

**Details:** Review ALL tool schemas (batch_update_shapes, create_shapes, move_shapes, etc). Make only truly required fields required. Apply .optional()/.partial() pattern. Fixes "make it purple" validation bug.

**Key Files:** `/utils/shapes/validation.js`, `/utils/shapes/constants.js`

### 📋 Task 2: Add Schema Validation Tests
- **Status:** Ready to start
- **Estimate:** 10-15 hours
- **Impact:** HIGH
- **Complexity:** MEDIUM

**Details:** Create test suite validating AI responses with partial data (e.g., "change only color", "move without rotating"). Catch schema validation issues before production.

**Key Files:** `/services/aiAgent.js.backup`, `/services/ai/tools/index.js`

### 📋 Task 3: Update AI Tool Definitions
- **Status:** Ready to start
- **Estimate:** 6-8 hours
- **Impact:** MEDIUM
- **Complexity:** MEDIUM

**Details:** Update tool definitions in prompts to clearly mark optional vs required fields. Add examples showing partial updates to help AI generate correct plans.

**Key Files:** `/services/ai/tools/index.js`, `/services/ai/tools/templates/useLoginTemplate.js`

### ✅ Success Criteria
- [ ] All schemas support partial updates
- [ ] Comprehensive test coverage for validation
- [ ] Tool definitions clearly indicate optional fields
- [ ] "Make it purple" bug is fixed
- [ ] All tests pass

### 🔄 Workflow
1. Switch to branch: `git checkout feature/agent-2-schema-validation`
2. Work on tasks in order (schemas → tests → definitions)
3. Test thoroughly after each task
4. Commit and push changes
5. Create PR when ready

### 📚 Resources
- Analysis files: `.todo-analysis/audit-all-ai-tool-schemas-for-partial-update-support.md`
- Analysis files: `.todo-analysis/add-ai-tool-schema-validation-tests.md`
- Analysis files: `.todo-analysis/update-ai-tool-definitions-with-optional-field-indicators.md`

---
**Agent 2 - Focus on schema validation and testing. These tasks are related and should be done together.**