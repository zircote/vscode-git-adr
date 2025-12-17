import * as vscode from 'vscode';
import { AdrTreeProvider } from './views/adrTreeProvider';
import { AdrContentProvider } from './documents/adrContentProvider';
import { GitAdrCli } from './cli/gitAdrCli';
import { registerCommands } from './commands/registerCommands';
import { OutputLogger } from './utils/logger';

let outputChannel: vscode.OutputChannel;
let logger: OutputLogger;

export function activate(context: vscode.ExtensionContext): void {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('Git ADR');
  logger = new OutputLogger(outputChannel);
  logger.log('Activating Git ADR extension');

  // Create CLI instance
  const cli = new GitAdrCli(logger);

  // Create tree provider
  const treeProvider = new AdrTreeProvider(cli, logger);
  const treeView = vscode.window.createTreeView('gitAdrView', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Create content provider for virtual documents
  const contentProvider = new AdrContentProvider(cli, logger);
  const contentProviderDisposable = vscode.workspace.registerTextDocumentContentProvider(
    'git-adr',
    contentProvider
  );

  // Register all commands
  const commandDisposables = registerCommands(cli, treeProvider, contentProvider, logger);

  // Auto-refresh on window focus
  const onDidChangeWindowState = vscode.window.onDidChangeWindowState((e) => {
    if (e.focused) {
      const config = vscode.workspace.getConfiguration('gitAdr');
      if (config.get<boolean>('autoRefreshOnFocus', true)) {
        treeProvider.refresh();
      }
    }
  });

  // Add all disposables to context
  context.subscriptions.push(
    outputChannel,
    treeView,
    contentProviderDisposable,
    onDidChangeWindowState,
    ...commandDisposables
  );

  logger.log('Git ADR extension activated');
}

export function deactivate(): void {
  if (logger) {
    logger.log('Deactivating Git ADR extension');
  }
}
