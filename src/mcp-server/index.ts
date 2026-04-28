import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CodeAtlasDB } from '../graph/db';

export class CodeAtlasMCPServer {
  private server: Server;
  private app: express.Application;
  private transport?: SSEServerTransport;
  private db: CodeAtlasDB;
  private port: number;

  constructor(db: CodeAtlasDB, port: number = 3025) {
    this.db = db;
    this.port = port;
    this.app = express();
    
    this.server = new Server(
      {
        name: 'codeatlas',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    this.setupRoutes();
  }

  private setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_graph_neighborhood',
            description: 'Get the structural codebase neighborhood (nodes and edges) around a specific file or symbol.',
            inputSchema: {
              type: 'object',
              properties: {
                nodeId: {
                  type: 'string',
                  description: 'The URI of the file or symbol ID to center the search on.',
                },
                depth: {
                  type: 'number',
                  description: 'Number of hops from the center node. Default is 1.',
                },
              },
              required: ['nodeId'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'get_graph_neighborhood') {
        const args = request.params.arguments as any;
        const nodeId = args.nodeId;
        const depth = args.depth || 1;

        try {
          const result = await this.db.getNeighborhood(nodeId, depth);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
             content: [
               {
                 type: 'text',
                 text: \`Error retrieving graph neighborhood: \${error.message}\`
               }
             ],
             isError: true
          }
        }
      }

      throw new Error(\`Tool not found: \${request.params.name}\`);
    });
  }

  private setupRoutes() {
    this.app.get('/sse', async (req, res) => {
      this.transport = new SSEServerTransport('/message', res);
      await this.server.connect(this.transport);
    });

    this.app.post('/message', express.json(), async (req, res) => {
      if (this.transport) {
        await this.transport.handlePostMessage(req, res);
      } else {
        res.status(503).send('SSE not connected');
      }
    });
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(\`CodeAtlas MCP Server listening on port \${this.port}\`);
    });
  }
}
