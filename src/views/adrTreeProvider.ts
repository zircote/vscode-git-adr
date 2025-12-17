import * as vscode from 'vscode';
import { GitAdrCli } from '../cli/gitAdrCli';
import { OutputLogger } from '../utils/logger';
import { parseAdrList, AdrListEntry } from '../utils/parser';
import { getWorkspaceFolders } from '../utils/workspace';

export class AdrTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly workspaceFolder?: vscode.WorkspaceFolder,
    public readonly adrEntry?: AdrListEntry
  ) {
    super(label, collapsibleState);

    if (adrEntry) {
      this.tooltip = `${adrEntry.id}: ${adrEntry.title}`;
      this.description = adrEntry.id;
      this.iconPath = new vscode.ThemeIcon('file-text');
      this.command = {
        command: 'gitAdr.show',
        title: 'Show ADR',
        arguments: [this],
      };
    } else if (workspaceFolder) {
      this.tooltip = workspaceFolder.uri.fsPath;
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

export class AdrTreeProvider implements vscode.TreeDataProvider<AdrTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AdrTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private adrCache = new Map<string, AdrListEntry[]>();

  constructor(
    private readonly cli: GitAdrCli,
    private readonly logger: OutputLogger
  ) {}

  refresh(item?: AdrTreeItem): void {
    if (item?.workspaceFolder) {
      // Clear cache for specific workspace
      this.adrCache.delete(item.workspaceFolder.uri.fsPath);
    } else {
      // Clear all cache
      this.adrCache.clear();
    }
    this._onDidChangeTreeData.fire(item);
  }

  getTreeItem(element: AdrTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AdrTreeItem): Promise<AdrTreeItem[]> {
    if (!element) {
      // Root level - show workspace folders
      return this.getWorkspaceFolderNodes();
    }

    if (element.workspaceFolder && !element.adrEntry) {
      // Workspace folder node - show ADRs
      return this.getAdrNodes(element.workspaceFolder);
    }

    // ADR nodes have no children
    return [];
  }

  private async getWorkspaceFolderNodes(): Promise<AdrTreeItem[]> {
    const folders = getWorkspaceFolders();

    if (folders.length === 0) {
      return [];
    }

    // Always show one node per workspace folder (spec requirement)
    return folders.map(
      (folder) =>
        new AdrTreeItem(
          folder.name,
          vscode.TreeItemCollapsibleState.Expanded,
          'workspace',
          folder
        )
    );
  }

  private async getAdrNodes(workspaceFolder: vscode.WorkspaceFolder): Promise<AdrTreeItem[]> {
    try {
      // Check cache first
      const cacheKey = workspaceFolder.uri.fsPath;
      let entries = this.adrCache.get(cacheKey);

      if (!entries) {
        // Check capabilities
        const capabilities = await this.cli.checkCapabilities(workspaceFolder);

        if (!capabilities.hasGit) {
          return [this.createErrorNode('Git not found')];
        }

        if (!capabilities.isGitRepo) {
          return [this.createErrorNode('Not a git repository')];
        }

        if (!capabilities.hasGitAdr) {
          return [this.createErrorNode('git-adr not found', 'Install from https://github.com/zircote/git-adr')];
        }

        // Fetch ADRs
        const output = await this.cli.list(workspaceFolder);
        entries = parseAdrList(output);
        this.adrCache.set(cacheKey, entries);
      }

      if (entries.length === 0) {
        return [this.createErrorNode('No ADRs found', 'Run "Git ADR: Initialize" or "Git ADR: New ADR"')];
      }

      return entries.map(
        (entry) =>
          new AdrTreeItem(
            entry.title,
            vscode.TreeItemCollapsibleState.None,
            'adr',
            workspaceFolder,
            entry
          )
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load ADRs: ${message}`, false);
      return [this.createErrorNode('Failed to load ADRs', message)];
    }
  }

  private createErrorNode(message: string, tooltip?: string): AdrTreeItem {
    const item = new AdrTreeItem(
      message,
      vscode.TreeItemCollapsibleState.None,
      'error'
    );
    item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
    item.tooltip = tooltip || message;
    return item;
  }

  getParent(_element: AdrTreeItem): vscode.ProviderResult<AdrTreeItem> {
    return null;
  }
}
