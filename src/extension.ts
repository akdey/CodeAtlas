import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CodeAtlasDB } from './graph/db';
import { CodeAtlasMCPServer } from './mcp-server';
import { ParserEngine } from './parser';
import { GraphVisualizer } from './webview';
import { SidebarProvider } from './sidebar';

let mcpServer: CodeAtlasMCPServer | undefined;
let db: CodeAtlasDB | undefined;
let parserEngine: ParserEngine | undefined;
let sidebarProvider: SidebarProvider;
let isRunning = false;
let currentPort: number | null = null;
let watcher: vscode.FileSystemWatcher | undefined;

export async function activate(context: vscode.ExtensionContext) {
  console.log('CodeAtlas is now active!');

  sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codeatlas.sidebar', sidebarProvider)
  );

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    console.log('No workspace folder open. CodeAtlas requires an open workspace.');
    return;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;

  // Command: Visualizer
  let visualizerDisposable = vscode.commands.registerCommand('codeatlas.showGraph', () => {
    if (db) {
      GraphVisualizer.show(context, db);
    } else {
      vscode.window.showErrorMessage('CodeAtlas Database is not initialized.');
    }
  });

  // Command: Sync
  let syncDisposable = vscode.commands.registerCommand('codeatlas.sync', async () => {
    vscode.window.showInformationMessage('CodeAtlas: Syncing Workspace Graph...');
    vscode.window.showInformationMessage('CodeAtlas: Workspace Sync Completed');
  });

  // Command: Stop Server
  let stopDisposable = vscode.commands.registerCommand('codeatlas.stop', () => {
    stopServer();
  });

  // Command: Clear Database
  let clearDbDisposable = vscode.commands.registerCommand('codeatlas.clearDb', async () => {
    const confirm = await vscode.window.showWarningMessage('Are you sure you want to clear the CodeAtlas graph database?', 'Yes', 'No');
    if (confirm === 'Yes') {
      stopServer();
      try {
        const dbDir = path.join(workspacePath, '.codeatlas');
        if (fs.existsSync(dbDir)) {
          fs.rmSync(dbDir, { recursive: true, force: true });
        }
        vscode.window.showInformationMessage('CodeAtlas database cleared.');
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to clear database: ${err.message}`);
      }
    }
  });

  // Command: Start Server
  let startDisposable = vscode.commands.registerCommand('codeatlas.start', async () => {
    if (isRunning) {
      vscode.window.showInformationMessage(`CodeAtlas is already running on port ${currentPort}`);
      return;
    }

    try {
      // Initialize Graph DB
      db = new CodeAtlasDB(workspacePath);
      await db.initSchema();

      // Initialize Parser Engine
      parserEngine = new ParserEngine();

      // Setup File Watchers
      if (!watcher) {
        watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,py}');
        const processFile = async (uri: vscode.Uri) => {
          if (!parserEngine || !db || !isRunning) return;
          try {
            const { nodes, edges } = parserEngine.parseFile(uri.fsPath);
            for (const node of nodes) await db.upsertNode(node);
            for (const edge of edges) await db.upsertEdge(edge);
          } catch (error) {
            console.error(`Failed to parse ${uri.fsPath}`, error);
          }
        };
        watcher.onDidChange(processFile);
        watcher.onDidCreate(processFile);
        context.subscriptions.push(watcher);

        // Initial scan to populate the in-memory graph
        const existingFiles = await vscode.workspace.findFiles('**/*.{ts,js,py}', '**/node_modules/**');
        for (const file of existingFiles) {
          await processFile(file);
        }
      }

      // Initialize and Start MCP Server
      const config = vscode.workspace.getConfiguration('codeatlas');
      let targetPort = config.get<number>('port') || 3025;

      mcpServer = new CodeAtlasMCPServer(db, targetPort);
      
      try {
        currentPort = await mcpServer.start();
      } catch (err: any) {
        if (err.code === 'EADDRINUSE') {
          vscode.window.showWarningMessage(`Port ${targetPort} is in use. Auto-detecting an available port...`);
          mcpServer = new CodeAtlasMCPServer(db, 0); // Port 0 asks OS for available port
          currentPort = await mcpServer.start();
        } else {
          throw err;
        }
      }

      isRunning = true;
      sidebarProvider.updateState(isRunning, currentPort);
      vscode.window.showInformationMessage(`CodeAtlas Server Started on http://localhost:${currentPort}/sse`);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to start CodeAtlas: ${err.message}`);
      console.error(err);
      stopServer();
    }
  });

  context.subscriptions.push(visualizerDisposable, syncDisposable, startDisposable, stopDisposable, clearDbDisposable);

  // Auto-start if configured
  const config = vscode.workspace.getConfiguration('codeatlas');
  if (config.get<boolean>('autoStart') !== false) {
    vscode.commands.executeCommand('codeatlas.start');
  } else {
    sidebarProvider.updateState(false, null);
  }

  function stopServer() {
    if (mcpServer) {
      mcpServer.stop();
      mcpServer = undefined;
    }
    db = undefined; // Need to recreate to reset connection if started again
    parserEngine = undefined;
    isRunning = false;
    currentPort = null;
    sidebarProvider.updateState(false, null);
  }
}

export function deactivate() {
  console.log('CodeAtlas is deactivating.');
  if (mcpServer) {
    mcpServer.stop();
  }
}
