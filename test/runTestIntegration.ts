import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { runTests } from '@vscode/test-electron';

const execFileAsync = promisify(execFile);

async function createTempGitWorkspace(): Promise<string> {
  const baseDir = process.env.RUNNER_TEMP || os.tmpdir();
  const tempDir = await fs.mkdtemp(path.join(baseDir, 'git-adr-vscode-test-'));
  await execFileAsync('git', ['init'], { cwd: tempDir });
  return tempDir;
}

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite-integration/index');

    const workspacePath = await createTempGitWorkspace();

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath],
      extensionTestsEnv: {
        ...process.env,
        VSCODE_GIT_ADR_TESTING: '1',
        VSCODE_GIT_ADR_TEST_WORKSPACE: workspacePath,
        VSCODE_GIT_ADR_TEST_FIXTURES: path.resolve(extensionDevelopmentPath, 'test', 'fixtures'),
      },
    });
  } catch (err) {
    console.error('Failed to run integration tests', err);
    process.exit(1);
  }
}

main();
