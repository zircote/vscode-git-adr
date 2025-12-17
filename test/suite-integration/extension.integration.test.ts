import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sinon from 'sinon';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { ICommandRunner, CommandResult, GitAdrCli } from '../../src/cli/gitAdrCli';
import { AdrTreeProvider, AdrTreeItem } from '../../src/views/adrTreeProvider';
import { getTestingApi, setTestCommandRunner } from '../../src/extension';

const execFileAsync = promisify(execFile);

type RunnerCall = { command: string; args: string[]; cwd: string; timeoutMs: number };

class HybridCommandRunner implements ICommandRunner {
  public readonly calls: RunnerCall[] = [];
  private readonly gitExecPath: string;
  private readonly adrSubcommand: string;

  constructor(
    private readonly handlers: {
      onGitAdrVersion?: () => CommandResult;
      onGitAdrList?: () => CommandResult;
      onGitAdrShow?: (id: string) => CommandResult;
      onGitAdrSearch?: (query: string) => CommandResult;
      onGitAdrSync?: (direction: '--pull' | '--push') => CommandResult;
    },
    options?: { gitExecPath?: string; adrSubcommand?: string }
  ) {
    this.gitExecPath = options?.gitExecPath ?? 'git';
    this.adrSubcommand = options?.adrSubcommand ?? 'adr';
  }

  async run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
    this.calls.push({ command, args: [...args], cwd, timeoutMs });

    if (command === this.gitExecPath && args[0] === this.adrSubcommand) {
      const sub = args[1];

      if (sub === '--version') {
        return this.handlers.onGitAdrVersion?.() ?? { stdout: 'git-adr 0.0.0', stderr: '' };
      }
      if (sub === 'list') {
        return this.handlers.onGitAdrList?.() ?? { stdout: '', stderr: '' };
      }
      if (sub === 'show') {
        return this.handlers.onGitAdrShow?.(args[2] ?? '') ?? { stdout: '', stderr: '' };
      }
      if (sub === 'search') {
        return this.handlers.onGitAdrSearch?.(args.slice(2).join(' ')) ?? { stdout: '', stderr: '' };
      }
      if (sub === 'sync') {
        const direction = args[2] as '--pull' | '--push';
        return this.handlers.onGitAdrSync?.(direction) ?? { stdout: '', stderr: '' };
      }
    }

    // Fall back to real command execution (used for git --version and git rev-parse).
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: String(stdout), stderr: String(stderr) };
  }
}

function extensionId(): string {
  // Matches package.json (publisher + name)
  return 'your-publisher-name.git-adr-vscode';
}

async function readFixture(rel: string): Promise<string> {
  const fixturesDir = process.env.VSCODE_GIT_ADR_TEST_FIXTURES;
  assert.ok(fixturesDir, 'VSCODE_GIT_ADR_TEST_FIXTURES must be set');
  const fixturePath = path.resolve(fixturesDir, rel);
  return fs.readFile(fixturePath, 'utf8');
}

async function activateWithRunner(runner: ICommandRunner): Promise<{ cli: GitAdrCli; treeProvider: AdrTreeProvider }> {
  const ext = vscode.extensions.getExtension(extensionId());
  assert.ok(ext, `Extension not found: ${extensionId()}`);

  if (!ext.isActive) {
    // Only the first activation can inject via setTestCommandRunner.
    setTestCommandRunner(runner);
    await ext.activate();
  }

  const api = getTestingApi();
  assert.ok(api, 'Testing API not available; ensure VSCODE_GIT_ADR_TESTING=1');
  api.cli.setCommandRunner(runner);
  api.cli.clearCapabilitiesCache();
  api.treeProvider.refresh();
  return { cli: api.cli, treeProvider: api.treeProvider };
}

suite('Extension Integration Tests', () => {
  teardown(() => {
    sinon.restore();
  });

  test('Tree view populates workspace root and ADR children', async () => {
    const listOutput = await readFixture('list-output.txt');

    const runner = new HybridCommandRunner({
      onGitAdrVersion: () => ({ stdout: 'git-adr 1.0.0', stderr: '' }),
      onGitAdrList: () => ({ stdout: listOutput, stderr: '' }),
    });

    const { treeProvider } = await activateWithRunner(runner);
    const roots = await treeProvider.getChildren();

    assert.strictEqual(roots.length, 1);
    assert.strictEqual(roots[0].contextValue, 'workspace');

    const children = await treeProvider.getChildren(roots[0]);
    assert.ok(children.length >= 2);

    const firstAdr = children.find((c) => c.contextValue === 'adr');
    assert.ok(firstAdr);
    assert.ok(typeof firstAdr.tooltip === 'string' && firstAdr.tooltip.includes('001'));
  });

  test('Selecting ADR node opens virtual document with expected content', async () => {
    const listOutput = await readFixture('list-output.txt');
    const showOutput = await readFixture('show-output-001.md');

    const runner = new HybridCommandRunner({
      onGitAdrVersion: () => ({ stdout: 'git-adr 1.0.0', stderr: '' }),
      onGitAdrList: () => ({ stdout: listOutput, stderr: '' }),
      onGitAdrShow: (id) => ({ stdout: id === '001' ? showOutput : '', stderr: '' }),
    });

    const { treeProvider } = await activateWithRunner(runner);
    const roots = await treeProvider.getChildren();
    const adrs = await treeProvider.getChildren(roots[0]);

    const target = adrs.find((n) => n.adrEntry?.id === '001') as AdrTreeItem | undefined;
    assert.ok(target, 'Expected ADR 001 node');

    await vscode.commands.executeCommand('gitAdr.show', target);

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Expected an active editor');
    assert.strictEqual(editor.document.uri.scheme, 'git-adr');
    assert.ok(editor.document.uri.toString().includes('/001.md'));
    assert.strictEqual(editor.document.getText(), showOutput);
    assert.strictEqual(editor.document.languageId, 'markdown');
  });

  test('Search command runs and opens results document', async () => {
    const searchOutput = await readFixture('search-output.txt');

    const runner = new HybridCommandRunner({
      onGitAdrVersion: () => ({ stdout: 'git-adr 1.0.0', stderr: '' }),
      onGitAdrList: () => ({ stdout: '', stderr: '' }),
      onGitAdrSearch: () => ({ stdout: searchOutput, stderr: '' }),
    });

    await activateWithRunner(runner);

    await vscode.commands.executeCommand('gitAdr.search', 'typescript');

    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'Expected an active editor');
    assert.ok(editor.document.getText().includes('TypeScript'));
  });

  test('Sync commands call correct CLI args', async () => {
    const runner = new HybridCommandRunner({
      onGitAdrVersion: () => ({ stdout: 'git-adr 1.0.0', stderr: '' }),
      onGitAdrList: () => ({ stdout: '', stderr: '' }),
      onGitAdrSync: (direction) => ({ stdout: `sync ${direction}`, stderr: '' }),
    });

    const { treeProvider } = await activateWithRunner(runner);
    const roots = await treeProvider.getChildren();
    const workspaceNode = roots[0];

    await vscode.commands.executeCommand('gitAdr.syncPull', workspaceNode);
    await vscode.commands.executeCommand('gitAdr.syncPush', workspaceNode);

    const syncCalls = runner.calls.filter(
      (c) => c.command === 'git' && c.args[0] === 'adr' && c.args[1] === 'sync'
    );
    assert.ok(syncCalls.some((c) => c.args.join(' ') === 'adr sync --pull'));
    assert.ok(syncCalls.some((c) => c.args.join(' ') === 'adr sync --push'));
  });

  test('Error handling shows user-visible message (missing git, missing git-adr, not a git repo)', async () => {
    const messages: string[] = [];
    const showErrorStub = sinon
      .stub(vscode.window, 'showErrorMessage')
      .callsFake(async (message: string) => {
        messages.push(message);
        return undefined;
      });

    // Activate with a working runner first.
    const runnerOk = new HybridCommandRunner({
      onGitAdrVersion: () => ({ stdout: 'git-adr 1.0.0', stderr: '' }),
      onGitAdrList: () => ({ stdout: '', stderr: '' }),
    });
    const { cli } = await activateWithRunner(runnerOk);

    // Missing git
    const missingGitRunner: ICommandRunner = {
      async run(_command: string, _args: string[], _cwd: string, _timeoutMs: number): Promise<CommandResult> {
        const err: NodeJS.ErrnoException = new Error('ENOENT');
        err.code = 'ENOENT';
        throw err;
      },
    };
    cli.setCommandRunner(missingGitRunner);
    cli.clearCapabilitiesCache();
    await vscode.commands.executeCommand('gitAdr.list');

    // Missing git-adr (git ok + repo ok, but adr --version fails)
    const missingGitAdrRunner: ICommandRunner = {
      async run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
        if (command === 'git' && args[0] === 'adr' && args[1] === '--version') {
          throw new Error('git-adr missing');
        }
        const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout: timeoutMs });
        return { stdout: String(stdout), stderr: String(stderr) };
      },
    };
    cli.setCommandRunner(missingGitAdrRunner);
    cli.clearCapabilitiesCache();
    await vscode.commands.executeCommand('gitAdr.list');

    // Not a git repo
    const notRepoRunner: ICommandRunner = {
      async run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
        if (command === 'git' && args[0] === 'rev-parse') {
          throw new Error('Not a git repository');
        }
        const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout: timeoutMs });
        return { stdout: String(stdout), stderr: String(stderr) };
      },
    };
    cli.clearCapabilitiesCache();
    cli.setCommandRunner(notRepoRunner);
    await vscode.commands.executeCommand('gitAdr.list');

    assert.ok(showErrorStub.called);
    assert.ok(messages.some((m) => m.toLowerCase().includes('git executable not found')));
    assert.ok(messages.some((m) => m.toLowerCase().includes('git-adr not found')));
    assert.ok(messages.some((m) => m.toLowerCase().includes('not a git repository')));
  });
});
