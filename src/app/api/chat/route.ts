import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
    Message,
    AssistantMessage,
    GameTool,
    LLMResponse,
    RollDiceTool,
    AddInventoryTool,
    UpdateInventoryTool,
    UpdateCharacterTool,
    GetCharacterStatsTool
} from '@/lib/llm/types';

// Tool definitions for OpenAI
const OPENAI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_character_stats',
            description: 'Get the current character statistics, HP, inventory, and other details',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'roll_dice',
            description: 'Roll dice for skill checks, attacks, damage, or any other random events. Returns the individual rolls and total.',
            parameters: {
                type: 'object',
                properties: {
                    dice: {
                        type: 'string',
                        description: 'Dice notation (e.g., "1d20", "2d6+3", "1d20+5")'
                    },
                    reason: {
                        type: 'string',
                        description: 'The reason for the roll (e.g., "Perception check", "Goblin attack", "Fire damage")'
                    }
                },
                required: ['dice', 'reason']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_inventory',
            description: 'Add items to the character inventory.',
            parameters: {
                type: 'object',
                properties: {
                    items: {
                        type: 'array',
                        description: 'Array of items to add',
                        items: {
                            type: 'object',
                            properties: {
                                slug: { type: 'string', description: 'Unique identifier/slug for the item' },
                                name: { type: 'string', description: 'Name of the item' },
                                description: { type: 'string', description: 'Brief description of the item' },
                                quantity: { type: 'number', description: 'Quantity of the item' }
                            },
                            required: ['slug', 'name', 'description', 'quantity']
                        }
                    }
                },
                required: ['items']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_inventory',
            description: 'Update quantity of existing items in inventory.',
            parameters: {
                type: 'object',
                properties: {
                    updates: {
                        type: 'array',
                        description: 'Array of updates to perform',
                        items: {
                            type: 'object',
                            properties: {
                                slug: { type: 'string', description: 'Slug of the item to update' },
                                quantityChange: { type: 'number', description: 'Change in quantity (positive to add, negative to remove)' }
                            },
                            required: ['slug', 'quantityChange']
                        }
                    }
                },
                required: ['updates']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_character',
            description: 'Update character stats like HP, stats (STR, DEX, etc.), or level',
            parameters: {
                type: 'object',
                properties: {
                    hp: { type: 'number', description: 'New HP value' },
                    maxHp: { type: 'number', description: 'New maximum HP value' },
                    level: { type: 'number', description: 'New level' },
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
                        description: 'Updated stats object'
                    }
                }
            }
        }
    }
];

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

        const openai = new OpenAI({ apiKey, baseURL });

        // Translate agnostic messages to OpenAI format
        const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg: Message) => {
            if (msg.role === 'tool') {
                return {
                    role: 'tool',
                    tool_call_id: msg.toolCallId,
                    content: JSON.stringify(msg.content) // OpenAI expects string content for tool results
                };
            }

            if (msg.role === 'assistant') {
                const toolCalls = msg.toolCalls?.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: {
                        name: tc.tool.name,
                        arguments: JSON.stringify(tc.tool.args)
                    }
                }));

                return {
                    role: 'assistant',
                    content: msg.content,
                    tool_calls: toolCalls
                } as OpenAI.Chat.ChatCompletionMessageParam;
            }

            return {
                role: msg.role,
                content: msg.content || ''
            };
        });

        const completion = await openai.chat.completions.create({
            model,
            messages: openAIMessages,
            tools: OPENAI_TOOLS,
            tool_choice: 'auto',
            temperature: 0.7,
        });

        const responseMessage = completion.choices[0].message;
        const openAIToolCalls = responseMessage.tool_calls;

        let toolCalls: AssistantMessage['toolCalls'];

        if (openAIToolCalls) {
            toolCalls = openAIToolCalls.map(tc => {
                if (tc.type !== 'function') {
                    throw new Error(`Unexpected tool type: ${tc.type}`);
                }

                const args = JSON.parse(tc.function.arguments);
                let tool: GameTool;

                switch (tc.function.name) {
                    case 'roll_dice':
                        tool = { name: 'roll_dice', args: args };
                        break;
                    case 'add_inventory':
                        tool = { name: 'add_inventory', args: args };
                        break;
                    case 'update_inventory':
                        tool = { name: 'update_inventory', args: args };
                        break;
                    case 'update_character':
                        tool = { name: 'update_character', args: args };
                        break;
                    case 'get_character_stats':
                        tool = { name: 'get_character_stats', args: {} };
                        break;
                    default:
                        throw new Error(`Unknown tool returned from LLM: ${tc.function.name}`);
                }

                return {
                    id: tc.id,
                    tool
                };
            });
        }

        // Translate OpenAI response to agnostic format
        const agnosticResponse: LLMResponse = {
            message: {
                role: 'assistant',
                content: responseMessage.content,
                toolCalls
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
