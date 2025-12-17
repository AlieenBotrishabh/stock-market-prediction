# 🔄 Git Workflow & Best Practices

## Quick Summary

Your project is now under **git version control** with proper commit history!

```
Commits:
  v0.1.0 (master) - 71ef708
    └─ docs: add comprehensive git commit history and guidelines
    └─ feat: integrate indianapi.in API service with 20 endpoints
```

---

## 📊 Current Git Status

```bash
$ git log --oneline --decorate
71ef708 (HEAD -> master, tag: v0.1.0) docs: add comprehensive git commit history and guidelines
66c79cb feat: integrate indianapi.in API service with 20 endpoints

$ git status
On branch master
nothing to commit, working tree clean
```

---

## 🎯 Making Future Commits

### For Frontend Changes:
```bash
# Fix API response handling
git add frontend/src/pages/
git commit -m "fix(api): handle different response formats in pages

- Support both array and object API responses
- Add fallback data handling
- Improve error handling"

# Add new component
git add frontend/src/components/NewComponent.jsx
git commit -m "feat(components): add new portfolio tracker component"

# Style improvements
git add frontend/src/index.css frontend/tailwind.config.js
git commit -m "style: update color scheme and animations"
```

### For Backend Changes:
```bash
# Add new API endpoint
git add backend/src/routes/
git commit -m "feat(api): add portfolio tracking endpoints

- GET /portfolio/:userId
- POST /portfolio/add
- DELETE /portfolio/remove
- PUT /portfolio/update"

# Fix authentication
git add backend/src/
git commit -m "fix(auth): validate JWT tokens properly

- Check token expiration
- Verify user exists
- Return proper error codes"

# Database migration
git add backend/src/models/
git commit -m "feat(db): add user portfolio schema

- Define Portfolio model
- Add indexes for performance
- Create migration script"
```

### For Documentation:
```bash
git add README.md API_DOCUMENTATION.md
git commit -m "docs: update API reference and setup guide

- Add new endpoint documentation
- Update installation steps
- Add troubleshooting section"
```

---

## 🏷️ Version Tags

Current version: **v0.1.0**

### Creating new versions:
```bash
# Create new tag
git tag -a v1.0.0 -m "Major release: Authentication and advanced features"

# Show all tags
git tag

# Delete tag
git tag -d v1.0.0
```

---

## 🌳 Branch Workflow (For Team Collaboration)

### Create feature branch:
```bash
git checkout -b feat/user-authentication
# Make changes
git add .
git commit -m "feat: implement user login"
# ... more commits ...
git checkout master
git merge feat/user-authentication
```

### Create bugfix branch:
```bash
git checkout -b fix/api-404-error
git add .
git commit -m "fix: handle missing API endpoints"
git checkout master
git merge fix/api-404-error
```

---

## 📝 Commit Message Template

Create `.git/hooks/commit-msg` with:

```bash
#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check format
if ! grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore)(\(.+\))?!?: " "$1"; then
  echo -e "${RED}❌ Commit message must follow conventional commits format:${NC}"
  echo -e "${YELLOW}feat(scope): description${NC}"
  echo -e "${YELLOW}fix(api): handle null responses${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Commit message format is correct${NC}"
```

---

## 📊 Useful Git Commands

### View History:
```bash
# Simple log
git log --oneline

# Detailed log with changes
git log -p

# Graph view
git log --oneline --graph --all

# Stats per commit
git log --stat

# Blame (who changed what)
git blame frontend/src/pages/HomePage.jsx

# Diff between commits
git diff 66c79cb 71ef708
```

### Undo Changes:
```bash
# Discard unstaged changes
git checkout -- frontend/src/pages/HomePage.jsx

# Unstage file
git reset HEAD frontend/src/pages/

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert commit (create new commit)
git revert 71ef708
```

### Stash (Temporary Storage):
```bash
# Save work in progress
git stash

# List stashes
git stash list

# Restore latest stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Delete stash
git stash drop stash@{0}
```

---

## 🔍 Checking Status

```bash
# Current status
git status

# Show unstaged changes
git diff

# Show staged changes
git diff --cached

# Show all untracked files
git status --porcelain

# Show commit statistics
git shortlog

# Show file history
git log -- frontend/src/pages/HomePage.jsx
```

---

## 💾 Committing Changes

### Single file:
```bash
git add frontend/src/pages/HomePage.jsx
git commit -m "fix: update home page layout"
```

### Multiple related files:
```bash
git add backend/src/routes/ backend/src/controllers/
git commit -m "feat: add new API endpoints for portfolio management"
```

### Interactive staging (pick specific changes):
```bash
git add -p
# Y/N/s/d/a for each hunk
git commit -m "feat: specific changes from file"
```

### All changes:
```bash
git add .
git commit -m "feat: complete feature implementation"
```

---

## 🚀 Push to Remote (When Ready)

```bash
# Add remote repository
git remote add origin https://github.com/yourusername/stock-market-prediction.git

# Push to GitHub
git push -u origin master

# Push tags
git push origin --tags

# Push specific branch
git push origin feat/authentication
```

---

## 📋 Commit Templates by Feature

### API Integration:
```
feat(api): add [endpoint name] integration

- Fetch data from [source]
- Parse response format
- Add error handling
- Return formatted data

Fixes #[issue number]
```

### UI Component:
```
feat(ui): create [component name]

- Implement component logic
- Add styling with Tailwind CSS
- Add responsive design
- Handle loading/error states
```

### Bug Fix:
```
fix([module]): [brief description]

- Identify root cause
- Implement solution
- Add error handling
- Test edge cases

Fixes #[issue number]
```

### Refactoring:
```
refactor([module]): [brief description]

- Improve code structure
- Extract duplicate code
- Improve performance
- Update tests
```

---

## 🎓 Commit Message Examples

```bash
# Good ✅
git commit -m "feat(stock): add price alerts functionality

- Implement alert creation and deletion
- Send email notifications
- Store alerts in database
- Add user preferences for alert frequency"

# Bad ❌
git commit -m "Update code"
git commit -m "Fixed stuff"
git commit -m "Work in progress"
git commit -m "asdf"
```

---

## 🔐 Security Tips

**Never commit**:
- API keys or secrets → Use `.env` files
- Passwords → Use environment variables
- Database credentials → Use `.env.example` as template
- Private information → Check before committing

**Check before committing**:
```bash
# Show what will be committed
git diff --cached

# Ensure no secrets are staged
git grep -i "password\|secret\|key" --exclude-dir=node_modules
```

---

## 📈 Repository Statistics

```bash
# Lines of code
git log --pretty=format: --numstat | awk '{sum1+=$1; sum2+=$2} END {print "Added:", sum1, "Removed:", sum2}'

# Commits per author
git shortlog -sn

# Most changed files
git log --pretty=format: --name-only | grep -v '^$' | sort | uniq -c | sort -rn | head -10
```

---

## 🎯 Next Steps

1. ✅ **Git initialized** with initial commit
2. ⏭️ **Create GitHub repository** (optional but recommended)
3. ⏭️ **Set up CI/CD** with GitHub Actions
4. ⏭️ **Protect master branch** (require pull requests)
5. ⏭️ **Add collaborators** and assign roles
6. ⏭️ **Create issue templates** for bug reports
7. ⏭️ **Document release process**

---

## 📚 Reference Links

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Branching Model](https://nvie.com/posts/a-successful-git-branching-model/)

---

**Status**: ✅ Git Repository Active  
**Current Version**: v0.1.0  
**Last Commit**: `71ef708`  
**Total Commits**: 2  
**Last Update**: December 17, 2025  

For full commit history, see [GIT_COMMIT_HISTORY.md](GIT_COMMIT_HISTORY.md)
