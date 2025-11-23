import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Character, Item, Stats } from '@/types/dnd';
import { GM_TOOLS, getGMSystemPrompt } from '@/lib/gm-prompts';

console.log(process.env);

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
            return updateInventory(args.action, args.items, character);

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

function updateInventory(action: 'add' | 'remove', items: { name: string; description: string; quantity: number }[], character: Character) {
    const results: any[] = [];
    const itemsSummary: string[] = [];

    for (const item of items) {
        if (action === 'add') {
            const newItem: Item = {
                id: `${Date.now()}-${Math.random()}`,
                name: item.name,
                description: item.description,
                quantity: item.quantity
            };
            results.push({
                success: true,
                action: 'added',
                item: newItem
            });
            itemsSummary.push(`${item.quantity}x ${item.name}`);
        } else {
            results.push({
                success: true,
                action: 'removed',
                itemName: item.name
            });
            itemsSummary.push(item.name);
        }
    }

    return {
        success: true,
        action,
        results,
        message: `${action === 'add' ? 'Added' : 'Removed'} ${itemsSummary.join(', ')} ${action === 'add' ? 'to' : 'from'} inventory`
    };
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

        const systemPrompt = getGMSystemPrompt(character);

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
            tools: GM_TOOLS,
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
