'use client';

import React, { useState, useCallback } from 'react';
import { 
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam
} from "@mlc-ai/web-llm";
import ReactFlow, { 
  Node, 
  Edge, 
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import { useLLM } from '../contexts/LLMContext';
import 'reactflow/dist/style.css';

type ActionType = 'expand' | 'opposite' | 'deeper' | 'broader' | 'timeForward' | 'timeBackward' | 'surprise' | 'people' | 'places' | 'good' | 'evil';

interface NodeData {
  label: string;
}

const ACTIONS: { type: ActionType; label: string; prompt: string; }[] = [
  { 
    type: 'expand', 
    label: 'Expand',
    prompt: 'Respond ONLY with {n} closely related topics to "{topic}", as a comma-separated list with no other text or punctuation. Example format: topic1, topic2, topic3, topic4. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'people', 
    label: 'People',
    prompt: 'Respond ONLY with {n} notable people closely associated with "{topic}", as a comma-separated list with no other text or punctuation. Example format: person1, person2, person3, person4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'places', 
    label: 'Places',
    prompt: 'Respond ONLY with {n} significant places related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'good', 
    label: 'Good',
    prompt: 'Respond ONLY with {n} "good" (as in opposite of evil) things related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'evil', 
    label: 'Evil',
    prompt: 'Respond ONLY with {n} "evil" things related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: place1, place2, place3, place4. DO NOT RESPOND WITH MORE THAN {n} TOPICS.'
  },
  { 
    type: 'opposite', 
    label: 'Opposite of',
    prompt: 'Respond ONLY with {n} conceptual opposites of "{topic}", as a comma-separated list with no other text or punctuation. Example format: opposite1, opposite2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'deeper', 
    label: 'Go deeper',
    prompt: 'Respond ONLY with {n} more specific subtopics of "{topic}", as a comma-separated list with no other text or punctuation. Example format: subtopic1, subtopic2, subtopic3. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'broader', 
    label: 'Go broader',
    prompt: 'Respond ONLY with {n} broader topics that encompass "{topic}", as a comma-separated list with no other text or punctuation. Example format: broader1, broader2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'timeForward', 
    label: 'Time →',
    prompt: 'Respond ONLY with {n} future developments related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: future1, future2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'timeBackward', 
    label: 'Time ←',
    prompt: 'Respond ONLY with {n} historical aspects of "{topic}", as a comma-separated list with no other text or punctuation. Example format: past1, past2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
  { 
    type: 'surprise', 
    label: 'Surprise me',
    prompt: 'Respond ONLY with {n} surprising topic tangentially related to "{topic}", as a comma-separated list with no other text or punctuation. Example format: surprise1, surprise2. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
  },
];

const ACTION_COLORS: Record<ActionType, string> = {
  expand: '#4CAF50',      // Green
  opposite: '#F44336',    // Red
  deeper: '#2196F3',      // Blue
  broader: '#9C27B0',     // Purple
  timeForward: '#FF9800', // Orange
  timeBackward: '#795548',// Brown
  surprise: '#E91E63',    // Pink
  people: '#00BCD4',      // Cyan
  places: '#FFEB3B',      // Yellow
  good: '#8BC34A',        // Light Green
  evil: '#607D8B',        // Blue Grey
};

const generateResponse = async (
  engineInstance: NonNullable<ReturnType<typeof useLLM>['engineInstance']>,
  prompt: string
) => {
  try {
    // Format the prompt as a chat message
    const messages: (ChatCompletionSystemMessageParam | ChatCompletionUserMessageParam)[] = [
      { role: "system", content: "You are an AI that ONLY responds with comma-separated values, with no other text or punctuation. Never include explanations or additional formatting." },
      { role: "user", content: prompt }
    ];

    // Generate response
    const response = await engineInstance.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 100
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('WebLLM error:', error);
    throw error;
  }
};

const MIN_NODE_DISTANCE = 100; // Minimum distance between nodes
const MAX_PLACEMENT_ATTEMPTS = 50; // Maximum number of attempts to place a node

// Helper function to calculate distance between two points
const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

// Helper function to check if a position would cause collision with existing nodes
const wouldCollide = (x: number, y: number, existingNodes: Node[], newNodes: Node[] = [], minDistance: number = MIN_NODE_DISTANCE): boolean => {
  // Check collision with existing nodes
  const collidesWithExisting = existingNodes.some(node => 
    distance(x, y, node.position.x, node.position.y) < minDistance
  );
  
  // Check collision with other new nodes being created
  const collidesWithNew = newNodes.some(node =>
    distance(x, y, node.position.x, node.position.y) < minDistance
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
  const angle = (Math.PI * 2 * attempt) / MAX_PLACEMENT_ATTEMPTS + Math.random() * 0.5;
  
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
  return findValidPosition(centerX, centerY, existingNodes, newNodes, attempt + 1);
};

const isNeighborNode = (selectedNodeId: string, topic: string, nodes: Node[], edges: Edge[]): boolean => {
  // Find all nodes connected to the selected node
  const neighborEdges = edges.filter(edge => edge.source === selectedNodeId);
  const neighborNodeIds = neighborEdges.map(edge => edge.target);
  const neighborNodes = nodes.filter(node => neighborNodeIds.includes(node.id));
  
  // Check if any neighbor node has the same topic (case insensitive)
  return neighborNodes.some(node => 
    node.data.label.toLowerCase() === topic.toLowerCase()
  );
};

export default function WikipediaGameBoard() {
  const { engineInstance } = useLLM();
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([{
    id: '0',
    type: 'default',
    data: { label: 'USA' },
    position: { x: 0, y: 0 },
  }]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const parseResponse = (response: unknown, maxTopics: number): string[] => {
    try {
      // Handle array response
      if (Array.isArray(response)) {
        const text = response[0]?.generated_text || '';
        return text.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0).slice(0, maxTopics);
      }
      
      // Handle string response
      if (typeof response === 'string') {
        return response.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0).slice(0, maxTopics);
      }
      
      // Handle object response
      if (response && typeof response === 'object' && 'generated_text' in response) {
        const text = (response as { generated_text: string }).generated_text;
        return text.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0).slice(0, maxTopics);
      }
      
      return [];
    } catch (err) {
      console.error('Parse error:', err);
      return [];
    }
  };

  const handleAction = async (actionType: ActionType) => {
    if (!selectedNode || !engineInstance) return;

    try {
      setLoading(true);
      setError(null);

      const action = ACTIONS.find(a => a.type === actionType);
      if (!action) return;

      const maxTopics = 4;

      const prompt = action.prompt.replace('{topic}', selectedNode.data.label).replaceAll('{n}', maxTopics.toString());
      console.log('Sending prompt:', prompt);
      
      try {
        const result = await generateResponse(engineInstance, prompt);
        console.log('Raw LLM result:', result);
        
        let topics = parseResponse(result, maxTopics);
        console.log('Extracted topics:', topics);
        
        // Filter out the selected node's label and any topics that are already neighbors
        topics = topics.filter(topic => 
          topic.toLowerCase() !== selectedNode.data.label.toLowerCase() && 
          topic.trim().length > 0 &&
          !isNeighborNode(selectedNode.id, topic, nodes, edges)
        );

        if (!topics.length) {
          throw new Error('No topics generated');
        }

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
            data: { label: topic },
            position,
          };
          
          newNodes.push(newNode);
        }

        const newEdges: Edge[] = newNodes.map(node => ({
          id: `e-${selectedNode.id}-${node.id}`,
          source: selectedNode.id,
          target: node.id,
          style: { stroke: ACTION_COLORS[actionType] },
        }));

        setNodes(nodes => [...nodes, ...newNodes]);
        setEdges(edges => [...edges, ...newEdges]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate response');
      }
    } finally {
      setLoading(false);
      setSelectedNode(null);
    }
  };

  return (
    <div className="w-full h-[80vh] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Action Menu */}
      {selectedNode && (
        <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border z-50">
          <h3 className="text-lg font-semibold mb-2 text-gray-900">Actions for &quot;{selectedNode.data.label}&quot;</h3>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map(action => (
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
  );
} 