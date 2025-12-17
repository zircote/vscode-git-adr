---
document_type: architecture
project_id: SPEC-2025-12-17-001
version: 1.0.0
last_updated: 2025-12-17T10:00:00Z
status: draft
---

# JSON UI Data Model - Technical Architecture

## System Overview

This refactoring transforms the data flow from unstructured text parsing to structured JSON parsing while maintaining backward compatibility through a fallback mechanism.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          VS Code Extension                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐  │
│  │  Tree Provider  │◄────►│   CLI Wrapper   │◄────►│     Parser      │  │
│  │ adrTreeProvider │      │   gitAdrCli     │      │     parser      │  │
│  └────────┬────────┘      └────────┬────────┘      └────────┬────────┘  │
│           │                        │                        │           │
│           │                        │                        │           │
│           ▼                        ▼                        ▼           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        AdrListItem[]                             │   │
│  │  Canonical typed interface - single source of truth              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                    ┌───────────────────────────────┐
                    │         git adr CLI           │
                    │  `git adr list -f json`       │
                    │  (fallback: `git adr list`)   │
                    └───────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| JSON-first with text fallback | Maximize UX while maintaining backward compatibility |
| Single `AdrListItem` interface | Type safety, single source of truth |
| Parser returns typed data, not strings | Clean separation of concerns |
| Fallback detection via parse failure | No version probing needed, self-healing |

## Component Design

### Component 1: Data Model (`src/models/adrListItem.ts`) [NEW]

- **Purpose**: Define canonical TypeScript interface for ADR list items
- **Responsibilities**:
  - Type definitions
  - Normalization helper function
- **Interfaces**: Exported `AdrListItem` interface
- **Dependencies**: None
- **Technology**: TypeScript

```typescript
// src/models/adrListItem.ts

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

/**
 * Normalize raw JSON object to AdrListItem with defaults
 * - Missing arrays become []
 * - Unknown fields are ignored
 * - null values preserved for supersedes fields
 */
export function normalizeAdrListItem(raw: Record<string, unknown>): AdrListItem {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    status: raw.status != null ? String(raw.status) : undefined,
    date: raw.date != null ? String(raw.date) : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    linked_commits: Array.isArray(raw.linked_commits) ? raw.linked_commits.map(String) : [],
    supersedes: raw.supersedes === null ? null : raw.supersedes != null ? String(raw.supersedes) : undefined,
    superseded_by: raw.superseded_by === null ? null : raw.superseded_by != null ? String(raw.superseded_by) : undefined,
  };
}
```

### Component 2: Parser (`src/utils/parser.ts`) [MODIFIED]

- **Purpose**: Parse CLI output into typed `AdrListItem[]`
- **Responsibilities**:
  - JSON parsing (primary path)
  - Text parsing (fallback path)
  - Error handling and logging
- **Interfaces**:
  - `parseAdrListJson(output: string): AdrListItem[]` [NEW]
  - `parseAdrList(output: string): AdrListItem[]` [MODIFIED - now returns AdrListItem]
- **Dependencies**: `AdrListItem` model
- **Technology**: TypeScript

**Changes:**
1. Add `parseAdrListJson()` function for JSON parsing
2. Modify existing `parseAdrList()` to return `AdrListItem[]` (enhanced interface)
3. Preserve existing text parsing logic as fallback

```typescript
// New: JSON parsing function
export function parseAdrListJson(output: string): AdrListItem[] {
  if (!output.trim()) {
    return [];
  }

  const parsed = JSON.parse(output);

  if (!Array.isArray(parsed)) {
    throw new Error('Expected JSON array');
  }

  return parsed.map(normalizeAdrListItem);
}

// Modified: Text parsing now returns AdrListItem[] with enhanced interface
export function parseAdrList(output: string): AdrListItem[] {
  // ... existing regex logic preserved ...
  // Return type enhanced to AdrListItem[]
}
```

### Component 3: CLI Wrapper (`src/cli/gitAdrCli.ts`) [MODIFIED]

- **Purpose**: Execute git-adr commands and return typed results
- **Responsibilities**:
  - Execute CLI commands
  - Try JSON format first, fallback on failure
  - Return typed `AdrListItem[]` for list command
- **Interfaces**:
  - `listJson(workspaceFolder): Promise<AdrListItem[]>` [NEW]
  - `list(workspaceFolder): Promise<string>` [PRESERVED for backward compat]
- **Dependencies**: Parser module, Logger
- **Technology**: TypeScript, Node.js child_process

**Changes:**
1. Add `listJson()` method that returns typed data
2. Implement try-JSON-fallback-to-text logic
3. Log data source to output channel

```typescript
// New method
async listJson(workspaceFolder: vscode.WorkspaceFolder): Promise<AdrListItem[]> {
  const config = this.getConfig();
  const capabilities = await this.checkCapabilities(workspaceFolder);

  // ... capability checks ...

  try {
    // Try JSON format first
    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'list', '-f', 'json'],
      workspaceFolder.uri.fsPath
    );

    const items = parseAdrListJson(result.stdout);
    this.logger.log('ADR list source = json');
    return items;
  } catch (jsonError) {
    // Fallback to text parsing
    this.logger.log('ADR list source = text-fallback');
    this.logger.log(`JSON parse failed: ${jsonError}`);

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'list'],
      workspaceFolder.uri.fsPath
    );

    return parseAdrList(result.stdout);
  }
}
```

### Component 4: Tree Provider (`src/views/adrTreeProvider.ts`) [MODIFIED]

- **Purpose**: Provide tree data for VS Code Tree View
- **Responsibilities**:
  - Fetch ADR list via CLI
  - Create TreeItems with structured rendering
  - Cache results
- **Interfaces**: `vscode.TreeDataProvider<AdrTreeItem>`
- **Dependencies**: CLI wrapper, Logger
- **Technology**: VS Code API

**Changes:**
1. Call `cli.listJson()` instead of `cli.list()`
2. Update `AdrTreeItem` construction for structured rendering
3. Implement description and tooltip formatters

```typescript
// New: Description formatter
function formatDescription(item: AdrListItem): string {
  const parts: string[] = [];
  if (item.status) parts.push(item.status);
  if (item.date) parts.push(item.date);
  if (item.tags && item.tags.length > 0) parts.push(item.tags.join(','));
  return parts.join(' • ');
}

// New: Tooltip formatter
function formatTooltip(item: AdrListItem): string {
  const lines: string[] = [];
  lines.push(`ID: ${item.id}`);
  if (item.status) lines.push(`Status: ${item.status}`);
  if (item.date) lines.push(`Date: ${item.date}`);
  if (item.tags && item.tags.length > 0) lines.push(`Tags: ${item.tags.join(', ')}`);
  if (item.linked_commits && item.linked_commits.length > 0) {
    const commits = item.linked_commits.length > 3
      ? [...item.linked_commits.slice(0, 3), `and ${item.linked_commits.length - 3} more`]
      : item.linked_commits;
    lines.push(`Linked commits: ${commits.join(', ')}`);
  }
  if (item.supersedes !== undefined) {
    lines.push(`Supersedes: ${item.supersedes ?? '(none)'}`);
  }
  if (item.superseded_by !== undefined) {
    lines.push(`Superseded by: ${item.superseded_by ?? '(none)'}`);
  }
  return lines.join('\n');
}
```

### Component 5: AdrTreeItem (`src/views/adrTreeProvider.ts`) [MODIFIED]

- **Purpose**: Represent a single tree node
- **Responsibilities**:
  - Store ADR metadata
  - Provide label, description, tooltip
- **Changes**:
  - Constructor now uses formatter functions
  - `adrEntry` type changed from `AdrListEntry` to `AdrListItem`

## Data Design

### Data Models

```
┌─────────────────────────────────────────────────────────────────┐
│                        AdrListItem                               │
├─────────────────────────────────────────────────────────────────┤
│ id: string              (required)  │ Unique identifier         │
│ title: string           (required)  │ ADR title                 │
│ status?: string         (optional)  │ accepted/proposed/etc     │
│ date?: string           (optional)  │ ISO date YYYY-MM-DD       │
│ tags?: string[]         (optional)  │ Labels, default []        │
│ linked_commits?: string[](optional) │ Git commit SHAs           │
│ supersedes?: string|null (optional) │ ID of superseded ADR      │
│ superseded_by?: string|null(optional)│ ID of superseding ADR    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ git adr CLI  │────►│   gitAdrCli  │────►│    parser    │────►│ AdrListItem[]│
│              │     │  .listJson() │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
  Raw stdout          Try JSON first      Parse JSON or        Typed array
  (JSON or text)      Fallback to text    fallback text        ready for UI
```

## Integration Points

### Internal Integrations

| Component | Integration Type | Purpose |
|-----------|-----------------|---------|
| parser.ts → gitAdrCli.ts | Import | CLI uses parser functions |
| adrListItem.ts → parser.ts | Import | Parser uses model interface |
| gitAdrCli.ts → adrTreeProvider.ts | Method call | Tree fetches data via CLI |

### External Integrations

| Service | Integration Type | Purpose |
|---------|-----------------|---------|
| git-adr CLI | Child process | Execute list command |
| VS Code API | TreeDataProvider | Render tree view |

## Testing Strategy

### Unit Tests

**File: `test/suite/parser.test.ts`**
- Parse valid JSON list output → `AdrListItem[]`
- Parse empty JSON array → `[]`
- Parse malformed JSON → throws error
- Parse JSON with missing optional fields → defaults applied
- Parse JSON with `null` supersedes → null preserved
- Parse JSON with unknown extra fields → ignored
- Existing text parsing tests → still pass (backward compat)

**File: `test/suite/gitAdrCli.test.ts`**
- `listJson()` returns typed array on valid JSON
- `listJson()` falls back on JSON parse error
- `listJson()` falls back on non-zero exit code
- Fallback logs to output channel

### Integration Tests

**File: `test/suite-integration/extension.integration.test.ts`**
- Tree nodes display titles as labels (no IDs)
- Tree node descriptions show `status • date` format
- Tree node tooltips show multiline structured metadata
- Fallback path produces readable tree items

### Test Fixtures

**File: `test/fixtures/list-output.json` [NEW]**
```json
[
  {
    "id": "20251217-test-adr",
    "title": "Test ADR Title",
    "status": "accepted",
    "date": "2025-12-17",
    "tags": ["test", "fixture"],
    "linked_commits": ["abc123"],
    "supersedes": null,
    "superseded_by": null
  }
]
```

**File: `test/fixtures/list-output-empty.json` [NEW]**
```json
[]
```

**File: `test/fixtures/list-output-minimal.json` [NEW]**
```json
[{"id": "001", "title": "Minimal ADR"}]
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/models/adrListItem.ts` | CREATE | New canonical interface |
| `src/utils/parser.ts` | MODIFY | Add JSON parsing, enhance return type |
| `src/cli/gitAdrCli.ts` | MODIFY | Add `listJson()` method |
| `src/views/adrTreeProvider.ts` | MODIFY | Use typed data, add formatters |
| `test/suite/parser.test.ts` | MODIFY | Add JSON parsing tests |
| `test/suite/gitAdrCli.test.ts` | MODIFY | Add listJson tests |
| `test/fixtures/list-output.json` | CREATE | JSON fixture |
| `test/fixtures/list-output-empty.json` | CREATE | Empty JSON fixture |
| `test/fixtures/list-output-minimal.json` | CREATE | Minimal JSON fixture |
