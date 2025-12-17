### What “workspace extension / remote execution constraints” means

VS Code can run an extension in different places:

* **UI extension (local)**: runs on your laptop where the VS Code window is.
* **Workspace extension (remote)**: runs on the machine where the *workspace files live* (Remote SSH / Dev Containers / WSL scenarios).

Those “remote execution constraints” are all the rules you must follow when your extension runs **somewhere other than your laptop**:

* when you run `git` / `git adr`, it must run **where the repo is**
* reading/writing files (artifacts) happens on the **remote filesystem**, not your laptop
* `$PATH` and environment can differ from your local shell
* you often need `extensionKind` and remote-safe activation patterns

Since you’re choosing **A) Local VS Code only**, we can ignore all of that and build a normal extension that runs locally.

---

## Updated Copilot project initiation prompt (Local VS Code only)

Copy/paste everything between the lines into Copilot.

---

You are an expert VS Code extension engineer. Create a complete, production-ready Visual Studio Code extension project named **`git-adr-vscode`** that integrates with the CLI tool **`git-adr`** ([https://github.com/zircote/git-adr](https://github.com/zircote/git-adr)). The extension must be ready for Marketplace release: reliable, tested, documented, and user-friendly.

### Scope / non-goals

* Target environment: **Local VS Code only** (no Remote SSH, no WSL, no Dev Containers requirements).
* Git remotes may use SSH ([git@github.com](mailto:git@github.com):...) but that is irrelevant to extension execution.
* Do **not** implement telemetry.
* Do **not** re-implement git notes parsing. The CLI is the source of truth.

### Product goal

Provide first-class ADR workflow inside VS Code **without storing ADRs as files**. `git-adr` stores ADRs in **git notes**. The extension is a polished UI for the existing CLI and shells out to `git adr ...` commands.

### Primary UX requirements

1. Add an **“ADR” activity bar view** with a Tree View showing ADRs for the current repo/workspace folder.
2. Users can:

   * Initialize ADR support in a repo (`git adr init`)
   * Create a new ADR (`git adr new`)
   * List/refresh ADRs (`git adr list`)
   * View an ADR in an editor tab (virtual document) (`git adr show`)
   * Edit an ADR (`git adr edit`)
   * Search ADRs (`git adr search`)
   * Sync notes:

     * `git adr sync --pull`
     * `git adr sync --push`
3. Must support:

   * Single-folder workspaces
   * Multi-root workspaces (each root treated independently)
4. Must degrade gracefully when:

   * workspace folder isn’t a git repo
   * `git` is missing
   * `git-adr` is missing

### Technical architecture

* Language: **TypeScript**. Package manager: **npm**.
* Use the official **VS Code Extension API**.
* Use a clean structure:

  * `src/extension.ts` activation entry
  * `src/cli/gitAdrCli.ts` wrapper for invoking commands
  * `src/views/adrTreeProvider.ts` TreeDataProvider
  * `src/documents/adrContentProvider.ts` TextDocumentContentProvider for `git-adr:` scheme
  * `src/commands/*.ts` command handlers
  * `src/utils/*.ts` (logging, errors, parsing, workspace selection)
* Execute CLI commands using `child_process.spawn` or `execFile` with args array (no shell).
* Always set `cwd` to the workspace folder root.
* Apply timeouts for CLI calls (default 15s; configurable).
* Implement a capabilities detection layer:

  * Check if `git` exists
  * Check if `git adr` exists
  * Cache per-workspace capabilities and refresh on demand

### Commands (must implement)

Command IDs under namespace `gitAdr`:

1. `gitAdr.refresh` — Refresh tree for current workspace
2. `gitAdr.init` — Run `git adr init`
3. `gitAdr.new` — Prompt for title; run `git adr new "<title>"`
4. `gitAdr.list` — Run `git adr list` and show results in tree
5. `gitAdr.show` — Open virtual doc for selected ADR (`git adr show <id>`)
6. `gitAdr.edit` — Run `git adr edit <id>`
7. `gitAdr.search` — Prompt query; run `git adr search "<query>"`
8. `gitAdr.syncPull` — Run `git adr sync --pull`
9. `gitAdr.syncPush` — Run `git adr sync --push`
10. `gitAdr.openDocs` — open the upstream git-adr repo page
11. `gitAdr.configure` — open Settings UI focused on this extension

### Tree View behavior

* View ID: `gitAdrView`
* Root nodes:

  * one node per workspace folder (multi-root), labeled with folder name
* Under each workspace:

  * ADR nodes from `git adr list`
* Each ADR node shows:

  * Title (best-effort)
  * Tooltip includes ADR id and any parsed metadata if available
* Context menu actions on ADR node:

  * Show
  * Edit
  * Search (pre-filled with title)
  * Sync Pull / Sync Push

### Virtual document viewer

* Scheme: `git-adr:`
* URI format: `git-adr://<workspaceFolderName>/<adrId>.md`
* When opened:

  * Content loaded from `git adr show <id>`
  * If content looks like markdown, set language mode to markdown
* Provide `gitAdr.refreshDocument` command to re-fetch content for the active ADR doc.

### Settings

Add extension settings (with defaults):

* `gitAdr.gitPath` (string, default `git`) — command used to invoke git (supports Windows users setting `git.exe`)
* `gitAdr.adrSubcommand` (string, default `adr`) — allows `git <subcommand>` variants
* `gitAdr.commandTimeoutMs` (number, default 15000)
* `gitAdr.autoRefreshOnFocus` (boolean, default true)
* `gitAdr.showOutputOnError` (boolean, default true)

### Logging & output

* Create an Output Channel named `Git ADR`.
* Log executed commands (command + args; do not log environment variables).
* For errors: show a concise notification with a “Show Output” action.

### Parsing requirements

* Implement a robust parser for `git adr list` output:

  * Prefer structured output if CLI supports it (only if you can detect a JSON flag reliably).
  * Otherwise parse text carefully.
  * If parsing fails, fall back to showing raw list output in an editor or output channel and keep the extension functional.

### Packaging & release readiness

Provide:

* Proper `package.json` contributes: commands, menus, views, configuration
* Activation events: on view/commands only (avoid always-on)
* `README.md` with:

  * What the extension does
  * Requirements (install git + git-adr)
  * First-run flow
  * Key commands
  * Troubleshooting + common errors (missing git-adr, not a repo, sync notes)
  * Statement: no telemetry
* `CHANGELOG.md` initial version notes
* `LICENSE` (MIT)
* `.vscodeignore` optimized
* Extension icon (simple placeholder png committed)
* ESLint + Prettier + strict TypeScript config
* GitHub Actions CI:

  * lint
  * typecheck
  * unit tests
  * build/package
* Scripts:

  * `npm run compile`
  * `npm run lint`
  * `npm test`
  * `npm run package` (vsce)

### Testing requirements

Implement tests with deterministic mocks (do NOT require real git-adr installed in CI):

* Unit tests for:

  * CLI wrapper (args, cwd, timeouts, error mapping)
  * capability detection
  * list parsing (fixtures)
* Integration tests:

  * run VS Code extension test runner
  * create a temp git repo
  * mock the command runner so git-adr calls return fixtures
  * verify tree nodes populate and virtual docs open

Implement:

* `ICommandRunner` interface
* Real runner uses child_process
* Mock runner for tests

### Security

* Prevent shell injection:

  * never pass unsanitized strings to a shell
  * always use args array
* Do not write user files except where the user explicitly triggers it (NOTE: artifacts support is out of scope for this version).

### Delivery output

Generate the entire repository tree with all files:

* `package.json`
* `src/**`
* `test/**`
* `.github/workflows/ci.yml`
* `README.md`, `CHANGELOG.md`, `LICENSE`
* configs: ESLint, Prettier, TS, vscode test config
* fixtures for parsing
* icon asset

Output format:

1. Print the final folder/file tree.
2. Then output the full contents of each file (or file-by-file if needed).
3. Ensure it runs with:

   * `npm install`
   * `npm run compile`
   * `npm test`
   * `npm run package`

Proceed now and generate the complete project.
