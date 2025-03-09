import {
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  CreateMLCEngine,
} from "@mlc-ai/web-llm";

export const generateResponse = async (
  engineInstance: Awaited<ReturnType<typeof CreateMLCEngine>>,
  prompt: string
) => {
  try {
    // Format the prompt as a chat message
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