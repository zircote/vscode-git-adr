import { ICommandRunner, CommandResult } from '../../src/cli/gitAdrCli';

export interface MockCommandResponse {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: Error;
}

export class MockCommandRunner implements ICommandRunner {
  private responses = new Map<string, MockCommandResponse>();
  private callHistory: Array<{
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
  }> = [];

  /**
   * Set a mock response for a specific command pattern
   * @param commandPattern Pattern to match (e.g., "git adr list")
   * @param response Mock response to return
   */
  setResponse(commandPattern: string, response: MockCommandResponse): void {
    this.responses.set(commandPattern, response);
  }

  /**
   * Set a mock response for any command matching a partial pattern
   */
  setResponseForPattern(pattern: string, response: MockCommandResponse): void {
    this.responses.set(pattern, response);
  }

  async run(
    command: string,
    args: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<CommandResult> {
    // Record the call
    this.callHistory.push({ command, args, cwd, timeoutMs });

    // Build full command string for matching
    const fullCommand = `${command} ${args.join(' ')}`;

    // Try exact match first
    let response = this.responses.get(fullCommand);

    // If no exact match, try pattern matching
    if (!response) {
      for (const [pattern, resp] of this.responses.entries()) {
        if (fullCommand.includes(pattern)) {
          response = resp;
          break;
        }
      }
    }

    // If still no response, use default
    if (!response) {
      response = { stdout: '', stderr: '', exitCode: 0 };
    }

    // Throw error if specified
    if (response.error) {
      throw response.error;
    }

    // Simulate non-zero exit code
    if (response.exitCode !== undefined && response.exitCode !== 0) {
      const error = new Error(`Command failed with exit code ${response.exitCode}`) as Error & {
        code: number;
        stderr: string;
      };
      error.code = response.exitCode;
      error.stderr = response.stderr || '';
      throw error;
    }

    return {
      stdout: response.stdout || '',
      stderr: response.stderr || '',
    };
  }

  /**
   * Get the history of all commands that were run
   */
  getCallHistory(): ReadonlyArray<{
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
  }> {
    return this.callHistory;
  }

  /**
   * Get the last command that was run
   */
  getLastCall(): { command: string; args: string[]; cwd: string; timeoutMs: number } | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Check if a specific command was called
   */
  wasCommandCalled(commandPattern: string): boolean {
    return this.callHistory.some(
      (call) => `${call.command} ${call.args.join(' ')}`.includes(commandPattern)
    );
  }

  /**
   * Clear the call history
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  /**
   * Reset all responses and history
   */
  reset(): void {
    this.responses.clear();
    this.callHistory = [];
  }
}
