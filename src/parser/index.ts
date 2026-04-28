import * as fs from 'fs';
import * as path from 'path';
import { GraphNode, GraphEdge } from '../graph/types';

export class ParserEngine {
  private parser: any;
  private tsParser: any;
  private pyParser: any;

  constructor() {
    const Parser = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const TypeScript = require('tree-sitter-typescript');
    const Python = require('tree-sitter-python');

    this.parser = new Parser();
    this.parser.setLanguage(JavaScript);

    this.tsParser = new Parser();
    this.tsParser.setLanguage(TypeScript.typescript || TypeScript);

    this.pyParser = new Parser();
    this.pyParser.setLanguage(Python);
  }

  public parseFile(filePath: string): { nodes: GraphNode[], edges: GraphEdge[] } {
    const ext = path.extname(filePath);
    let activeParser = this.parser;

    if (ext === '.ts' || ext === '.tsx') {
      activeParser = this.tsParser;
    } else if (ext === '.py') {
      activeParser = this.pyParser;
    } else if (ext === '.js' || ext === '.jsx') {
      activeParser = this.parser;
    } else {
      // Unsupported language
      return { nodes: [], edges: [] };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const tree = activeParser.parse(content);
      return this.extractGraph(tree.rootNode, filePath, content);
    } catch (err) {
      console.error(`Error parsing file ${filePath}:`, err);
      return { nodes: [], edges: [] };
    }
  }

  private extractGraph(rootNode: any, filePath: string, content: string) {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    const fileUri = `file://${filePath.replace(/\\/g, '/')}`;
    
    // Create the File node
    const fileNode: GraphNode = {
      id: fileUri,
      type: 'file',
      name: path.basename(filePath),
      uri: fileUri,
    };
    nodes.push(fileNode);

    // Simple manual traversal to find Imports, Classes, Functions
    this.traverseNode(rootNode, fileNode, nodes, edges, content);

    return { nodes, edges };
  }

  private traverseNode(node: any, fileNode: GraphNode, nodes: GraphNode[], edges: GraphEdge[], content: string) {
    // Detect Classes (TS/JS and Python)
    if (node.type === 'class_declaration' || node.type === 'class_definition') {
      const nameNode = node.children.find((c: any) => c.type === 'identifier');
      if (nameNode) {
        const className = nameNode.text;
        const classId = `${fileNode.id}#${className}`;
        
        nodes.push({
          id: classId,
          type: 'class',
          name: className,
          uri: fileNode.uri,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
        });

        // The file contains this class
        edges.push({
          sourceId: fileNode.id,
          targetId: classId,
          type: 'contains'
        });
      }
    }

    // Detect Functions
    if (node.type === 'function_declaration' || node.type === 'function_definition' || node.type === 'method_definition') {
      const nameNode = node.children.find((c: any) => c.type === 'identifier' || c.type === 'property_identifier');
      if (nameNode) {
        const funcName = nameNode.text;
        const funcId = `${fileNode.id}#${funcName}`;

        nodes.push({
          id: funcId,
          type: 'function',
          name: funcName,
          uri: fileNode.uri,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
        });

        edges.push({
          sourceId: fileNode.id,
          targetId: funcId,
          type: 'contains'
        });
      }
    }

    // Detect Imports
    if (node.type === 'import_statement' || node.type === 'import_from_statement') {
      const sourceNode = node.children.find((c: any) => c.type === 'string' || c.type === 'string_fragment' || c.type === 'string_content');
      if (sourceNode) {
         let importPath = sourceNode.text.replace(/['"]/g, '');
         const targetFileId = `file://${path.resolve(path.dirname(fileNode.uri.replace('file://', '')), importPath)}`;
         
         edges.push({
           sourceId: fileNode.id,
           targetId: targetFileId,
           type: 'imports'
         });
      }
    }

    // Recursively traverse children
    for (const child of node.children) {
      this.traverseNode(child, fileNode, nodes, edges, content);
    }
  }
}
