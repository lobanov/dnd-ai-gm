import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CLASS_PRESETS } from '@/lib/dnd-rules';

// Schema for character details response
const CHARACTER_DETAILS_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'character_details',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'A fitting character name' },
                stats: {
                    type: 'object',
                    properties: {
                        STR: { type: 'number' },
                        DEX: { type: 'number' },
                        CON: { type: 'number' },
                        INT: { type: 'number' },
                        WIS: { type: 'number' },
                        CHA: { type: 'number' }
                    },
                    required: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
                    additionalProperties: false
                },
                backstory: { type: 'string', description: 'A compelling backstory (2-3 sentences)' }
            },
            required: ['name', 'stats', 'backstory'],
            additionalProperties: false
        }
    }
} as const;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { gender, race, characterClass } = body;

        if (!characterClass || !gender || !race) {
            return NextResponse.json(
                { error: 'Invalid request body: gender, race, and characterClass are required' },
                { status: 400 }
            );
        }

        const apiKey = getEnv('LLM_API_KEY');
        const model = getEnv('LLM_MODEL');
        const baseURL = getEnv('LLM_ENDPOINT');

        const openai = new OpenAI({ apiKey, baseURL });

        const baseStats = CLASS_PRESETS[characterClass];
        if (!baseStats) {
            return NextResponse.json(
                { error: `Unknown character class: ${characterClass}` },
                { status: 400 }
            );
        }

        const prompt = `You are creating a D&D 5e character.
        
Character Context:
- Gender: ${gender}
- Race: ${race}
- Class: ${characterClass}

Please generate:
1. A fitting character name (appropriate for the race and gender)
2. Starting stats (base: STR ${baseStats.STR}, DEX ${baseStats.DEX}, CON ${baseStats.CON}, INT ${baseStats.INT}, WIS ${baseStats.WIS}, CHA ${baseStats.CHA}). You may adjust any stat by ±1-2 points for flavor, but keep them balanced.
3. A compelling backstory (2-3 sentences) that explains who they are, their background, and what motivates them to adventure.`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            response_format: CHARACTER_DETAILS_SCHEMA,
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
