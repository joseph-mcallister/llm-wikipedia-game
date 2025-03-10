"use client";

import { useState } from "react";
import { useLLM } from "../contexts/LLMContext";
import {
  IModel,
  MODELS,
  createMLCEngineInstance,
  createWllamaInstance,
  generateResponse,
} from "../utils/llm";
import { TestCaseWithResponse, LLMJudgeResponse, OllamaResponse, TestCaseWithScore } from "./helpers";
import { testCases } from "./testCases";

const isLocalhost = () => {
  if (typeof window !== "undefined") {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }
  return false;
};


const callJudge = async (
  testCase: TestCaseWithResponse
): Promise<LLMJudgeResponse> => {
  // Only allow this on localhost for security
  if (!isLocalhost()) {
    throw new Error("Judge endpoint only available on localhost");
  }

  const judgeModel = "llama3.1:8b";

  try {
    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: judgeModel,
        stream: false,
        prompt: `You are a judge evaluating the quality of an AI that is supposed to respond with a comma separated list of a few topics based on an action and a starting topic.

Rate the response from 0-10 where:
0 = Does not respond in comma separate format or is completely wrong
3 = Partially correct/relevant but repeats the prompt or has mistakes
5 = Partially correct/relevant
10 = Perfect response

If the model does not respond with topics comma separated, respond with 0.
If the model responds in a language other than English, respond with 0.
If the model responds with long topics, respond with 0.
If the model responds with topics that are not related to the prompt and action, respond with 0.

Here are some examples:

Given prompt: "Action: Broader, Topic: Apple"
AI response: "Fruit, Company, NYC"
Score:10

Given prompt: "Action: Deeper, Topic: War"
AI response: "World War I, World War II, Korean War"
Score:10

Given prompt: "Action: Future, Topic: Lightbulbs"
AI response: "1. The future of lightbulbs is LED"
Score: 0

Given prompt: "Action: Opposite, Topic: Good"
AI response: "Evil, Bad, Negative"
Score: 10

Given prompt: Action: places, Topic: War
Response: War, War, War, War
Score: 0

Given prompt: "Action: Future, Topic: Lightbulbs"
AI response: "Candle, Lamp, Torch"
Score: 3

Respond with ONLY a number between 0-10. Here is the prompt and response

Given prompt: "Action: ${testCase.actionType}, Topic: ${testCase.node}"
AI response: "${testCase.response}"
Score:`,
      }),
    });

    const data = (await ollamaResponse.json()) as OllamaResponse;
    const scoreText = data.response.trim();
    const score = parseFloat(scoreText);

    if (isNaN(score) || score < 0 || score > 10) {
      throw new Error("Invalid score returned from judge");
    }

    return { score };
  } catch (error) {
    console.error("Error calling judge:", error);
    return { score: 0 };
  }
};

export default function EvalPage() {
  const [selectedModelId, setSelectedModelId] = useState<string>(MODELS[0].id);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseWithScore[]>([]);
  const {
    engineInstance,
    setEngineInstance,
    wllamaInstance,
    setWllamaInstance,
  } = useLLM();
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const loadModel = async (selectedModel: IModel) => {
    setIsLoading(true);

    try {
      if (selectedModel.type === "mlc") {
        const engine = await createMLCEngineInstance(
          selectedModel,
          (report) => {
            console.log(
              `Loading ${selectedModel.name}: ${Math.round(
                report.progress * 100
              )}%`
            );
          }
        );
        setEngineInstance(engine);
      } else if (selectedModel.type === "wllama") {
        const engine = await createWllamaInstance(selectedModel, (report) => {
          console.log(
            `Loading ${selectedModel.name}: ${Math.round(
              (report.loaded / report.total) * 100
            )}%`
          );
        });
        setWllamaInstance(engine);
      }
      setIsModelLoaded(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadModel = async () => {
    const selectedModel = MODELS.find((model) => model.id === selectedModelId);
    if (!selectedModel) return;
    await loadModel(selectedModel);
  };

  const handleRunEval = async () => {
    setTestResults([]);

    const selectedModel = MODELS.find((model) => model.id === selectedModelId);
    if (!selectedModel) return;

    if (!engineInstance && !wllamaInstance) {
      console.error("Please load model first");
      return;
    }

    for (const testCase of testCases) {
      let modelOutput: string | undefined | null = undefined;
      const prompt = `${testCase.actionType} ${testCase.node}`;
      console.log("Testing prompt:", prompt);

      try {
        if (selectedModel?.type === "mlc" && engineInstance) {
          modelOutput = await generateResponse(engineInstance, {
            actionType: testCase.actionType,
            nodeLabel: testCase.node,
            neighboringTopics: [],
          });
        } else if (selectedModel?.type === "wllama" && wllamaInstance) {
          modelOutput = await generateResponse(wllamaInstance, {
            actionType: testCase.actionType,
            nodeLabel: testCase.node,
            neighboringTopics: [],
          });
        } else {
          console.error("No valid engine available");
          continue;
        }
        console.log("Model output:", modelOutput);
        if (modelOutput) {
          const judgeResponse = await callJudge({
            ...testCase,
            response: modelOutput,
          });
          console.log("Judge response:", judgeResponse);
          setTestResults((prev) => [
            ...prev,
            {
              ...testCase,
              response: modelOutput!,
              score: judgeResponse.score,
            },
          ]);
        }
      } catch (error) {
        console.error("Error during evaluation:", error);
      }
    }
  };

  return (
    <div className="p-4 text-white">
      <div className="flex gap-4 mb-4">
        <select
          value={selectedModelId}
          onChange={(e) => {
            setSelectedModelId(e.target.value);
            setIsModelLoaded(false);
          }}
          className="border rounded p-2 bg-black text-white"
        >
          {MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.downloadSize})
            </option>
          ))}
        </select>

        <button
          onClick={handleLoadModel}
          disabled={isLoading}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Load Model"}
        </button>

        <button
          onClick={handleRunEval}
          disabled={isLoading || !isModelLoaded}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Run Eval"}
        </button>
      </div>
      <div className="mt-8">
        {testResults.length > 0 && (
          <div className="mb-8 text-xl">
            Average Score:{" "}
            {(
              testResults.reduce((acc, result) => acc + result.score, 0) /
              testResults.length
            ).toFixed(1)}
            /10
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
