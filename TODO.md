# TODO List

> Last updated: 2025-10-18 | Last analyzed: 2025-10-18

---

## 🔴 Critical (Do First)

<!-- High-priority tasks: bugs, blockers, critical features -->

---

## 🟡 Important (Do Soon)

<!-- Important features, performance improvements, tech debt -->

### Profile AI request bottlenecks
**Status:** 🎯 Ready | **Est:** 8-12 hours | **Impact:** HIGH | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/profile-ai-request-bottlenecks.md)

**Quick Summary:**
Measure and identify bottlenecks in AI creative requests (5-10s delays). Profile aiAgent.js, prompt processing, and API round-trip times to inform optimization strategy.

**Key Files:** services/aiAgent.js.backup, This, components/AI/AIChat.jsx

### Implement AI response caching
**Status:** 🎯 Ready | **Est:** 10-15 hours | **Impact:** MEDIUM | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/implement-ai-response-caching.md)

**Quick Summary:**
Cache common AI responses (shapes, patterns) to avoid repeated API calls. Store by prompt hash with TTL expiration.

**Key Files:** /contexts/CanvasModeContext.jsx, This, /contexts/CanvasContext.jsx

### Optimize AI prompts for creative tasks
**Status:** 🎯 Ready | **Est:** 10-15 hours | **Impact:** MEDIUM | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/optimize-ai-prompts-for-creative-tasks.md)

**Quick Summary:**
Simplify and restructure creative prompts ("draw sunset", "create galaxy") to reduce token count and processing time while maintaining quality.

**Key Files:** /components/AI/AIChat.jsx, This, /services/aiAgent.js.backup

### Add fast model routing for simple AI requests
**Status:** 🎯 Ready | **Est:** 12-16 hours | **Impact:** MEDIUM | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/add-fast-model-routing-for-simple-ai-requests.md)

**Quick Summary:**
Route simple shape creation requests to gpt-4o-mini for faster responses. Keep gpt-4o for complex creative tasks. Auto-detect request complexity.

**Key Files:** contexts/CanvasModeContext.jsx, This, contexts/CanvasContext.jsx

### Audit all AI tool schemas for partial update support
**Status:** 🎯 Ready | **Est:** 8-12 hours | **Impact:** MEDIUM | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/audit-all-ai-tool-schemas-for-partial-update-support.md)

**Quick Summary:**
Review ALL tool schemas (batch_update_shapes, create_shapes, move_shapes, etc). Make only truly required fields required. Apply .optional()/.partial() pattern. Fixes "make it purple" validation bug.

**Key Files:** /utils/shapes/validation.js, This, /utils/shapes/constants.js

### Add AI tool schema validation tests
**Status:** 🎯 Ready | **Est:** 10-15 hours | **Impact:** HIGH | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/add-ai-tool-schema-validation-tests.md)

**Quick Summary:**
Create test suite validating AI responses with partial data (e.g., "change only color", "move without rotating"). Catch schema validation issues before production.

**Key Files:** /services/aiAgent.js.backup, This, /services/ai/tools/index.js

### Update AI tool definitions with optional field indicators
**Status:** 🎯 Ready | **Est:** 6-8 hours | **Impact:** MEDIUM | **Complexity:** MEDIUM
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/update-ai-tool-definitions-with-optional-field-indicators.md)

**Quick Summary:**
Update tool definitions in prompts to clearly mark optional vs required fields. Add examples showing partial updates to help AI generate correct plans.

**Key Files:** /services/ai/tools/index.js, This, /services/ai/tools/templates/useLoginTemplate.js

### Implement S3-based global AI response caching
**Status:** ⏸️ Blocked | **Est:** 15-20 hours | **Impact:** HIGH | **Complexity:** HIGH
**Added:** 2025-10-18 | **Depends on:** Profile AI request bottlenecks

**Quick Summary:**
Implement S3-based global cache for AI responses shared across all users. Store common responses (shapes, patterns, templates) in S3 with TTL expiration. Provides 3-5x better cache hit rates than in-memory caching alone.

**Key Files:** services/ai/index.js, services/cache/s3Cache.js, utils/cache/globalCache.js

**Benefits:**
- Shared cache across all users globally
- Persistent across sessions and deployments  
- 60-80% cache hit rate for common requests
- Massive cost savings and performance improvement
- Community knowledge base of common patterns

## 🟢 Nice to Have (When Free)

<!-- Polish, minor improvements, low-priority features -->

### Add keyboard shortcut hints to UI
**Status:** 🎯 Ready | **Est:** 3-5 hours | **Impact:** MEDIUM | **Complexity:** LOW
**Added:** 2025-10-18 | [📋 Analysis](/.todo-analysis/add-keyboard-shortcut-hints-to-ui.md)

**Quick Summary:**
Users don't know about keyboard shortcuts (Ctrl+Z, Delete, etc.). Add subtle hints in toolbar and help menu.

**Key Files:** /components/Canvas/CanvasToolbar.jsx, This, /utils/designSystem.js

## ⏸️ Backlog (Future / Blocked)

<!-- Tasks blocked by external dependencies or future considerations -->

---

## ✅ Done (Last 7 Days)

<!-- Recently completed tasks - archived weekly -->

---

## 📊 Quick Stats

- **Total Active:** 9 | **Ready:** 8 | **Needs Analysis:** 0 | **In Progress:** 0 | **Blocked:** 1
