## Copilot Prompt: Add GitHub Actions Release Workflow for VS Code Extension VSIX

You are working inside an existing VS Code extension repo (Node/TypeScript). Create a production-grade GitHub Actions workflow that:

1. On pushing a tag matching `v*.*.*` (e.g. `v0.2.1`), it:

   * installs dependencies (`npm ci`)
   * lints (if script exists)
   * compiles/builds (if script exists)
   * runs unit tests (if script exists)
   * runs integration tests (if script exists; use `xvfb-run -a` on Linux if needed)
   * packages the extension into a `.vsix` using `vsce` (prefer `npm run package` if defined; otherwise `npx vsce package`)
2. Creates a **GitHub Release** for that tag and uploads the `.vsix` as a release asset.
3. Uploads the `.vsix` as a workflow artifact as well (so we have a “package” even if the release step fails).
4. Enforces version/tag consistency:

   * Extract the extension version from `package.json`
   * Fail if it does not match the tag version (strip leading `v`).
5. Adds provenance info:

   * Compute and upload a `SHA256SUMS` file containing the `.vsix` hash, and attach it to the GitHub Release.
6. Uses minimal required permissions and best practices.

### Files to add/modify

Create `.github/workflows/release.yml` (or `release.yaml`) with:

* `on: push: tags: - 'v*.*.*'`
* `permissions:` least privilege:

  * `contents: write` (needed for creating releases)
  * `actions: read` (optional)
* Use Node LTS (20.x recommended).
* Use caching for npm if appropriate.

### Workflow job structure

Implement two jobs:

#### Job 1: `build_test_package`

Runs on `ubuntu-latest`:

* Checkout
* Setup node
* `npm ci`
* Run `npm run lint` only if present
* Run `npm run compile` or `npm run build` if present (detect which exists)
* Run `npm test` if present
* Run `npm run test:integration` if present (wrap in `xvfb-run -a` on Linux if it launches VS Code)
* Package:

  * Prefer `npm run package` if present
  * else `npx --yes @vscode/vsce package`
* Verify exactly one `.vsix` exists (or pick the newest). Capture its filename into an output variable.
* Generate `SHA256SUMS` for the `.vsix`.
* Upload both `.vsix` and `SHA256SUMS` as workflow artifacts.

#### Job 2: `github_release`

Needs: `build_test_package`

* Download artifacts
* Create or update GitHub Release for the tag
* Attach `.vsix` and `SHA256SUMS`
* Release notes:

  * If `CHANGELOG.md` exists and contains a section for the version, use that section; otherwise use a default message.

### Implementation requirements

* Make the workflow resilient:

  * Use `set -euo pipefail` in bash steps.
  * Print useful logs and filenames.
* Version check step:

  * Read version with node: `node -p "require('./package.json').version"`
  * Compare to `${GITHUB_REF_NAME#v}` and fail if mismatched.
* Do not attempt Marketplace publishing yet.

  * Add a clearly commented placeholder step (disabled) showing where `vsce publish -p $VSCE_PAT` would go later.

### Also add documentation

Create `RUNBOOK_RELEASE.md` section “Tag Release (GitHub Actions)”:

* Update version in `package.json`
* Update changelog
* Commit and merge to main
* Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
* Find release assets in GitHub Releases
* Note: Marketplace publish will be added later with VSCE_PAT

### Deliverable output

Output:

1. The new workflow file content
2. Any scripts added/updated in `package.json` (only if necessary)
3. The `RUNBOOK_RELEASE.md` updates (or full file if new)

Proceed now and implement.
