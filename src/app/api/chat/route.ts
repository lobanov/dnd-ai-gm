import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Character, Item, Stats } from '@/types/dnd';

console.log(process.env);

// Define the tools available to the GM
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
            name: 'update_inventory',
            description: 'Add or remove items from the character inventory',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['add', 'remove'],
                        description: 'Whether to add or remove an item'
                    },
                    item: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Name of the item'
                            },
                            description: {
                                type: 'string',
                                description: 'Brief description of the item'
                            },
                            quantity: {
                                type: 'number',
                                description: 'Quantity of the item'
                            }
                        },
                        required: ['name', 'description', 'quantity']
                    }
                },
                required: ['action', 'item']
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
                    hp: {
                        type: 'number',
                        description: 'New HP value (can be positive for healing or negative for damage)'
                    },
                    maxHp: {
                        type: 'number',
                        description: 'New maximum HP value'
                    },
                    level: {
                        type: 'number',
                        description: 'New level'
                    },
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

// Tool execution functions
function executeTool(toolName: string, args: any, character: Character) {
    switch (toolName) {
        case 'get_character_stats':
            return {
                name: character.name,
                class: character.class,
                level: character.level,
                hp: character.hp,
                maxHp: character.maxHp,
                stats: character.stats,
                inventory: character.inventory,
                skills: character.skills
            };

        case 'roll_dice':
            return rollDice(args.dice, args.reason);

        case 'update_inventory':
            return updateInventory(args.action, args.item, character);

        case 'update_character':
            return updateCharacter(args, character);

        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

function rollDice(diceNotation: string, reason: string) {
    // Parse dice notation like "1d20", "2d6+3", "1d20+5"
    const match = diceNotation.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) {
        return { error: 'Invalid dice notation. Use format like "1d20" or "2d6+3"' };
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    return {
        dice: diceNotation,
        reason,
        rolls,
        modifier,
        total,
        description: `Rolled ${diceNotation} for ${reason}: [${rolls.join(', ')}]${modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''} = ${total}`
    };
}

function updateInventory(action: 'add' | 'remove', item: { name: string; description: string; quantity: number }, character: Character) {
    if (action === 'add') {
        const newItem: Item = {
            id: Date.now().toString(),
            name: item.name,
            description: item.description,
            quantity: item.quantity
        };
        return {
            success: true,
            action: 'added',
            item: newItem,
            message: `Added ${item.quantity}x ${item.name} to inventory`
        };
    } else {
        // For removal, we'll mark it for removal and let the frontend handle it
        return {
            success: true,
            action: 'removed',
            itemName: item.name,
            message: `Removed ${item.name} from inventory`
        };
    }
}

function updateCharacter(updates: any, character: Character) {
    const changes: string[] = [];

    if (updates.hp !== undefined) {
        const oldHp = character.hp;
        const newHp = Math.max(0, Math.min(updates.hp, character.maxHp));
        const diff = newHp - oldHp;
        changes.push(`HP: ${oldHp} → ${newHp} (${diff >= 0 ? '+' : ''}${diff})`);
    }

    if (updates.maxHp !== undefined) {
        changes.push(`Max HP: ${character.maxHp} → ${updates.maxHp}`);
    }

    if (updates.level !== undefined) {
        changes.push(`Level: ${character.level} → ${updates.level}`);
    }

    if (updates.stats) {
        const statChanges = Object.entries(updates.stats)
            .filter(([key, _]) => key in character.stats)
            .map(([key, value]) => `${key}: ${character.stats[key as keyof Stats]} → ${value}`);
        changes.push(...statChanges);
    }

    return {
        success: true,
        updates,
        changes,
        message: changes.length > 0 ? `Updated character: ${changes.join(', ')}` : 'No changes made'
    };
}

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
                { error: 'Invalid request body: character is required' },
                { status: 400 }
            );
        }

        const apiKey = getEnv('LLM_API_KEY');
        const model = getEnv('LLM_MODEL');
        const baseURL = getEnv('LLM_ENDPOINT');

        try {
            new URL(baseURL);
        } catch (e) {
            console.error('LLM_ENDPOINT is invalid');
            return NextResponse.json(
                { error: 'LLM_ENDPOINT is not a valid URL.' },
                { status: 500 }
            );
        }

        const openai = new OpenAI({ apiKey, baseURL });

        const systemPrompt = `You are an expert Dungeon Master for a D&D 5e game. 
Your goal is to provide an immersive, text-based roleplaying experience.

Rules:
1. Follow D&D 5e rules for checks and combat where possible in a narrative format.
2. Use the roll_dice tool when skill checks, attack rolls, or damage rolls are needed.
3. Use the update_character tool to modify HP when the player takes damage or heals.
4. Use the update_inventory tool to add items when the player finds loot or purchases items, and to remove items when they are used or sold.
5. Keep descriptions vivid but concise.
6. Manage the story, NPCs, and world state.
7. Do not break character unless explaining a rule.
8. YOU are responsible for rolling dice for NPCs and events using the roll_dice tool.

Available Tools:
- get_character_stats: Get current character information
- roll_dice: Roll dice for any checks, attacks, or damage
- update_inventory: Add or remove items from the character's inventory
- update_character: Modify HP, stats, or level

Current Character:
Name: ${character.name}
Class: ${character.class}
Level: ${character.level}
HP: ${character.hp}/${character.maxHp}`;

        // Prepare messages for the LLM
        let llmMessages = [...messages];

        if (llmMessages.length > 0 && llmMessages[0].role === 'user') {
            // Prepend system prompt to the first user message
            llmMessages[0] = {
                ...llmMessages[0],
                content: `${systemPrompt}\n\n${llmMessages[0].content}`
            };
        } else {
            // Prepend a new user message with the system prompt
            llmMessages.unshift({
                role: 'user',
                content: systemPrompt
            });
        }

        // Make initial request with tools
        let completion = await openai.chat.completions.create({
            model,
            messages: llmMessages,
            tools,
            tool_choice: 'auto',
            temperature: 0.7,
        });

        console.log('LLM Response:', completion);

        const responseMessage = completion.choices[0].message;
        const toolCalls = responseMessage.tool_calls;

        // If the model wants to call tools, execute them
        if (toolCalls && toolCalls.length > 0) {
            // Filter for function tool calls and execute them
            const functionToolCalls = toolCalls.filter(tc => 'function' in tc);

            const toolResults = functionToolCalls.map(toolCall => {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);
                const result = executeTool(toolName, toolArgs, character);

                return {
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: toolName,
                    content: JSON.stringify(result)
                };
            });

            // Add the assistant's message with tool calls to the conversation
            llmMessages.push(responseMessage);

            // Add tool results to the conversation
            llmMessages.push(...toolResults);

            // Make a second request to get the final response
            completion = await openai.chat.completions.create({
                model,
                messages: llmMessages,
                temperature: 0.7,
            });

            console.log('LLM Final Response:', completion);

            // Return both the tool calls and the final message
            return NextResponse.json({
                content: completion.choices[0].message.content,
                role: 'assistant',
                toolCalls: functionToolCalls.map(tc => ({
                    name: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments),
                    result: JSON.parse(toolResults.find(tr => tr.tool_call_id === tc.id)!.content)
                }))
            });
        }

        // No tool calls, return the message as-is
        return NextResponse.json({
            content: responseMessage.content,
            role: 'assistant'
        });
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
