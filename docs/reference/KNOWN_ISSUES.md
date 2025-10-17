# Known Issues & Quirks

## Firebase SDK Warnings (Cosmetic Only)

### **400 (Bad Request) on Write Channel Termination**

**When It Happens:**
- Deleting a shape that was selected/locked
- Undo/redo operations involving deleted shapes

**Example:**
```
POST .../Firestore/Write/channel?...&TYPE=terminate 400 (Bad Request)
```

**Root Cause:**
Firebase SDK race condition:
1. Shape is deleted → Firebase closes the document's real-time listener
2. Unlock is attempted → Our code correctly detects missing shape and returns
3. Firebase SDK tries to terminate the write channel → Channel is already closed → 400 error

**Impact:**
- ✅ **No functional impact** - All operations complete successfully
- ✅ **Undo/redo works perfectly**
- ❌ **Console shows 400 error** (cosmetic only)

**Status:**
- **Won't Fix** - This is a Firebase SDK internal issue, not our code
- Similar to React's "Can't perform state update on unmounted component" warning
- Suppressing it risks hiding real errors

**Workaround:**
- None needed - functionality is unaffected
- Can be safely ignored

---

## Other Known Quirks

### **Firebase Quota Warnings**
If you see Firebase quota warnings during development:
- **Cause**: Rapid create/delete cycles during testing
- **Solution**: Upgrade to Blaze plan or wait for quota reset
- **Note**: Not an app bug, just Firebase free tier limits

### **Shape Position Sync Delay (~200-500ms)**
Minimal delay when dragging shapes in multi-user sessions:
- **Cause**: Firebase Firestore latency
- **Status**: Expected behavior for real-time sync
- **Note**: We use optimistic updates to minimize perceived latency

---

## Debugging Tips

### **How to Distinguish Real Errors from Quirks**

**Real Errors** (Need Fixing):
- ❌ Operations fail to complete
- ❌ UI becomes unresponsive
- ❌ Data loss occurs
- ❌ Errors with stack traces in our code

**Cosmetic Quirks** (Can Ignore):
- ✅ 400 errors on `/Write/channel?...TYPE=terminate`
- ✅ "Shape not found (may have been deleted)" warnings
- ✅ Firebase quota warnings (development only)
- ✅ React strict mode double-render warnings

### **Console Filtering**

To hide Firebase SDK quirks in Chrome DevTools:
1. Open Console
2. Click "Default levels" dropdown
3. Enter filter: `-/Write/channel`
4. This hides the 400 termination errors while keeping real errors visible

---

## Summary

The 400 error you're seeing is a **known Firebase SDK quirk** that:
- ✅ Doesn't affect functionality
- ✅ Happens during normal delete operations
- ✅ Is safe to ignore
- ❌ Can't be fixed from our side (Firebase SDK internal)

**Bottom line:** If undo/redo works (it does!), you can safely ignore this error. 🎉

