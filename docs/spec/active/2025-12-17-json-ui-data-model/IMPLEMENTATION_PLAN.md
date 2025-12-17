---
document_type: implementation_plan
project_id: SPEC-2025-12-17-001
version: 1.0.0
last_updated: 2025-12-17T10:00:00Z
status: draft
---

# JSON UI Data Model - Implementation Plan

## Overview

This plan implements the JSON UI data model refactoring in 4 phases: Foundation (data model), Core (parser/CLI), Integration (tree provider), and Polish (tests/cleanup). Each phase builds on the previous and can be validated independently.

## Phase Summary

| Phase | Goal | Key Deliverables |
|-------|------|------------------|
| Phase 1: Foundation | Data model types | `AdrListItem` interface, normalizer |
| Phase 2: Core | JSON parsing | Parser functions, CLI method |
| Phase 3: Integration | Tree View rendering | Updated tree provider, formatters |
| Phase 4: Polish | Tests & cleanup | Unit tests, integration tests, fixtures |

---

## Phase 1: Foundation

**Goal**: Create the canonical data model and types
**Prerequisites**: None

### Tasks

#### Task 1.1: Create AdrListItem interface

- **Description**: Create new model file with TypeScript interface matching JSON schema
- **File**: `src/models/adrListItem.ts` (CREATE)
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Interface `AdrListItem` exported with all fields
  - [ ] All fields have correct types (string, string[], null union)
  - [ ] JSDoc comments document field purposes

#### Task 1.2: Create normalizer function

- **Description**: Add `normalizeAdrListItem()` function to handle missing/extra fields
- **File**: `src/models/adrListItem.ts`
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - [ ] Function converts raw JSON object to `AdrListItem`
  - [ ] Missing arrays default to `[]`
  - [ ] `null` values preserved for supersedes fields
  - [ ] Unknown fields ignored (no errors thrown)
  - [ ] Function is exported

#### Task 1.3: Update existing AdrListEntry

- **Description**: Either deprecate `AdrListEntry` or alias it to `AdrListItem` for compatibility
- **File**: `src/utils/parser.ts`
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - [ ] Old `AdrListEntry` interface preserved as type alias or deprecated
  - [ ] Existing code using `AdrListEntry` continues to compile
  - [ ] Clear migration path documented

### Phase 1 Deliverables

- [ ] `src/models/adrListItem.ts` file created
- [ ] `AdrListItem` interface exported
- [ ] `normalizeAdrListItem()` function exported
- [ ] Existing code compiles without changes

### Phase 1 Exit Criteria

- [ ] `npm run compile` passes
- [ ] Interface matches canonical JSON schema exactly

---

## Phase 2: Core Implementation

**Goal**: Implement JSON parsing and CLI method
**Prerequisites**: Phase 1 complete

### Tasks

#### Task 2.1: Add JSON parsing function

- **Description**: Create `parseAdrListJson()` function in parser module
- **File**: `src/utils/parser.ts`
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - [ ] Function accepts string, returns `AdrListItem[]`
  - [ ] Empty string returns `[]`
  - [ ] Valid JSON array parsed and normalized
  - [ ] Non-array JSON throws descriptive error
  - [ ] Malformed JSON throws parse error

#### Task 2.2: Update parseAdrList return type

- **Description**: Change `parseAdrList()` to return `AdrListItem[]` instead of `AdrListEntry[]`
- **File**: `src/utils/parser.ts`
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - [ ] Return type is `AdrListItem[]`
  - [ ] Existing text parsing logic unchanged
  - [ ] Return objects include all `AdrListItem` fields (defaults for missing)

#### Task 2.3: Add listJson() method to CLI wrapper

- **Description**: New method that tries JSON format first, falls back to text
- **File**: `src/cli/gitAdrCli.ts`
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - [ ] Method `listJson()` added
  - [ ] Executes `git adr list -f json` first
  - [ ] On JSON parse failure, falls back to `git adr list` + text parsing
  - [ ] Logs `ADR list source = json` or `ADR list source = text-fallback`
  - [ ] Returns `Promise<AdrListItem[]>`

#### Task 2.4: Add imports and exports

- **Description**: Update barrel exports and imports across affected files
- **File**: Multiple
- **Dependencies**: Tasks 2.1-2.3
- **Acceptance Criteria**:
  - [ ] `parseAdrListJson` exported from parser
  - [ ] `AdrListItem` importable from models
  - [ ] No circular dependencies

### Phase 2 Deliverables

- [ ] `parseAdrListJson()` function working
- [ ] `listJson()` CLI method working
- [ ] JSON → fallback logic implemented
- [ ] Logging in place

### Phase 2 Exit Criteria

- [ ] `npm run compile` passes
- [ ] Manual test: extension loads ADRs (JSON path if git-adr supports it)
- [ ] Output channel shows data source log

---

## Phase 3: Integration

**Goal**: Update Tree View rendering to use structured data
**Prerequisites**: Phase 2 complete

### Tasks

#### Task 3.1: Create description formatter

- **Description**: Add function to format TreeItem description from `AdrListItem`
- **File**: `src/views/adrTreeProvider.ts`
- **Dependencies**: Task 2.3
- **Acceptance Criteria**:
  - [ ] Function `formatDescription(item: AdrListItem): string`
  - [ ] Format: `status • date` or `status • date • tags`
  - [ ] Missing fields omitted gracefully
  - [ ] Tags only included if non-empty

#### Task 3.2: Create tooltip formatter

- **Description**: Add function to format TreeItem tooltip from `AdrListItem`
- **File**: `src/views/adrTreeProvider.ts`
- **Dependencies**: Task 2.3
- **Acceptance Criteria**:
  - [ ] Function `formatTooltip(item: AdrListItem): string`
  - [ ] Multiline format with all fields
  - [ ] Linked commits truncated if >3 (show "and N more")
  - [ ] Supersedes fields shown even if null (as "(none)")

#### Task 3.3: Update AdrTreeItem constructor

- **Description**: Modify constructor to use new formatters and `AdrListItem`
- **File**: `src/views/adrTreeProvider.ts`
- **Dependencies**: Tasks 3.1, 3.2
- **Acceptance Criteria**:
  - [ ] `adrEntry` type changed to `AdrListItem`
  - [ ] Label shows `title` only
  - [ ] Description uses `formatDescription()`
  - [ ] Tooltip uses `formatTooltip()`

#### Task 3.4: Update getAdrNodes to use listJson

- **Description**: Change CLI call from `list()` to `listJson()`
- **File**: `src/views/adrTreeProvider.ts`
- **Dependencies**: Task 3.3
- **Acceptance Criteria**:
  - [ ] `cli.listJson()` called instead of `cli.list()` + parsing
  - [ ] Cache key and caching logic still works
  - [ ] Error handling preserved

### Phase 3 Deliverables

- [ ] Tree View shows clean titles as labels
- [ ] Descriptions show `status • date` format
- [ ] Tooltips show full structured metadata
- [ ] No raw CLI text visible anywhere

### Phase 3 Exit Criteria

- [ ] Visual inspection: Tree View is clean and readable
- [ ] All metadata visible in tooltip
- [ ] Extension works with real git-adr repository

---

## Phase 4: Polish

**Goal**: Complete tests, fixtures, and documentation
**Prerequisites**: Phase 3 complete

### Tasks

#### Task 4.1: Create JSON test fixtures

- **Description**: Add JSON fixture files for testing
- **Files**:
  - `test/fixtures/list-output.json` (CREATE)
  - `test/fixtures/list-output-empty.json` (CREATE)
  - `test/fixtures/list-output-minimal.json` (CREATE)
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Full ADR example with all fields
  - [ ] Empty array fixture
  - [ ] Minimal fixture (id + title only)

#### Task 4.2: Add parser unit tests

- **Description**: Unit tests for JSON parsing functions
- **File**: `test/suite/parser.test.ts`
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - [ ] Test: valid JSON → `AdrListItem[]`
  - [ ] Test: empty array → `[]`
  - [ ] Test: empty string → `[]`
  - [ ] Test: malformed JSON → throws
  - [ ] Test: null supersedes preserved
  - [ ] Test: missing optional fields → defaults
  - [ ] Test: unknown fields → ignored

#### Task 4.3: Add CLI unit tests

- **Description**: Unit tests for `listJson()` method
- **File**: `test/suite/gitAdrCli.test.ts`
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - [ ] Test: JSON success path
  - [ ] Test: fallback on parse error
  - [ ] Test: logging verification

#### Task 4.4: Update fixture loader

- **Description**: Add JSON fixture loading support
- **File**: `test/helpers/fixtures.ts`
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - [ ] `listJson()` fixture loader added
  - [ ] `listJsonEmpty()` fixture loader added
  - [ ] `listJsonMinimal()` fixture loader added

#### Task 4.5: Run full test suite

- **Description**: Verify all tests pass including existing ones
- **File**: N/A (command)
- **Dependencies**: Tasks 4.2-4.4
- **Acceptance Criteria**:
  - [ ] `npm run test` passes
  - [ ] No regressions in existing tests
  - [ ] Coverage maintained

### Phase 4 Deliverables

- [ ] JSON fixtures created
- [ ] Parser tests passing
- [ ] CLI tests passing
- [ ] Full test suite green

### Phase 4 Exit Criteria

- [ ] `npm run test` passes
- [ ] No TypeScript errors
- [ ] Extension manually verified working

---

## Dependency Graph

```
Phase 1: Foundation
  Task 1.1 (interface) ──┬──► Task 1.2 (normalizer)
                        │
                        └──► Task 1.3 (alias)
                                    │
                                    ▼
Phase 2: Core
  Task 2.1 (parseJson) ──┬──► Task 2.2 (return type)
                         │
                         └──► Task 2.3 (listJson)
                                     │
                                     └──► Task 2.4 (imports)
                                                  │
                                                  ▼
Phase 3: Integration
  Task 3.1 (description) ──┬
                           ├──► Task 3.3 (constructor)
  Task 3.2 (tooltip) ──────┘            │
                                        └──► Task 3.4 (getAdrNodes)
                                                     │
                                                     ▼
Phase 4: Polish
  Task 4.1 (fixtures) ──┬──► Task 4.2 (parser tests)
                        │
                        ├──► Task 4.3 (CLI tests)
                        │
                        └──► Task 4.4 (fixture loader)
                                         │
                                         └──► Task 4.5 (full test)
```

## Testing Checklist

- [ ] Unit tests for `normalizeAdrListItem()`
- [ ] Unit tests for `parseAdrListJson()`
- [ ] Unit tests for `parseAdrList()` backward compatibility
- [ ] Unit tests for `GitAdrCli.listJson()`
- [ ] Unit tests for `formatDescription()`
- [ ] Unit tests for `formatTooltip()`
- [ ] Integration test: Tree View rendering
- [ ] Manual test: Extension with real git-adr repo
- [ ] Manual test: Fallback with older git-adr

## Launch Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Extension activates without errors
- [ ] Tree View displays clean UI
- [ ] Tooltips show structured metadata
- [ ] Output channel shows data source
- [ ] Fallback path works (tested manually)
