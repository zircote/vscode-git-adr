# Release Runbook for Git ADR VS Code Extension

This document provides a comprehensive guide for releasing new versions of the Git ADR VS Code extension to the Visual Studio Code Marketplace.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Versioning Strategy](#versioning-strategy)
- [Pre-Release Checklist](#pre-release-checklist)
- [Release Process](#release-process)
- [Marketplace Listing Guidelines](#marketplace-listing-guidelines)
- [Troubleshooting](#troubleshooting)
- [Support and Triage](#support-and-triage)

## Prerequisites

### Required Accounts and Credentials

1. **VS Code Marketplace Publisher Account**
   - Create a publisher at https://marketplace.visualstudio.com/manage
   - Publisher ID should match the `publisher` field in `package.json`

2. **Personal Access Token (PAT)**
   - Create a PAT in Azure DevOps with `Marketplace (Publish)` scope
   - Navigate to: https://dev.azure.com → User Settings → Personal Access Tokens
   - Scope required: `Marketplace` → `Manage`
   - Store securely (needed for publishing)

3. **GitHub Repository Secrets**
   - Add `VSCE_PAT` to repository secrets
   - Navigate to: Repository → Settings → Secrets and variables → Actions
   - Name: `VSCE_PAT`
   - Value: Your Personal Access Token from step 2

### Development Tools

- Node.js 18.x or 20.x (LTS versions)
- npm (bundled with Node.js)
- git
- Visual Studio Code

## Versioning Strategy

This project follows [Semantic Versioning (SemVer)](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes or major feature overhauls
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, backwards-compatible

### Version Location

The version is stored in `package.json`:

```json
{
  "version": "X.Y.Z"
}
```

### Updating the Version

1. Update `package.json` version field
2. Update `CHANGELOG.md` with the new version and changes
3. Commit these changes before tagging

## Pre-Release Checklist

Before creating a release, complete the following steps:

### 1. Code Quality

```bash
# Install dependencies
npm ci

# Lint the code
npm run lint

# Fix linting issues if any
npm run lint:fix

# Compile TypeScript
npm run compile
```

### 2. Run Tests

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration
```

### 3. Local Packaging Test

```bash
# Package the extension
npm run package

# This creates a .vsix file (e.g., git-adr-vscode-X.Y.Z.vsix)
```

### 4. Manual Testing

Install the packaged extension locally and test:

```bash
# Install in VS Code
code --install-extension git-adr-vscode-X.Y.Z.vsix
```

**Manual Test Checklist:**

- [ ] Extension loads without errors
- [ ] ADR view appears in Activity Bar
- [ ] Tree view populates with ADRs (test with a real git-adr repository)
- [ ] Creating new ADR works
- [ ] Viewing ADR content works
- [ ] Search functionality works
- [ ] Sync (pull/push) commands work
- [ ] Error messages display correctly when git-adr is not installed
- [ ] Settings can be configured
- [ ] Extension works in multi-root workspace

### 5. Update Documentation

- [ ] Update `CHANGELOG.md` with new version section
- [ ] Ensure `README.md` is up-to-date
- [ ] Update screenshots if UI has changed
- [ ] Review all documentation for accuracy

## Release Process

### Option A: Automated Release (Recommended)

This is the primary release method using GitHub Actions.

#### Step 1: Update Version and Changelog

```bash
# Update package.json version
npm version patch  # or minor, or major

# Edit CHANGELOG.md to add release notes
```

Example CHANGELOG.md entry:

```markdown
## [1.2.3] - 2024-01-15

### Added
- New search filtering options
- Support for custom ADR templates

### Fixed
- Tree view refresh issue on Windows
- Sync command timeout on large repositories

### Changed
- Improved error messages for missing dependencies
```

#### Step 2: Commit Changes

```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "Prepare release v1.2.3"
git push origin main
```

#### Step 3: Create and Push Tag

```bash
# Create annotated tag
git tag -a v1.2.3 -m "Release v1.2.3"

# Push tag to GitHub
git push origin v1.2.3
```

#### Step 4: Monitor GitHub Actions

1. Navigate to: Repository → Actions
2. Watch the "Release" workflow execute
3. Workflow stages:
   - **Validate**: Checks tag version matches package.json
   - **Build and Test**: Runs full CI pipeline
   - **Package and Release**: Creates GitHub Release with .vsix
   - **Publish Marketplace**: Publishes to VS Code Marketplace (if VSCE_PAT is configured)

#### Step 5: Verify Release

1. **GitHub Release**
   - Check https://github.com/zircote/vscod-git-adr/releases
   - Verify .vsix file is attached
   - Verify checksums.txt is attached

2. **VS Code Marketplace** (if auto-published)
   - Visit https://marketplace.visualstudio.com/items?itemName=your-publisher-name.git-adr-vscode
   - Verify new version appears (may take 5-10 minutes)
   - Check that README renders correctly
   - Verify install/update works in VS Code

### Option B: Manual Release (Fallback)

Use this method if GitHub Actions fails or for testing.

#### Step 1: Prepare Release

Follow steps 1-2 from Option A.

#### Step 2: Package Locally

```bash
npm ci
npm run compile
npm run package
```

#### Step 3: Create GitHub Release Manually

1. Go to https://github.com/zircote/vscod-git-adr/releases/new
2. Choose tag: Create new tag `v1.2.3`
3. Release title: `Release v1.2.3`
4. Description: Copy relevant section from CHANGELOG.md
5. Attach the .vsix file
6. Click "Publish release"

#### Step 4: Publish to Marketplace

```bash
# Install vsce if not already installed
npm install -g @vscode/vsce

# Publish (will prompt for PAT if not in environment)
vsce publish -p <YOUR_PAT>

# Or set PAT in environment
export VSCE_PAT=<YOUR_PAT>
vsce publish
```

## Marketplace Listing Guidelines

### README Structure

Your extension's README should follow this structure:

1. **Header**: Extension name and brief description
2. **Features**: Bullet list with key features
3. **Requirements**: Dependencies and prerequisites
4. **Installation**: How to install git-adr
5. **Getting Started**: Quick start guide
6. **Commands**: List of available commands
7. **Settings**: Configuration options
8. **Troubleshooting**: Common issues and solutions
9. **Privacy**: No telemetry statement
10. **Contributing**: Link to contribution guidelines
11. **License**: License information

### Screenshots and Media

**Requirements:**
- PNG or JPG format
- Recommended size: 1280x720 or higher
- Show actual functionality, not mockups
- Include captions/annotations if helpful

**Storage:**
- Store in `resources/` or `images/` directory
- Reference in README with relative paths
- Optimize file sizes (use tools like TinyPNG)

**What to Capture:**
- ADR tree view in action
- Virtual document viewer
- Command palette showing commands
- Error messages/graceful degradation

### Categories and Keywords

**Current Categories** (in package.json):
```json
"categories": [
  "Other",
  "SCM Providers"
]
```

**Available Categories:**
- SCM Providers
- Other
- Programming Languages
- Snippets
- Linters
- Formatters
- Debuggers
- Testing

**Keywords** (in package.json):
```json
"keywords": [
  "git",
  "adr",
  "architecture",
  "decision",
  "records",
  "documentation"
]
```

### Icon Requirements

**Technical Requirements:**
- Format: PNG
- Size: 128x128 pixels minimum (256x256 recommended)
- Background: Transparent or solid color
- File: `resources/icon.png`

**Design Guidelines:**
- Simple and recognizable at small sizes
- Avoid text (extension name is shown separately)
- Use colors that work in light and dark themes
- Follow VS Code icon style guidelines

### Common Marketplace Rejection Issues

**Avoid these common issues:**

1. **Missing License**
   - Solution: Include LICENSE file (MIT license is present)

2. **Broken Links**
   - Solution: Test all links in README before publishing
   - Use relative paths for images

3. **Unclear Requirements**
   - Solution: Clearly state that git and git-adr must be installed
   - Provide installation links

4. **Too-Broad activationEvents**
   - Solution: Activate only on view/command usage (already implemented)
   - Avoid `*` activation event

5. **Large Package Size**
   - Solution: Use `.vscodeignore` to exclude unnecessary files
   - Exclude `node_modules`, `.git`, `src/*.ts`, etc.

6. **Missing or Incorrect Publisher**
   - Solution: Update `publisher` in package.json to match your Marketplace publisher ID

### No Telemetry Statement

This extension does not collect telemetry. This is clearly stated in the README:

```markdown
## Privacy

This extension does not collect any telemetry or user data.
```

**Important:** If you ever add telemetry:
- Get user consent
- Provide opt-out mechanism
- Update privacy statement
- Comply with GDPR and other regulations

## Troubleshooting

### Release Workflow Fails

**Version Mismatch Error:**
```
Error: Tag version (1.2.3) does not match package.json version (1.2.2)
```

**Solution:**
1. Check package.json version
2. Delete incorrect tag: `git tag -d v1.2.3 && git push origin :refs/tags/v1.2.3`
3. Update package.json
4. Recreate tag with correct version

**Tests Fail in CI:**

**Solution:**
1. Run tests locally: `npm run test:integration`
2. Check for environment-specific issues
3. Review test logs in GitHub Actions
4. Fix failing tests and push changes
5. Recreate tag after fixes

### Marketplace Publish Fails

**VSCE_PAT Not Configured:**

**Solution:**
1. Verify secret exists: Repository → Settings → Secrets → VSCE_PAT
2. Check PAT hasn't expired in Azure DevOps
3. Verify PAT has correct scope (Marketplace Manage)
4. Update secret if needed

**Invalid Package:**

**Solution:**
1. Test package locally: `vsce package`
2. Check for validation errors
3. Review package.json for required fields
4. Test install locally before publishing

**Publisher Not Found:**

**Solution:**
1. Create publisher at https://marketplace.visualstudio.com/manage
2. Update `publisher` field in package.json
3. Rebuild and republish

### Extension Not Appearing in Marketplace

**Possible Causes:**
1. Publishing takes 5-10 minutes to propagate
2. Extension was published as private
3. Publisher verification pending

**Solution:**
1. Wait 10-15 minutes
2. Check publisher dashboard for status
3. Verify extension is set to public

## Support and Triage

### Gathering User Information

When users report issues, request the following:

1. **Environment:**
   - OS: Windows/macOS/Linux (version)
   - VS Code version: Help → About
   - Extension version: Extensions → Git ADR
   - git version: `git --version`
   - git-adr version: `git adr --version`

2. **Reproduction Steps:**
   - Step-by-step what they did
   - Expected vs actual behavior
   - Screenshots/videos if UI-related

3. **Logs:**
   - Output Channel: View → Output → "Git ADR"
   - Copy all relevant log output

### Accessing Extension Logs

**User Instructions:**

1. Open Output panel: `View` → `Output` or `Ctrl+Shift+U` / `Cmd+Shift+U`
2. Select "Git ADR" from dropdown
3. Look for error messages or warnings
4. Copy entire log output for bug reports

**What Logs Contain:**
- Command executions (git adr commands)
- Working directories
- Error messages and stack traces
- Capability detection results

### Debugging Extension Host

**For Contributors/Developers:**

1. Clone repository
2. Open in VS Code
3. Press `F5` to launch Extension Development Host
4. Set breakpoints in TypeScript source
5. Reproduce issue
6. Inspect variables and call stack

**Remote Debugging:**
- Use VS Code built-in debugging tools
- Extension Host logs: Help → Toggle Developer Tools

### Issue Template Sections

Create a GitHub issue template (`.github/ISSUE_TEMPLATE/bug_report.md`):

```markdown
## Environment
- OS: [e.g., Windows 11, macOS 13.0, Ubuntu 22.04]
- VS Code Version: [e.g., 1.85.0]
- Extension Version: [e.g., 1.2.3]
- git version: [output of `git --version`]
- git-adr version: [output of `git adr --version`]

## Describe the Bug
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Logs
<details>
<summary>Output Channel Logs</summary>

```
Paste logs from View → Output → "Git ADR"
```
</details>

## Screenshots
If applicable, add screenshots to help explain the problem.

## Additional Context
Any other context about the problem.
```

### Common Issues and Solutions

**"Git not found" Error:**
- Verify git is installed: `git --version`
- Check PATH includes git
- Set `gitAdr.gitPath` in settings to full path

**"git-adr not found" Error:**
- Install git-adr: https://github.com/zircote/git-adr
- Verify installation: `git adr --version`
- Restart VS Code after installation

**"Not a git repository" Error:**
- Ensure workspace folder is a git repository
- Initialize git: `git init`
- Open the repository root folder, not a parent

**Tree View Not Refreshing:**
- Click refresh button in tree view
- Check `gitAdr.autoRefreshOnFocus` setting
- Manually refresh: Command Palette → "Git ADR: Refresh"

**Sync Failures:**
- Ensure remote is configured: `git remote -v`
- Check network connectivity
- Verify git notes refs are configured
- See git-adr documentation for notes syncing

## Appendix: Quick Reference

### Version Bump Commands

```bash
# Patch version (1.2.3 → 1.2.4)
npm version patch

# Minor version (1.2.3 → 1.3.0)
npm version minor

# Major version (1.2.3 → 2.0.0)
npm version major
```

### Useful vsce Commands

```bash
# Package extension
vsce package

# Publish extension
vsce publish

# Publish specific version
vsce publish 1.2.3

# Publish patch increment
vsce publish patch

# List published versions
vsce show your-publisher-name.git-adr-vscode

# Unpublish version (use with caution!)
vsce unpublish your-publisher-name.git-adr-vscode@1.2.3
```

### Git Tag Commands

```bash
# List all tags
git tag

# Create annotated tag
git tag -a v1.2.3 -m "Release v1.2.3"

# Push tag to remote
git push origin v1.2.3

# Push all tags
git push --tags

# Delete local tag
git tag -d v1.2.3

# Delete remote tag
git push origin :refs/tags/v1.2.3
```

## Contacts and Resources

- **GitHub Repository:** https://github.com/zircote/vscod-git-adr
- **Issue Tracker:** https://github.com/zircote/vscod-git-adr/issues
- **VS Code Marketplace:** https://marketplace.visualstudio.com/vscode
- **VS Code Extension API:** https://code.visualstudio.com/api
- **git-adr Project:** https://github.com/zircote/git-adr
