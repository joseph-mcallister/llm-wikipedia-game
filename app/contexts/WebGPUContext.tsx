'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface WebGPUContextType {
  isSupported: boolean | null;
}

const WebGPUContext = createContext<WebGPUContextType | undefined>(undefined);

export function WebGPUProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebGPUSupport = async () => {
      try {
        if (!navigator.gpu) {
          setIsSupported(false);
          return;
        }
        const adapter = await navigator.gpu.requestAdapter();
        setIsSupported(!!adapter);
      } catch (err) {
        console.error(err);
        setIsSupported(false);
      }
    };

    checkWebGPUSupport();
  }, []);

  return (
    <WebGPUContext.Provider value={{ isSupported }}>
      {children}
    </WebGPUContext.Provider>
  );
}

export function useWebGPU() {
  const context = useContext(WebGPUContext);
  if (context === undefined) {
    throw new Error('useWebGPU must be used within a WebGPUProvider');
  }
  return context;
} 