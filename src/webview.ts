import * as vscode from 'vscode';
import { CodeAtlasDB } from './graph/db';

export class GraphVisualizer {
  public static currentPanel: GraphVisualizer | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static show(context: vscode.ExtensionContext, db: CodeAtlasDB) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (GraphVisualizer.currentPanel) {
      GraphVisualizer.currentPanel._panel.reveal(column);
      GraphVisualizer.currentPanel.updateData(db);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeAtlasGraph',
      'CodeAtlas: Knowledge Graph',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    GraphVisualizer.currentPanel = new GraphVisualizer(panel, db);
  }

  private constructor(panel: vscode.WebviewPanel, private db: CodeAtlasDB) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    // Set initial HTML content
    this._panel.webview.html = this.getHtmlForWebview();

    // Fetch data and send to webview
    this.updateData(this.db);
  }

  public async updateData(db: CodeAtlasDB) {
    try {
      const graphData = await db.getAll();
      
      // Transform data for force-graph
      const gData = {
        nodes: graphData.nodes.map(n => ({ id: n.id, group: n.type === 'file' ? 1 : 2, name: n.name })),
        links: graphData.edges.map(e => ({ source: e.sourceId, target: e.targetId, name: e.type }))
      };

      this._panel.webview.postMessage({ command: 'updateData', data: gData });
    } catch (error) {
      console.error('Failed to get graph data for visualizer:', error);
    }
  }

  public dispose() {
    GraphVisualizer.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }

  private getHtmlForWebview() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeAtlas Graph</title>
  <script src="https://unpkg.com/force-graph"></script>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; overflow: hidden; font-family: sans-serif; }
    #graph-container { width: 100vw; height: 100vh; }
    .loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #60a5fa; font-size: 1.2rem; font-weight: bold; font-family: monospace;}
  </style>
</head>
<body>
  <div id="loading" class="loading">Initializing CodeAtlas Engine...</div>
  <div id="graph-container"></div>
  <script>
    const container = document.getElementById('graph-container');
    const loading = document.getElementById('loading');
    
    // Initialize force-graph
    const Graph = ForceGraph()(container)
      .backgroundColor('#0b0f19')
      .nodeRelSize(6)
      .nodeColor(node => node.group === 1 ? '#3b82f6' : '#a855f7')
      .nodeLabel('name')
      .linkColor(() => 'rgba(56, 189, 248, 0.2)')
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed(0.005)
      .linkDirectionalParticleWidth(1.5)
      .d3Force('charge').strength(-120);

    // Handle messages from the extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'updateData') {
        loading.style.display = 'none';
        Graph.graphData(message.data);
      }
    });
  </script>
</body>
</html>`;
  }
}
