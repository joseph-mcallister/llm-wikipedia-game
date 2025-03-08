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

type ActionType = 'expand' | 'opposite' | 'deeper' | 'broader' | 'timeForward' | 'timeBackward' | 'surprise';

interface NodeData {
  label: string;
}

const ACTIONS: { type: ActionType; label: string; prompt: string; }[] = [
  { 
    type: 'expand', 
    label: 'Expand',
    prompt: 'Respond ONLY with {n} closely related topics to "{topic}", as a comma-separated list with no other text or punctuation. Example format: topic1, topic2, topic3. DO NOT RESPOND WITH MORE THAN {n} TOPICS or include the topic itself.'
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
    console.log('Response:', response);

    return response.choices[0].message.content;
  } catch (error) {
    console.error('WebLLM error:', error);
    throw error;
  }
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

      const maxTopics = 3;

      const prompt = action.prompt.replace('{topic}', selectedNode.data.label).replaceAll('{n}', maxTopics.toString());
      console.log('Sending prompt:', prompt);
      
      try {
        const result = await generateResponse(engineInstance, prompt);
        console.log('Raw LLM result:', result);
        
        const topics = parseResponse(result, maxTopics);
        console.log('Extracted topics:', topics);
        
        if (!topics.length) {
          throw new Error('No topics found in response');
        }

        // Create new nodes and edges
        const newNodes: Node[] = topics.map((topic, index) => ({
          id: `${selectedNode.id}-${actionType}-${index}`,
          data: { label: topic },
          position: {
            x: (selectedNode.position.x || 0) + Math.cos(index * (2 * Math.PI / topics.length)) * 200,
            y: (selectedNode.position.y || 0) + Math.sin(index * (2 * Math.PI / topics.length)) * 200,
          },
        }));

        const newEdges: Edge[] = newNodes.map(node => ({
          id: `e-${selectedNode.id}-${node.id}`,
          source: selectedNode.id,
          target: node.id,
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
          <h3 className="text-lg font-semibold mb-2">Actions for &quot;{selectedNode.data.label}&quot;</h3>
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
          <div className="text-red-600">Error: {error}</div>
        </div>
      )}
    </div>
  );
} 