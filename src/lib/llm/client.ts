import OpenAI from 'openai';
import { LLMClient, LLMResponse, Message, GameAction, CharacterUpdates, InventoryUpdates } from './types';
import { GM_RESPONSE_SCHEMA } from './llm-schemas';
import { getGMSystemPrompt } from '@/lib/gm-prompts';
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
    async sendMessage(messages: Message[], character: any): Promise<LLMResponse> {
        try {
            const client = createLLMClient();
            const model = getModel();

            // Generate system prompt with character context
            const systemPrompt = getGMSystemPrompt(character as Character);

            // Translate agnostic messages to OpenAI format
            const openAIMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg: Message) => {
                return {
                    role: msg.role,
                    content: msg.content || ''
                } as OpenAI.Chat.ChatCompletionMessageParam;
            });

            const completion = await client.chat.completions.create({
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
                diceReason: a.diceReason || undefined,
                difficultyClass: a.difficultyClass || undefined
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

            return agnosticResponse;
        } catch (error) {
            console.error('Error sending message to LLM:', error);
            throw error;
        }
    }
}
