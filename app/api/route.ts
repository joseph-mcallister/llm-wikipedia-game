import { NextRequest } from "next/server";
import { ActionType } from "../constants/wikipediaGame";
import { GenerateResponseParams, defaultParams } from "../utils/llm";
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const actionToUserPrompt: { [key in ActionType]: string } = {
    broader: "Respond with a comma-separated list of a few topics that are broader/more general than the {topic}.",
    deeper: "Respond with a comma-separated list of a few topics that are more specific/detailed than the {topic}.",
    similar: "Respond with a comma-separated list of a few topics that are similar to the {topic}.",
    opposite: "Respond with a comma-separated list of a few topics that are opposite of the {topic}.",
    people: "Respond with a comma-separated list of a few notable people or types of people associated with the {topic}.",
    places: "Respond with a comma-separated list of a few significant places related to the {topic}.",
    good: "Respond with a comma-separated list of a few \"good\" things related to the {topic}.",
    evil: "Respond with a comma-separated list of a few \"evil\" things related to the {topic}.",
    future: "Respond with a comma-separated list of a few future developments related to the {topic}.",
    past: "Respond with a comma-separated list of a few historical aspects related to the {topic}.",
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { actionType, nodeLabel, neighboringTopics, maxTopics, systemPromptOverride, actionPromptOverride, modelType, temperature, maxTokens } = body as GenerateResponseParams;

        // Get the prompts
        const systemPrompt = "You are an AI that is the backend for an LLM version of the wikipedia game. You are given a topic and an action, and you need to respond with a comma-separated list of a few 1-2 wordtopics that are related to the action and the topic.";
        const prompt = actionToUserPrompt[actionType].replace("{topic}", nodeLabel).replace("{n}", maxTopics.toString());

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            max_tokens: maxTokens || defaultParams.maxTokens,
        });

        return Response.json({ 
            content: response.choices[0].message.content 
        });
    } catch (error) {
        console.error('OpenAI API error:', error);
        return Response.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}