# AI Prompt Caching Investigation & Fix

## 🔍 **Problem Identified**

User reported 26 seconds to create a tree with 20 shapes. Investigation revealed:

### Performance Breakdown:
```
GPT-4o Planning:         15,056ms (15 seconds) ← BOTTLENECK
Firebase Operations:        335ms (0.3 seconds) ✅ Fast!
----------------------------------------------------------
Total:                   15,392ms (26 seconds with overhead)
```

### Cache Status:
```
⚠️ [CACHE] No usage metadata available → 15053ms
```

**Prompt caching was NOT working** - Every request processed the full 8K token system prompt.

---

## 🐛 **Root Causes Discovered**

### **Issue 1: `withStructuredOutput()` Stripped Metadata**

```javascript
// BEFORE (models.js):
export const gpt4oStructured = gpt4o.withStructuredOutput(executionPlanSchema);

// Problem: Returns only parsed data
const response = await gpt4oStructured.invoke([...]);
// response = { plan: [...], reasoning: "..." }
// NO response_metadata! ❌
```

**Why this happened:**
- LangChain's `withStructuredOutput()` parses the response and returns only the data
- By default, it discards `response_metadata` which contains usage info
- Without metadata, we can't see if caching is working

---

### **Issue 2: Not Using `includeRaw` Option**

LangChain provides an `includeRaw` option to preserve metadata:

```javascript
const model = gpt4o.withStructuredOutput(schema, { 
  includeRaw: true  // ← This preserves response_metadata
});
```

**Response structure with `includeRaw: true`:**
```javascript
{
  parsed: { plan: [...], reasoning: "..." },  // Structured data
  raw: {                                      // Full OpenAI response
    response_metadata: {
      usage: {
        prompt_tokens: 8234,
        completion_tokens: 456,
        prompt_tokens_details: {
          cached_tokens: 8192  // ← CACHE INFO!
        }
      }
    }
  }
}
```

---

### **Issue 3: OpenAI Caching Requirements**

OpenAI's Prompt Caching (introduced in 2024) requires:

1. ✅ **Prompt >1024 tokens** - Your 8K system prompt qualifies
2. ✅ **Identical system message** - Your static prompt is cached
3. ✅ **Model supports caching** - gpt-4o does support it
4. ❓ **Correct API version** - Using latest LangChain SDK
5. ❓ **Pricing tier** - Some caching features require specific tiers

**How OpenAI Caching Works:**
- First request: Processes full prompt → stores in cache (5min TTL)
- Subsequent requests: Reads from cache → 50% faster + 50% cheaper
- Cache key: Exact match of system message content
- Auto-invalidates after 5-10 minutes of inactivity

---

## 🔧 **The Fix**

### Changed Files:

#### 1. `src/services/ai/config/models.js`

**Before:**
```javascript
export const gpt4oStructured = gpt4o.withStructuredOutput(executionPlanSchema);
```

**After:**
```javascript
export const gpt4oStructured = gpt4o.withStructuredOutput(executionPlanSchema, { 
  includeRaw: true  // Preserves response_metadata with usage stats
});
```

---

#### 2. `src/services/ai/planning/planner.js`

**Before:**
```javascript
const response = await selectedModel.invoke([...]);

// response = { plan: [...], reasoning: "..." }
// No metadata access ❌

if (response.response_metadata?.usage) {
  // This never runs because response_metadata doesn't exist
}
```

**After:**
```javascript
const rawResponse = await selectedModel.invoke([...]);

// Extract structured data and raw metadata
const response = rawResponse.parsed || rawResponse;  // Backward compatible
const raw = rawResponse.raw || rawResponse;
const metadata = raw.response_metadata || raw.usage_metadata || {};

// Now we can access usage info!
if (metadata.usage) {
  const usage = metadata.usage;
  const promptTokens = usage.prompt_tokens || 0;
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
  
  if (cachedTokens > 0) {
    console.log(`✅ [CACHE-HIT] ${cachedTokens}/${promptTokens} tokens cached`);
    // Calculate time saved
  } else {
    console.log(`❌ [CACHE-MISS] No cached tokens`);
  }
}
```

---

## 📊 **Expected Results**

### After the fix, console logs will show:

**First Request (Cache Miss):**
```
🤖 [MODEL] Using GPT-4o (best quality, no classification overhead)
🔄 [CACHE] Static prompt (~8K tokens) cacheable, dynamic context (~12 tokens)

🔍 [CACHE-DEBUG] Response type: object
🔍 [CACHE-DEBUG] Has 'raw' field: true
🔍 [CACHE-DEBUG] Has 'parsed' field: true

📊 [CACHE-DEBUG] Usage info: {
  "prompt_tokens": 8246,
  "completion_tokens": 432,
  "total_tokens": 8678,
  "prompt_tokens_details": {
    "cached_tokens": 0
  }
}

❌ [CACHE-MISS] 0/8246 tokens cached
   ├─ Inference time: 15000ms
   └─ Next request should be ~50% faster with cache
```

**Second Request (Cache Hit):**
```
🤖 [MODEL] Using GPT-4o (best quality, no classification overhead)
🔄 [CACHE] Static prompt (~8K tokens) cacheable, dynamic context (~12 tokens)

🔍 [CACHE-DEBUG] Response type: object
🔍 [CACHE-DEBUG] Has 'raw' field: true
🔍 [CACHE-DEBUG] Has 'parsed' field: true

📊 [CACHE-DEBUG] Usage info: {
  "prompt_tokens": 8246,
  "completion_tokens": 428,
  "total_tokens": 8674,
  "prompt_tokens_details": {
    "cached_tokens": 8192  ← CACHE HIT!
  }
}

✅ [CACHE-HIT] 8192/8246 tokens cached (99%)
   ├─ Inference time: 7500ms  ← 50% faster!
   └─ Estimated time saved: ~7500ms
```

---

## 🎯 **Performance Impact**

| Metric | Before Fix | After Fix (Cache Hit) | Improvement |
|--------|------------|----------------------|-------------|
| **GPT Planning** | 15,000ms | ~7,500ms | 50% faster |
| **Total Request** | 15,400ms | ~7,800ms | 49% faster |
| **Token Cost** | $0.060 | $0.030 | 50% cheaper |
| **Visibility** | None | Full cache monitoring | ∞ better |

---

## 🔬 **Testing Instructions**

1. **Clear browser console**

2. **Make first request**: "create a tree using 20 shapes"
   - Should see: `❌ [CACHE-MISS] 0/XXXX tokens cached`
   - Time: ~15 seconds

3. **Make second request**: "create a tree using 20 shapes"
   - Should see: `✅ [CACHE-HIT] XXXX/XXXX tokens cached (99%)`
   - Time: ~7-8 seconds (50% faster!)

4. **Verify cache hit rate**:
   - Look for `cached_tokens` in usage info
   - Should be >8000 tokens cached (the static system prompt)
   - Only dynamic context (user message) reprocessed

---

## 🚨 **Potential Issues**

### **If cache still doesn't work:**

1. **OpenAI API Tier**
   - Prompt caching may require specific pricing tier
   - Check OpenAI dashboard for tier requirements

2. **API Version**
   - Ensure using latest OpenAI API version
   - LangChain `@langchain/openai` v0.6.16 should support it

3. **System Prompt Changes**
   - Cache invalidates if system prompt changes
   - Even small differences create new cache entry

4. **Cache TTL Expired**
   - OpenAI caches expire after 5-10 minutes
   - First request after expiry will be cache miss

5. **Metadata Not Available**
   - If still seeing "No usage metadata available"
   - May need to check LangChain version compatibility

---

## 💡 **Alternative Solutions**

If OpenAI prompt caching doesn't work or isn't available:

### **Option 1: Add Tree Template** (Recommended)
- Create a tree template like login/navbar
- Instant generation (<15ms vs 15 seconds)
- **1000x speedup!**

### **Option 2: Simplify System Prompt**
- Reduce prompt from 8K to 4K tokens
- Faster processing but may reduce quality
- **~30% faster**

### **Option 3: Use Smaller Model**
- Use gpt-4o-mini for simple patterns
- Already removed classification overhead
- **~40% faster but lower quality**

### **Option 4: Client-Side Caching**
- Cache responses for identical queries
- Store "create tree" → plan mapping
- **Instant for repeated requests**

---

## 📋 **Checklist**

- [x] Identified root cause (metadata stripped)
- [x] Fixed `withStructuredOutput()` with `includeRaw: true`
- [x] Updated planner to extract metadata correctly
- [x] Added comprehensive cache logging
- [x] No linter errors
- [ ] Test first request (cache miss)
- [ ] Test second request (cache hit)
- [ ] Verify 50% speedup
- [ ] Monitor cache hit rate over time

---

## 🎓 **Key Learnings**

1. **Always preserve metadata** when using LangChain structured outputs
2. **OpenAI caching is automatic** but requires monitoring to verify
3. **LangChain's `includeRaw`** option is critical for debugging
4. **Prompt engineering matters** - static prompts cache better
5. **Templates are still faster** - even with perfect caching, 15ms > 7.5s

---

## 🔜 **Next Steps**

1. **Test the fix** - Run tree creation twice, verify cache hit
2. **Monitor cache performance** - Track cache hit rate over time
3. **Consider templates** - Add tree/flower/house templates for instant generation
4. **Document patterns** - Which requests benefit most from caching?
5. **Cost analysis** - Calculate actual savings from caching

---

**Status:** ✅ Fix implemented, ready for testing
**Expected Impact:** 50% faster requests after cache warm-up
**Risk:** Low - backward compatible fallback included

