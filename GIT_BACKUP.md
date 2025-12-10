# Git Backup Guide

This is a simple manual backup system using Git. No auto-commits, no fancy features - just manual backups when you want them.

## Initial Setup (Already Done)

✅ Git repository initialized
✅ Initial commit created with all current files
✅ Auto-features disabled

## How to Make a Manual Backup

When you want to save your current work, run these commands:

```bash
# 1. See what files have changed
git status

# 2. Add all changed files
git add .

# 3. Create a backup commit with a message
git commit -m "Backup: describe what you changed"
```

That's it! Your work is now backed up.

## Viewing Your Backups

```bash
# See all your backup commits
git log --oneline

# See what changed in a specific backup
git show <commit-hash>
```

## Restoring from a Backup

If you need to go back to a previous version:

```bash
# See all backups
git log --oneline

# Restore to a specific backup (replace <commit-hash> with actual hash)
git checkout <commit-hash> -- <file-name>

# Or restore everything to a specific backup
git reset --hard <commit-hash>
```

⚠️ **Warning**: `git reset --hard` will discard all changes after that commit. Use with caution!

## What's Ignored

The `.gitignore` file excludes:
- Python cache files
- OS files (`.DS_Store`, etc.)
- IDE files (`.vscode/`, `.idea/`)
- Cursor plan files (`.cursor/`, `*.plan.md`)
- Temporary files

## Current Status

Your first backup is complete! Commit hash: `9402a3c`

## Quick Reference

```bash
# Check status
git status

# Make a backup
git add .
git commit -m "Your backup message"

# View backups
git log --oneline

# See what changed
git diff
```

