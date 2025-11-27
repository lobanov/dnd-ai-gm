import { useState } from 'react';
import { LLMClient, UIMessage, LLMMessage } from './types';
import { useGameStore } from '@/lib/store';
import { ChatService } from '@/lib/game/chat-service';

interface UseLLMProps {
    client: LLMClient;
    onError?: (error: Error) => void;
}

export function useLLM({ client, onError }: UseLLMProps) {
    const [isLoading, setIsLoading] = useState(false);

    const {
        character,
        llmHistory,
        addUIMessage,
        addLLMMessage,
        setLLMHistory,
        setCurrentActions,
        updateCharacter
    } = useGameStore();

    const sendMessage = async (content: string, options?: { hidden?: boolean }) => {
        if (!content.trim()) return;

        setIsLoading(true);

        // 1. Add User Message to UI and LLM history
        const userUIMsg: UIMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now()
        };

        const userLLMMsg: LLMMessage = {
            role: 'user',
            content
        };

        if (!options?.hidden) {
            addUIMessage(userUIMsg);
        }
        addLLMMessage(userLLMMsg);

        try {
            // 2. Call LLM with updated history
            const currentLLMHistory = [...llmHistory, userLLMMsg];
            const response = await client.sendMessage(currentLLMHistory, character);

            // 3. Update LLM History
            const newLLMMessages = response.llmHistoryUpdates;
            setLLMHistory([...currentLLMHistory, ...newLLMMessages]);

            // 4. Process History Updates (Dice Rolls)
            const historyUIMessages = ChatService.processHistoryUpdates(newLLMMessages);
            historyUIMessages.forEach(msg => addUIMessage(msg));

            // 5. Process Assistant Response (Narrative, Actions, State Updates)
            const { uiMessages, characterUpdates, actions } = ChatService.processAssistantMessage(
                response.message,
                character
            );

            // Apply updates
            uiMessages.forEach(msg => addUIMessage(msg));
            if (Object.keys(characterUpdates).length > 0) {
                updateCharacter(characterUpdates);
            }
            setCurrentActions(actions);

        } catch (error: any) {
            console.error('Conversation error:', error);
            if (onError) onError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        sendMessage,
        isLoading
    };
}
