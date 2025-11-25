import OpenAI from 'openai';
import { Character } from '@/types/dnd';
import { getGMSystemPrompt } from '@/lib/gm-prompts';

// Schema for GM Response (copied from route.ts for validation)
const GM_RESPONSE_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'gm_response',
        schema: {
            type: 'object',
            properties: {
                narrative: { type: 'string' },
                actions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            diceRoll: { type: 'string' },
                            diceReason: { type: 'string' }
                        },
                        required: ['id', 'description']
                    }
                },
                characterUpdates: {
                    type: 'object',
                    properties: { hp: { type: 'number' } }
                },
                inventoryUpdates: {
                    type: 'object',
                    properties: {
                        add: { type: 'array' },
                        remove: { type: 'array' }
                    }
                }
            },
            required: ['narrative', 'actions']
        }
    }
} as const;

export function createTestCharacter(overrides?: Partial<Character>): Character {
    return {
        name: 'Test Hero',
        class: 'Fighter',
        gender: 'Male',
        level: 1,
        hp: 10,
        maxHp: 10,
        stats: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 },
        inventory: [],
        skills: [],
        race: 'Human',
        ...overrides,
    } as Character;
}

export async function callChatAPI(messages: any[], character: Character) {
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseURL = process.env.LLM_ENDPOINT;

    if (!apiKey || !model || !baseURL) {
        throw new Error('Missing LLM configuration in .env.local');
    }

    const openai = new OpenAI({ apiKey, baseURL });
    const systemPrompt = getGMSystemPrompt(character);

    // Prepare messages
    let llmMessages = [...messages];
    if (llmMessages.length > 0 && llmMessages[0].role === 'user') {
        // Prepend character context if needed, similar to client.ts
        // But for eval, we can just rely on the system prompt or prepend manually
        // The system prompt in gm-prompts.ts expects character context in the prompt? 
        // No, getGMSystemPrompt embeds it.
        // But the route.ts logic prepends it to the user message? 
        // Let's mimic route.ts behavior if possible, or just use the system prompt.
        // Actually, route.ts doesn't prepend system prompt, it sends messages as is?
        // Wait, route.ts maps messages. It relies on the client to send the right context?
        // No, client.ts sends messages. 
        // Ah, I missed where the system prompt is injected in route.ts?
        // Let's check route.ts again.
        // route.ts just maps messages. It DOES NOT inject system prompt?
        // Wait, if route.ts doesn't inject system prompt, where does it come from?
        // The client.ts sends it?
        // Let's check client.ts.
    }

    // Actually, let's just use the OpenAI client directly to test the PROMPT logic
    // We want to test if the LLM *responds* correctly given the right inputs.

    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            ...llmMessages
        ],
        response_format: GM_RESPONSE_SCHEMA,
        temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('No content');

    return JSON.parse(content);
}
