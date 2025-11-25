'use client'

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGameStore } from '@/lib/store';
import { Message as DndMessage } from '@/types/dnd';
import { getInitialAdventurePrompt } from '@/lib/gm-prompts';
import { useLLM } from '@/lib/llm/use-llm';
import { HttpLLMClient } from '@/lib/llm/client';
import { Message as LLMMessage } from '@/lib/llm/types';
import { convertLlmMessageToDndMessage, updateMessageWithToolResult } from '@/lib/chat-logic';

export function ChatInterface() {
    const { chatHistory, addMessage, updateMessage, character, setting } = useGameStore();
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
        } else if (message.role === 'tool') {
            const store = useGameStore.getState();
            const updateResult = updateMessageWithToolResult(store.chatHistory, message.toolCallId, message.content);

            if (updateResult) {
                updateMessage(updateResult.message.id, {
                    meta: updateResult.message.meta
                });
            }
        }
    };

    const { sendMessage, isLoading } = useLLM({
        client,
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
                // We send this as a user message to kickstart the LLM, but we might not want to show it as a user bubble?
                // The original code sent it as a user message but didn't add it to the store, 
                // effectively treating it as a system/hidden prompt.
                // useLLM adds the message to its history.
                // We can just call sendMessage. If we don't want it in the UI, we just don't add it to GameStore.
                // However, useLLM doesn't expose a way to send "hidden" messages easily without modifying history directly.
                // But wait, useLLM.sendMessage adds to its internal state.
                // If we want the *response* to show up, we need to call sendMessage.
                // If we don't want the *prompt* to show up in UI, we just don't call addMessage(userMsg) for it.
                // Since handleMessageReceived only handles assistant/tool messages, the user message won't be added automatically.
                // So we just call sendMessage(initialPrompt).

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

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 rounded-lg overflow-hidden border border-slate-800">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && !isLoading && (
                    <div className="text-center text-slate-500 mt-10 italic">
                        The adventure begins...
                    </div>
                )}
                {chatHistory.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-4 rounded-lg ${msg.role === 'user'
                                ? 'bg-indigo-900/50 text-indigo-100 border border-indigo-800'
                                : msg.role === 'system'
                                    ? 'bg-red-900/20 text-red-400 border border-red-900/30 text-sm font-mono'
                                    : 'bg-slate-900 text-slate-300 border border-slate-800 font-serif leading-relaxed'
                                }`}
                        >
                            {/* Display tool calls if present */}
                            {msg.meta?.toolCalls && msg.meta.toolCalls.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {msg.meta.toolCalls.map((toolCall: any, idx: number) => (
                                        <div key={idx} className="bg-slate-950/50 border border-amber-900/30 rounded px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2 text-amber-400 font-mono">
                                                <span className="text-amber-500">🛠️</span>
                                                <span className="font-bold">{toolCall.name}</span>
                                            </div>
                                            {/* Only show result if it exists */}
                                            {toolCall.result && (
                                                <>
                                                    {toolCall.name === 'roll_dice' && toolCall.result.description && (
                                                        <div className="mt-1 text-amber-300 flex items-center gap-2">
                                                            <span className="text-xl">🎲</span>
                                                            <span>{toolCall.result.description}</span>
                                                        </div>
                                                    )}
                                                    {(toolCall.name === 'update_inventory' || toolCall.name === 'add_inventory') && toolCall.result.message && (
                                                        <div className="mt-1 text-blue-300 flex items-center gap-2">
                                                            <span>📦</span>
                                                            <span>{toolCall.result.message}</span>
                                                        </div>
                                                    )}
                                                    {toolCall.name === 'update_character' && toolCall.result.message && (
                                                        <div className="mt-1 text-green-300 flex items-center gap-2">
                                                            <span>✨</span>
                                                            <span>{toolCall.result.message}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {!toolCall.result && (
                                                <div className="mt-1 text-slate-500 italic flex items-center gap-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span>Executing...</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }: any) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                                        h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold text-amber-500 mb-4 mt-6 font-serif border-b border-amber-500/20 pb-2" {...props} />,
                                        h2: ({ node, ...props }: any) => <h2 className="text-xl font-bold text-amber-400 mb-3 mt-5 font-serif" {...props} />,
                                        h3: ({ node, ...props }: any) => <h3 className="text-lg font-bold text-amber-300 mb-2 mt-4 font-serif" {...props} />,
                                        ul: ({ node, ...props }: any) => <ul className="list-disc list-outside ml-6 mb-4 space-y-1 marker:text-amber-500/50" {...props} />,
                                        ol: ({ node, ...props }: any) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 marker:text-amber-500/50" {...props} />,
                                        li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                                        blockquote: ({ node, ...props }: any) => <blockquote className="border-l-4 border-amber-500/30 pl-4 italic text-slate-400 my-4 bg-slate-950/30 py-2 pr-2 rounded-r" {...props} />,
                                        strong: ({ node, ...props }: any) => <strong className="font-bold text-amber-200" {...props} />,
                                        em: ({ node, ...props }: any) => <em className="text-slate-200 italic" {...props} />,
                                        code: ({ node, ...props }: any) => <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono text-sm border border-slate-800" {...props} />,
                                        table: ({ node, ...props }: any) => <div className="overflow-x-auto my-4 rounded border border-slate-800"><table className="w-full text-left text-sm" {...props} /></div>,
                                        thead: ({ node, ...props }: any) => <thead className="bg-slate-950 text-amber-500 font-bold" {...props} />,
                                        tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-slate-800" {...props} />,
                                        tr: ({ node, ...props }: any) => <tr className="hover:bg-slate-800/50 transition-colors" {...props} />,
                                        th: ({ node, ...props }: any) => <th className="px-4 py-2" {...props} />,
                                        td: ({ node, ...props }: any) => <td className="px-4 py-2" {...props} />,
                                    }}
                                >
                                    {msg.content || ''}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
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

            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="What do you do?"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-4 py-2 focus:outline-none focus:border-amber-500 transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
