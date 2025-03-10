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
import { generateResponseWithMLC, generateResponseWithWllama, parseResponse } from "../utils/llm";
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
  const { engineInstance, wllamaInstance } = useLLM();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);
  const [winningPath, setWinningPath] = useState<PathStep[]>([]);

  const generateResponse = async (prompt: string) => {
    if (engineInstance) {
      const result = await generateResponseWithMLC(engineInstance, prompt);
      return result;
    } else if (wllamaInstance) {
      const result = await generateResponseWithWllama(wllamaInstance, prompt);
      return result;
    } else {
      throw new Error("LLM not initialized");
    }
  }

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const copyPathToClipboard = () => {
    const pathText = winningPath.map(step => {
      return `${step.from} → ${step.to} (${step.action})`;
    }).join("\n");
    const nodeCount = nodes.length;
    const message = `Found a path from ${startWord} to ${endWord} in ${nodeCount} generated topics! \n${pathText}`;
    navigator.clipboard.writeText(message);
  };

  const handleAction = async (actionType: ActionType) => {
    if (!selectedNode) return;

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
        const result = await generateResponse(prompt);

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

  const handleReset = useCallback(() => {
    // Reset to initial state
    setNodes((nodes) => nodes.filter(node => !node.id.includes('-')));
    setEdges([]);
    setSelectedNode(null);
    setHasWon(false);
    setWinningPath([]);
    setError(null);
  }, []);

  return (
    <div>
      <div className="top-0 left-0 right-0 text-center z-50 mb-8">
        <div className="text-2xl text-white mb-8">
          {hasWon ? (
            <>
              <div>🎉 Congratulations! You found a path from <span className="font-bold text-cyan-400">{startWord}</span> to <span className="font-bold text-pink-400">{endWord}</span>! 🎉</div>
              <div className="text-md mt-2">Come back tomorrow for another game!</div>
              <div className="mt-4 bg-gray-800 p-4 rounded-lg mx-auto max-w-2xl">
                <div className="text-left mb-2 text-sm">Found in <b>{nodes.length}</b> generated topics!</div>
                {winningPath.map((step, index) => (
                  <div key={index} className="text-left mb-2 text-sm">
                    <span><b>{step.from}</b> ({step.action}) → <b>{step.to}</b></span>
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

      <div className="mt-4 text-center">
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Reset Board
        </button>
      </div>
    </div>
  );
}
