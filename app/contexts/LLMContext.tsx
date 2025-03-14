'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { Wllama } from '@wllama/wllama/esm/index.js';

interface LLMContextType {
  engineInstance: Awaited<ReturnType<typeof CreateMLCEngine>> | null;
  setEngineInstance: (engine: Awaited<ReturnType<typeof CreateMLCEngine>> | null) => void;
  wllamaInstance: Wllama | null;
  setWllamaInstance: (instance: Wllama | null) => void;
}

const LLMContext = createContext<LLMContextType | undefined>(undefined);

export function LLMProvider({ children }: { children: ReactNode }) {
  const [engineInstance, setEngineInstance] = useState<Awaited<ReturnType<typeof CreateMLCEngine>> | null>(null);
  const [wllamaInstance, setWllamaInstance] = useState<Wllama | null>(null);

  const value = {
    engineInstance,
    setEngineInstance,
    wllamaInstance,
    setWllamaInstance,
  };

  return (
    <LLMContext.Provider value={value}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error('useLLM must be used within a LLMProvider');
  }
  return context;
} 