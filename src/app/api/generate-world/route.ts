import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Schema for world generation response
const WORLD_GENERATION_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'world_generation',
        schema: {
            type: 'object',
            properties: {
                inventory: {
                    type: 'array',
                    description: 'Starting inventory (3-5 items)',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            quantity: { type: 'number' }
                        },
                        required: ['name', 'description', 'quantity'],
                        additionalProperties: false
                    }
                },
                setting: {
                    type: 'string',
                    description: 'A paragraph with concise setting description'
                }
            },
            required: ['inventory', 'setting'],
            additionalProperties: false
        }
    }
} as const;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, race, characterClass, backstory } = body;

        if (!name || !characterClass || !backstory) {
            return NextResponse.json(
                { error: 'Invalid request body: name, characterClass, and backstory are required' },
                { status: 400 }
            );
        }

        const apiKey = getEnv('LLM_API_KEY');
        const model = getEnv('LLM_MODEL');
        const baseURL = getEnv('LLM_ENDPOINT');

        const openai = new OpenAI({ apiKey, baseURL });

        const prompt = `You are creating a D&D 5e world and starting scenario. 

Character:
- Name: ${name}
- Race: ${race}
- Class: ${characterClass}
- Backstory: ${backstory}

Please generate:
1. Starting inventory (3-5 items) appropriate for a ${characterClass}:
   - Include weapons, armor, and useful adventuring gear.
2. A paragraph with concise setting description (plain text only) that:
   - Describes the world/realm they inhabit
   - Describes their current location
   - Sets up an initial situation or hook that connects to their backstory
   - Creates an engaging starting point for adventure`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            response_format: WORLD_GENERATION_SCHEMA,
            temperature: 0.8,
        });

        const responseContent = completion.choices[0].message.content;

        if (!responseContent) {
            throw new Error('No content received from LLM');
        }

        let parsedData;
        try {
            parsedData = JSON.parse(responseContent);
        } catch (e) {
            console.error('Failed to parse LLM response:', responseContent);
            throw new Error('Invalid JSON response from LLM');
        }

        return NextResponse.json(parsedData);
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
