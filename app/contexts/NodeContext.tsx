import React, { createContext, useContext, ReactNode } from 'react';
import { Node, Edge, useNodesState, useEdgesState } from 'reactflow';
import { MIN_NODE_DISTANCE } from '../constants/wikipediaGame';

interface NodeData {
  label: string;
  isBold?: boolean;
  borderColor?: string;
}

interface EdgeData {
  actionType: string;
}

interface NodeContextType {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<NodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge<EdgeData>[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNodesChange: (changes: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdgesChange: (changes: any) => void;
  findValidPositions: (centerX: number, centerY: number, nodeCount: number, existingNodes: Node[]) => { x: number; y: number }[];
  isNeighborNode: (selectedNodeId: string, topic: string, nodes: Node[], edges: Edge<EdgeData>[], actionType: string) => boolean;
  getNeighboringTopics: (nodeId: string, nodes: Node[], edges: Edge<EdgeData>[], actionType: string) => string[];
  findWinningPath: (nodes: Node[], edges: Edge<EdgeData>[], endWord: string) => PathStep[];
}

interface PathStep {
  from: string;
  to: string;
  action: string;
}

const NodeContext = createContext<NodeContextType | undefined>(undefined);

// Helper function to calculate distance between two points
const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Helper function to check if a position would cause collision with existing nodes
const wouldCollide = (
  x: number,
  y: number,
  existingNodes: Node[],
  newNodes: Node[] = [],
  minDistance: number = MIN_NODE_DISTANCE
): boolean => {
  // Check collision with existing nodes
  const collidesWithExisting = existingNodes.some(
    (node) => distance(x, y, node.position.x, node.position.y) < minDistance
  );

  // Check collision with other new nodes being created
  const collidesWithNew = newNodes.some(
    (node) => distance(x, y, node.position.x, node.position.y) < minDistance
  );

  return collidesWithExisting || collidesWithNew;
};

// Helper function to check if a direction has enough space for all nodes
const checkDirectionSpace = (
  centerX: number,
  centerY: number,
  angle: number,
  nodeCount: number,
  existingNodes: Node[],
  minDistance: number = MIN_NODE_DISTANCE
): boolean => {
  const radius = minDistance * 1.2;
  
  for (let i = 0; i < nodeCount; i++) {
    const offset = (i - (nodeCount - 1) / 2) * radius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius + offset;
    
    if (wouldCollide(x, y, existingNodes, [], minDistance)) {
      return false;
    }
  }
  return true;
};

export const NodeProvider: React.FC<{ children: ReactNode; startWord: string }> = ({ children, startWord }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([
    {
      id: "0",
      type: "default",
      data: { label: startWord, isBold: false },
      position: { x: 0, y: 0 },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);

  const findValidPositions = (
    centerX: number,
    centerY: number,
    nodeCount: number,
    existingNodes: Node[],
  ): { x: number; y: number }[] => {
    const positions: { x: number; y: number }[] = [];
    const directions = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
    
    for (const angle of directions) {
      if (checkDirectionSpace(centerX, centerY, angle, nodeCount, existingNodes)) {
        const radius = MIN_NODE_DISTANCE * 1.2;
        
        for (let i = 0; i < nodeCount; i++) {
          const offset = (i - (nodeCount - 1) / 2) * radius;
          positions.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius + offset
          });
        }
        return positions;
      }
    }

    const placedNodes: Node[] = [];
    const baseRadius = MIN_NODE_DISTANCE * 1.2;
    let angle = 0;
    let radiusMultiplier = 1;
    let attemptsPerRadius = 8;

    while (positions.length < nodeCount) {
      for (let i = 0; i < attemptsPerRadius && positions.length < nodeCount; i++) {
        const x = centerX + Math.cos(angle) * (baseRadius * radiusMultiplier);
        const y = centerY + Math.sin(angle) * (baseRadius * radiusMultiplier);

        if (!wouldCollide(x, y, existingNodes, placedNodes)) {
          positions.push({ x, y });
          placedNodes.push({
            id: `temp-${positions.length}`,
            position: { x, y },
            data: { label: "" }
          });
        }

        angle += (2 * Math.PI) / attemptsPerRadius;
      }

      radiusMultiplier += 0.5;
      attemptsPerRadius += 4;
    }

    return positions;
  };

  const isNeighborNode = (
    selectedNodeId: string,
    topic: string,
    nodes: Node[],
    edges: Edge<EdgeData>[],
    actionType: string
  ): boolean => {
    const neighborEdges = edges.filter((edge) => edge.source === selectedNodeId && edge.data?.actionType === actionType);
    const neighborNodeIds = neighborEdges.map((edge) => edge.target);
    const neighborNodes = nodes.filter((node) =>
      neighborNodeIds.includes(node.id)
    );

    return neighborNodes.some(
      (node) => node.data.label.toLowerCase() === topic.toLowerCase()
    );
  };

  const getNeighboringTopics = (nodeId: string, nodes: Node[], edges: Edge<EdgeData>[], actionType: string): string[] => {
    const neighborEdges = edges.filter((edge) => edge.source === nodeId && edge.data?.actionType === actionType);
    const neighborNodeIds = neighborEdges.map((edge) => edge.target);
    return nodes
      .filter((node) => neighborNodeIds.includes(node.id))
      .map((node) => node.data.label);
  };

  const findWinningPath = (nodes: Node[], edges: Edge<EdgeData>[], endWord: string): PathStep[] => {
    const endNode = nodes.find(node => 
      node.data.label.toLowerCase().includes(endWord.toLowerCase())
    );
    if (!endNode) return [];

    const path: PathStep[] = [];
    let currentNode = endNode;
    
    while (currentNode) {
      const incomingEdges = edges.filter(edge => edge.target === currentNode.id);
      if (incomingEdges.length === 0) break;

      if (incomingEdges.length === 2) {
        const [edge1, edge2] = incomingEdges;
        const parent1 = nodes.find(n => n.id === edge1.source);
        const parent2 = nodes.find(n => n.id === edge2.source);
        if (parent1 && parent2) {
          path.unshift({
            from: `${parent1.data.label} and ${parent2.data.label}`,
            to: currentNode.data.label,
            action: "intersection"
          });
          currentNode = parent1;
          continue;
        }
      }

      const parentEdge = incomingEdges[0];
      const parentNode = nodes.find(n => n.id === parentEdge.source);
      if (!parentNode) break;

      path.unshift({
        from: parentNode.data.label,
        to: currentNode.data.label,
        action: parentEdge.data?.actionType || "unknown"
      });
      currentNode = parentNode;
    }

    return path;
  };

  const value = {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    findValidPositions,
    isNeighborNode,
    getNeighboringTopics,
    findWinningPath,
  };

  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>;
};

export const useNodes = () => {
  const context = useContext(NodeContext);
  if (context === undefined) {
    throw new Error('useNodes must be used within a NodeProvider');
  }
  return context;
}; 