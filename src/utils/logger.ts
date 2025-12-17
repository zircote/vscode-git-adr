import * as vscode from 'vscode';

export class OutputLogger {
  constructor(private readonly outputChannel: vscode.OutputChannel) {}

  log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  error(message: string, showOutput = true): void {
    this.log(`ERROR: ${message}`);
    if (showOutput) {
      const config = vscode.workspace.getConfiguration('gitAdr');
      if (config.get<boolean>('showOutputOnError', true)) {
        this.outputChannel.show(true);
      }
    }
  }

  command(command: string, args: string[], cwd: string): void {
    this.log(`Running: ${command} ${args.join(' ')} (cwd: ${cwd})`);
  }

  show(): void {
    this.outputChannel.show();
  }
}
