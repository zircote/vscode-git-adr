# Changelog

All notable changes to the Git ADR extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.11] - 2025-12-17

### Fixed
- Fixed Marketplace publish to use pre-built .vsix instead of rebuilding

## [0.1.10] - 2025-12-17

### Changed
- Fixed Copilot workflow job name for coding agent compatibility
- Enabled automated VS Code Marketplace publishing on release

## [0.1.9] - 2025-12-17

### Changed
- Synchronized CHANGELOG with actual release history

## [0.1.8] - 2025-12-17

### Fixed
- Parser now correctly sanitizes JSON control characters only inside string literals, preventing corruption of valid JSON structure

### Changed
- Updated GitHub Actions dependencies:
  - actions/checkout from 4 to 6
  - actions/download-artifact from 4 to 7
  - actions/setup-node from 4 to 6
  - actions/upload-artifact from 4 to 6
- Updated TypeScript to 5.9.3

### Docs
- Fixed broken links and typos in RUNBOOK_RELEASE.md

## [0.1.1] - 2025-12-17

### Added
- Architecture Decision Records (ADRs) documenting key design decisions
  - Local VS Code execution only (no remote SSH/WSL/DevContainers)
  - CLI as source of truth for ADR operations
  - JSON-first CLI output parsing with text fallback
  - ICommandRunner interface for testable CLI execution
  - Virtual document scheme (git-adr://) for ADR viewing
  - Shell injection prevention via args array execution
  - Mock-based testing without CLI dependency
  - Tag-based GitHub Actions for automated releases
- Pre-push hook for automatic ADR notes synchronization
- JSON UI data model for ADR list parsing
- GitHub ecosystem and Copilot configuration
- Copilot instructions for the repository

### Changed
- Reorganized documentation into docs/ directory

## [0.1.0] - 2024-12-17

### Added
- Initial release of Git ADR for VS Code
- ADR tree view with multi-root workspace support
- Virtual document viewer for ADR content
- Commands: init, new, list, show, edit, search, sync pull/push
- Settings for git path, subcommand, timeouts, auto-refresh, output on error
- Comprehensive integration tests with mock command runner
- GitHub Actions CI/CD workflows for testing and releases
- Release runbook with marketplace publishing guidelines

### Fixed
- Basic parsing, logging, and deterministic tests

[0.1.11]: https://github.com/zircote/vscode-git-adr/releases/tag/v0.1.11
[0.1.10]: https://github.com/zircote/vscode-git-adr/releases/tag/v0.1.10
[0.1.9]: https://github.com/zircote/vscode-git-adr/releases/tag/v0.1.9
[0.1.8]: https://github.com/zircote/vscode-git-adr/releases/tag/v0.1.8
[0.1.1]: https://github.com/zircote/vscode-git-adr/releases/tag/v0.1.1
[0.1.0]: https://github.com/zircote/vscode-git-adr/releases/tag/v0.1.0
