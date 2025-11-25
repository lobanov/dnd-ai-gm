import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
    Message,
    AssistantMessage,
    LLMResponse,
    GameAction,
    CharacterUpdates,
    InventoryUpdates
} from '@/lib/llm/types';
import { Character } from '@/types/dnd';
import { getGMSystemPrompt } from '@/lib/gm-prompts';

// JSON Schema for GM Response
// JSON Schema for GM Response
const GM_RESPONSE_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'gm_response',
        schema: {
            type: 'object',
            properties: {
                narrative: {
                    type: 'string',
                    description: 'The narrative description of what happens next.'
                },
                actions: {
                    type: 'array',
                    description: '2-5 actions the player can take next.',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            diceRoll: { type: 'string', description: 'Dice notation if a roll is required (e.g. "2d6+3")' },
                            diceReason: { type: 'string', description: 'Reason for the dice roll' }
                        },
                        required: ['id', 'description']
                    }
                },
                characterUpdates: {
                    type: 'object',
                    properties: {
                        hp: { type: 'number' }
                    }
                },
                inventoryUpdates: {
                    type: 'object',
                    properties: {
                        add: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    slug: { type: 'string' },
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number' }
                                },
                                required: ['slug', 'name', 'description', 'quantity']
                            }
                        },
                        remove: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    slug: { type: 'string' },
                                    quantityChange: { type: 'number' }
                                },
                                required: ['slug', 'quantityChange']
                            }
                        }
                    }
                }
            },
            required: ['narrative', 'actions']
        }
    }
} as const;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, character } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Invalid request body: messages array is required' },
                { status: 400 }
            );
        }

        if (!character) {
            return NextResponse.json(
                { error: 'Invalid request body: character context is required' },
                { status: 400 }
            );
        }

        const apiKey = getEnv('LLM_API_KEY');
        const model = getEnv('LLM_MODEL');
        const baseURL = getEnv('LLM_ENDPOINT');

        const openai = new OpenAI({ apiKey, baseURL });

        // Generate system prompt with character context
        const systemPrompt = getGMSystemPrompt(character as Character);

        // Translate agnostic messages to OpenAI format
        const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg: Message) => {
            return {
                role: msg.role,
                content: msg.content || ''
            } as OpenAI.Chat.ChatCompletionMessageParam;
        });

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...openAIMessages
            ],
            response_format: GM_RESPONSE_SCHEMA,
            temperature: 0.7,
        });

        const responseContent = completion.choices[0].message.content;

        if (!responseContent) {
            throw new Error('No content received from LLM');
        }

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseContent);
        } catch (e) {
            console.error('Failed to parse LLM response:', responseContent);
            throw new Error('Invalid JSON response from LLM');
        }

        // Transform nulls to undefined for optional fields to match TypeScript interfaces
        const actions: GameAction[] = parsedResponse.actions.map((a: any) => ({
            id: a.id,
            description: a.description,
            diceRoll: a.diceRoll || undefined,
            diceReason: a.diceReason || undefined
        }));

        const characterUpdates: CharacterUpdates | undefined = parsedResponse.characterUpdates ? {
            hp: parsedResponse.characterUpdates.hp || undefined
        } : undefined;

        const inventoryUpdates: InventoryUpdates | undefined = parsedResponse.inventoryUpdates ? {
            add: parsedResponse.inventoryUpdates.add || undefined,
            remove: parsedResponse.inventoryUpdates.remove || undefined
        } : undefined;

        // Construct agnostic response
        const agnosticResponse: LLMResponse = {
            message: {
                role: 'assistant',
                content: parsedResponse.narrative,
                actions,
                characterUpdates,
                inventoryUpdates
            }
        };

        return NextResponse.json(agnosticResponse);

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
