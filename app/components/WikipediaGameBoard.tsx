"use client";

import React, { useState, useCallback } from "react";
import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "@mlc-ai/web-llm";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from "reactflow";
import { useLLM } from "../contexts/LLMContext";
import {
  ActionType,
  ACTIONS,
  ACTION_COLORS,
  MIN_NODE_DISTANCE,
  MAX_PLACEMENT_ATTEMPTS,
} from "../constants/wikipediaGame";
import "reactflow/dist/style.css";

interface NodeData {
  label: string;
  isBold?: boolean;
}

const generateResponse = async (
  engineInstance: NonNullable<ReturnType<typeof useLLM>["engineInstance"]>,
  prompt: string
) => {
  try {
    // Format the prompt as a chat message
    const messages: (
      | ChatCompletionSystemMessageParam
      | ChatCompletionUserMessageParam
    )[] = [
      {
        role: "system",
        content:
          "You are an AI that ONLY responds with comma-separated values, with no other text or punctuation. Never include explanations or additional formatting.",
      },
      { role: "user", content: prompt },
    ];

    // Generate response
    const response = await engineInstance.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 100,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("WebLLM error:", error);
    throw error;
  }
};

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
  const radius = minDistance * 1.2; // Slightly larger than minimum to ensure no overlap
  
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

// Helper function to find valid positions for a group of nodes
const findValidPositions = (
  centerX: number,
  centerY: number,
  nodeCount: number,
  existingNodes: Node[],
): { x: number; y: number }[] => {
  const positions: { x: number; y: number }[] = [];
  const directions = [0, Math.PI/2, Math.PI, 3*Math.PI/2]; // Try right, down, left, up
  
  // First try to find a direction where all nodes fit
  for (const angle of directions) {
    if (checkDirectionSpace(centerX, centerY, angle, nodeCount, existingNodes)) {
      const radius = MIN_NODE_DISTANCE * 1.2;
      
      // Place all nodes in this direction
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

  // If no direction fits all nodes, use spiral placement
  const placedNodes: Node[] = [];
  const baseRadius = MIN_NODE_DISTANCE * 1.2;
  let angle = 0;
  let radiusMultiplier = 1;
  let attemptsPerRadius = 8;

  while (positions.length < nodeCount) {
    // Try positions in a spiral pattern
    for (let i = 0; i < attemptsPerRadius && positions.length < nodeCount; i++) {
      const x = centerX + Math.cos(angle) * (baseRadius * radiusMultiplier);
      const y = centerY + Math.sin(angle) * (baseRadius * radiusMultiplier);

      // Check if this position would collide with any existing nodes or already placed nodes
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

    // Increase radius and number of attempts for next spiral
    radiusMultiplier += 0.5;
    attemptsPerRadius += 4;
  }

  return positions;
};

const isNeighborNode = (
  selectedNodeId: string,
  topic: string,
  nodes: Node[],
  edges: Edge[]
): boolean => {
  // Find all nodes connected to the selected node
  const neighborEdges = edges.filter((edge) => edge.source === selectedNodeId);
  const neighborNodeIds = neighborEdges.map((edge) => edge.target);
  const neighborNodes = nodes.filter((node) =>
    neighborNodeIds.includes(node.id)
  );

  // Check if any neighbor node has the same topic (case insensitive)
  return neighborNodes.some(
    (node) => node.data.label.toLowerCase() === topic.toLowerCase()
  );
};

// Helper function to get neighboring topics
const getNeighboringTopics = (nodeId: string, nodes: Node[], edges: Edge[]): string[] => {
  const neighborEdges = edges.filter((edge) => edge.source === nodeId);
  const neighborNodeIds = neighborEdges.map((edge) => edge.target);
  return nodes
    .filter((node) => neighborNodeIds.includes(node.id))
    .map((node) => node.data.label);
};

export default function WikipediaGameBoard() {
  // const START_WORD = "USA";
  // const TARGET_WORD = "Satya Nadella";
  const START_WORD = "Egyptian pyramids";
  const TARGET_WORD = "Joe Rogan";

  const { engineInstance } = useLLM();
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([
    {
      id: "0",
      type: "default",
      data: { label: START_WORD, isBold: false },
      position: { x: 0, y: 0 },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [isIntersectionMode, setIsIntersectionMode] = useState(false);
  const [secondarySelectedNode, setSecondarySelectedNode] = useState<Node<NodeData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (isIntersectionMode && selectedNode) {
      // Don't allow selecting the same node
      if (node.id === selectedNode.id) {
        return;
      }
      setSecondarySelectedNode(node);
      handleIntersection(selectedNode, node);
    } else {
      setSelectedNode(node);
      setSecondarySelectedNode(null);
    }
  }, [isIntersectionMode, selectedNode]);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSecondarySelectedNode(null);
    setIsIntersectionMode(false);
  }, []);

  // Add new function to handle intersection
  const handleIntersection = async (firstNode: Node<NodeData>, secondNode: Node<NodeData>) => {
    if (!engineInstance) return;

    try {
      setLoading(true);
      setError(null);

      const maxTopics = 4;
      const action = ACTIONS.find((a) => a.type === 'intersection');
      if (!action) return;

      const prompt = action.prompt
        .replace("{topic1}", firstNode.data.label)
        .replace("{topic2}", secondNode.data.label)
        .replace("{n}", maxTopics.toString());

      console.log("Sending intersection prompt:", prompt);

      const result = await generateResponse(engineInstance, prompt);
      let topics = parseResponse(result, maxTopics);

      // Filter out topics that are the same as either selected node or are already neighbors
      topics = topics.filter(
        (topic) =>
          topic.toLowerCase() !== firstNode.data.label.toLowerCase() &&
          topic.toLowerCase() !== secondNode.data.label.toLowerCase() &&
          topic.trim().length > 0 &&
          !isNeighborNode(firstNode.id, topic, nodes, edges) &&
          !isNeighborNode(secondNode.id, topic, nodes, edges)
      );

      if (!topics.length) {
        throw new Error("No intersection topics generated");
      }

      // Calculate midpoint between the two nodes for new node placement
      const centerX = (firstNode.position.x + secondNode.position.x) / 2;
      const centerY = (firstNode.position.y + secondNode.position.y) / 2;

      // Get positions for all new nodes
      const positions = findValidPositions(centerX, centerY, topics.length, nodes);

      // Create new nodes and edges
      const newNodes: Node[] = [];
      const timestamp = Date.now();

      topics.forEach((topic, index) => {
        const nodeId = `intersection-${timestamp}-${index}`;
        const position = positions[index];

        const newNode = {
          id: nodeId,
          data: { label: topic, isBold: true },
          position,
          style: { fontWeight: "bold" },
        };

        newNodes.push(newNode);
      });

      const newEdges: Edge[] = newNodes.flatMap((node) => [
        {
          id: `e-${firstNode.id}-${node.id}`,
          source: firstNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS.intersection },
        },
        {
          id: `e-${secondNode.id}-${node.id}`,
          source: secondNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS.intersection },
        },
      ]);

      setNodes((nodes) => {
        // First unbold all nodes
        const unbolded = nodes.map((node) => ({
          ...node,
          data: { ...node.data, isBold: false },
          style: { fontWeight: "normal" },
        }));
        // Then add new nodes
        return [...unbolded, ...newNodes];
      });
      
      setEdges((edges) => [...edges, ...newEdges]);

      // Check if any of the new nodes contains the target word
      if (topics.some((topic) => topic.toLowerCase().includes(TARGET_WORD.toLowerCase()))) {
        setHasWon(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate intersection");
    } finally {
      setLoading(false);
      setSelectedNode(null);
      setSecondarySelectedNode(null);
      setIsIntersectionMode(false);
    }
  };

  const handleAction = async (actionType: ActionType) => {
    if (!selectedNode || !engineInstance) return;

    if (actionType === 'intersection') {
      setIsIntersectionMode(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const action = ACTIONS.find((a) => a.type === actionType);
      if (!action) return;

      const maxTopics = 4;

      // Get existing neighboring topics
      const neighboringTopics = getNeighboringTopics(selectedNode.id, nodes, edges);
      const existingTopicsStr = neighboringTopics.length 
        ? `You have already generated these topics: ${neighboringTopics.join(", ")}. Generate new topics.` 
        : "";

      const prompt = action.prompt
        .replace("{topic}", selectedNode.data.label)
        .replaceAll("{n}", maxTopics.toString())
        + " " + existingTopicsStr;

      console.log("Sending prompt:", prompt);

      try {
        const result = await generateResponse(engineInstance, prompt);
        console.log("Raw LLM result:", result);

        let topics = parseResponse(result, maxTopics);
        console.log("Extracted topics:", topics);

        // Filter out the selected node's label and any topics that are already neighbors
        topics = topics.filter(
          (topic) =>
            topic.toLowerCase() !== selectedNode.data.label.toLowerCase() &&
            topic.trim().length > 0 &&
            !isNeighborNode(selectedNode.id, topic, nodes, edges)
        );

        if (!topics.length) {
          throw new Error("No topics generated");
        }

        // First, unbold all existing nodes
        setNodes((nodes) =>
          nodes.map((node) => ({
            ...node,
            data: { ...node.data, isBold: false },
            style: { fontWeight: "normal" },
          }))
        );

        // Get positions for all new nodes
        const positions = findValidPositions(
          selectedNode.position.x,
          selectedNode.position.y,
          topics.length,
          nodes
        );

        // Create new nodes and edges
        const newNodes: Node[] = [];
        const timestamp = Date.now();

        topics.forEach((topic, index) => {
          const nodeId = `${selectedNode.id}-${actionType}-${timestamp}-${index}`;
          const position = positions[index];

          const newNode = {
            id: nodeId,
            data: { label: topic, isBold: true },
            position,
            style: { fontWeight: "bold" },
          };

          newNodes.push(newNode);
        });

        const newEdges: Edge[] = newNodes.map((node) => ({
          id: `e-${selectedNode.id}-${node.id}`,
          source: selectedNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS[actionType] },
        }));

        setNodes((nodes) => [...nodes, ...newNodes]);
        setEdges((edges) => [...edges, ...newEdges]);

        // Check if any of the new nodes contains the target word
        if (
          topics.some((topic) =>
            topic.toLowerCase().includes(TARGET_WORD.toLowerCase())
          )
        ) {
          setHasWon(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate response"
        );
      }
    } finally {
      setLoading(false);
      setSelectedNode(null);
    }
  };

  const parseResponse = (response: unknown, maxTopics: number): string[] => {
    try {
      // Helper to capitalize first letter
      const capitalize = (str: string) =>
        str.charAt(0).toUpperCase() + str.slice(1);

      // Handle array response
      if (Array.isArray(response)) {
        const text = response[0]?.generated_text || "";
        return text
          .split(",")
          .map((item: string) => capitalize(item.trim()))
          .filter((item: string) => item.length > 0)
          .slice(0, maxTopics);
      }

      // Handle string response
      if (typeof response === "string") {
        return response
          .split(",")
          .map((item: string) => capitalize(item.trim()))
          .filter((item: string) => item.length > 0)
          .slice(0, maxTopics);
      }

      // Handle object response
      if (
        response &&
        typeof response === "object" &&
        "generated_text" in response
      ) {
        const text = (response as { generated_text: string }).generated_text;
        return text
          .split(",")
          .map((item: string) => capitalize(item.trim()))
          .filter((item: string) => item.length > 0)
          .slice(0, maxTopics);
      }

      return [];
    } catch (err) {
      console.error("Parse error:", err);
      return [];
    }
  };

  return (
    <div>
      <div className="top-0 left-0 right-0 text-center z-50 mb-8">
        <p className="text-2xl text-white mb-8">
          {hasWon ? (
            <>🎉 Congratulations! You found a path from <span className="font-bold text-cyan-400">{START_WORD}</span> to <span className="font-bold text-pink-400">{TARGET_WORD}</span>! 🎉</>
          ) : (
            <>
              Find a path from <span className="font-bold text-cyan-400">{START_WORD}</span> to{" "}
              <span className="font-bold text-pink-400">{TARGET_WORD}</span>
            </>
          )}
        </p>
      </div>

      <div className="w-full h-[80vh] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Action Menu */}
        {selectedNode && !loading && (
          <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              {isIntersectionMode ? (
                <>Select a second node</>
              ) : (
                <>Actions for "{selectedNode.data.label}"</>
              )}
            </h3>
            {!isIntersectionMode && (
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleAction(action.type)}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    disabled={loading}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            {isIntersectionMode && (
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setIsIntersectionMode(false);
                    setSecondarySelectedNode(null);
                  }}
                  className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Cancel Intersection
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading and Error States */}
        {loading && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
            <div className="text-gray-600">Loading...</div>
          </div>
        )}
        {error && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
            <div className="text-red-600">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
