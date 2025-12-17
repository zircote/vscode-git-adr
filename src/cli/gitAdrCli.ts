import { execFile } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { OutputLogger } from '../utils/logger';
import {
  GitAdrError,
  CommandTimeoutError,
  GitNotFoundError,
  GitAdrNotFoundError,
  NotAGitRepositoryError,
} from '../utils/errors';
import { AdrListItem } from '../models/adrListItem';
import { parseAdrListJson, parseAdrList } from '../utils/parser';

const execFileAsync = promisify(execFile);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface ICommandRunner {
  run(command: string, args: string[], cwd: string, timeoutMs: number): Promise<CommandResult>;
}

export class RealCommandRunner implements ICommandRunner {
  async run(
    command: string,
    args: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });
      return { stdout, stderr };
    } catch (error: unknown) {
      const err = error as { killed?: boolean; signal?: string };
      if (err?.killed && err?.signal === 'SIGTERM') {
        throw new CommandTimeoutError(`Command timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  }
}

export interface WorkspaceCapabilities {
  hasGit: boolean;
  hasGitAdr: boolean;
  isGitRepo: boolean;
}

export class GitAdrCli {
  private commandRunner: ICommandRunner;
  private capabilitiesCache = new Map<string, WorkspaceCapabilities>();

  constructor(
    private readonly logger: OutputLogger,
    commandRunner?: ICommandRunner
  ) {
    this.commandRunner = commandRunner || new RealCommandRunner();
  }

  private getConfig() {
    const config = vscode.workspace.getConfiguration('gitAdr');
    return {
      gitPath: config.get<string>('gitPath', 'git'),
      adrSubcommand: config.get<string>('adrSubcommand', 'adr'),
      timeoutMs: config.get<number>('commandTimeoutMs', 15000),
    };
  }

  async checkCapabilities(workspaceFolder: vscode.WorkspaceFolder): Promise<WorkspaceCapabilities> {
    const cacheKey = workspaceFolder.uri.fsPath;
    const cached = this.capabilitiesCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const capabilities: WorkspaceCapabilities = {
      hasGit: false,
      hasGitAdr: false,
      isGitRepo: false,
    };

    const config = this.getConfig();
    const cwd = workspaceFolder.uri.fsPath;

    // Check for git
    try {
      await this.runCommand(config.gitPath, ['--version'], cwd);
      capabilities.hasGit = true;
    } catch (error) {
      this.logger.log('Git not found');
      this.capabilitiesCache.set(cacheKey, capabilities);
      return capabilities;
    }

    // Check if it's a git repo
    try {
      await this.runCommand(config.gitPath, ['rev-parse', '--git-dir'], cwd);
      capabilities.isGitRepo = true;
    } catch (error) {
      this.logger.log(`Not a git repository: ${cwd}`);
      this.capabilitiesCache.set(cacheKey, capabilities);
      return capabilities;
    }

    // Check for git-adr
    try {
      await this.runCommand(config.gitPath, [config.adrSubcommand, '--version'], cwd);
      capabilities.hasGitAdr = true;
    } catch (error) {
      this.logger.log('git-adr not found');
    }

    this.capabilitiesCache.set(cacheKey, capabilities);
    return capabilities;
  }

  clearCapabilitiesCache(workspaceFolder?: vscode.WorkspaceFolder): void {
    if (workspaceFolder) {
      this.capabilitiesCache.delete(workspaceFolder.uri.fsPath);
    } else {
      this.capabilitiesCache.clear();
    }
  }

  setCommandRunner(commandRunner: ICommandRunner): void {
    this.commandRunner = commandRunner;
  }

  private async runCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<CommandResult> {
    const config = this.getConfig();
    this.logger.command(command, args, cwd);

    try {
      const result = await this.commandRunner.run(command, args, cwd, config.timeoutMs);
      return result;
    } catch (error: unknown) {
      if (error instanceof CommandTimeoutError) {
        throw error;
      }

      const err = error as Record<string, unknown>;
      const code = typeof err.code === 'string' ? err.code : undefined;
      const message =
        error instanceof Error
          ? error.message
          : typeof err.message === 'string'
            ? err.message
            : 'Command failed';
      const stderr = typeof err.stderr === 'string' ? err.stderr : undefined;

      if (code === 'ENOENT') {
        if (command.includes('git')) {
          throw new GitNotFoundError();
        }
        throw new GitAdrError(`Command not found: ${command}`, 'ENOENT');
      }

      throw new GitAdrError(message, code, stderr);
    }
  }

  async init(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'init'],
      workspaceFolder.uri.fsPath
    );

    // Clear capabilities cache to detect any changes
    this.clearCapabilitiesCache(workspaceFolder);

    return result.stdout.trim();
  }

  async new(workspaceFolder: vscode.WorkspaceFolder, title: string): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'new', title],
      workspaceFolder.uri.fsPath
    );

    return result.stdout.trim();
  }

  async list(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'list'],
      workspaceFolder.uri.fsPath
    );

    return result.stdout.trim();
  }

  /**
   * List ADRs with structured JSON output, falling back to text parsing.
   *
   * This method attempts to use `git adr list -f json` for structured data.
   * If the JSON format fails (older CLI version or parse error), it falls
   * back to text parsing with `git adr list`.
   *
   * @param workspaceFolder - VS Code workspace folder containing the git repo
   * @returns Promise resolving to array of typed AdrListItem objects
   * @throws {GitNotFoundError} If git is not installed
   * @throws {NotAGitRepositoryError} If the folder is not a git repository
   * @throws {GitAdrNotFoundError} If git-adr is not installed
   */
  async listJson(workspaceFolder: vscode.WorkspaceFolder): Promise<AdrListItem[]> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    // Try JSON format first (preferred path)
    try {
      const result = await this.runCommand(
        config.gitPath,
        [config.adrSubcommand, 'list', '-f', 'json'],
        workspaceFolder.uri.fsPath
      );

      const items = parseAdrListJson(result.stdout);
      this.logger.log('ADR list source = json');
      return items;
    } catch (jsonError) {
      // Fallback to text parsing
      this.logger.log('ADR list source = text-fallback');
      this.logger.log(`JSON parse failed: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);

      try {
        const result = await this.runCommand(
          config.gitPath,
          [config.adrSubcommand, 'list'],
          workspaceFolder.uri.fsPath
        );

        return parseAdrList(result.stdout);
      } catch (textError) {
        // If text parsing also fails, throw the original JSON error
        // to preserve the most informative error message
        throw jsonError;
      }
    }
  }

  async show(workspaceFolder: vscode.WorkspaceFolder, adrId: string): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'show', adrId],
      workspaceFolder.uri.fsPath
    );

    return result.stdout;
  }

  async edit(workspaceFolder: vscode.WorkspaceFolder, adrId: string): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'edit', adrId],
      workspaceFolder.uri.fsPath
    );

    return result.stdout.trim();
  }

  async search(workspaceFolder: vscode.WorkspaceFolder, query: string): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'search', query],
      workspaceFolder.uri.fsPath
    );

    return result.stdout.trim();
  }

  async syncPull(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'sync', '--pull'],
      workspaceFolder.uri.fsPath
    );

    return result.stdout.trim();
  }

  async syncPush(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const config = this.getConfig();
    const capabilities = await this.checkCapabilities(workspaceFolder);

    if (!capabilities.hasGit) {
      throw new GitNotFoundError();
    }

    if (!capabilities.isGitRepo) {
      throw new NotAGitRepositoryError(workspaceFolder.uri.fsPath);
    }

    if (!capabilities.hasGitAdr) {
      throw new GitAdrNotFoundError();
    }

    const result = await this.runCommand(
      config.gitPath,
      [config.adrSubcommand, 'sync', '--push'],
      workspaceFolder.uri.fsPath
    );

    return result.stdout.trim();
  }
}
