import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useGameStore } from '@/lib/store';
import { getInitialAdventurePrompt } from '@/lib/gm-prompts';
import { useLLM } from '@/lib/llm/use-llm';
import { HttpLLMClient } from '@/lib/llm/client';
import { UIMessage } from '@/lib/llm/types';
import { ChatMessage } from './chat/ChatMessage';
import { ChatInput } from './chat/ChatInput';
import { ActionSelector } from './chat/ActionSelector';

export function ChatInterface() {
    const { chatHistory, addUIMessage, removeUIMessage, character, setting, setCurrentActions, currentActions } = useGameStore();
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    // Initialize LLM client
    const client = useMemo(() => new HttpLLMClient(), []);

    const { sendMessage, isLoading } = useLLM({
        client,
        onError: (error) => {
            const errorMsg: UIMessage = {
                id: Date.now().toString(),
                role: 'system',
                content: `Error: ${error.message}`,
                timestamp: Date.now(),
            };
            addUIMessage(errorMsg);
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
                // We send the initial prompt as a user message (invisible or system) or just trigger the GM
                // Actually, getInitialAdventurePrompt returns a prompt string.
                // We want the GM to start.
                // In the new flow, we just send a message.
                // But wait, the initial prompt is usually a system instruction or a user "Start game" trigger.
                // The `getInitialAdventurePrompt` generates a prompt for the *User* to send to the GM to start.
                await sendMessage(initialPrompt, { hidden: true });
            }
        };

        initGame();
    }, [chatHistory.length, character, setting, sendMessage]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const content = input;
        setInput('');

        // sendMessage now handles adding the user message to the store
        await sendMessage(content);
    };

    const handleActionSelect = async (actionId: string, actionText: string, diceTotal?: number) => {
        if (isLoading) return;

        // Construct simple action message
        const content = diceTotal
            ? `I choose action: "${actionText}" (Rolled: ${diceTotal})`
            : `I choose action: "${actionText}"`;

        setCurrentActions([]); // Clear actions while waiting

        // sendMessage now handles adding the user message to the store
        await sendMessage(content);
    };

    const handleRetry = async (errorMessage: UIMessage) => {
        // Find the user message that preceded this error
        const errorIndex = chatHistory.findIndex(m => m.id === errorMessage.id);
        if (errorIndex <= 0) return; // No previous message or error not found

        // Find the last user message before the error
        let userMessageIndex = errorIndex - 1;
        while (userMessageIndex >= 0 && chatHistory[userMessageIndex].role !== 'user') {
            userMessageIndex--;
        }

        if (userMessageIndex < 0) return; // No user message found

        const userMessage = chatHistory[userMessageIndex];

        // Remove both the error message and the original user message
        removeUIMessage(errorMessage.id);
        removeUIMessage(userMessage.id);

        // Resend the user's message (this will add a new user message)
        await sendMessage(userMessage.content);
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
                        message={msg as any} // Cast to any or compatible type if needed
                        isLastMessage={idx === chatHistory.length - 1}
                        onRetry={handleRetry}
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

                {/* Show Actions inline in history if available */}
                {currentActions.length > 0 && (
                    <div className="mt-4">
                        <ActionSelector
                            actions={currentActions}
                            onActionSelect={handleActionSelect}
                        />
                    </div>
                )}
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <ChatInput
                    onSend={handleSend}
                    isLoading={isLoading}
                    input={input}
                    setInput={setInput}
                    disabled={isLoading || currentActions.length > 0}
                    placeholder={currentActions.length > 0 ? "Select an action above..." : "What do you do?"}
                />
            </div>
        </div>
    );
}

