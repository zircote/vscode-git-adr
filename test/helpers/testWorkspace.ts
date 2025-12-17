import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface TempWorkspace {
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a temporary workspace directory with git initialized
 */
export async function createTempWorkspace(): Promise<TempWorkspace> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'git-adr-test-'));

  // Initialize git repo
  try {
    await execAsync('git init', { cwd: tmpDir });
    await execAsync('git config user.email "test@example.com"', { cwd: tmpDir });
    await execAsync('git config user.name "Test User"', { cwd: tmpDir });
  } catch (error) {
    // If git init fails, we'll still return the workspace
    // Tests can mock git commands
    console.warn('Failed to initialize git in test workspace:', error);
  }

  const cleanup = async () => {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup test workspace:', error);
    }
  };

  return { path: tmpDir, cleanup };
}

/**
 * Create a temporary workspace without initializing git
 */
export async function createTempWorkspaceNoGit(): Promise<TempWorkspace> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'git-adr-test-nogit-'));

  const cleanup = async () => {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup test workspace:', error);
    }
  };

  return { path: tmpDir, cleanup };
}

/**
 * Wait for a promise with a timeout
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
