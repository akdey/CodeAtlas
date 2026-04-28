<div align="center">
  <h1>CodeAtlas: The "Context Engine" for Vibe Coding</h1>
  <p><strong>Stop burning thousands of tokens on "context discovery" every time you switch tools.</strong></p>
</div>

**CodeAtlas** is a powerful VS Code extension that transforms your project from a folder of text files into a **living, queryable Knowledge Graph**. By exposing a deterministic map of your entire codebase via the **Model Context Protocol (MCP)**, CodeAtlas eliminates "Context Collapse" and slashes the "Token Tax" associated with modern AI-native engineering.

### 💸 The problem is simple: Your AI is re-reading your code over and over.
In the era of **Vibe Coding**, we are moving beyond simple snippet generation to full-scale agentic engineering. However, every time you ask an AI tool (Cursor, Copilot, Antigravity, or Claude) to perform a task, it starts with **Structural Blindness**. It spends the first 5,000 to 10,000 tokens just trying to "figure out" how your files are connected, inheritance chains, and side effects. 

When you hit a rate limit or "token expiration" on one tool and switch to another, that expensive context is **lost**. You start the "Token Burn" all over again.

**CodeAtlas provides the "Universal Context Layer" that follows you across every tool, ensuring your AI acts as a Senior Architect, not a lost tourist.**

---

## 🛑 The Problem: "Context Collapse" & The Token Burn

In the era of **Vibe Coding**, we are moving beyond simple snippet generation to full-scale agentic engineering. However, a critical bottleneck remains: **Context Collapse**.

### 💸 The Token Tax & Massive "Token Burn"
Every time an AI agent (like Cursor, Copilot, or Antigravity) attempts to solve a complex task, it must first "find" the relevant code. Without a structural map, these tools resort to:
1.  **Massive RAG Retrieval:** Pulling in dozens of snippets that *look* relevant but might just be naming coincidences.
2.  **Brute-Force File Reading:** Reading entire utility files and dependency trees repeatedly.

This results in **Massive Token Burn**. A single architectural question can cost 10,000+ tokens just in "discovery" before a single line of code is written. For a team of engineers, this translates to hundreds of dollars in "re-reading" costs every day.

### 🔄 The "Vibe Switch" Friction (Token Expiration)
Imagine you've been working in Cursor all morning. The AI has finally "understood" your project's messy inheritance chain. Suddenly, you hit your **daily token limit** or a rate limit. 

You switch to Claude Desktop or another agentic tool to keep the momentum going. **But the context is gone.** The new tool has no idea about the structural discoveries made by the previous one. It must restart the expensive, high-latency "discovery" phase from scratch—burning even more tokens and wasting your time.

### 🧩 Structural Blindness
Vector search is "semantic," not "structural." An AI might find a function named `processOrder()`, but it often fails to see:
*   The hidden chain of **15 inheritance layers**.
*   The **indirect side effects** in a distant module that aren't semantically similar in text.
*   The **complex interface implementations** that define how the code actually runs.

## 💡 The Solution: CodeAtlas GraphRAG

**CodeAtlas** transforms your project directory from a folder of text files into a **navigable, queryable brain**. 

By leveraging **Tree-sitter** for deep AST parsing and **LadybugDB** for high-performance graph storage, CodeAtlas maintains a real-time, deterministic map of your entire codebase. It exposes this intelligence through the **Model Context Protocol (MCP)**, allowing any AI tool to perform **GraphRAG**.

Instead of guessing how files are connected, your AI assistant can now query the graph for structural "hops," drastically reducing token usage and ensuring a "Senior Architect" level understanding of your project's architecture—no matter which tool you are using.

## 💡 The Solution: CodeAtlas GraphRAG

**CodeAtlas** solves this by providing a standardized, **local-first Knowledge Graph** of your project directory. 

Instead of forcing AI to guess how files are connected by reading text, CodeAtlas leverages **Tree-sitter** to parse your code into an AST and stores the structural relationships (Files, Classes, Functions, Imports) in a high-performance, embedded **Graphology** in-memory graph.

By running an **SSE MCP Server** directly from your IDE, CodeAtlas allows any AI agent to perform **GraphRAG**—retrieving only the precise nodes and edges necessary to solve a task, with zero token waste.

---

## Features

- 🗺️ **Deterministic Navigation:** Maps every class, function, and variable across your workspace dynamically.
- ⚡ **Zero-Waste Context:** AI agents query the graph for "hops" (*"What are the downstream dependencies of this interface?"*) instead of reading the entire codebase.
- 🔄 **Incremental Real-time Parsing:** Maintains a "living map" without destroying your CPU. When you save a file, CodeAtlas **only re-parses that specific file** and performs a micro-update to the graph. It **does not recalculate** the whole workspace. Your AI never hallucinates an outdated architecture.
- 🌐 **Platform Agnostic:** The standard MCP SSE server means CodeAtlas serves as a "Universal Context Layer" that follows you across VS Code, terminal agents, and web-based IDEs.
- 🛡️ **100% Open Source Stack:** Built on fully open source, privacy-first tooling (Tree-sitter, Graphology). Everything stays local on your machine.

---

## 🛠️ Architecture & Tech Stack

CodeAtlas is built for speed and compatibility:
- **Parser Engine:** Uses **Tree-sitter** for lightning-fast, multi-language AST parsing (Supports JS, TS, Python out of the box).
- **Graph Database:** Powered by **@ladybugdb/core** (an embedded, lightweight graph database) for fast Cypher-style structural queries.
- **MCP Interface:** Utilizes the official `@modelcontextprotocol/sdk` to serve an SSE (Server-Sent Events) endpoint locally at `http://localhost:3025/sse`.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- VS Code >= 1.85.0

### Installation

1. Download the latest `.vsix` file from the [Releases](https://github.com/akdey/CodeAtlas/releases) page.
2. Open VS Code.
3. Go to the Extensions view (`Ctrl+Shift+X`).
4. Click on the `...` (More Actions) menu in the top right corner.
5. Select **Install from VSIX...** and choose the downloaded file.

### Connecting an AI Agent via MCP

Once CodeAtlas is running in your VS Code workspace, the MCP server is actively hosted on `http://localhost:3025/sse`. Because it uses standard HTTP (Server-Sent Events), connecting your vibe coding tools is extremely simple:

#### **Connecting to Cursor**
1. Open Cursor Settings.
2. Navigate to **Features > MCP Servers**.
3. Click **+ Add New MCP Server**.
4. Set Name to `CodeAtlas`, Type to `sse`, and URL to `http://localhost:3025/sse`.

#### **Connecting to Claude Desktop**
1. Open your `claude_desktop_config.json`.
2. Add the CodeAtlas SSE endpoint to your MCP servers:
```json
"mcpServers": {
  "codeatlas": {
    "command": "node", 
    "args": [], 
    "env": {}, 
    "url": "http://localhost:3025/sse"
  }
}
```
*(Note: Because it's SSE, the connection handles everything over the URL. The `command` block is often ignored or bypassed for SSE in many clients, but you can use community SSE-client wrappers if required by your specific Claude Desktop version).*

#### **Connecting to Antigravity / Other Terminal Agents**
Provide the tool with the SSE URL `http://localhost:3025/sse`. The agent will automatically discover the `get_graph_neighborhood` tool and begin structurally navigating your code!

---

## 🤝 Contributing

We welcome contributions! Whether it's adding Tree-sitter support for new languages (Rust, Go, Java) or building new MCP tools for deeper structural analysis, feel free to open a PR.

## 📄 License

CodeAtlas is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
