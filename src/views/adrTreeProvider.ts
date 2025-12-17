import * as vscode from 'vscode';
import { GitAdrCli } from '../cli/gitAdrCli';
import { OutputLogger } from '../utils/logger';
import { AdrListItem } from '../models/adrListItem';
import { getWorkspaceFolders } from '../utils/workspace';

/**
 * Format TreeItem description from AdrListItem metadata.
 *
 * Format: `status • date` or `status • date • tags`
 * Missing fields are gracefully omitted.
 *
 * @example
 * formatDescription({ status: 'accepted', date: '2025-12-17' })
 * // => "accepted • 2025-12-17"
 *
 * formatDescription({ status: 'proposed', date: '2025-12-17', tags: ['security', 'api'] })
 * // => "proposed • 2025-12-17 • security, api"
 */
function formatDescription(item: AdrListItem): string {
  const parts: string[] = [];

  if (item.status) {
    parts.push(item.status);
  }

  if (item.date) {
    parts.push(item.date);
  }

  // Only include tags if non-empty
  if (item.tags && item.tags.length > 0) {
    parts.push(item.tags.join(', '));
  }

  return parts.join(' • ');
}

/**
 * Format TreeItem tooltip from AdrListItem metadata.
 *
 * Produces a multiline tooltip with all available metadata fields.
 * Linked commits are truncated if there are more than 3.
 * Supersedes fields show "(none)" if explicitly null.
 *
 * @example
 * ```
 * ID: 20251217-my-adr
 * Status: proposed
 * Date: 2025-12-17
 * Tags: security, api
 * Linked commits: abc123, def456
 * Supersedes: (none)
 * Superseded by: (none)
 * ```
 */
function formatTooltip(item: AdrListItem): string {
  const lines: string[] = [];

  // Always show ID
  lines.push(`ID: ${item.id}`);

  // Optional fields
  if (item.status) {
    lines.push(`Status: ${item.status}`);
  }

  if (item.date) {
    lines.push(`Date: ${item.date}`);
  }

  if (item.tags && item.tags.length > 0) {
    lines.push(`Tags: ${item.tags.join(', ')}`);
  }

  // Linked commits with truncation
  if (item.linked_commits && item.linked_commits.length > 0) {
    const maxCommits = 3;
    if (item.linked_commits.length > maxCommits) {
      const shown = item.linked_commits.slice(0, maxCommits);
      const remaining = item.linked_commits.length - maxCommits;
      lines.push(`Linked commits: ${shown.join(', ')} and ${remaining} more`);
    } else {
      lines.push(`Linked commits: ${item.linked_commits.join(', ')}`);
    }
  }

  // Supersedes fields - show "(none)" if explicitly null
  if (item.supersedes !== undefined) {
    lines.push(`Supersedes: ${item.supersedes ?? '(none)'}`);
  }

  if (item.superseded_by !== undefined) {
    lines.push(`Superseded by: ${item.superseded_by ?? '(none)'}`);
  }

  return lines.join('\n');
}

export class AdrTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly workspaceFolder?: vscode.WorkspaceFolder,
    public readonly adrEntry?: AdrListItem
  ) {
    super(label, collapsibleState);

    if (adrEntry) {
      // Use structured formatting for description and tooltip
      this.tooltip = formatTooltip(adrEntry);
      this.description = formatDescription(adrEntry);
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

  private adrCache = new Map<string, AdrListItem[]>();

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

        // Fetch ADRs using JSON format (with automatic text fallback)
        entries = await this.cli.listJson(workspaceFolder);
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
