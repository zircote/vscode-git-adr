# Changelog

All notable changes to the Git ADR extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/zircote/vscod-git-adr/releases/tag/v0.1.0
