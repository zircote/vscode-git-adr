import * as vscode from 'vscode';
import { GitAdrCli } from '../cli/gitAdrCli';
import { OutputLogger } from '../utils/logger';
import { getWorkspaceFolders } from '../utils/workspace';

export class AdrContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private readonly cli: GitAdrCli,
    private readonly logger: OutputLogger
  ) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    try {
      // URI format: git-adr://<workspaceFolderName>/<adrId>.md
      // In VS Code URIs, the workspace folder name is the authority; the ADR id is in the path.
      const workspaceFolderName = uri.authority;
      const adrIdWithExt = uri.path.split('/').filter((p) => p).pop();

      if (!workspaceFolderName || !adrIdWithExt) {
        return 'Invalid ADR URI format';
      }

      const adrId = adrIdWithExt.replace(/\.md$/, '');

      // Find workspace folder
      const folders = getWorkspaceFolders();
      const workspaceFolder =
        folders.find((folder) => folder.name === workspaceFolderName) ??
        (folders.length === 1 ? folders[0] : undefined);

      if (!workspaceFolder) {
        return `Workspace folder not found: ${workspaceFolderName}`;
      }

      // Fetch ADR content
      this.logger.log(`Fetching ADR ${adrId} from ${workspaceFolderName}`);
      const content = await this.cli.show(workspaceFolder, adrId);

      return content;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load ADR: ${message}`);
      return `Error loading ADR: ${message}`;
    }
  }

  refresh(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }
}
