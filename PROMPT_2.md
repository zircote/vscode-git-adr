## Copilot Prompt: Add Real Tests, CI, Release Workflow, and Publishing Runbook

You are working inside an existing VS Code extension repository (already functional). The current project has unit tests and an “Extension Test Suite” placeholder smoke test. Upgrade the repository to production-grade testing + automation and add GitHub workflows for CI and release publishing.

### Goals

1. Replace the placeholder Extension Test Suite with **real integration tests** that validate user experience behavior:

   * Tree view displays workspace folder nodes and ADR children.
   * Selecting ADR node opens a virtual document containing the expected content.
   * Commands execute and show appropriate notifications / output behaviors.
   * Error conditions are handled cleanly (missing git, missing git-adr, not a git repo).
2. Add **automation-focused tests** that exercise common user flows without depending on real git-adr installation.
3. Add `.github/workflows`:

   * CI: lint, typecheck, unit tests, integration tests, build/package on PR and main.
   * Release: on tag `v*.*.*`, run full CI, create a GitHub Release, attach `.vsix`, and publish to Marketplace via `vsce`.
4. Add a **runbook** (`RUNBOOK_RELEASE.md`) explaining step-by-step how to version, package, publish, and maintain the Marketplace listing (including screenshots, README hygiene, categories, etc.).

### Constraints / non-goals

* Do not require `git-adr` to be installed in CI. Tests must use mock runners/fixtures.
* Keep tests deterministic across OS (at least Linux CI). Bonus: add a small matrix for Windows/macOS if feasible without flakiness.
* No telemetry.
* Don’t rewrite core extension logic unless necessary to make it testable.
* Avoid brittle UI automation that relies on pixel positions; use VS Code test APIs and command invocation.

---

## Part A — Testing Upgrades

### A1) Introduce/ensure a testable architecture boundary

If not already present, implement (or expand) an internal abstraction that the extension uses everywhere it runs CLI commands:

* `ICommandRunner` with a single method like:

  * `run(command: string, args: string[], options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv })`
  * returns `{ exitCode: number; stdout: string; stderr: string; }`
* Production uses `child_process.spawn` (no shell).
* Tests use `MockCommandRunner` with deterministic fixtures.

Then refactor the extension activation to allow injecting the runner in tests. Options:

* Export a `createExtensionContext(deps)` factory
* Or a `setTestDeps()` function gated behind `process.env.VSCODE_GIT_ADR_TESTING=1`
* Or dependency injection via a singleton module with a setter only in test builds

Keep it clean: no global mutation unless guarded and resettable for test isolation.

### A2) Integration tests: real assertions (replace placeholder smoke test)

Use `@vscode/test-electron` (or the repo’s existing harness) to run integration tests.

Add integration tests that assert:

#### Test 1 — Tree view populates workspace root and ADR children

* Setup:

  * Create temp folder
  * Initialize a git repo (`git init`) using the system git (this is acceptable; git is typically available on CI images). If git is not guaranteed, mock git too, but prefer real git init for realism.
  * Open the folder as the VS Code workspace
  * Inject `MockCommandRunner` so `git adr list` returns fixture output representing at least 2 ADRs.
* Assertions:

  * The tree provider returns exactly one root node for the workspace folder
  * The workspace node expands to ADR nodes matching the fixture
  * ADR nodes show correct label (ID+title or title as per project behavior)
  * Tooltips include ADR id at minimum

#### Test 2 — Opening ADR node opens virtual document with expected content

* Setup:

  * Mock `git adr show <id>` to return markdown content fixture
* Action:

  * Programmatically invoke the command (e.g. `gitAdr.show`) on a selected ADR node OR call the handler directly with the node.
* Assertions:

  * An editor opens with a `git-adr:` URI
  * Document text matches fixture content
  * Language mode is markdown if implemented

#### Test 3 — Search command shows results in expected UI path

* Setup:

  * Mock `git adr search "<query>"` output fixture
* Action:

  * Run search command with a provided query (bypass input UI by directly calling handler with test arg if needed; update handler to accept an optional arg for tests).
* Assertions:

  * Either QuickPick is shown with items OR output channel receives the raw output (depending on your implementation).
  * Verify no throw, and output is accessible.

#### Test 4 — Sync commands call correct CLI args

* Validate `git adr sync --pull` and `git adr sync --push` are invoked exactly.
* Assert calls captured by Mock runner.

#### Test 5 — Error handling UX

Add separate tests for:

* Missing git
* Missing git-adr
* Not a git repo

For each:

* Mock runner returns non-zero exit code + stderr.
* Assertions:

  * A user-visible error message is shown (use stubs/spies around `vscode.window.showErrorMessage`)
  * Output channel contains relevant logs
  * No uncaught exceptions

### A3) Unit test enhancements (behavioral)

Add/expand unit tests for:

* List parser robustness:

  * normal output
  * empty output
  * weird/unparseable output (must not crash)
* CLI wrapper:

  * timeout behavior
  * cwd correctness
  * args escaping (ensure no shell)
* Capabilities detection:

  * handles “command not found”
  * caches by workspace folder and refreshes

### A4) Test ergonomics improvements

* Add fixtures in `test/fixtures/` for:

  * list output (2+ ADRs)
  * show output (markdown)
  * search output
  * common error stderrs
* Add helper utilities:

  * createTempWorkspace()
  * openWorkspaceInVSCode()
  * waitForTreeProviderRefresh()
* Ensure tests clean up temp dirs and reset injected dependencies.

---

## Part B — GitHub Workflows

Create/replace workflows under `.github/workflows/`:

### B1) `ci.yml` — PR and main CI

Trigger:

* `pull_request`
* `push` to `main`

Jobs (use Ubuntu latest; optionally add matrix later):

1. `lint_and_test`

   * checkout
   * setup node (pin to LTS, e.g. 20.x)
   * `npm ci`
   * `npm run lint`
   * `npm run compile` (or `npm run build`)
   * `npm test` (unit tests)
   * run integration tests:

     * `npm run test:integration` (create this script if needed)
2. `package`

   * depends on lint_and_test
   * `npm ci`
   * `npm run package` (produces `.vsix`)
   * upload `.vsix` as workflow artifact

Notes:

* Integration tests for VS Code extensions often require `xvfb-run` on Linux. Use it if needed:

  * `xvfb-run -a npm run test:integration`
* Cache npm to speed runs.

### B2) `release.yml` — Tag-based release + publish

Trigger:

* `push` tags: `v*.*.*`

Jobs:

1. `build_and_test` (same as CI)
2. `package_and_release`

   * depends on build_and_test
   * `npm ci`
   * `npm run package`
   * Create GitHub Release (use `softprops/action-gh-release` or GitHub’s official action)

     * Title: tag name
     * Body: extracted from CHANGELOG section for that version if available
     * Attach `.vsix`
3. `publish_marketplace`

   * depends on package_and_release
   * `npm ci`
   * Install vsce: `npm i -g @vscode/vsce`
   * Publish:

     * `vsce publish -p $VSCE_PAT`
   * Secrets:

     * Require `VSCE_PAT` in repo secrets.
   * Safety:

     * Only run publish step if `VSCE_PAT` is present; otherwise fail with clear message.

Also:

* Validate `package.json` version matches tag (strip leading `v`). Fail if mismatch.
* Optionally generate SHA256 for the vsix and attach it.

---

## Part C — Release & Publishing Runbook

Create `RUNBOOK_RELEASE.md` with a real operator guide. Include:

### C1) Preconditions

* Marketplace publisher created
* PAT created with correct scope (Marketplace publish)
* GitHub repo secrets:

  * `VSCE_PAT`

### C2) Versioning strategy

* SemVer rules
* Where version is stored (`package.json`)
* How to update `CHANGELOG.md`
* How to tag releases

### C3) Manual local verification checklist

* `npm ci`
* `npm run lint`
* `npm run compile`
* `npm test`
* `npm run test:integration`
* `npm run package`
* Install vsix locally and sanity test against a real repo with git-adr installed.

### C4) Publishing steps

Option A — automated tag publish:

* Update version + changelog
* Merge to main
* Create tag `vX.Y.Z`
* Push tag
* Verify GitHub Actions release created
* Verify Marketplace listing updated

Option B — manual publish (fallback):

* `npm run package`
* `vsce publish -p <token>`

### C5) Marketplace listing guidelines

Include explicit guidance:

* README structure: What/Why/Install/Usage/Troubleshooting
* Add screenshots/gifs (where to store and reference)
* Categories & keywords
* Icon requirements
* Common Marketplace review / rejection issues:

  * missing license
  * broken links
  * unclear requirements
  * too-broad activationEvents
  * huge package size
* “No telemetry” statement

### C6) Support & triage

* How to gather logs from Output Channel “Git ADR”
* Recommended issue template sections (OS, VS Code version, git-adr version, repro steps, output logs)
* How to debug extension host

---

## Part D — Deliverables

Implement and commit:

* Real integration tests replacing placeholder smoke test
* Updated test scripts in `package.json`:

  * `test` for unit tests
  * `test:integration` for extension tests (with xvfb wrapper if needed)
* `.github/workflows/ci.yml`
* `.github/workflows/release.yml`
* `RUNBOOK_RELEASE.md`

Update `README.md` to mention:

* CI badge (optional)
* Where to find release runbook

Make sure everything works end-to-end.

Output in your response:

1. File tree changes
2. Full content for each new/modified file (or the full patch)
3. Any new npm scripts and how to run them locally

Proceed.

