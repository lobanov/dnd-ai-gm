import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
1. Starting inventory (3-5 items) appropriate for a ${characterClass}. Include weapons, armor, and useful adventuring gear. Each item should have a name, description, and quantity.
2. A rich setting description (2-3 paragraphs) that:
   - Describes the world/realm they inhabit
   - Describes their current location
   - Sets up an initial situation or hook that connects to their backstory
   - Creates an engaging starting point for adventure

Respond ONLY with valid JSON in this exact format:
{
  "inventory": [
    {
      "name": "item name",
      "description": "item description",
      "quantity": number
    }
  ],
  "setting": "setting description text"
}`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 600,
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
        if (!parsedData.inventory || !Array.isArray(parsedData.inventory) || !parsedData.setting) {
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
