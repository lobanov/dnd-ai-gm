import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { characterClass, gender } = body;

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
        const prompt = `Generate a single, creative, and fitting fantasy name for a Dungeons & Dragons character of the class: ${characterClass}.${genderText} 
        Do not include any titles, descriptions, or punctuation, just the name.`;

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 20,
        });

        const generatedName = completion.choices[0].message.content?.trim().replace(/["\.]/g, '') || '';

        return NextResponse.json({ name: generatedName });
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
