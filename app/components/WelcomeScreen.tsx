'use client';

import { useState } from 'react';
import { useWebGPU } from '../contexts/WebGPUContext';
import { InitProgressReport, CreateMLCEngine } from "@mlc-ai/web-llm";
import { useLLM } from '../contexts/LLMContext';
import WebGPUStatus from './WebGPUStatus';

interface WelcomeScreenProps {
  onGameStart: () => void;
}

enum WEB_LLM_MODELS {
  LLAMA_3_2_1B_INSTRUCT_Q4F32_1 = "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  QWEN2_5_0_5B_INSTRUCT_Q4F32_1 = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
}

export default function WelcomeScreen({ onGameStart }: WelcomeScreenProps) {
  const { isSupported } = useWebGPU();
  const { engineInstance, setEngineInstance } = useLLM();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<InitProgressReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (!engineInstance) {
        const engine = await CreateMLCEngine(
          WEB_LLM_MODELS.LLAMA_3_2_1B_INSTRUCT_Q4F32_1,
          { 
            initProgressCallback: (report: InitProgressReport) => {
              console.log('Model loading:', report);
              setProgress(report);
            }
          }
        );
        setEngineInstance(engine);
      }
      onGameStart();
    } catch (err) {
      console.error('Failed to initialize game:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-top min-h-[80vh] gap-8">
      <WebGPUStatus />
      
      <div className="max-w-2xl text-center">
        <p className="text-lg mb-4">
          This game requires downloading a ~1GB LLM that will run directly in your browser.
          The model will be cached for future visits.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handleStartGame}
        disabled={!isSupported || isLoading}
        className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors
          ${isSupported && !isLoading 
            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
      >
        {isLoading ? 'Downloading model...' : 'Download and Play'}
      </button>

      {isLoading && progress && (
        <div className="text-center">
          <p>Download progress: {Math.round(progress.progress * 100)}%</p>
          <p className="text-sm text-gray-600">{progress.text}</p>
        </div>
      )}
    </div>
  );
} 