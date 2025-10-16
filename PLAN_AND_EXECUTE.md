# Plan-and-Execute Pattern Implementation Guide

## 🎯 Overview

The Plan-and-Execute pattern separates AI reasoning into two phases:
1. **Planning Phase**: AI creates an execution plan (one LLM call)
2. **Execution Phase**: Execute tools sequentially without additional LLM calls

This maintains modularity while achieving performance similar to consolidated tools.

---

## 📊 Performance Comparison

| Approach | LLM Calls | Performance | Modularity | Complexity |
|----------|-----------|-------------|------------|-----------|
| **Standard Agent** | N (reactive) | ~20s | ✅ High | 🟡 Medium |
| **Consolidated Tool** | 1 | ~5s | ❌ Low | ✅ Low |
| **Plan-and-Execute** | 1 (plan) | ~3-4s | ✅ High | 🔴 High |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User: "Create 50 random shapes"                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PLANNING PHASE (1 LLM call, ~2-3s)                         │
│                                                              │
│ AI generates execution plan:                                │
│ [                                                            │
│   {                                                          │
│     step: 1,                                                 │
│     tool: "generate_random_coordinates",                    │
│     args: { count: 50, shapeType: "rectangle" }            │
│   },                                                         │
│   {                                                          │
│     step: 2,                                                 │
│     tool: "batch_create_shapes",                            │
│     args: { shapes: "{{step_1_output}}" }                  │
│   }                                                          │
│ ]                                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ EXECUTION PHASE (No LLM calls, ~1-2s)                      │
│                                                              │
│ Step 1: generate_random_coordinates(50, "rectangle")       │
│   Result: [{x, y, size}, {x, y, size}, ...]                │
│                                                              │
│ Step 2: batch_create_shapes(coordinates)                   │
│   Result: 50 shapes created                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
                      ✅ Done!
```

---

## 🔧 Implementation Options

### Option 1: LangGraph Prebuilt (Recommended)
**Pros**: Battle-tested, handles complex scenarios, built-in error recovery  
**Cons**: Learning curve, heavier dependency

```javascript
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agent = createReactAgent({
  llm: model,
  tools: tools,
  messageModifier: planningPrompt, // Custom planning instructions
});
```

### Option 2: Custom Lightweight Implementation
**Pros**: Full control, minimal overhead, easier to debug  
**Cons**: More code to maintain, need to handle edge cases

```javascript
async function planAndExecute(userMessage, tools) {
  // Phase 1: Generate plan
  const plan = await generatePlan(userMessage, tools);
  
  // Phase 2: Execute plan
  const results = [];
  for (const step of plan) {
    const result = await executeStep(step, results);
    results.push(result);
  }
  
  return results;
}
```

---

## 📝 Planning Prompt Design

The planning prompt is critical. It should:
1. Instruct AI to output a structured plan
2. Define how to reference previous step outputs
3. Specify tool selection criteria
4. Handle conditional logic

```javascript
const planningPrompt = `You are a planning assistant. Given a user request, create an execution plan.

**Output Format** (JSON):
{
  "plan": [
    {
      "step": 1,
      "tool": "tool_name",
      "args": { ... },
      "description": "What this step does"
    }
  ]
}

**Tool Output References**:
Use {{step_N}} to reference output from step N.
Example: { "shapes": "{{step_1}}" }

**Available Tools**:
${toolDescriptions}

**Examples**:
User: "Create 50 random shapes"
Plan:
{
  "plan": [
    {
      "step": 1,
      "tool": "generate_random_coordinates",
      "args": { "count": 50, "shapeType": "rectangle" }
    },
    {
      "step": 2,
      "tool": "batch_create_shapes",
      "args": { "shapes": "{{step_1}}" }
    }
  ]
}
`;
```

---

## 🚀 Execution Engine

```javascript
async function executePlan(plan, tools) {
  const stepOutputs = new Map();
  const results = [];
  
  for (const step of plan.plan) {
    console.log(`⚙️ [EXECUTE] Step ${step.step}: ${step.tool}`);
    
    // Resolve references to previous outputs
    const resolvedArgs = resolveReferences(step.args, stepOutputs);
    
    // Find and execute the tool
    const tool = tools.find(t => t.name === step.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${step.tool}`);
    }
    
    const startTime = performance.now();
    const result = await tool.func(resolvedArgs);
    const duration = performance.now() - startTime;
    
    console.log(`  └─ Completed in ${duration.toFixed(0)}ms`);
    
    stepOutputs.set(`step_${step.step}`, result);
    results.push(result);
  }
  
  return results;
}

function resolveReferences(args, stepOutputs) {
  const resolved = { ...args };
  
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.startsWith('{{step_')) {
      const stepRef = value.match(/{{step_(\d+)}}/)[1];
      resolved[key] = stepOutputs.get(`step_${stepRef}`);
    }
  }
  
  return resolved;
}
```

---

## 🎨 Integration with AIChat Component

```javascript
// AIChat.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;
  
  const userMessage = input.trim();
  setInput('');
  setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
  setIsLoading(true);
  
  const startTime = performance.now();
  console.log(`\n🚀 [AI-PERF] User submitted: "${userMessage}"`);
  
  try {
    // PHASE 1: Planning
    console.log('🧠 [PLANNING] Generating execution plan...');
    const planStartTime = performance.now();
    const plan = await generateExecutionPlan(userMessage, shapes);
    const planDuration = performance.now() - planStartTime;
    console.log(`⏱️ [PLANNING] Plan generated in ${planDuration.toFixed(0)}ms`);
    console.log('📋 [PLANNING] Plan:', plan);
    
    // PHASE 2: Execution
    console.log('⚙️ [EXECUTION] Executing plan...');
    const execStartTime = performance.now();
    const results = await executePlan(plan);
    const execDuration = performance.now() - execStartTime;
    console.log(`⏱️ [EXECUTION] Completed in ${execDuration.toFixed(0)}ms`);
    
    // Execute canvas actions from results
    for (const result of results) {
      await executeActions([result]);
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`✅ [AI-PERF] Total request completed in ${totalTime.toFixed(0)}ms\n`);
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Executed ${plan.plan.length} steps successfully!`
    }]);
  } catch (error) {
    console.error('❌ [AI-PERF] Request failed:', error);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `❌ Error: ${error.message}`
    }]);
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🧪 Test Cases

### Test 1: Simple Multi-Step
```
Input: "Create 50 random shapes"
Expected Plan:
  1. generate_random_coordinates(50)
  2. batch_create_shapes({{step_1}})
```

### Test 2: Complex Dashboard
```
Input: "Build a dashboard with 5 charts"
Expected Plan:
  1. create_grid(rows=2, cols=3) // Layout
  2. create_text(x=100, y=50, text="Dashboard Title")
  3. create_circle(x=500, y=500, radius=50) // Chart 1
  4. create_rectangle(x=1000, y=500, w=200, h=150) // Chart 2
  ... (5 charts total)
```

### Test 3: Conditional Logic
```
Input: "If canvas has shapes, clear it, then add 10 circles"
Expected Plan:
  1. check_canvas_state() // Returns { hasShapes: true }
  2. clear_canvas() // Conditional on step 1
  3. create_circle_row(count=10)
```

---

## 📊 Performance Expectations

| Scenario | Standard Agent | Plan-and-Execute | Improvement |
|----------|----------------|------------------|-------------|
| 50 random shapes | ~20s | ~3-4s | **83% faster** |
| Complex form (10 fields) | ~30s | ~5-6s | **83% faster** |
| Dashboard (5 charts) | ~40s | ~8-10s | **80% faster** |

---

## 🔍 Debugging & Observability

### Log Levels
1. **Planning Phase**:
   - Plan generation time
   - Number of steps in plan
   - Tool sequence

2. **Execution Phase**:
   - Per-step execution time
   - Tool arguments (resolved)
   - Step outputs

3. **Overall**:
   - Total time (planning + execution)
   - Success/failure status
   - Error details

### Example Logs
```
🚀 [AI-PERF] User submitted: "Create 50 random shapes"
🧠 [PLANNING] Generating execution plan...
⏱️ [PLANNING] Plan generated in 2,341ms
📋 [PLANNING] Plan: 2 steps
  1. generate_random_coordinates(count=50, shapeType="rectangle")
  2. batch_create_shapes(shapes={{step_1}})
⚙️ [EXECUTION] Executing plan...
  ⚙️ [EXECUTE] Step 1: generate_random_coordinates
    └─ Completed in 1ms
  ⚙️ [EXECUTE] Step 2: batch_create_shapes
    🔥 [FIREBASE] Batch created 50 shapes in 587ms
    └─ Completed in 612ms
⏱️ [EXECUTION] Completed in 613ms
✅ [AI-PERF] Total request completed in 2,954ms
```

---

## 🎯 Next Steps

1. ✅ Review task list in TODO
2. Set up LangSmith tracing (see LANGSMITH_SETUP.md)
3. Choose implementation approach (LangGraph vs Custom)
4. Implement planning prompt
5. Build execution engine
6. Test with complex scenarios
7. Compare performance metrics
8. Deploy and monitor

---

## 📚 Resources

- [LangChain Plan-and-Execute](https://js.langchain.com/docs/modules/agents/agent_types/plan_and_execute)
- [LangGraph Prebuilt Agents](https://langchain-ai.github.io/langgraphjs/how-tos/create-react-agent/)
- [LangSmith Tracing Guide](https://docs.smith.langchain.com/)

