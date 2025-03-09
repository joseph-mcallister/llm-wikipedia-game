"use client";

import { useState, useEffect } from "react";
import { useWebGPU } from "../contexts/WebGPUContext";
import { InitProgressReport, CreateMLCEngine } from "@mlc-ai/web-llm";
import { useLLM } from "../contexts/LLMContext";
import WebGPUStatus from "../components/WebGPUStatus";
import { MODELS } from "../utils/llm";

interface WelcomeScreenProps {
  onGameStart: () => void;
}

export default function WelcomeScreen({ onGameStart }: WelcomeScreenProps) {
  const { isSupported } = useWebGPU();
  const { engineInstance, setEngineInstance } =
    useLLM();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<InitProgressReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);

  useEffect(() => {
    // Set initial model based on WebGPU support
    const defaultModel = isSupported 
      ? MODELS[0] 
      : MODELS.find(model => model.type === "transformers.js") || MODELS[0];
    setSelectedModel(defaultModel);
  }, [isSupported]);

  const handleStartGame = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (selectedModel.type === "transformers.js") {
        // if (!pipeInstance) {
        //   const pipe = await pipeline(
        //     "text-generation",
        //     "onnx-community/Qwen2.5-0.5B-Instruct"
        //   ) as TextGenerationPipeline;
        //   setPipeInstance(() => pipe);
        // }
      } else {
        if (!engineInstance) {
          const engine = await CreateMLCEngine(selectedModel.id, {
            initProgressCallback: (report: InitProgressReport) => {
              console.log("Model loading:", report);
              setProgress(report);
            },
          });
          setEngineInstance(engine);
        }
      }
      onGameStart();
    } catch (err) {
      console.error("Failed to initialize game:", err);
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-top min-h-[80vh] gap-8">
      <WebGPUStatus />

      <div className="flex flex-col items-center gap-2">
        <select
          id="model-select"
          value={selectedModel.id}
          onChange={(e) =>
            setSelectedModel(
              MODELS.find((model) => model.id === e.target.value) || MODELS[0]
            )
          }
          className={`p-4 rounded-lg border border-black/[.08] dark:border-white/[.145] text-center bg-black ${
            !isSupported ? "opacity-50" : ""
          } text-white`}
          disabled={isLoading || (selectedModel.type === "mlc" && !isSupported)}
        >
          {MODELS.map((model) => (
            <option
              key={model.id}
              value={model.id}
              className="bg-black text-white"
              disabled={model.type === "mlc" && !isSupported}
            >
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
      )}

      <button
        onClick={handleStartGame}
        disabled={isLoading}
        className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors
          ${
           !isLoading
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
      >
        {isLoading ? "Downloading model..." : "Download and Play*"}
      </button>

      {isLoading && progress && (
        <div className="text-center">
          <p>Download progress: {Math.round(progress.progress * 100)}%</p>
          <p className="text-sm text-gray-600">{progress.text}</p>
        </div>
      )}

      <div className="max-w-2xl text-center">
        <p className="text-sm mb-4">
          *Playing requires downloading a {selectedModel.downloadSize} LLM that
          will run directly in your browser. The model will be cached for future
          games. If you experience performance issues or errors, try selecting a
          smaller model size.
        </p>
      </div>
    </div>
  );
}
