import * as vscode from 'vscode';
import { GitAdrCli } from '../cli/gitAdrCli';
import { AdrTreeProvider, AdrTreeItem } from '../views/adrTreeProvider';
import { AdrContentProvider } from '../documents/adrContentProvider';
import { OutputLogger } from '../utils/logger';
import { selectWorkspaceFolder } from '../utils/workspace';
import { GitAdrError } from '../utils/errors';

export function registerCommands(
  cli: GitAdrCli,
  treeProvider: AdrTreeProvider,
  contentProvider: AdrContentProvider,
  logger: OutputLogger
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Refresh
  disposables.push(
    vscode.commands.registerCommand('gitAdr.refresh', (item?: AdrTreeItem) => {
      treeProvider.refresh(item);
    })
  );

  // Init
  disposables.push(
    vscode.commands.registerCommand('gitAdr.init', async () => {
      try {
        const folder = await selectWorkspaceFolder();
        if (!folder) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Initializing ADR...',
            cancellable: false,
          },
          async () => {
            const result = await cli.init(folder);
            logger.log(`Init result: ${result}`);
            vscode.window.showInformationMessage('ADR initialized successfully');
            treeProvider.refresh();
          }
        );
      } catch (error: unknown) {
        handleError('Failed to initialize ADR', error, logger);
      }
    })
  );

  // New
  disposables.push(
    vscode.commands.registerCommand('gitAdr.new', async () => {
      try {
        const folder = await selectWorkspaceFolder();
        if (!folder) {
          return;
        }

        const title = await vscode.window.showInputBox({
          prompt: 'Enter ADR title',
          placeHolder: 'Use TypeScript for backend services',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Title cannot be empty';
            }
            return null;
          },
        });

        if (!title) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Creating ADR...',
            cancellable: false,
          },
          async () => {
            const result = await cli.new(folder, title);
            logger.log(`New ADR result: ${result}`);
            vscode.window.showInformationMessage(`ADR created: ${title}`);
            treeProvider.refresh();
          }
        );
      } catch (error: unknown) {
        handleError('Failed to create ADR', error, logger);
      }
    })
  );

  // List
  disposables.push(
    vscode.commands.registerCommand('gitAdr.list', async () => {
      try {
        const folder = await selectWorkspaceFolder();
        if (!folder) {
          return;
        }

        const output = await cli.list(folder);
        const doc = await vscode.workspace.openTextDocument({
          content: output,
          language: 'text',
        });
        await vscode.window.showTextDocument(doc);
      } catch (error: unknown) {
        handleError('Failed to list ADRs', error, logger);
      }
    })
  );

  // Show
  disposables.push(
    vscode.commands.registerCommand('gitAdr.show', async (item?: AdrTreeItem) => {
      try {
        let workspaceFolder: vscode.WorkspaceFolder | undefined;
        let adrId: string | undefined;

        if (item?.adrEntry && item?.workspaceFolder) {
          workspaceFolder = item.workspaceFolder;
          adrId = item.adrEntry.id;
        } else {
          workspaceFolder = await selectWorkspaceFolder();
          if (!workspaceFolder) {
            return;
          }

          adrId = await vscode.window.showInputBox({
            prompt: 'Enter ADR ID',
            placeHolder: 'e.g., 1, abc123',
          });

          if (!adrId) {
            return;
          }
        }

        // Create virtual document URI
        const uri = vscode.Uri.parse(
          `git-adr://${workspaceFolder.name}/${adrId}.md`
        );

        const doc = await vscode.workspace.openTextDocument(uri);
        // If content is markdown-like, use markdown mode (we use .md URIs).
        if (doc.languageId !== 'markdown') {
          await vscode.languages.setTextDocumentLanguage(doc, 'markdown');
        }
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (error: unknown) {
        handleError('Failed to show ADR', error, logger);
      }
    })
  );

  // Edit
  disposables.push(
    vscode.commands.registerCommand('gitAdr.edit', async (item?: AdrTreeItem) => {
      try {
        let workspaceFolder: vscode.WorkspaceFolder | undefined;
        let adrId: string | undefined;

        if (item?.adrEntry && item?.workspaceFolder) {
          workspaceFolder = item.workspaceFolder;
          adrId = item.adrEntry.id;
        } else {
          workspaceFolder = await selectWorkspaceFolder();
          if (!workspaceFolder) {
            return;
          }

          adrId = await vscode.window.showInputBox({
            prompt: 'Enter ADR ID',
            placeHolder: 'e.g., 1, abc123',
          });

          if (!adrId) {
            return;
          }
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Editing ADR...',
            cancellable: false,
          },
          async () => {
            const result = await cli.edit(workspaceFolder!, adrId!);
            logger.log(`Edit result: ${result}`);
            vscode.window.showInformationMessage('ADR editor launched');
            // Refresh after a delay to allow external editor to save
            setTimeout(() => treeProvider.refresh(), 1000);
          }
        );
      } catch (error: unknown) {
        handleError('Failed to edit ADR', error, logger);
      }
    })
  );

  // Search
  disposables.push(
    vscode.commands.registerCommand(
      'gitAdr.search',
      async (itemOrQuery?: AdrTreeItem | string, explicitQuery?: string) => {
      try {
        const folder = await selectWorkspaceFolder();
        if (!folder) {
          return;
        }

        const item = typeof itemOrQuery === 'string' ? undefined : itemOrQuery;
        const defaultQuery = item?.adrEntry?.title || '';

        const providedQuery =
          typeof itemOrQuery === 'string'
            ? itemOrQuery
            : typeof explicitQuery === 'string'
              ? explicitQuery
              : undefined;

        const query =
          providedQuery ??
          (await vscode.window.showInputBox({
            prompt: 'Enter search query',
            placeHolder: 'keyword or phrase',
            value: defaultQuery,
          }));

        if (!query) {
          return;
        }

        const output = await cli.search(folder, query);
        const doc = await vscode.workspace.openTextDocument({
          content: output || 'No results found',
          language: 'text',
        });
        await vscode.window.showTextDocument(doc);
      } catch (error: unknown) {
        handleError('Failed to search ADRs', error, logger);
      }
      }
    )
  );

  // Sync Pull
  disposables.push(
    vscode.commands.registerCommand('gitAdr.syncPull', async (item?: AdrTreeItem) => {
      try {
        const folder = item?.workspaceFolder || await selectWorkspaceFolder();
        if (!folder) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Syncing ADRs (pull)...',
            cancellable: false,
          },
          async () => {
            const result = await cli.syncPull(folder);
            logger.log(`Sync pull result: ${result}`);
            vscode.window.showInformationMessage('ADRs synced (pulled)');
            treeProvider.refresh();
          }
        );
      } catch (error: unknown) {
        handleError('Failed to sync ADRs (pull)', error, logger);
      }
    })
  );

  // Sync Push
  disposables.push(
    vscode.commands.registerCommand('gitAdr.syncPush', async (item?: AdrTreeItem) => {
      try {
        const folder = item?.workspaceFolder || await selectWorkspaceFolder();
        if (!folder) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Syncing ADRs (push)...',
            cancellable: false,
          },
          async () => {
            const result = await cli.syncPush(folder);
            logger.log(`Sync push result: ${result}`);
            vscode.window.showInformationMessage('ADRs synced (pushed)');
          }
        );
      } catch (error: unknown) {
        handleError('Failed to sync ADRs (push)', error, logger);
      }
    })
  );

  // Open Docs
  disposables.push(
    vscode.commands.registerCommand('gitAdr.openDocs', () => {
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/zircote/git-adr'));
    })
  );

  // Configure
  disposables.push(
    vscode.commands.registerCommand('gitAdr.configure', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'gitAdr');
    })
  );

  // Refresh Document
  disposables.push(
    vscode.commands.registerCommand('gitAdr.refreshDocument', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.scheme === 'git-adr') {
        contentProvider.refresh(editor.document.uri);
      }
    })
  );

  return disposables;
}

function handleError(context: string, error: unknown, logger: OutputLogger): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const message = error instanceof GitAdrError ? error.message : `${context}: ${errMsg}`;
  logger.error(message);
  
  vscode.window.showErrorMessage(message, 'Show Output').then((selected) => {
    if (selected === 'Show Output') {
      logger.show();
    }
  });
}
