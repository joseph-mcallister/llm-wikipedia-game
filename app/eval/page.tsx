"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MODELS, createMLCEngineInstance, generateResponseWithMLC } from '../utils/llm';

// http://localhost:3000/eval?modelId=Llama-3.2-1B-Instruct-q4f32_1-MLC

export default function EvalPage() {
  const searchParams = useSearchParams();
  const modelId = searchParams.get('modelId') as string;
  const [response, setResponse] = useState<string | null>(null);
  const selectedModel = MODELS.find(model => model.id === modelId);

  useEffect(() => {
    console.log(modelId);
    
    async function loadModel() {
      if (selectedModel?.type === "mlc") {
        const engine = await createMLCEngineInstance(selectedModel, (report) => {
          console.log(`Loading ${selectedModel.name}: ${Math.round(report.progress * 100)}%`);
        });
        const result = await generateResponseWithMLC(engine, "Hello, how are you?");
        console.log(result);
        setResponse(result);
      }
    }

    loadModel();
  }, [modelId, selectedModel]);

  return (
    <pre>
      {JSON.stringify({
        modelId,
        modelDetails: selectedModel || 'Model not found',
        response
      }, null, 2)}
    </pre>
  );
}