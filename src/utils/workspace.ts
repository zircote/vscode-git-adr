import * as vscode from 'vscode';

export async function selectWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open');
    return undefined;
  }

  if (folders.length === 1) {
    return folders[0];
  }

  // Multiple folders - let user choose
  const selected = await vscode.window.showQuickPick(
    folders.map((folder) => ({
      label: folder.name,
      description: folder.uri.fsPath,
      folder,
    })),
    {
      placeHolder: 'Select workspace folder',
    }
  );

  return selected?.folder;
}

export function getWorkspaceFolders(): vscode.WorkspaceFolder[] {
  return [...(vscode.workspace.workspaceFolders ?? [])];
}
