import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CLASS_PRESETS } from '@/lib/dnd-rules';

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

        const prompt = `You are creating a D&D 5e character. Generate the following in JSON format:

Character Details:
- Gender: ${gender}
- Race: ${race}
- Class: ${characterClass}

Please generate:
1. A fitting character name (appropriate for the race and gender)
2. Starting stats (base: STR ${baseStats.STR}, DEX ${baseStats.DEX}, CON ${baseStats.CON}, INT ${baseStats.INT}, WIS ${baseStats.WIS}, CHA ${baseStats.CHA}). You may adjust any stat by ±1-2 points for flavor, but keep them balanced.
3. A compelling backstory (2-3 sentences) that explains who they are, their background, and what motivates them to adventure.

Respond ONLY with valid JSON in this exact format:
{
  "name": "character name",
  "stats": {
    "STR": number,
    "DEX": number,
    "CON": number,
    "INT": number,
    "WIS": number,
    "CHA": number
  },
  "backstory": "backstory text"
}`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 300,
        });

        const responseText = completion.choices[0].message.content?.trim() || '';

        // Try to parse JSON from the response
        let parsedData;
        try {
            // Remove potential markdown code blocks
            const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            parsedData = JSON.parse(jsonText);
        } catch (e) {
            console.error('Failed to parse LLM response as JSON:', responseText);
            return NextResponse.json(
                { error: 'Failed to parse LLM response', details: responseText },
                { status: 500 }
            );
        }

        // Validate the response structure
        if (!parsedData.name || !parsedData.stats || !parsedData.backstory) {
            return NextResponse.json(
                { error: 'Invalid LLM response structure', details: parsedData },
                { status: 500 }
            );
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
