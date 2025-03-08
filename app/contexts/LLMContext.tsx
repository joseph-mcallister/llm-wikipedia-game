'use client';

import { createContext, useContext, ReactNode, useState } from 'react';
import { CreateMLCEngine } from "@mlc-ai/web-llm";

interface LLMContextType {
  engineInstance: Awaited<ReturnType<typeof CreateMLCEngine>> | null;
  setEngineInstance: (engine: Awaited<ReturnType<typeof CreateMLCEngine>> | null) => void;
}

export const LLMContext = createContext<LLMContextType | undefined>(undefined);

export function LLMProvider({ children }: { children: ReactNode }) {
  const [engineInstance, setEngineInstance] = useState<Awaited<ReturnType<typeof CreateMLCEngine>> | null>(null);

  return (
    <LLMContext.Provider value={{ engineInstance, setEngineInstance }}>
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