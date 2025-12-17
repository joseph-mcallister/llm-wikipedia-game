import { NextResponse } from 'next/server';
import { ActionType } from '@/app/constants/wikipediaGame';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add global variable at the top with other constants
const INCLUDE_NEIGHBORING_TOPICS = false;

interface NodeRequestV2 {
  actionType: ActionType;
  nodeLabel: string;
  neighboringTopics: string[];
  targetNodeLabel: string;
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
    const body: NodeRequestV2 = await request.json();
    const { actionType, nodeLabel, neighboringTopics, targetNodeLabel } = body;

    if (!actionType || !nodeLabel || !targetNodeLabel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    let prompt = `
${actionTypePrompts[actionType].replace("{nodeLabel}", `"${nodeLabel}"`)}.
${INCLUDE_NEIGHBORING_TOPICS ? `Avoid repeating these previously generated topics: ${neighboringTopics.join(", ")}.` : ''}
Return exactly three distinct Wikipedia-style article titles that are nouns, formatted as a comma-separated list with no extra text.
Do not include descriptions or adjectives. Focus on specific, named entities or concrete noun concepts only.
The eventual target article the user is trying to reach is "${targetNodeLabel}".
`.trim();
    prompt = prompt.substring(0, Math.min(2000, prompt.length));
    console.log('=== PROMPT ===');
    console.log(prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      reasoning_effort: "minimal",
      messages: [
        {
          role: "system",
          content: `You are an expert Wikipedia editor helping generate high-quality, noun-based article titles for a semantic navigation game. Each title should resemble something that could exist on Wikipedia and must be:
- A **noun phrase**, not a sentence
- **Concise**, typically 1–3 words
- **Specific**, not overly broad (e.g. prefer 'Quantum Cryptography' over 'Science')
- **Diverse** from previous suggestions and each other

Return 3 titles in a comma-separated list. Do not include explanations or extra text."
`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 1000
    });

    console.log('=== FULL COMPLETION ===');
    console.log(JSON.stringify(completion, null, 2));

    const responses = completion.choices[0].message.content
    console.log('=== EXTRACTED CONTENT ===');
    console.log(responses);

    return NextResponse.json({ 
      completion: responses,
      prompt
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 