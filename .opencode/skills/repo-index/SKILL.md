---
name: repo-index
description: Use ONLY when the user asks about file locations, project structure, or when you need to update REPO_INDEX.md after adding/removing/renaming files. Also use when onboarding to a new session and needing to understand the codebase layout.
---

# Repo Index Maintenance

## Purpose

REPO_INDEX.md is the single source of truth for the project's file structure. Every AI session reads this first to navigate the codebase.

## When to Update

Update `REPO_INDEX.md` whenever:
- A new file is created
- A file is deleted or renamed
- A route endpoint changes
- The directory structure changes

## How to Update

1. Read the current REPO_INDEX.md
2. Use `Get-ChildItem -Recurse -File` to get the current file tree
3. Rewrite the entire REPO_INDEX.md with the accurate listing
4. Update the route table if endpoints changed
