import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { GitAdrCli, ICommandRunner, CommandResult } from '../../src/cli/gitAdrCli';
import { OutputLogger } from '../../src/utils/logger';

class MockCommandRunner implements ICommandRunner {
  private responses = new Map<string, CommandResult>();
  private errors = new Map<string, Error>();

  setResponse(key: string, result: CommandResult): void {
    this.responses.set(key, result);
  }

  setError(key: string, error: Error): void {
    this.errors.set(key, error);
  }

  async run(command: string, args: string[], _cwd: string, _timeoutMs: number): Promise<CommandResult> {
    const key = `${command} ${args.join(' ')}`;
    const error = this.errors.get(key);
    if (error) {
      throw error;
    }

    const response = this.responses.get(key);
    if (response) {
      return response;
    }

    return { stdout: '', stderr: '' };
  }
}

suite('GitAdrCli Test Suite', () => {
  let mockRunner: MockCommandRunner;
  let mockLogger: OutputLogger;
  let cli: GitAdrCli;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;
  let outputChannel: vscode.OutputChannel;

  setup(() => {
    mockRunner = new MockCommandRunner();
    outputChannel = {
      appendLine: sinon.stub(),
      show: sinon.stub(),
    } as unknown as vscode.OutputChannel;
    mockLogger = new OutputLogger(outputChannel);
    cli = new GitAdrCli(mockLogger, mockRunner);

    mockWorkspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test-workspace',
      index: 0,
    };
  });

  teardown(() => {
    sinon.restore();
  });

  test('Check capabilities - all present', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });

    const capabilities = await cli.checkCapabilities(mockWorkspaceFolder);

    assert.strictEqual(capabilities.hasGit, true);
    assert.strictEqual(capabilities.isGitRepo, true);
    assert.strictEqual(capabilities.hasGitAdr, true);
  });

  test('Check capabilities - git missing', async () => {
    const error: NodeJS.ErrnoException = new Error('ENOENT');
    error.code = 'ENOENT';
    mockRunner.setError('git --version', error);

    const capabilities = await cli.checkCapabilities(mockWorkspaceFolder);

    assert.strictEqual(capabilities.hasGit, false);
    assert.strictEqual(capabilities.isGitRepo, false);
    assert.strictEqual(capabilities.hasGitAdr, false);
  });

  test('Check capabilities - not a git repo', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setError('git rev-parse --git-dir', new Error('Not a git repository'));

    const capabilities = await cli.checkCapabilities(mockWorkspaceFolder);

    assert.strictEqual(capabilities.hasGit, true);
    assert.strictEqual(capabilities.isGitRepo, false);
    assert.strictEqual(capabilities.hasGitAdr, false);
  });

  test('List ADRs', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });
    mockRunner.setResponse('git adr list', {
      stdout: '001 | Use TypeScript\n002 | Implement tree view',
      stderr: '',
    });

    const result = await cli.list(mockWorkspaceFolder);

    assert.strictEqual(result, '001 | Use TypeScript\n002 | Implement tree view');
  });

  test('Create new ADR', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });
    mockRunner.setResponse('git adr new Test ADR', {
      stdout: 'Created ADR 003',
      stderr: '',
    });

    const result = await cli.new(mockWorkspaceFolder, 'Test ADR');

    assert.strictEqual(result, 'Created ADR 003');
  });

  test('Show ADR', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });
    mockRunner.setResponse('git adr show 001', {
      stdout: '# ADR 001\n\nContent here',
      stderr: '',
    });

    const result = await cli.show(mockWorkspaceFolder, '001');

    assert.strictEqual(result, '# ADR 001\n\nContent here');
  });

  test('Search ADRs', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });
    mockRunner.setResponse('git adr search typescript', {
      stdout: '001 | Use TypeScript',
      stderr: '',
    });

    const result = await cli.search(mockWorkspaceFolder, 'typescript');

    assert.strictEqual(result, '001 | Use TypeScript');
  });

  test('Capabilities caching', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });

    await cli.checkCapabilities(mockWorkspaceFolder);

    mockRunner = new MockCommandRunner();
    cli.setCommandRunner(mockRunner);

    const capabilities = await cli.checkCapabilities(mockWorkspaceFolder);

    assert.strictEqual(capabilities.hasGit, true);
    assert.strictEqual(capabilities.isGitRepo, true);
    assert.strictEqual(capabilities.hasGitAdr, true);
  });

  test('Clear capabilities cache', async () => {
    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });

    await cli.checkCapabilities(mockWorkspaceFolder);
    
    cli.clearCapabilitiesCache(mockWorkspaceFolder);

    mockRunner.setResponse('git --version', { stdout: 'git version 2.30.0', stderr: '' });
    mockRunner.setResponse('git rev-parse --git-dir', { stdout: '.git', stderr: '' });
    mockRunner.setResponse('git adr --version', { stdout: 'git-adr 1.0.0', stderr: '' });

    const capabilities = await cli.checkCapabilities(mockWorkspaceFolder);
    assert.strictEqual(capabilities.hasGit, true);
  });
});
