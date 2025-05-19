"use client";

import { useState } from "react";
import { useLLM } from "../contexts/LLMContext";
import {
  IModel,
  MODELS,
  createMLCEngineInstance,
  createWllamaInstance,
  generateResponse,
  GenerateResponseParams,
  defaultParams,
  actionToUserPrompt,
} from "../utils/llm";
import {
  TestCaseWithResponse,
  LLMJudgeResponse,
  OllamaResponse,
  TestCaseWithScore,
} from "./helpers";
import { testCases } from "./testCases";
import { ACTIONS, ActionType } from "../constants/wikipediaGame";


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
3 = Partially correct/relevant but repeats the prompt topic or has clear mistakes
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

Given prompt: "Action: Broader, Topic: Apple"
AI response: "Apple, Company, Fruit"
Score:3

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
  const [singleResponseScore, setSingleResponseScore] = useState<number | null>(null);
  const [isJudging, setIsJudging] = useState(false);
  const [isSingleResponseSettingsExpanded, setIsSingleResponseSettingsExpanded] = useState(false);
  const [isPromptSettingsExpanded, setIsPromptSettingsExpanded] = useState(false);
  const [isLLMSettingsExpanded, setIsLLMSettingsExpanded] = useState(false);
  const {
    engineInstance,
    setEngineInstance,
    wllamaInstance,
    setWllamaInstance,
  } = useLLM();
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  const [formParams, setFormParams] = useState<GenerateResponseParams>({
    actionType: ACTIONS[0].type,
    nodeLabel: "",
    targetNodeLabel: "",
    neighboringTopics: [],
    maxTopics: 4,
    systemPromptOverride: defaultParams.systemPromptOverride,
    actionPromptOverride: defaultParams.actionToUserPromptOverride,
    modelType: "chat",
    temperature: defaultParams.temperature,
    maxTokens: defaultParams.maxTokens,
    topP: undefined,
    topK: undefined,
  });
  const [singleResponse, setSingleResponse] = useState<string | null>(null);
  const [isActionPromptsExpanded, setIsActionPromptsExpanded] = useState(false);

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

  const handleSingleGenerate = async () => {
    if (!engineInstance && !wllamaInstance) {
      console.error("Please load model first");
      return;
    }

    const selectedModel = MODELS.find((model) => model.id === selectedModelId);
    if (!selectedModel) return;

    try {
      let modelOutput: string | undefined | null = undefined;

      if (selectedModel?.type === "mlc" && engineInstance) {
        modelOutput = await generateResponse(engineInstance, formParams);
      } else if (selectedModel?.type === "wllama" && wllamaInstance) {
        modelOutput = await generateResponse(wllamaInstance, formParams);
      }
      
      setSingleResponse(modelOutput || null);
      
      // If we're on localhost, automatically run the judge
      if (isLocalhost() && modelOutput) {
        setIsJudging(true);
        try {
          const judgeResponse = await callJudge({
            actionType: formParams.actionType,
            node: formParams.nodeLabel,
            response: modelOutput,
          });
          setSingleResponseScore(judgeResponse.score);
        } catch (error) {
          console.error("Error calling judge:", error);
        } finally {
          setIsJudging(false);
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);
    }
  };

  const handleRetryJudge = async () => {
    if (!singleResponse || !isLocalhost()) return;
    
    setIsJudging(true);
    try {
      const judgeResponse = await callJudge({
        actionType: formParams.actionType,
        node: formParams.nodeLabel,
        response: singleResponse,
      });
      setSingleResponseScore(judgeResponse.score);
    } catch (error) {
      console.error("Error calling judge:", error);
    } finally {
      setIsJudging(false);
    }
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
        // Create eval params based on current form settings but override the action and node
        const evalParams: GenerateResponseParams = {
          ...formParams,
          actionType: actionType as ActionType,
          nodeLabel: testCase.node,
          completionPromptOverride: selectedModel.completionPrompt,
          modelType: selectedModel.chat ? "chat" : "completion",
        };
        if (selectedModel?.type === "mlc" && engineInstance) {
          modelOutput = await generateResponse(engineInstance, evalParams);
        } else if (selectedModel?.type === "wllama" && wllamaInstance) {
          modelOutput = await generateResponse(wllamaInstance, evalParams);
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

        <div className="border border-white/20 rounded p-4">
          <h3 className="text-lg font-semibold mb-4">Generation Parameters</h3>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setIsSingleResponseSettingsExpanded(!isSingleResponseSettingsExpanded)}
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <span className="text-xl">{isSingleResponseSettingsExpanded ? '▼' : '▶'}</span>
              <span>Single Response Settings</span>
            </button>

            {isSingleResponseSettingsExpanded && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1">Action Type</label>
                  <select
                    value={formParams.actionType}
                    onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, actionType: e.target.value as ActionType }))}
                    className="w-full border rounded p-2 bg-black text-white"
                  >
                    {ACTIONS.map((action) => (
                      <option key={action.type} value={action.type}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1">Node Label</label>
                  <input
                    type="text"
                    value={formParams.nodeLabel}
                    onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, nodeLabel: e.target.value }))}
                    className="w-full border rounded p-2 bg-black text-white"
                    placeholder="Enter topic..."
                  />
                </div>
              </div>
            )}

            <div className="border-t border-white/20 pt-4">
              <button
                type="button"
                onClick={() => setIsPromptSettingsExpanded(!isPromptSettingsExpanded)}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <span className="text-xl">{isPromptSettingsExpanded ? '▼' : '▶'}</span>
                <span>Prompt Settings</span>
              </button>
              
              {isPromptSettingsExpanded && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block mb-1">Neighboring Topics (comma-separated)</label>
                    <input
                      type="text"
                      value={formParams.neighboringTopics.join(", ")}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ 
                        ...prev, 
                        neighboringTopics: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                      }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      placeholder="topic1, topic2, ..."
                    />
                  </div>

                  <div>
                    <label className="block mb-1">Max Topics</label>
                    <input
                      type="number"
                      value={formParams.maxTopics}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, maxTopics: parseInt(e.target.value) || 4 }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      min="1"
                      max="10"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">System Prompt</label>
                    <textarea
                      value={formParams.systemPromptOverride}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, systemPromptOverride: e.target.value }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      rows={3}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setIsActionPromptsExpanded(!isActionPromptsExpanded)}
                      className="flex items-center gap-2 text-white/80 hover:text-white"
                    >
                      <span className="text-xl">{isActionPromptsExpanded ? '▼' : '▶'}</span>
                      <span>Action Prompts Override</span>
                    </button>
                    
                    {isActionPromptsExpanded && (
                      <div className="mt-4 space-y-4">
                        {ACTIONS.map((action) => (
                          <div key={action.type}>
                            <label className="block mb-1">{action.label} Prompt</label>
                            <textarea
                              value={formParams.actionPromptOverride?.[action.type] || actionToUserPrompt[action.type]}
                              onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({
                                ...prev,
                                actionPromptOverride: {
                                  ...(prev.actionPromptOverride || actionToUserPrompt),
                                  [action.type]: e.target.value
                                }
                              }))}
                              className="w-full border rounded p-2 bg-black text-white"
                              rows={3}
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setFormParams((prev: GenerateResponseParams) => ({
                            ...prev,
                            actionPromptOverride: actionToUserPrompt
                          }))}
                          className="text-sm text-white/60 hover:text-white"
                        >
                          Reset to Defaults
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/20 pt-4">
              <button
                type="button"
                onClick={() => setIsLLMSettingsExpanded(!isLLMSettingsExpanded)}
                className="flex items-center gap-2 text-white/80 hover:text-white"
              >
                <span className="text-xl">{isLLMSettingsExpanded ? '▼' : '▶'}</span>
                <span>LLM Settings</span>
              </button>
              
              {isLLMSettingsExpanded && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block mb-1">Model Type</label>
                    <select
                      value={formParams.modelType}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, modelType: e.target.value as "chat" | "completion" }))}
                      className="w-full border rounded p-2 bg-black text-white"
                    >
                      <option value="chat">Chat</option>
                      <option value="completion">Completion</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1">Temperature</label>
                    <input
                      type="number"
                      value={formParams.temperature}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      step="0.1"
                      min="0"
                      max="2"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">Max Tokens</label>
                    <input
                      type="number"
                      value={formParams.maxTokens}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, maxTokens: parseInt(e.target.value) || 20 }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      min="1"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">Top P</label>
                    <input
                      type="number"
                      value={formParams.topP}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, topP: parseFloat(e.target.value) || 1.0 }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      step="0.1"
                      min="0"
                      max="1"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">Top K</label>
                    <input
                      type="number"
                      value={formParams.topK}
                      onChange={(e) => setFormParams((prev: GenerateResponseParams) => ({ ...prev, topK: parseInt(e.target.value) || 50 }))}
                      className="w-full border rounded p-2 bg-black text-white"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLoadModel}
          disabled={isModelLoading}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isModelLoading ? "Loading..." : "Load Model"}
        </button>

        <button
          onClick={handleSingleGenerate}
          disabled={!isModelLoaded}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          Generate Single Response
        </button>

        <div>
          <label className="block mb-1">Override Test Case Actions (Optional)</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value as ActionType | "")}
            className="w-full border rounded p-2 bg-black text-white"
          >
            <option value="">Use Original Actions</option>
            {ACTIONS.map((action) => (
              <option key={action.type} value={action.type}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleRunEval}
          disabled={isEvalRunning || !isModelLoaded}
          className="bg-black text-white px-4 py-2 rounded border border-white disabled:opacity-50"
        >
          {isEvalRunning ? "Running..." : "Run Eval"}
        </button>
      </div>

      {singleResponse && (
        <div className="mt-8 p-4 border border-white/20 rounded">
          <div className="flex justify-between items-center mb-4">
            <div className="text-xl font-bold">Single Generation Result</div>
            {isLocalhost() && (
              <div className="flex items-center gap-4">
                {singleResponseScore !== null && (
                  <div className="text-lg">
                    Score: <span className="font-bold">{singleResponseScore}/10</span>
                  </div>
                )}
                <button
                  onClick={handleRetryJudge}
                  disabled={isJudging}
                  className="px-3 py-1 text-sm border border-white/40 rounded hover:border-white disabled:opacity-50"
                >
                  {isJudging ? "Judging..." : "Retry Judge"}
                </button>
              </div>
            )}
          </div>
          <div>{singleResponse}</div>
        </div>
      )}

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
