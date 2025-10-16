# Debugging Duplicate Execution

## What to Look For

When you run an AI command, you'll now see detailed logs that will help identify the duplicate:

### Expected Flow (CORRECT - No Duplicates)
```
🎬 [AI-CHAT] Starting execution of 1 action(s)

▶️ [AI-CHAT] Action 1/1: create_rectangle
   Data: {"x":100,"y":100,"width":50,"height":50,"fill":"#FF0000"}
   Route: executeSmartOperation("create_rectangle", data)

🔷 [SMART-OP-abc123] START: create_rectangle
   { data: {...}, timestamp: ..., caller: "..." }
   
🔶 [SMART-OP-abc123] END: create_rectangle

✅ [AI-CHAT] Action 1/1 (create_rectangle) completed in 250ms

🏁 [AI-CHAT] Completed all 1 action(s)
```

### Duplicate Flow (INCORRECT - Shows Problem)
```
🎬 [AI-CHAT] Starting execution of 1 action(s)

▶️ [AI-CHAT] Action 1/1: create_rectangle
   Route: executeSmartOperation("create_rectangle", data)

🔷 [SMART-OP-abc123] START: create_rectangle  ← FIRST CALL
   { caller: "at useFirebaseCanvas.js:228" }
   
🔷 [SMART-OP-def456] START: create_rectangle  ← DUPLICATE!
   { caller: "at AIChat.jsx:49" }
   
🔶 [SMART-OP-abc123] END: create_rectangle
🔶 [SMART-OP-def456] END: create_rectangle

✅ [AI-CHAT] Action 1/1 completed
```

## Common Causes & Solutions

### 1. **Multiple Execution Paths in AIChat.jsx**
**Symptom:** Two calls with different `caller` locations in AIChat.jsx

**Cause:** Old action handler code still exists alongside new `executeSmartOperation` call

**Solution:** Check AIChat.jsx for old switch/case statements that might be executing operations

---

### 2. **Hook Wrapper Calling Service Directly**
**Symptom:** One call from `useFirebaseCanvas.js`, another from `AIChat.jsx`

**Cause:** The hook wrapper is executing the operation AND passing it through

**Fix in `useFirebaseCanvas.js`:**
```javascript
// Make sure this is just a pass-through:
const executeSmartOperation = useCallback(async (action, data) => {
  return await executeSmartOperationService(action, data, canvasId);
}, [canvasId]);

// NOT this (which would execute twice):
const executeSmartOperation = useCallback(async (action, data) => {
  await executeSmartOperationService(action, data, canvasId);  // Executes here
  return await executeSmartOperationService(action, data, canvasId);  // AND here!
}, [canvasId]);
```

---

### 3. **Tools Executing During Planning Phase**
**Symptom:** Operations happen before "Starting execution" log

**Cause:** Tools in `aiAgent.js` are executing operations instead of returning descriptors

**Check:** All tools should return JSON strings, NOT execute operations:
```javascript
// ✅ CORRECT
const createRectangleTool = tool(
  async ({ x, y, width, height, fill }) => {
    return JSON.stringify({
      action: 'create_rectangle',
      data: { x, y, width, height, fill }
    });
  }
);

// ❌ WRONG
const createRectangleTool = tool(
  async ({ x, y, width, height, fill }) => {
    await createShape({ x, y, width, height, fill });  // DON'T DO THIS!
    return JSON.stringify({ action: 'create_rectangle' });
  }
);
```

---

### 4. **React Double-Render in Dev Mode**
**Symptom:** Everything executes twice, including the entire AI flow

**Cause:** React Strict Mode causes double-renders in development

**Check:** Look at timestamps - if two complete flows run milliseconds apart, this is Strict Mode

**Solution:** This is normal in dev, won't happen in production

---

## How to Debug

### Step 1: Run Dev Server
```bash
npm run dev
```

### Step 2: Open Console
Open browser DevTools → Console tab

### Step 3: Execute AI Command
Type in AI chat: "create a red circle"

### Step 4: Analyze Logs
Look for:
1. **How many `🔷 START` logs?**
   - 1 = No duplicate ✅
   - 2+ = Duplicate detected ❌

2. **What are the `caller` locations?**
   - Same file multiple times = Logic issue in that file
   - Different files = Multiple execution paths

3. **When do they appear?**
   - Before `🎬 Starting execution` = Tools executing during planning
   - After `🎬 Starting execution` = Action execution duplicates

### Step 5: Share Logs
Copy the relevant logs and share them. Include:
- The full AI request flow (from `🚀 [AI-PERF] User submitted` to `✅ Total request completed`)
- All `🔷 START` and `🔶 END` logs
- Any error messages

---

## Quick Fix Reference

### If duplicate is in AIChat.jsx:
Check for old code patterns like:
```javascript
// OLD PATTERN (remove this):
switch (action) {
  case 'create_rectangle':
    await addShape(data);
    break;
  // ... more cases
}

// NEW PATTERN (keep this):
await executeSmartOperation(action, data);
```

### If duplicate is in useFirebaseCanvas.js:
Make sure the wrapper is just passing through:
```javascript
const executeSmartOperation = useCallback(async (action, data) => {
  return await executeSmartOperationService(action, data, canvasId);
}, [canvasId]);
```

### If duplicate is in canvas.js:
Check if `executeSmartOperation` is calling itself recursively:
```javascript
case 'create_grid': {
  // ✅ CORRECT - calls batchOperations
  return await batchOperations(operations, canvasId);
  
  // ❌ WRONG - would create infinite loop
  return await executeSmartOperation('batch_operations', { operations });
}
```

---

## Next Steps

1. Run the app with these debug logs
2. Execute an AI command
3. Share the console output
4. I'll identify the exact source of the duplicate
5. We'll implement the fix

The logs will tell us exactly where the duplicate is coming from!

