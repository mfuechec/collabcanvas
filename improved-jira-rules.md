# Improved Jira Rules - Why Cursor CLI Ignores Rules

## Root Cause Analysis

The cursor rules are being ignored because they **assume perfect starting conditions** but don't **validate or guide** users to those conditions first.

### Current Problems:

1. **No Pre-Condition Checks**: Rules jump straight to workflow steps
2. **Assumes Feature Branch**: Rules expect `CRM-XX-description` branch exists
3. **No State Validation**: Doesn't check current git state
4. **No Workflow Violation Detection**: Doesn't catch main branch work

### What Should Happen:

```
User: "move to in review"
AI: "Let me check your current state..."
AI: "I see you're on main with changes - this violates workflow"
AI: "Let me guide you to the correct process"
```

### What Actually Happens:

```
User: "move to in review" 
AI: "I'll follow the workflow steps" (ignoring current state)
AI: Executes steps without proper setup
```

## Improved Rule Structure

### 0. Pre-Condition Checks (CRITICAL)

**ALWAYS check these first:**

```bash
# Check current branch
git branch --show-current

# Check for uncommitted changes
git status --porcelain

# Check if we're in a git repository
git rev-parse --is-inside-work-tree
```

### Branch Validation Logic:

**If on main branch with changes:**
```
⚠️  WORKFLOW VIOLATION: Working on main branch with uncommitted changes.

This violates the feature branch workflow. You should be working on a feature branch.

Current state:
- Branch: main
- Changes: [list files]

Required action:
1. Create feature branch: git checkout -b CRM-XX-description
2. Move changes to feature branch
3. Then retry "move to in review"
```

**If on main with no changes:**
```
⚠️  On main branch with no changes.

This suggests either:
1. Work was done directly on main (violates workflow)
2. You're on the wrong branch
3. No work has been done yet

Required action:
1. Create feature branch: git checkout -b CRM-XX-description
2. Do the work on the feature branch
3. Then retry "move to in review"
```

**If on feature branch with changes:**
```
✅ Good: On feature branch with uncommitted changes.

Current state:
- Branch: [branch-name]
- Changes: [list files]

Proceeding with commit and review workflow...
```

### Branch Naming Validation:

**Expected format:** `CRM-XX-description` (e.g., `CRM-14-optimize-creative-prompts`)

**If branch doesn't match pattern:**
```
⚠️  Branch naming doesn't follow convention.

Current: [branch-name]
Expected: CRM-XX-description

Options:
1. Rename branch: git branch -m CRM-XX-description
2. Create new branch: git checkout -b CRM-XX-description
3. Continue anyway (not recommended)
```

## Implementation Script Template (IMPROVED)

```javascript
node << 'EOF'
import('dotenv').then(async dotenv => {
  dotenv.default.config();
  const { execSync } = require('child_process');
  
  const JIRA_HOST = process.env.JIRA_HOST;
  const JIRA_EMAIL = process.env.JIRA_EMAIL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  
  const ticketKey = "[TICKET_KEY]"; // e.g., "CRM-19"
  const channelName = ticketKey.toLowerCase(); // e.g., "crm-19"
  
  try {
    // 0. PRE-CONDITION CHECKS
    console.log('🔍 Checking pre-conditions...');
    
    // Check current branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    console.log(`Current branch: ${currentBranch}`);
    
    // Check for uncommitted changes
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    const hasChanges = gitStatus.trim().length > 0;
    
    // Validate branch naming
    const branchPattern = /^CRM-\d+-.+/;
    const isValidBranch = branchPattern.test(currentBranch);
    
    // Check if on main
    const isMainBranch = currentBranch === 'main';
    
    // Pre-condition validation
    if (isMainBranch && hasChanges) {
      console.log('❌ WORKFLOW VIOLATION: Working on main branch with uncommitted changes.');
      console.log('This violates the feature branch workflow.');
      console.log('\nRequired action:');
      console.log('1. Create feature branch: git checkout -b CRM-XX-description');
      console.log('2. Move changes to feature branch');
      console.log('3. Then retry "move to in review"');
      process.exit(1);
    }
    
    if (isMainBranch && !hasChanges) {
      console.log('❌ On main branch with no changes.');
      console.log('This suggests work was done directly on main (violates workflow).');
      console.log('\nRequired action:');
      console.log('1. Create feature branch: git checkout -b CRM-XX-description');
      console.log('2. Do the work on the feature branch');
      console.log('3. Then retry "move to in review"');
      process.exit(1);
    }
    
    if (!isValidBranch && !isMainBranch) {
      console.log(`⚠️  Branch naming doesn't follow convention.`);
      console.log(`Current: ${currentBranch}`);
      console.log(`Expected: CRM-XX-description`);
      console.log('\nOptions:');
      console.log('1. Rename branch: git branch -m CRM-XX-description');
      console.log('2. Create new branch: git checkout -b CRM-XX-description');
      console.log('3. Continue anyway (not recommended)');
      // Continue anyway for now, but warn
    }
    
    console.log('✅ Pre-conditions validated\n');
    
    // Rest of workflow...
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
});
EOF
```

## Key Improvements

1. **Pre-condition checks** before any workflow steps
2. **Branch validation** (main vs feature branch)
3. **Change detection** and proper handling
4. **Branch naming validation** (CRM-XX-description pattern)
5. **Clear error messages** with specific actions
6. **Workflow violation detection** and prevention
7. **State-aware execution** based on current git state

## Why This Fixes the Problem

**Before:** Rules assume perfect starting conditions
**After:** Rules validate and guide to correct conditions

**Before:** AI jumps to implementation
**After:** AI checks state first, then guides user

**Before:** Workflow violations happen silently
**After:** Workflow violations are caught and prevented

The fundamental issue is that the rules need to be **state-aware** and **interactive** rather than assuming the correct starting state.