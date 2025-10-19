# Git Worktrees for Multi-Agent Development

## What Are Worktrees?

Git worktrees allow multiple working directories (with different branches) to share the same `.git` repository. This enables multiple Cursor agents to work on different Jira tickets simultaneously without interfering with each other.

## Structure

```
~/Desktop/
├── collab canvas/              ← Main repo (stays on main)
│   ├── .git/                   ← Shared git repository
│   └── scripts/jira/           ← Scripts live here
│
└── .git-worktrees/             ← Isolated workspaces
    ├── CRM-32-add-feature/     ← Agent 1 workspace
    ├── CRM-33-fix-bug/         ← Agent 2 workspace
    └── CRM-34-refactor/        ← Agent 3 workspace
```

## Workflow

### 1. Start a Ticket (Creates Worktree)

```bash
# From main repo or any worktree
node scripts/jira/start-ticket.js CRM-32

# Output:
# 🌿 Creating worktree: CRM-32-add-feature
# 📂 Location: /Users/you/Desktop/.git-worktrees/CRM-32-add-feature
# ✅ Worktree created
#
# 🚀 To switch to the worktree, run:
#    cd "/Users/you/Desktop/.git-worktrees/CRM-32-add-feature"
```

**Then manually cd to the worktree:**
```bash
cd "/Users/you/Desktop/.git-worktrees/CRM-32-add-feature"
```

### 2. Work on Ticket

You're now in an isolated workspace. Changes here don't affect other worktrees or main repo.

```bash
# Make changes
# Build, test, etc.
# Each worktree has its own node_modules, dist, etc.
```

### 3. Ready for Review

```bash
# From within the worktree
node /Users/you/Desktop/collab\ canvas/scripts/jira/review-ticket.js CRM-32

# Auto-detects worktree environment
# Builds and deploys from worktree
```

### 4. Complete Ticket (Removes Worktree)

```bash
# From within the worktree
node /Users/you/Desktop/collab\ canvas/scripts/jira/complete-ticket.js CRM-32

# - Switches to main repo
# - Merges branch
# - Deploys to production
# - Removes worktree
# - Deletes branch
```

## Benefits

✅ **No git conflicts** - Each agent on separate branch  
✅ **Parallel builds** - Each worktree has own `dist/`  
✅ **Independent state** - Different branches, different file states  
✅ **Shared history** - All use same `.git` (saves disk space)  
✅ **Easy cleanup** - Worktrees removed automatically on completion  

## Tips

### For iTerm2 Multi-Agent Setup

1. **Main repo tab**: Stay on `main`, run `create-ticket.js` and `scope-ticket.js`
2. **Agent 1 tab**: `cd ../.git-worktrees/CRM-32-...`, work on CRM-32
3. **Agent 2 tab**: `cd ../.git-worktrees/CRM-33-...`, work on CRM-33
4. **Agent 3 tab**: `cd ../.git-worktrees/CRM-34-...`, work on CRM-34

### Listing Active Worktrees

```bash
git worktree list
```

### Manual Cleanup (if needed)

```bash
# Remove a worktree
git worktree remove /path/to/worktree

# Prune stale worktree data
git worktree prune
```

### Checking Where You Are

```bash
# Check current branch
git branch --show-current

# Check if in worktree
git rev-parse --git-dir
# If output ends with .git → main repo
# If output is a path → worktree
```

## Limitations

⚠️ **Merge conflicts still possible** - If two tickets modify the same files, you'll get conflicts when completing the second ticket. This is normal.

⚠️ **Scripts must use absolute paths** - When running scripts from worktrees, use absolute paths to the main repo's script folder.

⚠️ **Each worktree needs build** - `npm install` and builds are per-worktree (disk space consideration).

## Troubleshooting

### Script can't find deploy-test.sh

The script auto-detects worktrees and uses the correct path. If this fails, check:
```bash
git rev-parse --git-common-dir
# Should point to main repo's .git
```

### Worktree stuck

If a worktree fails to be removed:
```bash
# Force remove
git worktree remove --force /path/to/worktree

# Clean up git's worktree list
git worktree prune
```

### Want to delete a worktree manually

```bash
# First, ensure it's not in use
rm -rf /path/to/worktree
git worktree prune
```

