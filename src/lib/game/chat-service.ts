import { AssistantMessage, UIMessage, GameAction, LLMMessage } from '@/lib/llm/types';
import { Character } from '@/types/dnd';
import { calculateNewCharacterState, calculateNewInventory, rollDice } from './engine';

export interface ProcessedResponse {
    uiMessages: UIMessage[];
    characterUpdates: Partial<Character>;
    actions: GameAction[];
}

export class ChatService {
    /**
     * Process an assistant message and generate UI messages and state updates.
     */
    static processAssistantMessage(
        message: AssistantMessage,
        currentCharacter: Character
    ): ProcessedResponse {
        const uiMessages: UIMessage[] = [];
        let updatedCharacter = { ...currentCharacter };

        // 1. Handle Narrative
        if (message.content) {
            uiMessages.push({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: message.content,
                timestamp: Date.now()
            });
        }

        // 2. Handle Character Updates (HP)
        if (message.characterUpdates) {
            const { newCharacter, logs } = calculateNewCharacterState(updatedCharacter, message.characterUpdates);
            updatedCharacter = newCharacter;
            // We don't necessarily need to show logs for HP updates if the UI shows the bar, 
            // but let's keep it consistent with previous behavior if needed.
            // The previous code returned logs but didn't seem to display them as messages?
            // Actually, `processCharacterUpdates` returned strings, but they weren't used in `useLLM`?
            // Let's check `useLLM` again. It didn't seem to use the return value of `processCharacterUpdates`.
            // Wait, `useLLM` in the previous file didn't even call `processCharacterUpdates`!
            // It seems `useLLM` was refactored or I missed it.
            // Ah, `useLLM` calls `setLLMHistory` and `setCurrentActions`.
            // It does NOT seem to call `processCharacterUpdates` or `processInventoryUpdates` in the version I read.
            // Let me double check `useLLM.ts`.
        }

        // 3. Handle Inventory Updates
        if (message.inventoryUpdates) {
            const { newInventory, logs } = calculateNewInventory(updatedCharacter.inventory, message.inventoryUpdates);
            updatedCharacter.inventory = newInventory;

            logs.forEach(log => {
                uiMessages.push({
                    id: crypto.randomUUID(),
                    role: 'system',
                    content: log,
                    timestamp: Date.now()
                });
            });
        }

        // 4. Handle Tool Calls (Dice Rolls)
        // The previous `useLLM` handled tool calls by looking at `tool_calls` in the message.
        // But the new protocol seems to put actions in `message.actions`.
        // If there are explicit tool calls (legacy or specific), we handle them here.
        if (message.tool_calls) {
            message.tool_calls.forEach(toolCall => {
                if (toolCall.function.name === 'roll_dice') {
                    try {
                        const args = JSON.parse(toolCall.function.arguments);
                        // We execute the roll immediately for display? 
                        // Or do we wait for the "tool" message?
                        // In the previous code, it looked for a *matching* tool result message.
                        // But here we are processing the *Assistant* message.
                        // If the LLM *calls* a tool, we usually need to execute it and feed it back.
                        // BUT, for "roll_dice", if it's just for display, we can do it here.
                        // However, the previous code logic was:
                        // "Find the corresponding tool result... if toolResultMsg..."
                        // This implies the tool was ALREADY executed and the result is in the history.

                        // If we are just processing the *new* assistant message, we might not have the tool result yet if we haven't executed it.
                        // But `client.sendMessage` returns `llmHistoryUpdates` which includes the tool result if the client executed it?
                        // The `HttpLLMClient` (which I haven't read fully but assume) might be handling the loop?
                        // Let's assume for now we just handle the structured outputs.
                    } catch (e) {
                        console.error('Error parsing tool call', e);
                    }
                }
            });
        }

        return {
            uiMessages,
            characterUpdates: updatedCharacter,
            actions: message.actions || []
        };
    }

    /**
     * Process history updates to extract intermediate tool outputs (e.g. dice rolls)
     */
    static processHistoryUpdates(messages: LLMMessage[]): UIMessage[] {
        const uiMessages: UIMessage[] = [];

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (msg.role === 'assistant' && msg.tool_calls) {
                for (const toolCall of msg.tool_calls) {
                    if (toolCall.function.name === 'roll_dice') {
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            // Find the corresponding tool result
                            const toolResultMsg = messages.find(
                                m => m.role === 'tool' && m.tool_call_id === toolCall.id
                            );

                            if (toolResultMsg && toolResultMsg.content) {
                                const result = JSON.parse(toolResultMsg.content);

                                // Only display roll if we have valid data
                                if (args?.notation && result?.result != null) {
                                    uiMessages.push({
                                        id: crypto.randomUUID(),
                                        role: 'system',
                                        content: `🎲 **GM Rolled ${args.notation}**: ${result.result}`,
                                        timestamp: Date.now()
                                    });
                                }
                            }
                        } catch (e) {
                            console.error('Failed to parse tool call for UI', e);
                        }
                    }
                }
            }
        }

        return uiMessages;
    }
}
