export interface GraphNode {
  id: string; // E.g., file:///path/to/file.ts or file:///path/to/file.ts#MyClass
  type: 'file' | 'class' | 'function' | 'variable';
  name: string;
  uri: string;
  startLine?: number;
  endLine?: number;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  type: 'imports' | 'contains' | 'calls' | 'extends';
}
