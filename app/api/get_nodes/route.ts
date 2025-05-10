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
  broader: "Generate broader, more general categories that encompass {nodeLabel}",
  deeper: "Generate specific deeper subcategories or specialized aspects of {nodeLabel}",
  people: "Generate notable individuals, historical figures, or influential people associated with {nodeLabel}",
  places: "Generate specific places related to {nodeLabel}",
  similar: "Generate topics that share key characteristics or are conceptually related to {nodeLabel}",
  opposite: "Generate concepts that represent the antithesis or contrasting ideas to {nodeLabel}",
  good: "Generate specific positive, beneficial, or virtuous nouns related to {nodeLabel}",
  evil: "Generate specific negative, harmful, or malevolent nouns related to {nodeLabel}",
  future: "Generate potential futuristic nouns related to {nodeLabel}",
  past: "Generate historical nouns related to this {nodeLabel}"
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
    
    const prompt = `${actionTypePrompts[actionType].replace("{nodeLabel}", nodeLabel)}. Format the response as a comma-separated list of topics.`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an AI generating topics similar to the Wikipedia game. You will generate 3 diverse, interesting topics nouns related to the given topic. ALWAYS reply with 3 topics in a comma separated list"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 1,
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