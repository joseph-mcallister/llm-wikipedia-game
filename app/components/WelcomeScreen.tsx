'use client';

import { useState } from 'react';
import { useWebGPU } from '../contexts/WebGPUContext';
import { InitProgressReport, CreateMLCEngine } from "@mlc-ai/web-llm";
import { useLLM } from '../contexts/LLMContext';
import WebGPUStatus from './WebGPUStatus';

interface WelcomeScreenProps {
  onGameStart: () => void;
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
          "Llama-3.2-1B-Instruct-q4f32_1-MLC",
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
    <div className="flex flex-col items-center justify-top min-h-[80vh] gap-8 p-8">
      <WebGPUStatus />
      
      <div className="max-w-2xl text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Wikipedia Game!</h2>
        <p className="text-lg mb-4">
          This game requires downloading a ~1GB language model that will run directly in your browser.
          The model will be cached for future visits.
        </p>
        <div className="text-left mt-8">
          <h3 className="text-xl font-semibold mb-4">How it works:</h3>
          <ol className="list-decimal list-inside space-y-4 text-lg">
            <li>Download an LLM that runs directly in your browser</li>
            <li>Receive a starting Wikipedia page and target Wikipedia page</li>
            <li>The LLM will begin describing the starting topic</li>
            <li>Click any subtopic in their output to guide to the next topic</li>
            <li>Repeat until the LLM outputs your target Wikipedia page</li>
          </ol>
        </div>
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
        {isLoading ? 'Downloading model...' : 'Play Game'}
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