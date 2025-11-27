import OpenAI from 'openai';
import { LLMClient, LLMResponse, LLMMessage, GameAction } from './types';
import { GM_ACTIONS_SCHEMA } from './llm-schemas';
import { getNarrativeSystemPrompt, getActionsSystemPrompt } from '@/lib/gm-prompts';
import { Character } from '@/types/dnd';

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

export class HttpLLMClient implements LLMClient {
    async sendMessage(history: LLMMessage[], character: any): Promise<LLMResponse> {
        try {
            const client = createLLMClient();
            const model = getModel();

            // --- Phase 1: Narrative Generation ---

            // 1. Prepare messages for narrative generation
            const narrativeSystemPrompt = getNarrativeSystemPrompt(character as Character);

            // Convert LLMMessage[] to OpenAI format
            let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: narrativeSystemPrompt },
                ...history.map(msg => {
                    if (msg.role === 'tool') {
                        return {
                            role: 'tool',
                            content: msg.content,
                            tool_call_id: msg.tool_call_id
                        } as OpenAI.Chat.ChatCompletionToolMessageParam;
                    }
                    if (msg.role === 'assistant' && msg.tool_calls) {
                        return {
                            role: 'assistant',
                            content: msg.content,
                            tool_calls: msg.tool_calls
                        } as OpenAI.Chat.ChatCompletionAssistantMessageParam;
                    }
                    return {
                        role: msg.role as 'user' | 'assistant' | 'system',
                        content: msg.content
                    } as OpenAI.Chat.ChatCompletionMessageParam;
                })
            ];

            // Track new messages generated during this turn (for history updates)
            const newLLMMessages: LLMMessage[] = [];

            let narrative = '';
            let finishedNarrative = false;

            // Track state updates from tools
            let characterUpdates: any = {};
            let inventoryUpdates: any = { add: [], remove: [] };

            // Tool loop for narrative phase
            while (!finishedNarrative) {
                const completion = await client.chat.completions.create({
                    model,
                    messages: currentMessages,
                    tools: [
                        {
                            type: 'function',
                            function: {
                                name: 'roll_dice',
                                description: 'Roll dice for an NPC or event. Do NOT use for player actions (those are already rolled).',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        notation: { type: 'string', description: 'Dice notation (e.g. "1d20+5")' },
                                        reason: { type: 'string', description: 'Reason for the roll' }
                                    },
                                    required: ['notation', 'reason']
                                }
                            }
                        },
                        {
                            type: 'function',
                            function: {
                                name: 'update_hp',
                                description: 'Update character HP (damage or healing).',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        hp: { type: 'number', description: 'New HP value' },
                                        reason: { type: 'string', description: 'Reason for change' }
                                    },
                                    required: ['hp', 'reason']
                                }
                            }
                        },
                        {
                            type: 'function',
                            function: {
                                name: 'update_inventory',
                                description: 'Add or remove items from inventory.',
                                parameters: {
                                    type: 'object',
                                    properties: {
                                        add: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    description: { type: 'string' },
                                                    quantity: { type: 'number' }
                                                },
                                                required: ['name', 'description', 'quantity']
                                            }
                                        },
                                        remove: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    slug: { type: 'string', description: 'Item name/slug to remove' },
                                                    quantityChange: { type: 'number', description: 'Negative number for removal amount' }
                                                },
                                                required: ['slug', 'quantityChange']
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    tool_choice: 'auto',
                    temperature: 0.7,
                });

                const message = completion.choices[0].message;

                // Handle Tool Calls
                if (message.tool_calls && message.tool_calls.length > 0) {
                    // Add assistant message with tool calls to history
                    const assistantMsg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
                        role: 'assistant',
                        content: message.content,
                        tool_calls: message.tool_calls
                    };
                    currentMessages.push(assistantMsg);

                    newLLMMessages.push({
                        role: 'assistant',
                        content: message.content,
                        tool_calls: message.tool_calls as any // Cast to our internal type
                    });

                    // Execute tools
                    for (const toolCall of message.tool_calls) {
                        const tc = toolCall as any;
                        const args = JSON.parse(tc.function.arguments);
                        let toolResultContent = '';

                        if (tc.function.name === 'roll_dice') {
                            const rollResult = Math.floor(Math.random() * 20) + 1; // Simplified d20
                            toolResultContent = JSON.stringify({ result: rollResult, details: `Rolled ${args.notation} for ${args.reason}` });
                        } else if (tc.function.name === 'update_hp') {
                            characterUpdates.hp = args.hp;
                            toolResultContent = JSON.stringify({ success: true, message: `HP updated to ${args.hp}` });
                        } else if (tc.function.name === 'update_inventory') {
                            if (args.add) inventoryUpdates.add.push(...args.add);
                            if (args.remove) inventoryUpdates.remove.push(...args.remove);
                            toolResultContent = JSON.stringify({ success: true, message: 'Inventory updated' });
                        }

                        const toolMsg: OpenAI.Chat.ChatCompletionToolMessageParam = {
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: toolResultContent
                        };
                        currentMessages.push(toolMsg);

                        newLLMMessages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: toolMsg.content as string
                        });
                    }
                } else {
                    // No tool calls, we have our narrative
                    narrative = message.content || '';
                    finishedNarrative = true;

                    // Add final narrative to history for Phase 2
                    currentMessages.push({
                        role: 'assistant',
                        content: narrative
                    });

                    newLLMMessages.push({
                        role: 'assistant',
                        content: narrative
                    });
                }
            }

            // --- Phase 2: Action Generation ---

            const actionsSystemPrompt = getActionsSystemPrompt(character as Character);

            // Prepare messages for action generation
            // We use the full history including the just-generated narrative
            const actionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: actionsSystemPrompt },
                ...currentMessages.slice(1) // Skip the narrative system prompt, keep the rest
            ];

            const actionCompletion = await client.chat.completions.create({
                model,
                messages: actionMessages,
                response_format: GM_ACTIONS_SCHEMA,
                temperature: 0.7,
            });

            const actionContent = actionCompletion.choices[0].message.content;
            if (!actionContent) {
                throw new Error('No content received from LLM for actions');
            }

            let parsedActions;
            try {
                parsedActions = JSON.parse(actionContent);
            } catch (e) {
                console.error('Failed to parse LLM actions response:', actionContent);
                throw new Error('Invalid JSON response from LLM');
            }

            const actions: GameAction[] = parsedActions.actions.map((a: any, idx: number) => {
                // Helper to check if a value is valid (not null, undefined, NaN, or "NaN")
                const isValid = (val: any) => val != null && val !== 'NaN' && val !== '';

                const { description, diceRoll } = a;
                const actionId = `action-${idx}`;
                if (diceRoll) {
                    const notation = isValid(diceRoll.notation) ? diceRoll.notation : undefined;
                    const reason = isValid(diceRoll.reason) ? diceRoll.reason : undefined;
                    const dc = isValid(diceRoll.dc) ? parseInt(diceRoll.dc) : undefined;
                    return {
                        id: actionId,
                        description,
                        diceRoll: notation,
                        diceReason: reason,
                        difficultyClass: dc
                    };
                }
                return {
                    id: actionId,
                    description,
                };
            });

            // Construct response
            const response: LLMResponse = {
                message: {
                    role: 'assistant',
                    content: narrative,
                    actions: actions,
                    characterUpdates: Object.keys(characterUpdates).length > 0 ? characterUpdates : undefined,
                    inventoryUpdates: (inventoryUpdates.add.length > 0 || inventoryUpdates.remove.length > 0) ? inventoryUpdates : undefined
                },
                llmHistoryUpdates: newLLMMessages
            };

            return response;

        } catch (error) {
            console.error('Error sending message to LLM:', error);
            throw error;
        }
    }
}
