---
project_id: SPEC-2025-12-17-001
project_name: "JSON UI Data Model for vscode-git-adr"
slug: json-ui-data-model
status: in-review
created: 2025-12-17T10:00:00Z
approved: null
started: null
completed: null
expires: 2026-03-17T10:00:00Z
superseded_by: null
tags: [vscode-extension, tree-view, json-parsing, ux-improvement]
stakeholders: []
worktree:
  branch: plan/json-ui-data-model
  base_branch: main
---

# JSON UI Data Model for vscode-git-adr

## Overview

Refactor the VS Code extension to use structured JSON output from `git adr list -f json` instead of parsing unstructured CLI text. This eliminates the fragile regex-based parsing and enables a clean, readable Tree View UI.

## Current State

- CLI wrapper calls `git adr list` without format flag
- Parser uses regex heuristics to parse unstructured text output
- Tree View shows raw IDs in descriptions, minimal tooltips
- UI appears cluttered with terminal-like formatting

## Target State

- CLI wrapper calls `git adr list -f json` by default
- JSON response parsed into typed `AdrListItem[]` array
- Tree View displays clean labels, structured descriptions, rich tooltips
- Graceful fallback to text parsing for older git-adr versions

## Key Artifacts

| Document | Status | Description |
|----------|--------|-------------|
| REQUIREMENTS.md | ✅ complete | Functional and non-functional requirements |
| ARCHITECTURE.md | ✅ complete | Technical design and component changes |
| IMPLEMENTATION_PLAN.md | ✅ complete | Phased task breakdown |
| CHANGELOG.md | ✅ complete | Plan evolution history |

## Summary

| Metric | Value |
|--------|-------|
| Total Requirements | 17 (12 P0, 3 P1, 2 P2) |
| Total Tasks | 15 across 4 phases |
| Files to Create | 4 (model + fixtures) |
| Files to Modify | 4 (parser, CLI, tree provider, fixture loader) |
| Key Risk | Older git-adr versions (mitigated by fallback) |

## Quick Links

- Source codebase: `/src/`
- Tests: `/test/`
- CLI wrapper: `src/cli/gitAdrCli.ts`
- Tree provider: `src/views/adrTreeProvider.ts`
- Parser: `src/utils/parser.ts`

## Next Steps

1. Review the specification documents
2. Run `/cs:i json-ui-data-model` to begin implementation
