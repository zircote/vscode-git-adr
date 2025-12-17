import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { GitAdrCli } from '../../src/cli/gitAdrCli';
import { AdrTreeProvider } from '../../src/views/adrTreeProvider';
import { AdrContentProvider } from '../../src/documents/adrContentProvider';
import { OutputLogger } from '../../src/utils/logger';
import { MockCommandRunner } from '../helpers/mockCommandRunner';
import { createTempWorkspace, createTempWorkspaceNoGit } from '../helpers/testWorkspace';
import { fixtures } from '../helpers/fixtures';

suite('Extension Integration Test Suite', () => {
  let outputChannel: vscode.OutputChannel;
  let logger: OutputLogger;
  let mockRunner: MockCommandRunner;
  let cli: GitAdrCli;

  setup(() => {
    outputChannel = vscode.window.createOutputChannel('Git ADR Test');
    logger = new OutputLogger(outputChannel);
    mockRunner = new MockCommandRunner();
    cli = new GitAdrCli(logger, mockRunner);
  });

  teardown(() => {
    outputChannel.dispose();
    mockRunner.reset();
  });

  suite('Tree View Tests', () => {
    test('Tree view populates with workspace root and ADR children', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Setup mock responses
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });
        mockRunner.setResponse('git adr --version', { stdout: 'git-adr 0.1.0' });
        mockRunner.setResponse('git adr list', { stdout: fixtures.list() });

        // Create tree provider
        const treeProvider = new AdrTreeProvider(cli, logger);

        // Create workspace folder
        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        // Mock workspace folders
        const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [workspaceFolder],
          configurable: true,
        });

        // Get root nodes
        const rootNodes = await treeProvider.getChildren();
        assert.ok(rootNodes, 'Root nodes should exist');
        assert.strictEqual(rootNodes.length, 1, 'Should have exactly one workspace root node');

        // Get ADR children
        const adrNodes = await treeProvider.getChildren(rootNodes[0]);
        assert.ok(adrNodes, 'ADR nodes should exist');
        assert.ok(adrNodes.length > 0, 'Should have ADR children');

        // Verify ADR node structure
        const firstAdr = adrNodes[0];
        assert.ok(firstAdr.label, 'ADR node should have a label');
        assert.ok(firstAdr.tooltip, 'ADR node should have a tooltip');

        // Restore workspace folders
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: originalWorkspaceFolders,
          configurable: true,
        });
      } finally {
        await workspace.cleanup();
      }
    });

    test('Tree view handles empty ADR list', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Setup mock responses with empty list
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });
        mockRunner.setResponse('git adr --version', { stdout: 'git-adr 0.1.0' });
        mockRunner.setResponse('git adr list', { stdout: '' });

        const treeProvider = new AdrTreeProvider(cli, logger);

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: [workspaceFolder],
          configurable: true,
        });

        const rootNodes = await treeProvider.getChildren();
        assert.ok(rootNodes, 'Root nodes should exist');

        const adrNodes = await treeProvider.getChildren(rootNodes[0]);
        assert.ok(adrNodes, 'ADR nodes should be defined');
        assert.strictEqual(adrNodes.length, 0, 'Should have no ADR children for empty list');

        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
          value: originalWorkspaceFolders,
          configurable: true,
        });
      } finally {
        await workspace.cleanup();
      }
    });
  });

  suite('Virtual Document Tests', () => {
    test('Opening ADR node opens virtual document with expected content', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Setup mock responses
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });
        mockRunner.setResponse('git adr --version', { stdout: 'git-adr 0.1.0' });
        mockRunner.setResponse('git adr show 001', { stdout: fixtures.show() });

        const contentProvider = new AdrContentProvider(cli, logger);

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        // Create URI for ADR document
        const uri = vscode.Uri.parse(
          `git-adr://${encodeURIComponent(workspaceFolder.name)}/001.md`
        );

        // Get content
        const content = await contentProvider.provideTextDocumentContent(uri);

        assert.ok(content, 'Content should be provided');
        assert.ok(content.includes('ADR 001'), 'Content should include ADR identifier');
        assert.ok(
          content.includes('TypeScript'),
          'Content should include expected text from fixture'
        );
      } finally {
        await workspace.cleanup();
      }
    });
  });

  suite('Command Execution Tests', () => {
    test('Sync pull command calls correct CLI args', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Setup mock responses
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });
        mockRunner.setResponse('git adr --version', { stdout: 'git-adr 0.1.0' });
        mockRunner.setResponse('git adr sync --pull', { stdout: 'Sync complete' });

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        await cli.syncPull(workspaceFolder);

        // Verify the command was called with correct args
        assert.ok(
          mockRunner.wasCommandCalled('adr sync --pull'),
          'Should call git adr sync --pull'
        );
      } finally {
        await workspace.cleanup();
      }
    });

    test('Sync push command calls correct CLI args', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Setup mock responses
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });
        mockRunner.setResponse('git adr --version', { stdout: 'git-adr 0.1.0' });
        mockRunner.setResponse('git adr sync --push', { stdout: 'Sync complete' });

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        await cli.syncPush(workspaceFolder);

        // Verify the command was called with correct args
        assert.ok(
          mockRunner.wasCommandCalled('adr sync --push'),
          'Should call git adr sync --push'
        );
      } finally {
        await workspace.cleanup();
      }
    });

    test('Search command executes with query', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Setup mock responses
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });
        mockRunner.setResponse('git adr --version', { stdout: 'git-adr 0.1.0' });
        mockRunner.setResponse('git adr search TypeScript', { stdout: fixtures.search() });

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        const result = await cli.search(workspaceFolder, 'TypeScript');

        assert.ok(result, 'Should return search results');
        assert.ok(
          mockRunner.wasCommandCalled('adr search TypeScript'),
          'Should call git adr search with query'
        );
      } finally {
        await workspace.cleanup();
      }
    });
  });

  suite('Error Handling Tests', () => {
    test('Handles missing git gracefully', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Mock git not found
        const gitError = new Error('Command not found: git') as Error & { code: string };
        gitError.code = 'ENOENT';
        mockRunner.setResponse('git --version', { error: gitError });

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        const capabilities = await cli.checkCapabilities(workspaceFolder);

        assert.strictEqual(capabilities.hasGit, false, 'Should detect git is not available');
        assert.strictEqual(capabilities.hasGitAdr, false, 'Should not check for git-adr');
        assert.strictEqual(capabilities.isGitRepo, false, 'Should not check if git repo');
      } finally {
        await workspace.cleanup();
      }
    });

    test('Handles missing git-adr gracefully', async () => {
      const workspace = await createTempWorkspace();

      try {
        // Mock git available but git-adr not found
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });
        mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git' });

        const adrError = new Error(fixtures.errorAdrNotFound()) as Error & { code: number };
        adrError.code = 128;
        mockRunner.setResponse('git adr --version', { error: adrError });

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        const capabilities = await cli.checkCapabilities(workspaceFolder);

        assert.strictEqual(capabilities.hasGit, true, 'Should detect git is available');
        assert.strictEqual(capabilities.isGitRepo, true, 'Should detect git repo');
        assert.strictEqual(
          capabilities.hasGitAdr,
          false,
          'Should detect git-adr is not available'
        );
      } finally {
        await workspace.cleanup();
      }
    });

    test('Handles not a git repository gracefully', async () => {
      const workspace = await createTempWorkspaceNoGit();

      try {
        // Mock git available but not a git repo
        mockRunner.setResponse('git --version', { stdout: 'git version 2.39.0' });

        const repoError = new Error(fixtures.errorNotARepo()) as Error & { code: number };
        repoError.code = 128;
        mockRunner.setResponse('git rev-parse --git-dir', { error: repoError });

        const workspaceFolder: vscode.WorkspaceFolder = {
          uri: vscode.Uri.file(workspace.path),
          name: path.basename(workspace.path),
          index: 0,
        };

        const capabilities = await cli.checkCapabilities(workspaceFolder);

        assert.strictEqual(capabilities.hasGit, true, 'Should detect git is available');
        assert.strictEqual(
          capabilities.isGitRepo,
          false,
          'Should detect directory is not a git repo'
        );
        assert.strictEqual(capabilities.hasGitAdr, false, 'Should not check for git-adr');
      } finally {
        await workspace.cleanup();
      }
    });
  });
});
