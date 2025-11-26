import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useGameStore } from '@/lib/store';
import { Message as DndMessage } from '@/types/dnd';
import { getInitialAdventurePrompt } from '@/lib/gm-prompts';
import { useLLM } from '@/lib/llm/use-llm';
import { HttpLLMClient } from '@/lib/llm/client';
import { Message as LLMMessage } from '@/lib/llm/types';
import { convertLlmMessageToDndMessage, processCharacterUpdates, processInventoryUpdates } from '@/lib/chat-logic';
import { ChatMessage } from './chat/ChatMessage';
import { ChatInput } from './chat/ChatInput';

export function ChatInterface() {
    const { chatHistory, addMessage, character, setting, setCurrentActions } = useGameStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    // Initialize LLM client
    const client = useMemo(() => new HttpLLMClient(), []);

    // Callback to sync LLM messages to GameStore
    const handleMessageReceived = (message: LLMMessage) => {
        if (message.role === 'assistant') {
            const aiMsg = convertLlmMessageToDndMessage(message);
            addMessage(aiMsg);

            // Update store with available actions
            if (message.actions) {
                setCurrentActions(message.actions);
            }

            // Process updates
            const store = useGameStore.getState();
            if (message.characterUpdates) {
                processCharacterUpdates(message.characterUpdates, store);
            }
            if (message.inventoryUpdates) {
                processInventoryUpdates(message.inventoryUpdates, store);
            }
        }
    };

    const { sendMessage, isLoading } = useLLM({
        client,
        character,
        onMessageReceived: handleMessageReceived,
        onError: (error) => {
            const errorMsg: DndMessage = {
                id: Date.now().toString(),
                role: 'system',
                content: `Error: ${error.message}`,
                timestamp: Date.now(),
            };
            addMessage(errorMsg);
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    useEffect(() => {
        const initGame = async () => {
            if (chatHistory.length === 0 && !hasInitialized.current) {
                hasInitialized.current = true;
                const initialPrompt = getInitialAdventurePrompt(character, setting);
                await sendMessage(initialPrompt);
            }
        };

        initGame();
    }, [chatHistory.length, character, setting, sendMessage]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: DndMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };

        addMessage(userMsg);
        setInput('');

        await sendMessage(input);
    };

    const handleActionSelect = async (actionId: string, actionText: string, diceTotal?: number) => {
        if (isLoading) return;

        // Construct simple action message
        const content = diceTotal
            ? `I choose action: "${actionText}" (Rolled: ${diceTotal})`
            : `I choose action: "${actionText}"`;

        const userMsg: DndMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: content,
            timestamp: Date.now(),
        };

        addMessage(userMsg);
        setCurrentActions([]); // Clear actions while waiting

        await sendMessage(content);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 rounded-lg overflow-hidden border border-slate-800">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && !isLoading && (
                    <div className="text-center text-slate-500 mt-10 italic">
                        The adventure begins...
                    </div>
                )}
                {chatHistory.map((msg, idx) => (
                    <ChatMessage
                        key={msg.id}
                        message={msg}
                        isLastMessage={idx === chatHistory.length - 1}
                        onActionSelect={handleActionSelect}
                    />
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                            <span className="text-slate-500 text-sm italic">The GM is thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Only show text input if no actions are available (e.g. initial setup or error recovery) */}
            {(!chatHistory.length || chatHistory[chatHistory.length - 1]?.meta?.type !== 'action_request') && (
                <ChatInput
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}

