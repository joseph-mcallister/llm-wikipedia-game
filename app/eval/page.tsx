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
import {
  TestCaseWithResponse,
  LLMJudgeResponse,
  OllamaResponse,
  TestCaseWithScore,
} from "./helpers";
import { testCases } from "./testCases";
import { ACTIONS, ActionType } from "../constants/wikipediaGame";

const systemPromptOverride =
  "You are an AI that ONLY responds with comma-separated values, with no other text or punctuation. Never include explanations or additional formatting.";
const actionToUserPromptOverride: { [key in ActionType]: string } = {
  broader:
    'Respond with exactly {n} broader categories or topics that encompass "{topic}". Format: category1, category2. Keep each topic concise (1-3 words). Must be broader than the original topic.',
  deeper:
    'Respond with exactly {n} specific subtopics or examples of "{topic}". Format: subtopic1, subtopic2. Keep each topic concise (1-3 words). Must be more specific than the original topic.',
  people:
    'Respond with exactly {n} real people who are directly connected to "{topic}" (creators, experts, historical figures). Format: person1, person2. Use full names where possible.',
  places:
    'Respond with exactly {n} specific real-world locations strongly connected to "{topic}". Format: place1, place2. Can include cities, countries, landmarks, or institutions.',
  similar:
    'Respond with exactly {n} topics that are closely related to but distinct from "{topic}". Format: topic1, topic2. Keep each topic concise (1-3 words). Must be at same level of specificity.',
  opposite:
    'Respond with exactly {n} direct conceptual opposites or antonyms of "{topic}". Format: opposite1, opposite2. Keep each response concise (1-3 words).',
  good: 'Respond with exactly {n} positive/beneficial/ethical aspects or examples related to "{topic}". Format: example1, example2. Keep each response concise (1-3 words).',
  evil: 'Respond with exactly {n} negative/harmful/unethical aspects or examples related to "{topic}". Format: example1, example2. Keep each response concise (1-3 words).',
  future:
    'Respond with exactly {n} realistic future developments, trends or possibilities related to "{topic}". Format: future1, future2. Keep each response concise (1-3 words).',
  past: 'Respond with exactly {n} historical events, periods or developments related to "{topic}". Format: past1, past2. Keep each response concise (1-3 words).',
};

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

Given prompt: "Action: Opposite, Topic: Republican"
AI response: "Democrat, Socialist, Liberal, Progressive"
Score: 10

Given prompt: "Action: Past, Topic: Lightbulbs"
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
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isEvalRunning, setIsEvalRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseWithScore[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionType | "">("");
  const [usePromptOverrides, setUsePromptOverrides] = useState(false);
  const {
    engineInstance,
    setEngineInstance,
    wllamaInstance,
    setWllamaInstance,
  } = useLLM();
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const loadModel = async (selectedModel: IModel) => {
    setIsModelLoading(true);

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
      setIsModelLoading(false);
    }
  };

  const handleLoadModel = async () => {
    const selectedModel = MODELS.find((model) => model.id === selectedModelId);
    if (!selectedModel) return;
    await loadModel(selectedModel);
  };

  const handleRunEval = async () => {
    setIsEvalRunning(true);
    setTestResults([]);

    const selectedModel = MODELS.find((model) => model.id === selectedModelId);
    if (!selectedModel) return;

    if (!engineInstance && !wllamaInstance) {
      console.error("Please load model first");
      return;
    }

    for (const testCase of testCases) {
      let modelOutput: string | undefined | null = undefined;
      const actionType = selectedAction || testCase.actionType;
      const prompt = `${actionType} ${testCase.node}`;
      console.log("Testing prompt:", prompt);

      try {
        if (selectedModel?.type === "mlc" && engineInstance) {
          modelOutput = await generateResponse(engineInstance, {
            actionType: actionType as ActionType,
            nodeLabel: testCase.node,
            maxTopics: 4,
            neighboringTopics: [],
            systemPromptOverride: usePromptOverrides
              ? systemPromptOverride
              : undefined,
            actionToUserPromptOverride: usePromptOverrides
              ? actionToUserPromptOverride
              : undefined,
          });
        } else if (selectedModel?.type === "wllama" && wllamaInstance) {
          modelOutput = await generateResponse(wllamaInstance, {
            actionType: actionType as ActionType,
            nodeLabel: testCase.node,
            neighboringTopics: [],
            maxTopics: 4,
            systemPromptOverride: usePromptOverrides
              ? systemPromptOverride
              : undefined,
            actionToUserPromptOverride: usePromptOverrides
              ? actionToUserPromptOverride
              : undefined,
          });
        } else {
          console.error("No valid engine available");
          continue;
        }
        console.log("Model output:", modelOutput);
        if (modelOutput) {
          const judgeResponse = await callJudge({
            ...testCase,
            actionType: actionType as ActionType,
            response: modelOutput,
          });
          console.log("Judge response:", judgeResponse);
          setTestResults((prev) => [
            ...prev,
            {
              ...testCase,
              actionType: actionType as ActionType,
              response: modelOutput!,
              score: judgeResponse.score,
            },
          ]);
        }
      } catch (error) {
        console.error("Error during evaluation:", error);
      }
    }
    setIsEvalRunning(false);
  };

  return (
    <div className="p-4 text-white">
      <div className="text-xl font-bold mb-4">Eval Settings</div>
      <div className="flex flex-col gap-4 mb-4 max-w-md">
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

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value as ActionType | "")}
          className="border rounded p-2 bg-black text-white"
        >
          <option value="">Use test case actions</option>
          {ACTIONS.map((action) => (
            <option key={action.type} value={action.type}>
              Override with: {action.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={usePromptOverrides}
            onChange={(e) => setUsePromptOverrides(e.target.checked)}
            className="form-checkbox"
          />
          Use prompt overrides
        </label>

        <button
          onClick={handleLoadModel}
          disabled={isModelLoading}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isModelLoading ? "Loading..." : "Load Model"}
        </button>

        <button
          onClick={handleRunEval}
          disabled={isEvalRunning || !isModelLoaded}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isEvalRunning ? "Running..." : "Run Eval"}
        </button>
      </div>
      <div className="mt-8">
        {testResults.length > 0 && (
          <div>
            <div className="text-xl font-bold mb-4">Eval Results</div>
            <div className="mb-8 text-xl">
              Average Score:{" "}
              {(
                testResults.reduce((acc, result) => acc + result.score, 0) /
                testResults.length
              ).toFixed(1)}
              /10
            </div>
          </div>
        )}
        {testResults.map((result, index) => (
          <div key={index} className="mb-4 p-4 border border-white/20 rounded">
            <div className="font-bold">Test Case {index + 1}</div>
            <div>Action: {selectedAction || result.actionType}</div>
            <div>Node: {result.node}</div>
            <div>Response: {result.response}</div>
            <div>Score: {result.score}/10</div>
          </div>
        ))}
      </div>
    </div>
  );
}
