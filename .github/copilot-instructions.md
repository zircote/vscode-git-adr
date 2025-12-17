# Copilot Instructions for Git ADR VS Code Extension

## Project Overview

This is a Visual Studio Code extension that provides integration with [git-adr](https://github.com/zircote/git-adr), allowing users to manage Architecture Decision Records (ADRs) stored in git notes directly within VS Code.

**Key Technologies:**
- TypeScript
- VS Code Extension API
- Git integration
- Node.js

## Architecture

The codebase is organized as follows:

- **`src/`**: Source code
  - `extension.ts`: Main extension entry point
  - `cli/`: Git and git-adr CLI integration (`gitAdrCli.ts`)
  - `commands/`: VS Code command implementations
  - `models/`: Data models (`AdrListItem` interface)
  - `providers/`: Virtual document provider for ADR content
  - `utils/`: Utility functions, parser, logger, errors
  - `views/`: Tree view provider for ADR sidebar
- **`test/`**: Test suites
  - `suite-unit/`: Unit tests (mocked dependencies)
  - `suite-integration/`: Integration tests (real git operations)
  - `fixtures/`: Test data files (JSON and text)
  - `helpers/`: Test helpers and fixtures
- **`resources/`**: Extension icons and assets

### Key Patterns

- **Dependency Injection**: CLI uses `ICommandRunner` interface for testability
- **Try-JSON-First Fallback**: `listJson()` tries JSON output, falls back to text parsing
- **VS Code API Types**: Always import from `vscode` module, never mock core types

## Development Workflow

### Setup
```bash
npm ci                  # Install dependencies
npm run compile         # Compile TypeScript
```

### Code Quality
```bash
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Format code with Prettier
```

### Testing
```bash
npm test                        # Run unit tests in VS Code extension host
npm run test:integration        # Run integration tests
xvfb-run -a npm test           # Run tests on Linux CI/headless
```

### Packaging
```bash
npm run package         # Create .vsix file
```

## Coding Standards

### TypeScript
- **Strict mode enabled**: All TypeScript strict checks are enforced
- **No unused variables/parameters**: Use `_` prefix for intentionally unused parameters
- **Explicit return types**: Functions should have explicit return types when not obvious
- **Error handling**: Always handle errors gracefully and provide user-friendly messages

```typescript
// Prefer explicit types over inference for public APIs
export function parseAdrList(input: string): AdrListItem[] {
  // Implementation
}

// Use readonly for immutable data
export interface AdrListItem {
  readonly id: string;
  readonly title: string;
  readonly status?: string;
}

// Prefer early returns
if (!input.trim()) {
  return [];
}

// Use nullish coalescing
const value = item.field ?? defaultValue;
```

### Code Style
- **Quotes**: Single quotes for strings (enforced by ESLint)
- **Semicolons**: Required (enforced by ESLint)
- **Naming conventions**:
  - camelCase for variables and functions
  - PascalCase for classes and interfaces
  - UPPER_CASE for constants
- **Formatting**: Use Prettier configuration (`.prettierrc.json`)

### Error Handling

```typescript
// Wrap CLI operations in try-catch
try {
  const result = await this.cli.listJson(folder);
  return result;
} catch (error) {
  this.logger.error('Failed to list ADRs', error);
  throw error;
}

// Use custom error types for specific failures
throw new CommandTimeoutError(`Command timed out after ${timeout}ms`);
```

### VS Code Extension Patterns
- **Command registration**: All commands must be registered in `package.json` and `extension.ts`
- **Error messages**: Use `vscode.window.showErrorMessage()` for user-facing errors
- **Output channel**: Use the extension's output channel for debugging information
- **Async operations**: Always use async/await, never callbacks
- **Disposables**: Register all disposables in the extension context

```typescript
// Register disposables in activate()
export function activate(context: vscode.ExtensionContext) {
  const provider = new AdrTreeProvider(cli, logger);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('gitAdrView', provider)
  );
}

// Use configuration API for settings
const config = vscode.workspace.getConfiguration('gitAdr');
const timeout = config.get<number>('commandTimeoutMs', 15000);
```

## Testing Guidelines

### Unit Tests
- Located in `test/suite-unit/`
- Use mocked dependencies (see `test/helpers/mockCommandRunner.ts`)
- Fast execution, no real git operations
- Test individual functions and classes in isolation

```typescript
// Use descriptive test names
test('listJson - fallback to text parsing on JSON error', async () => {
  // Arrange
  mockRunner.setError('git adr list -f json', new Error('Unknown flag'));
  mockRunner.setResponse('git adr list', { stdout: '001 | Title', stderr: '' });

  // Act
  const result = await cli.listJson(mockWorkspaceFolder);

  // Assert
  assert.strictEqual(result.length, 1);
});

// Mock external dependencies, not internal implementation
const mockRunner = new MockCommandRunner();
const cli = new GitAdrCli(mockLogger, mockRunner);
```

### Integration Tests
- Located in `test/suite-integration/`
- Use real git repositories (see `test/helpers/testWorkspace.ts`)
- Test complete workflows (init, create, list ADRs)
- Clean up test fixtures after each test

### Test Conventions
- Use Mocha test framework
- Use Sinon for mocking and spying
- Test files should end with `.test.ts`
- Each test should be independent and idempotent

## Dependencies

### Runtime Dependencies
None - this is a pure VS Code extension that shells out to git/git-adr CLI

### Dev Dependencies
- **TypeScript 5.3.3**: Language and compiler
- **ESLint**: Linting with TypeScript plugin
- **Prettier**: Code formatting
- **Mocha**: Test framework
- **Sinon**: Test mocking/stubbing
- **@vscode/test-electron**: VS Code extension testing

## Common Tasks

### Adding a New Command
1. Add command definition to `package.json` under `contributes.commands`
2. Implement command handler in `src/commands/`
3. Register command in `src/extension.ts`
4. Add menu entries if needed in `contributes.menus`
5. Add tests in `test/suite-unit/` and/or `test/suite-integration/`
6. Update README.md with command documentation

### Adding a New Data Field
1. Update `AdrListItem` interface in `src/models/adrListItem.ts`
2. Update `normalizeAdrListItem()` function
3. Update `parseAdrListJson()` if needed
4. Add tests for new field handling
5. Update tree view if displaying the field

### Modifying CLI Integration
1. Changes to git/git-adr invocation go in `src/cli/`
2. Always handle errors (git not found, git-adr not installed, etc.)
3. Add unit tests with mocked command execution
4. Add integration tests with real git operations

### Working with Virtual Documents
- ADR content is provided via `AdrDocumentProvider` in `src/providers/`
- Uses custom URI scheme: `adr:`
- Content updates trigger document refresh via event emitter

### Debugging
- Use VS Code's built-in debugger with F5
- Check Output panel: View > Output > Git ADR
- Use Developer Tools: Help > Toggle Developer Tools

## Important Constraints

### External Dependencies
The extension requires users to have:
1. **Git**: Must be in PATH or configured via `gitAdr.gitPath` setting
2. **git-adr**: Python CLI tool, must be installed separately

### Git Integration
The extension wraps the `git-adr` CLI tool which stores ADRs in git notes. Key CLI commands:
- `git adr init`: Initialize ADR repository
- `git adr new <title>`: Create new ADR
- `git adr list`: List all ADRs
- `git adr list -f json`: List ADRs as JSON (preferred)
- `git adr show <id>`: Show ADR content
- `git adr search <query>`: Search ADRs

### Error Handling
- Never assume git or git-adr is installed
- Provide clear error messages with installation instructions
- Use graceful degradation when commands fail

### Cross-Platform Support
- Test on Windows, macOS, and Linux
- Use `vscode.workspace.workspaceFolders` for multi-root support
- Use Node.js `path` module for path operations

## CI/CD

The project uses GitHub Actions:
- **CI workflow** (`.github/workflows/ci.yml`):
  - Runs on every push to main and all PRs
  - Executes: lint, compile, unit tests, integration tests
  - Packages extension as .vsix artifact
  - Uses Xvfb on Linux for VS Code extension host
- **Release workflow** (`.github/workflows/release.yml`):
  - See `RUNBOOK_RELEASE.md` for details

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [git-adr CLI](https://github.com/zircote/git-adr)
- [Git Notes Documentation](https://git-scm.com/docs/git-notes)

## Notes for AI Assistants

When making changes:
1. **Always read files** before modifying them
2. **Run tests**: `npm test` and `npm run test:integration`
3. **Run linter**: `npm run lint` before committing
4. **Update package.json**: If adding new commands, update both `commands` and `activationEvents`
5. **Maintain backward compatibility**: This extension is published to VS Code Marketplace
6. **Consider multi-root workspaces**: Test with multiple folders open
7. **Document user-facing changes**: Update README.md and CHANGELOG.md
8. **Prefer editing existing code** over creating new files
9. **Use established patterns** from existing code
10. **Keep test coverage high** for CLI and parser functions
