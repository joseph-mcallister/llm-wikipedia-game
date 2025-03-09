"use client";

import React, { useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MarkerType,
} from "reactflow";
import { useLLM } from "../contexts/LLMContext";
import { useGameWords } from "../contexts/GameWordsContext";
import { useNodes } from "../contexts/NodeContext";
import {
  ActionType,
  ACTIONS,
  ACTION_COLORS,
} from "../constants/wikipediaGame";
import { generateResponse, parseResponse } from "../utils/llm";
import "reactflow/dist/style.css";

interface NodeData {
  label: string;
  isBold?: boolean;
  borderColor?: string;
}

interface PathStep {
  from: string;
  to: string;
  action: string;
}

interface EdgeData {
  actionType: ActionType;
}

export default function WikipediaGameBoard() {
  const { startWord, endWord } = useGameWords();
  const { engineInstance } = useLLM();
  const { 
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
  } = useNodes();
  
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [isIntersectionMode, setIsIntersectionMode] = useState(false);
  const [secondarySelectedNode, setSecondarySelectedNode] = useState<Node<NodeData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [winningPath, setWinningPath] = useState<PathStep[]>([]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (isIntersectionMode && selectedNode) {
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

  const copyPathToClipboard = () => {
    const pathText = winningPath.map(step => {
      if (step.action === "intersection") {
        return `Intersection of ${step.from} → ${step.to}`;
      }
      return `${step.from} → ${step.to} (${step.action})`;
    }).join("\n");
    
    navigator.clipboard.writeText(pathText);
  };

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

      topics = topics.filter(
        (topic) =>
          topic.toLowerCase() !== firstNode.data.label.toLowerCase() &&
          topic.toLowerCase() !== secondNode.data.label.toLowerCase() &&
          topic.trim().length > 0 &&
          !isNeighborNode(firstNode.id, topic, nodes, edges, 'intersection') &&
          !isNeighborNode(secondNode.id, topic, nodes, edges, 'intersection')
      );

      if (!topics.length) {
        throw new Error("No intersection topics generated");
      }

      const centerX = (firstNode.position.x + secondNode.position.x) / 2;
      const centerY = (firstNode.position.y + secondNode.position.y) / 2;

      const positions = findValidPositions(centerX, centerY, topics.length, nodes);

      const newNodes: Node[] = [];
      const timestamp = Date.now();

      topics.forEach((topic, index) => {
        const nodeId = `intersection-${timestamp}-${index}`;
        const position = positions[index];

        const newNode = {
          id: nodeId,
          data: { 
            label: topic, 
            isBold: true,
            borderColor: ACTION_COLORS.intersection
          },
          position,
          style: { 
            fontWeight: "bold",
            border: `2px solid ${ACTION_COLORS.intersection}`,
            borderRadius: '8px',
          },
        };

        newNodes.push(newNode);
      });

      const newEdges: Edge<EdgeData>[] = newNodes.flatMap((node) => [
        {
          id: `e-${firstNode.id}-${node.id}`,
          source: firstNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS.intersection },
          markerEnd: {
            type: MarkerType.Arrow,
            color: ACTION_COLORS.intersection,
          },
          data: { actionType: 'intersection' },
        },
        {
          id: `e-${secondNode.id}-${node.id}`,
          source: secondNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS.intersection },
          markerEnd: {
            type: MarkerType.Arrow,
            color: ACTION_COLORS.intersection,
          },
          data: { actionType: 'intersection' },
        },
      ]);

      setNodes((nodes) => {
        const unbolded = nodes.map((node) => ({
          ...node,
          data: { ...node.data, isBold: false, borderColor: undefined },
          style: { fontWeight: "normal", border: 'none', padding: '8px' },
        }));
        return [...unbolded, ...newNodes];
      });
      
      setEdges((edges) => [...edges, ...newEdges]);

      if (topics.some((topic) => topic.toLowerCase().includes(endWord.toLowerCase()))) {
        setHasWon(true);
        const updatedNodes = [...nodes, ...newNodes];
        const updatedEdges = [...edges, ...newEdges];
        const path = findWinningPath(updatedNodes, updatedEdges, endWord);
        setWinningPath(path);
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

      const neighboringTopics = getNeighboringTopics(selectedNode.id, nodes, edges, actionType);
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

        topics = topics.filter(
          (topic) =>
            topic.toLowerCase() !== selectedNode.data.label.toLowerCase() &&
            topic.trim().length > 0 &&
            !isNeighborNode(selectedNode.id, topic, nodes, edges, actionType)
        );

        if (!topics.length) {
          throw new Error("No topics generated");
        }

        setNodes((nodes) =>
          nodes.map((node) => ({
            ...node,
            data: { ...node.data, isBold: false, borderColor: undefined },
            style: { fontWeight: "normal", border: 'none' },
          }))
        );

        const positions = findValidPositions(
          selectedNode.position.x,
          selectedNode.position.y,
          topics.length,
          nodes
        );

        const newNodes: Node[] = [];
        const timestamp = Date.now();

        topics.forEach((topic, index) => {
          const nodeId = `${selectedNode.id}-${actionType}-${timestamp}-${index}`;
          const position = positions[index];

          const newNode = {
            id: nodeId,
            data: { 
              label: topic, 
              isBold: true,
              borderColor: ACTION_COLORS[actionType]
            },
            position,
            style: { 
              fontWeight: "bold",
              border: `2px solid ${ACTION_COLORS[actionType]}`,
              borderRadius: '8px',
            },
          };

          newNodes.push(newNode);
        });

        const newEdges: Edge<EdgeData>[] = newNodes.map((node) => ({
          id: `e-${selectedNode.id}-${node.id}`,
          source: selectedNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS[actionType] },
          markerEnd: {
            type: MarkerType.Arrow,
            color: ACTION_COLORS[actionType],
          },
          data: { actionType },
        }));

        setNodes((nodes) => [...nodes, ...newNodes]);
        setEdges((edges) => [...edges, ...newEdges]);

        if (
          topics.some((topic) =>
            topic.toLowerCase().includes(endWord.toLowerCase())
          )
        ) {
          setHasWon(true);
          const updatedNodes = [...nodes, ...newNodes];
          const updatedEdges = [...edges, ...newEdges];
          const path = findWinningPath(updatedNodes, updatedEdges, endWord);
          setWinningPath(path);
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
        <div className="text-2xl text-white mb-8">
          {hasWon ? (
            <>
              <div>🎉 Congratulations! You found a path from <span className="font-bold text-cyan-400">{startWord}</span> to <span className="font-bold text-pink-400">{endWord}</span>! 🎉</div>
              <div className="mt-4 bg-gray-800 p-4 rounded-lg mx-auto max-w-2xl">
                {winningPath.map((step, index) => (
                  <div key={index} className="text-left mb-2 text-sm">
                    {step.action === "intersection" ? (
                      <span>Intersection of <b>{step.from}</b> → <b>{step.to}</b></span>
                    ) : (
                      <span><b>{step.from}</b> ({step.action}) → <b>{step.to}</b></span>
                    )}
                  </div>
                ))}
                <button 
                  onClick={copyPathToClipboard}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Copy Path to Clipboard
                </button>
              </div>
            </>
          ) : (
            <>
              Find a path from <span className="font-bold text-cyan-400">{startWord}</span> to{" "}
              <span className="font-bold text-pink-400">{endWord}</span>
              {" by tapping a topic"}
            </>
          )}
        </div>
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

        {selectedNode && !loading && (
          <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50">
            <h3 className="text-lg mb-2 text-gray-900">
              {isIntersectionMode ? (
                <>Select a second node to intersect with &quot;{selectedNode.data.label}&quot;</>
              ) : (
                <>Actions for &quot;{selectedNode.data.label}&quot;</>
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
