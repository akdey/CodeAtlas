import * as ladybug from '@ladybugdb/core';
import * as path from 'path';
import * as fs from 'fs';
import { GraphNode, GraphEdge } from './types';

export class CodeAtlasDB {
  private db: any;
  private conn: any;

  constructor(private workspacePath: string) {
    const dbPath = path.join(workspacePath, '.codeatlas', 'db');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
    
    // Initialize LadybugDB
    // Assuming a standard Cypher-like interface
    this.db = new (ladybug as any).Database(dbPath);
    this.conn = new (ladybug as any).Connection(this.db);
  }

  public async initSchema() {
    // Basic schema setup for Nodes and Edges
    try {
      await this.conn.query(`CREATE NODE TABLE Node (id STRING, type STRING, name STRING, uri STRING, startLine INT64, endLine INT64, PRIMARY KEY (id))`);
      await this.conn.query(`CREATE REL TABLE DependsOn (FROM Node TO Node, type STRING)`);
    } catch (e: any) {
      // Ignore if already exists
      if (!e.message?.includes('already exists')) {
        console.error('Error creating schema:', e);
      }
    }
  }

  public async upsertNode(node: GraphNode) {
    const query = `
      MERGE (n:Node {id: $id})
      ON MATCH SET n.type = $type, n.name = $name, n.uri = $uri, n.startLine = $startLine, n.endLine = $endLine
      ON CREATE SET n.type = $type, n.name = $name, n.uri = $uri, n.startLine = $startLine, n.endLine = $endLine
    `;
    await this.conn.query(query, {
      id: node.id,
      type: node.type,
      name: node.name,
      uri: node.uri,
      startLine: node.startLine || -1,
      endLine: node.endLine || -1
    });
  }

  public async upsertEdge(edge: GraphEdge) {
    const query = `
      MATCH (src:Node {id: $sourceId})
      MATCH (tgt:Node {id: $targetId})
      MERGE (src)-[r:DependsOn {type: $type}]->(tgt)
    `;
    await this.conn.query(query, {
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type
    });
  }

  public async getNeighborhood(nodeId: string, depth: number = 1): Promise<{nodes: GraphNode[], edges: GraphEdge[]}> {
    // Cypher query to get neighborhood up to 'depth' hops
    const query = `
      MATCH p=(n:Node {id: $id})-[*1..${depth}]-(m:Node)
      RETURN nodes(p) AS nodes, rels(p) AS edges
    `;
    const result = await this.conn.query(query, { id: nodeId });
    
    const nodesMap = new Map<string, GraphNode>();
    const edgesList: GraphEdge[] = [];
    
    // Note: Assuming a generic result iterator format. Adjust based on exact LadybugDB API
    for await (const row of result) {
      if (row.nodes) {
        row.nodes.forEach((n: any) => nodesMap.set(n.id, n));
      }
      if (row.edges) {
        row.edges.forEach((e: any) => {
           edgesList.push({ sourceId: e._src, targetId: e._dst, type: e.type });
        });
      }
    }

    return { nodes: Array.from(nodesMap.values()), edges: edgesList };
  }
}
