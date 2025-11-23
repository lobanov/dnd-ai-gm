import { NextResponse } from 'next/server';
import OpenAI from 'openai';

console.log(process.env);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Invalid request body: messages array is required' },
                { status: 400 }
            );
        }

        const apiKey = getEnv('LLM_API_KEY');
        const model = getEnv('LLM_MODEL');
        const baseURL = getEnv('LLM_ENDPOINT');

        try {
            new URL(baseURL);
        } catch (e) {
            console.error('LLM_ENDPOINT is invalid');
            return NextResponse.json(
                { error: 'LLM_ENDPOINT is not a valid URL.' },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey, baseURL });

        const systemPrompt = `You are an expert Dungeon Master for a D&D 5e game. 
          Your goal is to provide an immersive, text-based roleplaying experience.
          
          Rules:
          1. Follow D&D 5e rules for checks and combat where possible in a narrative format.
          2. Ask the player to roll for skills when appropriate (e.g., "Roll for Perception").
          3. Keep descriptions vivid but concise.
          4. Manage the story, NPCs, and world state.
          5. Do not break character unless explaining a rule.
          6. YOU are responsible for rolling dice for NPCs and events.
          
          Current Context:
          The player is a single adventurer.
          `;

        // Prepare messages for the LLM
        // To ensure compatibility with various models/servers (like LM Studio),
        // we merge the system prompt into the first user message if possible,
        // or prepend a user message with the system prompt.
        // This avoids "Conversation roles must alternate" errors with strict templates.

        let llmMessages = [...messages];

        if (llmMessages.length > 0 && llmMessages[0].role === 'user') {
            // Prepend system prompt to the first user message
            llmMessages[0] = {
                ...llmMessages[0],
                content: `${systemPrompt}\n\n${llmMessages[0].content}`
            };
        } else {
            // Prepend a new user message with the system prompt
            llmMessages.unshift({
                role: 'user',
                content: systemPrompt
            });
        }


        const completion = await openai.chat.completions.create({
            model,
            messages: llmMessages,
            temperature: 0.7,
        });

        console.log('LLM Response:', completion);

        return NextResponse.json(completion.choices[0].message);
    } catch (error: any) {
        console.error('LLM Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch response from LLM' },
            { status: 500 }
        );
    }
}

function getEnv(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
        throw new Error(`${key} is not configured on the server.`);
    }
    return value;
}
