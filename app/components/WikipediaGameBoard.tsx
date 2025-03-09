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

// Helper function to find a valid position for a new node
const findValidPosition = (
  centerX: number,
  centerY: number,
  existingNodes: Node[],
  newNodes: Node[] = [],
  attempt: number = 0
): { x: number; y: number } => {
  // On each attempt, increase the radius to search in a wider area
  const radius = MIN_NODE_DISTANCE * (1 + attempt * 0.2);
  const angle =
    (Math.PI * 2 * attempt) / MAX_PLACEMENT_ATTEMPTS + Math.random() * 0.5;

  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;

  if (attempt >= MAX_PLACEMENT_ATTEMPTS) {
    // If we've tried too many times, just return this position
    return { x, y };
  }

  if (!wouldCollide(x, y, existingNodes, newNodes)) {
    return { x, y };
  }

  // Try again with an increased radius
  return findValidPosition(
    centerX,
    centerY,
    existingNodes,
    newNodes,
    attempt + 1
  );
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
  const { engineInstance } = useLLM();
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([
    {
      id: "0",
      type: "default",
      data: { label: "USA", isBold: false },
      position: { x: 0, y: 0 },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);

  const START_WORD = "USA";
  const TARGET_WORD = "Satya Nadella";

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

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

  const handleAction = async (actionType: ActionType) => {
    if (!selectedNode || !engineInstance) return;

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

        // Create new nodes and edges, skipping any that would create duplicate IDs
        const newNodes: Node[] = [];
        const timestamp = Date.now();

        for (const topic of topics) {
          const nodeId = `${selectedNode.id}-${actionType}-${timestamp}-${newNodes.length}`;

          // Find a valid position for the new node, considering both existing and new nodes
          const position = findValidPosition(
            selectedNode.position.x || 0,
            selectedNode.position.y || 0,
            nodes,
            newNodes
          );

          const newNode = {
            id: nodeId,
            data: { label: topic, isBold: true },
            position,
            style: { fontWeight: "bold" },
          };

          newNodes.push(newNode);
        }

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
              Actions for &quot;{selectedNode.data.label}&quot;
            </h3>
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
