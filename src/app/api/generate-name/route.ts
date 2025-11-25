import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Schema for name generation response
const NAME_GENERATION_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'character_name',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'A creative and fitting fantasy name' }
            },
            required: ['name'],
            additionalProperties: false
        }
    }
} as const;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { characterClass, gender, race } = body;

        if (!characterClass) {
            return NextResponse.json(
                { error: 'Invalid request body: characterClass is required' },
                { status: 400 }
            );
        }

        const apiKey = getEnv('LLM_API_KEY');
        const model = getEnv('LLM_MODEL');
        const baseURL = getEnv('LLM_ENDPOINT');

        const openai = new OpenAI({ apiKey, baseURL });

        const genderText = gender ? ` The character is ${gender.toLowerCase()}.` : '';
        const raceText = race ? ` The character is a ${race}.` : '';
        const prompt = `Generate a single, creative, and fitting fantasy name for a Dungeons & Dragons character of the class: ${characterClass}.${raceText}${genderText}`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            response_format: NAME_GENERATION_SCHEMA,
            temperature: 0.7,
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
