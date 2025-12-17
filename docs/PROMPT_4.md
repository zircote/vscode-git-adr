

## Prompt: Use `git adr list -f json` for UI Data Model + Rendering

You are working in an existing VS Code extension (`vscode-git-adr`). The current UI looks bad because it renders unstructured CLI text. We have confirmed the CLI provides a clean JSON format for listing ADRs.

### Authoritative fact

`git adr list -f json` returns a JSON array of objects with the following fields (example provided below). You must treat this as the **canonical schema** for populating the Tree View.

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

### Objective

Refactor the extension so **Tree View rendering and other structured UI** is driven from this JSON output. Raw CLI text must never be displayed in tree labels/descriptions/tooltips.

### Requirements

#### 1) Internal data model

Create a single canonical TypeScript interface for list results:

```ts
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

Normalize fields:

* Convert missing arrays to `[]`
* Preserve `null` for supersedes fields
* Never throw on unknown extra fields

#### 2) CLI wrapper: JSON-first and explicit flag usage

Update the CLI execution for list so it runs:

* `git adr list -f json`

Parse stdout as JSON. Handle:

* empty stdout → empty list
* JSON parse failure → show error + fallback strategy (see below)
* non-zero exit code → show user-friendly message + output channel logs

Do NOT attempt to infer structure from text output unless the JSON call fails.

#### 3) Fallback behavior (only if JSON fails)

If `git adr list -f json` fails due to older git-adr versions or parse error:

* Fall back to the existing text parsing logic (if present)
* Populate `AdrListItem[]` as best-effort
* Log: `ADR list source = text-fallback` in Output Channel

#### 4) Tree View rendering rules (strict)

Update Tree rendering to be clean and consistent:

* `label`: `title` (optionally prefix with a short ID only if titles collide)
* `description`: a compact string derived from structured fields, e.g.

  * `accepted • 2025-12-16`
  * `proposed • 2025-12-17`
  * include tags only if useful: `accepted • 2025-12-16 • security,yaml`
* `tooltip`: multiline, structured, e.g.

  * `ID: ...`
  * `Status: ...`
  * `Date: ...`
  * `Tags: ...`
  * `Linked commits: ...` (truncate list if long)
  * `Supersedes: ...` / `Superseded by: ...` if non-null

No raw CLI output should appear in label/description/tooltip.

#### 5) Show/open ADR content

`git adr show <id>` can remain as text/markdown for the document content, but do not embed “list output” text into it. If you need additional structured metadata for the show view, fetch it separately (future-proof).

#### 6) Tests (must update)

Add fixtures using the exact JSON schema above.

Unit tests:

* parsing valid JSON list output → `AdrListItem[]`
* empty list
* malformed JSON → triggers fallback path (or clean error + empty list) and logs
* supersedes fields handle `null` correctly

Integration tests:

* Tree nodes display only titles (no CLI noise)
* Descriptions/tooltips show structured metadata

#### 7) UX acceptance criteria

After refactor:

* The ADR sidebar tree is readable, minimal, and stable
* The UI does not degrade when titles are long
* No terminal-like formatting shows up in the tree

### Deliverables

* Update CLI layer to support `git adr list -f json`
* Update parsing + model types
* Update Tree provider rendering
* Update tests + fixtures
* Keep backward compatibility via fallback only

Proceed now and implement.
