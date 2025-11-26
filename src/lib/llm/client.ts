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
                        // Cast to any to avoid TS issues with the specific OpenAI version types
                        const tc = toolCall as any;
                        if (tc.function && tc.function.name === 'roll_dice') {
                            const args = JSON.parse(tc.function.arguments);
                            // Simple dice roller implementation
                            // In a real app, we might want a shared dice service
                            // For now, just parse and roll
                            // Assuming simple XdY+Z format
                            // This is a placeholder logic for the tool execution
                            const rollResult = Math.floor(Math.random() * 20) + 1; // Simplified d20

                            const toolMsg: OpenAI.Chat.ChatCompletionToolMessageParam = {
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify({ result: rollResult, details: `Rolled ${args.notation} for ${args.reason}` })
                            };
                            currentMessages.push(toolMsg);

                            newLLMMessages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: toolMsg.content as string
                            });
                        }
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

            const actions: GameAction[] = parsedActions.actions.map((a: any) => {
                // Helper to check if a value is valid (not null, undefined, NaN, or "NaN")
                const isValid = (val: any) => val != null && val !== 'NaN' && val !== '';

                // Parse difficulty class, ensuring it's a valid number
                let dc: number | undefined = undefined;
                if (isValid(a.difficultyClass)) {
                    const parsed = parseInt(String(a.difficultyClass), 10);
                    dc = !isNaN(parsed) ? parsed : undefined;
                }

                return {
                    id: a.id,
                    description: a.description,
                    diceRoll: isValid(a.diceRoll) ? a.diceRoll : undefined,
                    diceReason: isValid(a.diceReason) ? a.diceReason : undefined,
                    difficultyClass: dc
                };
            });

            // Construct response
            const response: LLMResponse = {
                message: {
                    role: 'assistant',
                    content: narrative,
                    actions: actions,
                    // Character/Inventory updates are currently not in the narrative schema
                    // We might need to parse them from text or add them to Phase 2 schema if needed
                    // For now, assuming they are handled via tools or separate logic if we want them back
                    // The prompt says "narrative only" for Phase 1 and "actions" for Phase 2.
                    // If we need state updates, we should add them to Phase 2 schema.
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
