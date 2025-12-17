# Git ADR for VS Code

![CI](https://github.com/zircote/vscod-git-adr/actions/workflows/ci.yml/badge.svg)

Manage Architecture Decision Records (ADRs) stored in git notes directly within VS Code.

This extension provides a seamless integration with [git-adr](https://github.com/zircote/git-adr), allowing you to create, view, edit, and manage ADRs without leaving your editor.

## Features

- **Activity Bar View**: Browse all ADRs in your workspace with a dedicated tree view
- **Virtual Documents**: View ADR content without creating files in your workspace
- **Multi-root Support**: Works with multi-root workspaces, managing ADRs per repository
- **Full ADR Workflow**:
  - Initialize ADR support in a repository
  - Create new ADRs with descriptive titles
  - View and edit existing ADRs
  - Search across all ADRs
  - Sync ADRs via git notes (pull/push)
- **Graceful Degradation**: Clear error messages when git or git-adr is not available

## Requirements

Before using this extension, you must install:

1. **Git** - The extension requires git to be installed and available in your PATH
2. **git-adr** - Install from [https://github.com/zircote/git-adr](https://github.com/zircote/git-adr)

### Installing git-adr

Follow the installation instructions at the git-adr repository:

- https://github.com/zircote/git-adr

This extension does not assume a specific installation method (pip/pipx/homebrew/etc.). The only requirement is that running `git adr --version` works in your terminal.

## Getting Started

1. Open a git repository in VS Code
2. Open the ADR view from the Activity Bar (look for the ADR icon)
3. If this is your first time:
   - Click "Initialize ADR in Repository" or run the command `Git ADR: Initialize ADR in Repository`
4. Create your first ADR:
   - Click the "New ADR" button or run `Git ADR: New ADR`
   - Enter a descriptive title
5. View your ADRs in the tree view - click any ADR to open it

## Commands

All commands are available through the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- `Git ADR: Refresh` - Refresh the ADR list
- `Git ADR: Initialize ADR in Repository` - Initialize ADR support (`git adr init`)
- `Git ADR: New ADR` - Create a new ADR
- `Git ADR: List ADRs` - Show all ADRs in a text editor
- `Git ADR: Show ADR` - Open an ADR in a virtual document
- `Git ADR: Edit ADR` - Edit an ADR (launches external editor)
- `Git ADR: Search ADRs` - Search for ADRs by keyword
- `Git ADR: Sync: Pull` - Pull ADRs from remote via git notes
- `Git ADR: Sync: Push` - Push ADRs to remote via git notes
- `Git ADR: Open Documentation` - Open git-adr documentation
- `Git ADR: Configure Extension` - Open extension settings

## Extension Settings

Configure the extension through VS Code settings:

- `gitAdr.gitPath`: Path to git executable (default: `git`)
- `gitAdr.adrSubcommand`: Git subcommand for ADR operations (default: `adr`)
- `gitAdr.commandTimeoutMs`: Timeout for CLI commands in milliseconds (default: `15000`)
- `gitAdr.autoRefreshOnFocus`: Automatically refresh ADR list when VS Code gains focus (default: `true`)
- `gitAdr.showOutputOnError`: Show output channel when errors occur (default: `true`)

## Troubleshooting

### "Git not found" error

Ensure git is installed and available in your PATH. You can also set the `gitAdr.gitPath` setting to point to your git executable.

### "git-adr not found" error

Install git-adr from [https://github.com/zircote/git-adr](https://github.com/zircote/git-adr) and ensure it's available in your PATH.

### "Not a git repository" error

Open a folder that contains a git repository (initialized with `git init`).

### Sync issues

ADRs are stored in git notes. To sync with remote repositories:

1. Ensure your remote is configured
2. Use `Git ADR: Sync: Pull` to fetch remote ADRs
3. Use `Git ADR: Sync: Push` to share your ADRs

For more details on git notes syncing, see the [git-adr documentation](https://github.com/zircote/git-adr).

## Privacy

This extension does not collect any telemetry or user data.

## Contributing

Issues and pull requests are welcome at [https://github.com/zircote/vscod-git-adr](https://github.com/zircote/vscod-git-adr)

## Development

- `npm ci`
- `npm run lint`
- `npm run compile`
- `npm test` (unit suite in VS Code extension host)
- `npm run test:integration` (integration suite in VS Code extension host)
- `npm run package` (builds a `.vsix`)

On Linux CI/headless environments, run tests under Xvfb:

- `xvfb-run -a npm test`
- `xvfb-run -a npm run test:integration`

## Release

See [RUNBOOK_RELEASE.md](RUNBOOK_RELEASE.md) for versioning, tagging, packaging, and Marketplace publishing.

## License

MIT

## Credits

This extension is a VS Code integration for [git-adr](https://github.com/zircote/git-adr).