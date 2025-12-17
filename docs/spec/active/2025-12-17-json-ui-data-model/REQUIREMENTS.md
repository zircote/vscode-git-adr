---
document_type: requirements
project_id: SPEC-2025-12-17-001
version: 1.0.0
last_updated: 2025-12-17T10:00:00Z
status: draft
---

# JSON UI Data Model - Product Requirements Document

## Executive Summary

The vscode-git-adr extension currently renders ADR list items using unstructured CLI text, resulting in a cluttered UI with terminal-like formatting. The git-adr CLI provides a clean JSON format via `git adr list -f json`. This project refactors the extension to consume structured JSON data, delivering a polished, readable Tree View experience.

## Problem Statement

### The Problem

The current Tree View displays raw CLI output artifacts in labels, descriptions, and tooltips. Users see pipe separators, inconsistent spacing, and IDs that obscure the actual ADR titles. This degrades the professional appearance of the extension and makes navigation difficult.

### Impact

- **User Experience**: Developers scanning ADRs waste time parsing visual noise
- **Reliability**: Regex-based text parsing is fragile and breaks with CLI output changes
- **Maintenance**: Any CLI format change requires parser updates

### Current State

| Component | Current Behavior |
|-----------|-----------------|
| CLI call | `git adr list` (no format flag) |
| Parser | Regex heuristics: pipe, colon, space separators |
| TreeItem label | Raw title from regex match |
| TreeItem description | Raw ID string |
| TreeItem tooltip | `${id}: ${title}` only |

## Goals and Success Criteria

### Primary Goal

Transform the ADR Tree View from unstructured text rendering to structured JSON-driven UI with clean, consistent presentation.

### Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Tree View readability | No terminal-like formatting visible | Visual inspection |
| Tooltip completeness | All metadata fields displayed | Checklist verification |
| Fallback reliability | Graceful degradation on older CLI | Manual test with text-only CLI |
| Test coverage | 100% coverage of JSON parsing logic | Jest coverage report |

### Non-Goals (Explicit Exclusions)

- Changing the `git adr show` output format (remains text/markdown)
- Adding new CLI commands beyond existing ones
- Modifying the git-adr CLI itself
- Supporting alternative JSON schemas

## User Analysis

### Primary Users

- **Who**: Developers using git-adr to manage Architecture Decision Records
- **Needs**: Quick navigation of ADRs, understanding status at a glance
- **Context**: VS Code sidebar while coding, reviewing architecture decisions

### User Stories

1. As a developer, I want to see ADR titles clearly in the Tree View so I can quickly find the decision I'm looking for
2. As a developer, I want to see status and date in the description so I can identify recent/active decisions without clicking
3. As a developer, I want rich tooltips with all metadata so I can preview ADR details without opening the file
4. As a developer using an older git-adr version, I want the extension to still work (with degraded formatting)

## Functional Requirements

### Must Have (P0)

| ID | Requirement | Rationale | Acceptance Criteria |
|----|-------------|-----------|---------------------|
| FR-001 | Create `AdrListItem` interface matching JSON schema | Type safety for all downstream code | Interface exists with all fields from canonical schema |
| FR-002 | Update CLI wrapper to call `git adr list -f json` | Enable structured data consumption | CLI executes with `-f json` flag |
| FR-003 | Parse stdout as JSON array | Eliminate regex parsing for JSON path | `JSON.parse()` used, returns `AdrListItem[]` |
| FR-004 | Handle empty stdout → empty array | Prevent errors on empty ADR repositories | Returns `[]` without throwing |
| FR-005 | Handle JSON parse failure → fallback to text | Backward compatibility with older CLI | Falls back, logs `ADR list source = text-fallback` |
| FR-006 | Handle non-zero exit code → user-friendly error | Clear error messaging | Error displayed in Tree View with guidance |
| FR-007 | TreeItem label = `title` | Clean, readable labels | Label shows title only, no ID prefix |
| FR-008 | TreeItem description = structured string | Status/date at a glance | Format: `status • date` or `status • date • tags` |
| FR-009 | TreeItem tooltip = multiline structured | Full metadata preview | Shows: ID, Status, Date, Tags, Linked commits, Supersedes |
| FR-010 | Normalize missing arrays to `[]` | Prevent null reference errors | Tags/linked_commits default to `[]` |
| FR-011 | Preserve `null` for supersedes fields | Correct handling of nullable fields | `null` values remain `null`, not converted |
| FR-012 | Ignore unknown extra fields | Forward compatibility | Parser doesn't throw on extra JSON fields |

### Should Have (P1)

| ID | Requirement | Rationale | Acceptance Criteria |
|----|-------------|-----------|---------------------|
| FR-101 | Log JSON source vs text-fallback | Debugging/support clarity | Output channel shows `ADR list source = json` or `text-fallback` |
| FR-102 | Truncate long linked_commits list in tooltip | Prevent tooltip overflow | Shows first 3 with "and N more" |
| FR-103 | Conditional tag display in description | Reduce noise when no tags | Tags only shown if array is non-empty |

### Nice to Have (P2)

| ID | Requirement | Rationale | Acceptance Criteria |
|----|-------------|-----------|---------------------|
| FR-201 | ID prefix on collision | Handle duplicate titles | When two ADRs have same title, prefix with short ID |
| FR-202 | Status icon in tree | Visual status indicator | Use theme icons based on status value |

## Non-Functional Requirements

### Performance

- JSON parsing must complete in <50ms for 100 ADRs
- No blocking of VS Code UI during list refresh

### Security

- No shell injection: use `execFile` not `exec` (already implemented)
- No eval of JSON: use `JSON.parse()` only

### Reliability

- Fallback path must work when JSON flag is unsupported
- Parse errors must not crash extension

### Maintainability

- Single source of truth for `AdrListItem` interface
- Clear separation: CLI layer returns typed data, not raw strings

## Technical Constraints

- TypeScript strict mode
- VS Code API compatibility: minimum 1.85.0
- No new npm dependencies for JSON parsing

## Dependencies

### Internal Dependencies

- Existing parser.ts will be refactored but text parsing preserved as fallback
- adrTreeProvider.ts consumes new typed interface
- gitAdrCli.ts returns typed data instead of raw strings

### External Dependencies

- git-adr CLI must support `-f json` flag for primary path
- Fallback path works with any git-adr version

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Older git-adr versions don't support `-f json` | Medium | High | Fallback to existing text parsing |
| JSON schema changes in future CLI versions | Low | Medium | Ignore unknown fields, handle missing optional fields |
| Performance degradation with large ADR counts | Low | Low | JSON parsing is O(n) and very fast |

## Open Questions

- [x] How to detect JSON support? → **Resolved**: Try JSON first, fallback on error

## Appendix

### JSON Schema (Canonical)

```json
[
  {
    "id": "20251217-rename-homebrew-tap-to-follow-naming-conventions",
    "title": "Rename Homebrew tap to follow naming conventions",
    "status": "proposed",
    "date": "2025-12-17",
    "tags": [],
    "linked_commits": [],
    "supersedes": null,
    "superseded_by": null
  }
]
```

### TypeScript Interface

```typescript
export interface AdrListItem {
  id: string;
  title: string;
  status?: string;
  date?: string;
  tags?: string[];
  linked_commits?: string[];
  supersedes?: string | null;
  superseded_by?: string | null;
}
```

### Tree Rendering Examples

**Description format:**
- `accepted • 2025-12-16`
- `proposed • 2025-12-17`
- `accepted • 2025-12-16 • security,yaml`

**Tooltip format:**
```
ID: 20251217-rename-homebrew-tap
Status: proposed
Date: 2025-12-17
Tags: infrastructure, naming
Linked commits: abc123, def456
Supersedes: (none)
Superseded by: (none)
```
