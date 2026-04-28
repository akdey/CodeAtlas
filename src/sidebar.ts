import * as vscode from 'vscode';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _isRunning: boolean = false;
  private _port: number | null = null;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(data => {
      switch (data.type) {
        case 'start': {
          vscode.commands.executeCommand('codeatlas.start');
          break;
        }
        case 'stop': {
          vscode.commands.executeCommand('codeatlas.stop');
          break;
        }
        case 'clearDb': {
          vscode.commands.executeCommand('codeatlas.clearDb');
          break;
        }
        case 'showGraph': {
          vscode.commands.executeCommand('codeatlas.showGraph');
          break;
        }
      }
    });
  }

  public updateState(isRunning: boolean, port: number | null) {
    this._isRunning = isRunning;
    this._port = port;
    if (this._view) {
      this._view.webview.postMessage({ type: 'updateState', isRunning, port });
    }
  }

  private _getHtmlForWebview() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeAtlas Panel</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      padding: 10px;
    }
    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 12px;
      margin: 5px 0;
      width: 100%;
      cursor: pointer;
      border-radius: 2px;
      font-size: 13px;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
    .status {
      margin-bottom: 15px;
      padding: 10px;
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
    }
    .status-indicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 5px;
    }
    .running { background-color: #10b981; }
    .stopped { background-color: #ef4444; }
    
    .mcp-info {
      margin-top: 10px;
      font-size: 12px;
      word-break: break-all;
      background-color: var(--vscode-textCodeBlock-background);
      padding: 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h2>CodeAtlas Engine</h2>
  
  <div class="status">
    <div>
      <span id="statusIndicator" class="status-indicator ${this._isRunning ? 'running' : 'stopped'}"></span>
      <strong id="statusText">${this._isRunning ? 'Running' : 'Stopped'}</strong>
    </div>
    <div id="mcpInfo" class="mcp-info" style="display: ${this._isRunning ? 'block' : 'none'}">
      <strong>MCP SSE URL:</strong><br>
      <code id="mcpUrl">http://localhost:${this._port}/sse</code>
    </div>
  </div>

  <button id="btnStart" style="display: ${this._isRunning ? 'none' : 'block'}">Start Server</button>
  <button id="btnStop" class="secondary" style="display: ${this._isRunning ? 'block' : 'none'}">Stop Server</button>
  <hr style="border: none; border-top: 1px solid var(--vscode-widget-border); margin: 15px 0;" />
  <button id="btnVisualizer">Open Graph Visualizer</button>
  <button id="btnClear" class="secondary" style="margin-top: 20px; color: #ef4444;">Clear Database</button>

  <script>
    const vscode = acquireVsCodeApi();
    
    document.getElementById('btnStart').addEventListener('click', () => {
      vscode.postMessage({ type: 'start' });
    });
    document.getElementById('btnStop').addEventListener('click', () => {
      vscode.postMessage({ type: 'stop' });
    });
    document.getElementById('btnClear').addEventListener('click', () => {
      vscode.postMessage({ type: 'clearDb' });
    });
    document.getElementById('btnVisualizer').addEventListener('click', () => {
      vscode.postMessage({ type: 'showGraph' });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type === 'updateState') {
        const isRunning = message.isRunning;
        document.getElementById('statusIndicator').className = 'status-indicator ' + (isRunning ? 'running' : 'stopped');
        document.getElementById('statusText').innerText = isRunning ? 'Running' : 'Stopped';
        
        document.getElementById('btnStart').style.display = isRunning ? 'none' : 'block';
        document.getElementById('btnStop').style.display = isRunning ? 'block' : 'none';
        
        const mcpInfo = document.getElementById('mcpInfo');
        if (isRunning && message.port) {
          mcpInfo.style.display = 'block';
          document.getElementById('mcpUrl').innerText = \`http://localhost:\${message.port}/sse\`;
        } else {
          mcpInfo.style.display = 'none';
        }
      }
    });
  </script>
</body>
</html>`;
  }
}
