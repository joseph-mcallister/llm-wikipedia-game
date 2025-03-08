'use client';

import { useState, useEffect } from 'react';
import { pipeline } from "@huggingface/transformers";

export default function LLMComponent() {
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runLLM = async () => {
      try {
        setLoading(true);
        setError(null);

        const pipe = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct');
        const result = await pipe('Wikipedia article about USA: ');
        // @ts-ignore
        setOutput(result[0].generated_text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    runLLM();
  }, []);

  return (
    <div className="mt-8 p-4 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">LLM Output</h2>
      {loading && (
        <div className="text-gray-600">Loading...</div>
      )}
      {error && (
        <div className="text-red-600">Error: {error}</div>
      )}
      {output && (
        <div className="whitespace-pre-wrap font-mono bg-white p-4 rounded border">
          {output}
        </div>
      )}
    </div>
  );
} 