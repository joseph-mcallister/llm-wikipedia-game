import { NextResponse } from 'next/server';
import { ActionType } from '@/app/constants/wikipediaGame';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface NodeRequest {
  actionType: ActionType;
  nodeLabel: string;
  neighboringTopics: string[];
}

const actionTypePrompts: { [key in ActionType]: string } = {
  broader: "Generate nouns that are broader, more general categories that encompass {nodeLabel}",
  deeper: "Generate nouns that are specific deeper versions of {nodeLabel}",
  people: "Generate nouns that are notable individuals, historical figures, or influential people associated with {nodeLabel}",
  places: "Generate nouns that are specific places related to {nodeLabel}",
  similar: "Generate nouns that are topics that share key characteristics or are conceptually related to {nodeLabel}",
  opposite: "Generate nouns that are concepts that represent the antithesis or contrasting ideas to {nodeLabel}",
  good: "Generate nouns that are specific positive, beneficial, or virtuous concepts related to {nodeLabel}",
  evil: "Generate nouns that are specific negative, harmful, or malevolent concepts related to {nodeLabel}",
  future: "Generate nouns that are potential futuristic concepts related to {nodeLabel}",
  past: "Generate nouns that are historical concepts related to {nodeLabel}"
};

export async function POST(request: Request) {
  try {
    const body: NodeRequest = await request.json();
    const { actionType, nodeLabel, neighboringTopics } = body;

    if (!actionType || !nodeLabel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    let prompt = `
${actionTypePrompts[actionType].replace("{nodeLabel}", `"${nodeLabel}"`)}.
Avoid repeating these previously generated topics: ${neighboringTopics.join(", ")}.
Return exactly three distinct Wikipedia-style article titles that are nouns, formatted as a comma-separated list with no extra text.
Do not include descriptions or adjectives. Focus on specific, named entities or concrete noun concepts only.
`.trim();
    prompt = prompt.substring(0, Math.min(2000, prompt.length));
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: `You are an expert Wikipedia editor helping generate high-quality, noun-based article titles for a semantic navigation game. Each title should resemble something that could exist on Wikipedia and must be:
- A **noun phrase**, not a sentence
- **Concise**, typically 1–4 words
- **Specific**, not overly broad (e.g. prefer 'Quantum Cryptography' over 'Science')
- **Diverse** from previous suggestions and each other

Return exactly three titles in a comma-separated list. Do not include explanations or extra text."
`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 15
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({ completion: response, prompt });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}