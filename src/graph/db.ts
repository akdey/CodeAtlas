import { GraphNode, GraphEdge } from './types';
import Graph from 'graphology';

export class CodeAtlasDB {
  private graph: Graph;

  constructor(private workspacePath: string) {
    this.graph = new Graph({ multi: true });
  }

  public async initSchema() {
    // Graphology doesn't need schema initialization
    return Promise.resolve();
  }

  public async upsertNode(node: GraphNode) {
    if (!this.graph.hasNode(node.id)) {
      this.graph.addNode(node.id, { ...node });
    } else {
      this.graph.mergeNodeAttributes(node.id, { ...node });
    }
  }

  public async upsertEdge(edge: GraphEdge) {
    // Ensure nodes exist before adding an edge
    if (!this.graph.hasNode(edge.sourceId)) {
      this.graph.addNode(edge.sourceId);
    }
    if (!this.graph.hasNode(edge.targetId)) {
      this.graph.addNode(edge.targetId);
    }

    // Graphology allows multi edges, but we can prevent duplicates manually
    let exists = false;
    this.graph.forEachEdge(
      edge.sourceId,
      edge.targetId,
      (e, attr) => {
        if (attr.type === edge.type) exists = true;
      }
    );

    if (!exists) {
      this.graph.addEdge(edge.sourceId, edge.targetId, { type: edge.type });
    }
  }

  public async getNeighborhood(nodeId: string, depth: number = 1): Promise<{nodes: GraphNode[], edges: GraphEdge[]}> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    
    if (!this.graph.hasNode(nodeId)) {
      return { nodes, edges };
    }

    const visitedNodes = new Set<string>();
    visitedNodes.add(nodeId);

    // Get the center node
    const centerAttrs = this.graph.getNodeAttributes(nodeId);
    nodes.push({ id: nodeId, ...centerAttrs } as GraphNode);

    // Simple 1-depth neighborhood for now (graphology makes deeper traversal easy, but 1 is usually enough for MCP)
    this.graph.forEachOutNeighbor(nodeId, (neighborId, attributes) => {
      if (!visitedNodes.has(neighborId)) {
        visitedNodes.add(neighborId);
        nodes.push({ id: neighborId, ...attributes } as GraphNode);
      }
    });

    this.graph.forEachOutboundEdge(nodeId, (edgeId, attributes, source, target) => {
      edges.push({ sourceId: source, targetId: target, type: attributes.type });
    });

    return { nodes, edges };
  }

  public async getAll(): Promise<{nodes: GraphNode[], edges: GraphEdge[]}> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    this.graph.forEachNode((nodeId, attributes) => {
      nodes.push({ id: nodeId, ...attributes } as GraphNode);
    });

    this.graph.forEachEdge((edgeId, attributes, source, target) => {
      edges.push({ sourceId: source, targetId: target, type: attributes.type });
    });

    return { nodes, edges };
  }
}
