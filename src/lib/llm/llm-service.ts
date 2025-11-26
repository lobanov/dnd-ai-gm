import OpenAI from 'openai';
import { CLASS_PRESETS } from '@/lib/dnd-rules';
import {
    CHARACTER_DETAILS_SCHEMA,
    NAME_GENERATION_SCHEMA,
    WORLD_GENERATION_SCHEMA
} from './llm-schemas';

/**
 * Get the LLM model name from environment variable
 */
function getModel(): string {
    const model = process.env.NEXT_PUBLIC_LLM_MODEL;
    if (!model) {
        throw new Error('NEXT_PUBLIC_LLM_MODEL environment variable is not configured');
    }
    return model;
}

/**
 * Create an OpenAI client configured to use the LiteLLM proxy via Next.js rewrite
 */
function createLLMClient(): OpenAI {
    // Use the Next.js rewrite endpoint which proxies to LiteLLM
    // Must use absolute URL for browser
    const baseURL = typeof window !== 'undefined'
        ? `${window.location.origin}/api/llm/v1`
        : '/api/llm/v1';

    return new OpenAI({
        apiKey: 'dummy-key', // LiteLLM doesn't require auth for localhost
        baseURL,
        dangerouslyAllowBrowser: true // Required for client-side usage
    });
}

/**
 * Generate character details (name, stats, backstory)
 */
export async function generateCharacterDetails(
    gender: string,
    race: string,
    characterClass: string
): Promise<{
    name: string;
    stats: {
        STR: number;
        DEX: number;
        CON: number;
        INT: number;
        WIS: number;
        CHA: number;
    };
    backstory: string;
}> {
    const client = createLLMClient();
    const model = getModel();

    const baseStats = CLASS_PRESETS[characterClass];
    if (!baseStats) {
        throw new Error(`Unknown character class: ${characterClass}`);
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

    const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: CHARACTER_DETAILS_SCHEMA,
        temperature: 0.8,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
        throw new Error('No content received from LLM');
    }

    try {
        return JSON.parse(responseContent);
    } catch (e) {
        console.error('Failed to parse LLM response:', responseContent);
        throw new Error('Invalid JSON response from LLM');
    }
}

/**
 * Generate a character name
 */
export async function generateCharacterName(
    characterClass: string,
    gender?: string,
    race?: string
): Promise<{ name: string }> {
    const client = createLLMClient();
    const model = getModel();

    const genderText = gender ? ` The character is ${gender.toLowerCase()}.` : '';
    const raceText = race ? ` The character is a ${race}.` : '';
    const prompt = `Generate a single, creative, and fitting fantasy name for a Dungeons & Dragons character of the class: ${characterClass}.${raceText}${genderText}`;

    const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: NAME_GENERATION_SCHEMA,
        temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
        throw new Error('No content received from LLM');
    }

    try {
        return JSON.parse(responseContent);
    } catch (e) {
        console.error('Failed to parse LLM response:', responseContent);
        throw new Error('Invalid JSON response from LLM');
    }
}

/**
 * Generate world description and starting inventory
 */
export async function generateWorld(
    name: string,
    race: string,
    characterClass: string,
    backstory: string
): Promise<{
    inventory: Array<{ name: string; description: string; quantity: number }>;
    setting: string;
}> {
    const client = createLLMClient();
    const model = getModel();

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

    const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: WORLD_GENERATION_SCHEMA,
        temperature: 0.8,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
        throw new Error('No content received from LLM');
    }

    try {
        return JSON.parse(responseContent);
    } catch (e) {
        console.error('Failed to parse LLM response:', responseContent);
        throw new Error('Invalid JSON response from LLM');
    }
}
