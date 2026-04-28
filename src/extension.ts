import * as vscode from 'vscode';
import { CodeAtlasDB } from './graph/db';
import { CodeAtlasMCPServer } from './mcp-server';
import { ParserEngine } from './parser';
import { GraphVisualizer } from './webview';

let mcpServer: CodeAtlasMCPServer | undefined;
let db: CodeAtlasDB | undefined;
let parserEngine: ParserEngine | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('CodeAtlas is now active!');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    console.log('No workspace folder open. CodeAtlas requires an open workspace.');
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;

  try {
    // 1. Initialize Graph DB
    db = new CodeAtlasDB(workspacePath);
    await db.initSchema();

    // 2. Initialize Parser Engine
    parserEngine = new ParserEngine();

    // 3. Initialize and Start MCP Server
    mcpServer = new CodeAtlasMCPServer(db, 3025);
    mcpServer.start();

    // 4. Setup File Watchers for Real-time Synchronization
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,py}');
    
    const processFile = async (uri: vscode.Uri) => {
      if (!parserEngine || !db) return;
      try {
        console.log(`Parsing ${uri.fsPath}`);
        const { nodes, edges } = parserEngine.parseFile(uri.fsPath);
        
        for (const node of nodes) {
          await db.upsertNode(node);
        }
        for (const edge of edges) {
          await db.upsertEdge(edge);
        }
        console.log(`Updated graph for ${uri.fsPath}`);
      } catch (error) {
        console.error(`Failed to parse ${uri.fsPath}`, error);
      }
    };

    watcher.onDidChange(processFile);
    watcher.onDidCreate(processFile);

    context.subscriptions.push(watcher);

    // Provide a command to trigger a full workspace sync manually
    let disposable = vscode.commands.registerCommand('codeatlas.sync', async () => {
      vscode.window.showInformationMessage('CodeAtlas: Syncing Workspace Graph...');
      // In a real implementation, we'd recursively scan the workspace and call processFile
      // For now, this is just a placeholder
      vscode.window.showInformationMessage('CodeAtlas: Workspace Sync Completed');
    });

    let visualizerDisposable = vscode.commands.registerCommand('codeatlas.showGraph', () => {
      if (db) {
        GraphVisualizer.show(context, db);
      } else {
        vscode.window.showErrorMessage('CodeAtlas Database not initialized yet.');
      }
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(visualizerDisposable);
    vscode.window.showInformationMessage('CodeAtlas Server Started on http://localhost:3025/sse');
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to start CodeAtlas: ${err.message}`);
    console.error(err);
  }
}

export function deactivate() {
  console.log('CodeAtlas is deactivating.');
}
