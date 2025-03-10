"use client";

import { useState, useCallback } from 'react';
import { useLLM } from '../contexts/LLMContext';
import { IModel, MODELS, createMLCEngineInstance, createWllamaInstance, generateResponseWithMLC, generateResponseWithWllama } from '../utils/llm';
import { ActionType } from '../constants/wikipediaGame';

const isLocalhost = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
  return false;
};

interface OllamaResponse {
    response: string;
}

interface LLMJudgeResponse {
    score: number;
}

interface TestCaseInput {
    actionType: ActionType;
    node: string;
}

interface TestCaseWithResponse extends TestCaseInput {
    response: string;
}

interface TestCaseWithScore extends TestCaseWithResponse {
    score: number;
}

const testCases: TestCaseInput[] = [
    {
        actionType: "broader",
        node: "AI",
    },
    {
        actionType: "deeper",
        node: "History",
    },
]

const callJudge = async (testCase: TestCaseWithResponse): Promise<LLMJudgeResponse> => {
  // Only allow this on localhost for security
  if (!isLocalhost()) {
    throw new Error("Judge endpoint only available on localhost");
  }

  const judgeModel = "llama3.1:8b"
  
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: judgeModel,
        stream: false,
        prompt: `You are a judge evaluating the quality of an AI response.
Given prompt: "${testCase.actionType} ${testCase.node}"
AI response: "${testCase.response}"

Rate the response from 0-10 where:
0 = Completely wrong or irrelevant
5 = Partially correct/relevant
10 = Perfect response

Respond with ONLY a number between 0-10.`
      })
    });

    const data = await ollamaResponse.json() as OllamaResponse;
    const scoreText = data.response.trim();
    const score = parseFloat(scoreText);

    if (isNaN(score) || score < 0 || score > 10) {
      throw new Error("Invalid score returned from judge");
    }

    return { score };
  } catch (error) {
    console.error('Error calling judge:', error);
    return { score: 0 };
  }
}

export default function EvalPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>(MODELS[0].id);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseWithScore[]>([]);
  const { engineInstance, setEngineInstance, wllamaInstance, setWllamaInstance } = useLLM();
  

  const loadModel = async (selectedModel: IModel) => {
    setIsLoading(true);

    try {
      if (selectedModel.type === "mlc") {
        const engine = await createMLCEngineInstance(selectedModel, (report) => {
          console.log(`Loading ${selectedModel.name}: ${Math.round(report.progress * 100)}%`);
        });
        setEngineInstance(engine);
      } else if (selectedModel.type === "wllama") {
        const engine = await createWllamaInstance(selectedModel, (report) => {
          console.log(`Loading ${selectedModel.name}: ${Math.round(report.loaded / report.total * 100)}%`);
        });
        setWllamaInstance(engine);
      }

      // Test the model with a simple prompt
      const testPrompt = "Hello, how are you?";
      let result;
      if (selectedModel.type === "mlc" && engineInstance) {
        console.log("Generating with MLC");
        console.log(engineInstance);
        result = await generateResponseWithMLC(engineInstance, testPrompt);
      } else if (selectedModel.type === "wllama" && wllamaInstance) {
        result = await generateResponseWithWllama(wllamaInstance, testPrompt);
      }
      console.log("Test response:", result);
      if (result) {
        setResponse(result);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleRunEval = async () => {
    const selectedModel = MODELS.find(model => model.id === selectedModelId);
    if (!selectedModel) return;

    if (!engineInstance && !wllamaInstance) {
        await loadModel(selectedModel);
    }
    
    for (const testCase of testCases) {
        let modelOutput: string | undefined | null = undefined;
        const prompt = `${testCase.actionType} ${testCase.node}`;
        console.log("Testing prompt:", prompt);
        
        try {
          if (selectedModel?.type === "mlc" && engineInstance) {
              modelOutput = await generateResponseWithMLC(engineInstance, prompt);
          } else if (selectedModel?.type === "wllama" && wllamaInstance) {
              modelOutput = await generateResponseWithWllama(wllamaInstance, prompt);
          } else {
              console.error("No valid engine available");
              continue;
          }
          console.log("Model output:", modelOutput);
          if (modelOutput) {
            const judgeResponse = await callJudge({...testCase, response: modelOutput});
            console.log("Judge response:", judgeResponse);
            setTestResults(prev => [...prev, {
              ...testCase,
              response: modelOutput!,
              score: judgeResponse.score
            }]);
          }
        } catch (error) {
          console.error("Error during evaluation:", error);
        }
    }
  }

  return (
    <div className="p-4 text-white">
      <div className="flex gap-4 mb-4">
        <select 
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="border rounded p-2 bg-black text-white"
        >
          {MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.downloadSize})
            </option>
          ))}
        </select>
        
        <button
          onClick={handleRunEval}
          disabled={isLoading}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Run Eval'}
        </button>
      </div>
      <div className="mt-8">
        {testResults.length > 0 && (
          <div className="mb-8 text-xl">
            Average Score: {(testResults.reduce((acc, result) => acc + result.score, 0) / testResults.length).toFixed(1)}/10
          </div>
        )}
        {testResults.map((result, index) => (
          <div key={index} className="mb-4 p-4 border border-white/20 rounded">
            <div className="font-bold">Test Case {index + 1}</div>
            <div>Action: {result.actionType}</div>
            <div>Node: {result.node}</div>
            <div>Response: {result.response}</div>
            <div>Score: {result.score}/10</div>
          </div>
        ))}
      </div>
    </div>
  );
}