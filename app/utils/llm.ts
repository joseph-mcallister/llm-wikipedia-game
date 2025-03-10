import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  CreateMLCEngine,
  InitProgressReport,
} from "@mlc-ai/web-llm";

import { Wllama, WllamaChatMessage } from '@wllama/wllama/esm/index.js';
import WasmFromCDN from '@wllama/wllama/esm/wasm-from-cdn.js';

export interface IModel {
  id: string;
  name: string;
  downloadSize: string;
  filePath?: string;
  type: "mlc" | "wllama"
}


export const MODELS: IModel[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    name: "Llama-3.2-1B (best, webgpu)",
    downloadSize: "650 MB",
    type: "mlc"
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    name: "Qwen-2.5-0.5B (fastest, webgpu)",
    downloadSize: "250 MB",
    type: "mlc"
  },
  {
    id: "hugging-quants/Llama-3.2-1B-Instruct-Q4_K_M-GGUF",
    name: "Llama-3.2-1B (best, wasm)",
    filePath: "llama-3.2-1b-instruct-q4_k_m.gguf",
    downloadSize: "800 MB",
    type: "wllama"
  },
  {
    id: "Qwen/Qwen2.5-0.5B-Instruct-GGUF",
    name: "Qwen-2.5-0.5B (fastest, wasm)",
    filePath: "qwen2.5-0.5b-instruct-q8_0.gguf",
    downloadSize: "650 MB",
    type: "wllama"
  },
];

export const createWllamaInstance = async (model: IModel, progressCallback: ({loaded, total}: {loaded: number, total: number}) => void) => {
  const wllamaInstance = new Wllama(WasmFromCDN); // TODO: Figure out how to get nextjs to import the wasm from node module
  if (model.type !== "wllama" || model.filePath === undefined) {
    throw new Error("Model not configured correctly");
  }
  await wllamaInstance.loadModelFromHF(
    model.id,
    model.filePath,
    {
      progressCallback,
    }
  );
  return wllamaInstance;
}

export const createMLCEngineInstance = async (
  model: IModel,
  progressCallback: (report: InitProgressReport) => void
) => {
  if (model.type !== "mlc") {
    throw new Error("Model not configured correctly");
  }
  const engine = await CreateMLCEngine(model.id, {
    initProgressCallback: progressCallback,
  });
  return engine;
}

export const generateResponseWithWllama = async (wllamaInstance: Wllama, prompt: string) => {
  const messages: WllamaChatMessage[] = [
    {
      role: "system",
      content: "You are an AI that ONLY responds with comma-separated values, with no other text or punctuation. Never include explanations or additional formatting.",
    },
    { role: "user", content: prompt },
  ];
  const outputText = await wllamaInstance.createChatCompletion(messages,{ 
    sampling: {
      temp: 0.7,
    },
  });
  return outputText;
}

export const generateResponseWithMLC = async (
  engineInstance: Awaited<ReturnType<typeof CreateMLCEngine>>,
  prompt: string
) => {
  try {
    const messages: (
      | ChatCompletionSystemMessageParam
      | ChatCompletionUserMessageParam
    )[] = [
      {
        role: "system",
        content:
          "You are an AI that ONLY responds with comma-separated values, with no other text or punctuation. Never include explanations or additional formatting.",
      },
      { role: "user", content: prompt },
    ];

    // Generate response
    const response = await engineInstance.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 100,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("WebLLM error:", error);
    throw error;
  }
};

export const parseResponse = (response: unknown, maxTopics: number): string[] => {
  try {
    // Helper to capitalize first letter
    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1);

    // Handle array response
    if (Array.isArray(response)) {
      const text = response[0]?.generated_text || "";
      return text
        .split(",")
        .map((item: string) => capitalize(item.trim()))
        .filter((item: string) => item.length > 0)
        .slice(0, maxTopics);
    }

    // Handle string response
    if (typeof response === "string") {
      return response
        .split(",")
        .map((item: string) => capitalize(item.trim()))
        .filter((item: string) => item.length > 0)
        .slice(0, maxTopics);
    }

    // Handle object response
    if (
      response &&
      typeof response === "object" &&
      "generated_text" in response
    ) {
      const text = (response as { generated_text: string }).generated_text;
      return text
        .split(",")
        .map((item: string) => capitalize(item.trim()))
        .filter((item: string) => item.length > 0)
        .slice(0, maxTopics);
    }

    return [];
  } catch (err) {
    console.error("Parse error:", err);
    return [];
  }
}; 