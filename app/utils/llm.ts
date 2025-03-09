import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  CreateMLCEngine,
} from "@mlc-ai/web-llm";
import { pipeline, TextGenerationPipeline } from "@huggingface/transformers";

interface Model {
  id: string;
  name: string;
  downloadSize: string;
  type: "mlc" | "transformers.js";
}

export const MODELS: Model[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    name: "Llama-3.2-1B (best)",
    downloadSize: "650 MB",
    type: "mlc",
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
    name: "Qwen-2.5-0.5B ",
    downloadSize: "250 MB",
    type: "mlc",
  },
  {
    id: "onnx-community/Qwen2.5-0.5B-Instruct",
    name: "Qwen-2.5-0.5B (wasm)",
    downloadSize: "250 MB",
    type: "transformers.js",
  },
  {
    id: "onnx-community/Llama-3.2-1B-Instruct",
    name: "Llama-3.2-1B (wasm)",
    downloadSize: "650 MB",
    type: "transformers.js",
  }
];

export const generateResponseWithWasm = async (prompt: string, pipe: (prompt: any, options: any) => TextGenerationPipeline) => {
  const messages = [
    { role: "system", content: "You are an AI assistant that responds ONLY with comma-separated lists of topics" },
    { role: "user", content: prompt }
  ];
  console.log(messages)
  try {
    const output= await pipe(messages, {
      max_new_tokens: 20,
      temperature: 0.7
    }) as any;
    console.log(output)
    const text = output[0].generated_text[2].content;
    console.log(text)
    return text;
  } catch (error) {
    console.error("WebLLM error:", error);
    throw error;
  }
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