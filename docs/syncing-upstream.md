# Syncing with Upstream v4.0

This document describes how to keep the IVR Replacement repository synchronized with updates from the upstream simple-conversation-relay v4.0 branch.

## Overview

The IVR Replacement system is built on top of Conversation Relay v4.0. To receive bug fixes, security updates, and new features from the base platform, you need to periodically sync with the upstream repository.

## Repository Structure

- **origin**: Your IVR Replacement repository (`github.com/deshartman/crelay-ivr-replacement`)
- **upstream**: Original Conversation Relay repository (`github.com/deshartman/simple-conversation-relay`)

## Setup Upstream Remote

If you haven't already configured the upstream remote:

```bash
git remote add upstream https://github.com/deshartman/simple-conversation-relay.git
git remote -v
```

You should see:
```
origin    https://github.com/deshartman/crelay-ivr-replacement.git (fetch)
origin    https://github.com/deshartman/crelay-ivr-replacement.git (push)
upstream  https://github.com/deshartman/simple-conversation-relay.git (fetch)
upstream  https://github.com/deshartman/simple-conversation-relay.git (push)
```

## Checking for Updates

### View Available Updates

```bash
# Fetch latest changes from upstream
git fetch upstream v4.0

# View commits that are in upstream but not in your branch
git log HEAD..upstream/v4.0 --oneline --no-merges

# View detailed changes
git log HEAD..upstream/v4.0 --stat
```

### Check Specific Files

```bash
# See what changed in specific files
git diff HEAD..upstream/v4.0 -- server/src/server.ts
git diff HEAD..upstream/v4.0 -- server/src/services/
```

## Merging Upstream Updates

### Standard Merge Process

```bash
# Ensure you're on main branch
git checkout main

# Fetch latest upstream changes
git fetch upstream v4.0

# Merge upstream v4.0 into main
git merge upstream/v4.0

# If merge succeeds without conflicts
git push origin main
```

### If Merge Conflicts Occur

```bash
# After running git merge, if conflicts occur:
git status  # Shows files with conflicts

# Manually resolve conflicts in each file
# Look for conflict markers: <<<<<<<, =======, >>>>>>>

# After resolving, stage the files
git add <resolved-file>

# Complete the merge
git commit

# Push to origin
git push origin main
```

## Conflict Resolution Strategy

### Expected Conflict Areas

Conflicts are most likely in these files:

1. **`server/src/server.ts`**
   - **IVR Endpoints Section**: Your IVR endpoints (`/mapIvr`, `/mapIvr/:jobId`)
   - **Resolution**: Keep both upstream changes AND your IVR endpoints

2. **`server/assets/serverConfig.json`**
   - **IVR Configuration**: Your IVR-specific settings
   - **Resolution**: Merge both configurations

3. **`server/package.json`**
   - **Metadata Changes**: Your project name, version, repository URLs
   - **Resolution**: Keep your IVR-specific metadata, accept upstream dependency updates

### Files That Won't Conflict

These IVR-specific files don't exist in upstream, so they won't conflict:

- `server/src/services/IvrMappingService.ts`
- `server/src/interfaces/IvrMappingService.d.ts`
- `server/src/tools/read_legs.ts`
- `server/src/tools/write_legs.ts`
- `server/assets/ivrWalkContext.md`
- `server/assets/ivrWalkToolManifest.json`

### Resolving server.ts Conflicts

Example conflict in `server/src/server.ts`:

```typescript
<<<<<<< HEAD
// Your IVR endpoints
app.post('/mapIvr', async (req, res) => { /* ... */ });
app.get('/mapIvr/:jobId', async (req, res) => { /* ... */ });
=======
// Upstream changes to other endpoints
app.post('/someNewEndpoint', async (req, res) => { /* ... */ });
>>>>>>> upstream/v4.0
```

**Resolution**: Keep BOTH:

```typescript
// Upstream changes
app.post('/someNewEndpoint', async (req, res) => { /* ... */ });

// Your IVR endpoints
app.post('/mapIvr', async (req, res) => { /* ... */ });
app.get('/mapIvr/:jobId', async (req, res) => { /* ... */ });
```

## Testing After Merge

After merging upstream changes, always test thoroughly:

```bash
# Reinstall dependencies (in case of package.json changes)
cd server
npm install

# Build the project
npm run build

# Run development server
npm run dev

# Test IVR endpoints
curl -X POST http://localhost:3001/mapIvr \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Verify existing functionality still works
# Test other endpoints, tools, and services
```

## Sync Schedule Recommendations

### Monthly Sync

Check for updates monthly to stay current:

```bash
git fetch upstream v4.0
git log HEAD..upstream/v4.0 --oneline
```

### Security Updates

For critical security updates, sync immediately:

1. Monitor upstream repository for security announcements
2. Review the changes
3. Merge and test promptly
4. Deploy to production

### Feature Updates

For new features you want to adopt:

1. Review the feature implementation
2. Merge and test in development environment
3. Verify compatibility with IVR features
4. Deploy to staging, then production

## Reverting a Merge

If a merge causes issues:

```bash
# Find the merge commit
git log --oneline

# Revert the merge (use merge commit hash)
git revert -m 1 <merge-commit-hash>

# Or reset to before merge (destructive - use with caution)
git reset --hard HEAD~1
```

## Advanced: Selective Merging

To merge only specific commits from upstream:

```bash
# View commits
git log upstream/v4.0 --oneline

# Cherry-pick specific commits
git cherry-pick <commit-hash>

# Or cherry-pick a range
git cherry-pick <start-commit>..<end-commit>
```

## Monitoring Upstream Changes

### Subscribe to Notifications

1. Watch the upstream repository on GitHub
2. Configure notifications for releases and updates
3. Monitor the v4.0 branch specifically

### Review Changelogs

Check the upstream CHANGELOG.md before merging:

```bash
git fetch upstream v4.0
git show upstream/v4.0:CHANGELOG.md
```

## Troubleshooting

### "Refusing to merge unrelated histories"

If you see this error:

```bash
git merge upstream/v4.0 --allow-unrelated-histories
```

### "CONFLICT: Merge conflict in package-lock.json"

Package lock conflicts are common:

```bash
# Accept theirs or yours
git checkout --theirs package-lock.json
# or
git checkout --ours package-lock.json

# Then regenerate
rm package-lock.json
npm install

# Stage and continue
git add package-lock.json
git commit
```

### Build Fails After Merge

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Getting Help

If you encounter issues during sync:

1. Check this documentation
2. Review upstream project documentation
3. Open an issue in the IVR Replacement repository
4. Include merge conflict details and error messages

## Summary

**Regular Workflow:**

```bash
# 1. Fetch upstream
git fetch upstream v4.0

# 2. Check for updates
git log HEAD..upstream/v4.0 --oneline

# 3. Merge if updates exist
git merge upstream/v4.0

# 4. Resolve conflicts if any
# (Keep both IVR features and upstream changes)

# 5. Test thoroughly
npm install && npm run build && npm run dev

# 6. Push to origin
git push origin main
```

**Remember:**
- IVR features are isolated and rarely conflict
- Most conflicts will be in `server.ts` - keep both sets of changes
- Always test after merging
- Sync regularly to avoid large merge conflicts
