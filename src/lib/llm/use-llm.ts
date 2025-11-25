import { useState, useCallback, useRef } from 'react';
import { Message, LLMClient, AssistantMessage } from './types';

interface UseLLMProps {
    client: LLMClient;
    character: any;
    onMessageReceived?: (message: Message) => void;
    onError?: (error: Error) => void;
}

export function useLLM({ client, character, onMessageReceived, onError }: UseLLMProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef<Message[]>([]);

    // Sync ref with state to access latest messages in async callbacks
    messagesRef.current = messages;

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    const sendMessage = async (content: string) => {
        setIsLoading(true);
        const userMsg: Message = { role: 'user', content };

        // Optimistic update
        const newHistory = [...messagesRef.current, userMsg];
        setMessages(newHistory);

        try {
            const response = await client.sendMessage(newHistory, character);
            const assistantMsg = response.message;

            const currentHistory = [...newHistory, assistantMsg];
            setMessages(currentHistory);
            if (onMessageReceived) onMessageReceived(assistantMsg);

        } catch (error: any) {
            console.error('Conversation error:', error);
            if (onError) onError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        sendMessage,
        isLoading,
        addMessage // Exposed to add initial system/welcome messages
    };
}
