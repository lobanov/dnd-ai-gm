'use client'

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGameStore } from '@/lib/store';
import { GameState, Message } from '@/types/dnd';
import { getInitialAdventurePrompt } from '@/lib/gm-prompts';

export function ChatInterface() {
    const { chatHistory, addMessage, character } = useGameStore();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    useEffect(() => {
        const initGame = async () => {
            if (chatHistory.length === 0 && !hasInitialized.current) {
                hasInitialized.current = true;
                setIsLoading(true);

                try {
                    const initialPrompt = getInitialAdventurePrompt(character);

                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: [{
                                role: 'user',
                                content: initialPrompt
                            }],
                            character: character  // Send character state
                        }),
                    });

                    if (!response.ok) throw new Error('Failed to get response');

                    const data = await response.json();

                    const aiMsg: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'assistant',
                        content: data.content,
                        timestamp: Date.now(),
                        meta: { type: 'narration' }
                    };

                    addMessage(aiMsg);
                } catch (error) {
                    console.error(error);
                    const errorMsg: Message = {
                        id: (Date.now() + 1).toString(),
                        role: 'system',
                        content: 'Error: Could not connect to the Game Master. Please check your configuration.',
                        timestamp: Date.now(),
                    };
                    addMessage(errorMsg);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        initGame();
    }, [chatHistory.length, character, addMessage]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };

        addMessage(userMsg);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare context for AI
            // Filter out system messages (like errors) to avoid breaking role alternation
            let contextMessages = chatHistory
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            // If history starts with assistant (due to auto-start), prepend the initial prompt
            // to ensure User -> Assistant -> User flow
            if (contextMessages.length > 0 && contextMessages[0].role === 'assistant') {
                const initialPrompt = getInitialAdventurePrompt(character);

                contextMessages.unshift({
                    role: 'user',
                    content: initialPrompt
                });
            }

            // Add the new user message
            contextMessages.push({
                role: userMsg.role,
                content: userMsg.content
            });

            // Sanitize messages to ensure strict User -> Assistant -> User alternation
            // This handles cases where we might have consecutive user messages (e.g. after an error)
            const sanitizedMessages: { role: string; content: string }[] = [];
            for (const msg of contextMessages) {
                if (sanitizedMessages.length === 0) {
                    sanitizedMessages.push({ ...msg });
                } else {
                    const lastMsg = sanitizedMessages[sanitizedMessages.length - 1];
                    if (lastMsg.role === msg.role) {
                        // Merge consecutive messages with same role
                        lastMsg.content += `\n\n${msg.content}`;
                    } else {
                        sanitizedMessages.push({ ...msg });
                    }
                }
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: sanitizedMessages,
                    character: character  // Send character state with every request
                }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: Date.now(),
                meta: data.toolCalls ? {
                    type: 'tool',
                    toolCalls: data.toolCalls
                } : { type: 'narration' }
            };

            addMessage(aiMsg);

            // Apply tool call effects to the character state
            if (data.toolCalls) {
                for (const toolCall of data.toolCalls) {
                    if (toolCall.name === 'update_inventory' && toolCall.result.success) {
                        const { addItem, character, updateCharacter } = useGameStore.getState();

                        // Process each item in the results array
                        for (const itemResult of toolCall.result.results) {
                            if (itemResult.action === 'added') {
                                addItem(itemResult.item);
                            } else if (itemResult.action === 'removed') {
                                updateCharacter({
                                    inventory: character.inventory.filter(i => i.name !== itemResult.itemName)
                                });
                            }
                        }
                    } else if (toolCall.name === 'update_character' && toolCall.result.success) {
                        const { updateCharacter } = useGameStore.getState();
                        updateCharacter(toolCall.result.updates);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: 'Error: Could not connect to the Game Master. Please check your configuration.',
                timestamp: Date.now(),
            };
            addMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
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
                                    {msg.meta.toolCalls.map((toolCall, idx) => (
                                        <div key={idx} className="bg-slate-950/50 border border-amber-900/30 rounded px-3 py-2 text-sm">
                                            <div className="flex items-center gap-2 text-amber-400 font-mono">
                                                <span className="text-amber-500">🛠️</span>
                                                <span className="font-bold">{toolCall.name}</span>
                                            </div>
                                            {toolCall.name === 'roll_dice' && toolCall.result.description && (
                                                <div className="mt-1 text-amber-300 flex items-center gap-2">
                                                    <span className="text-xl">🎲</span>
                                                    <span>{toolCall.result.description}</span>
                                                </div>
                                            )}
                                            {toolCall.name === 'update_inventory' && toolCall.result.message && (
                                                <div className="mt-1 text-blue-300 flex items-center gap-2">
                                                    <span>{toolCall.result.action === 'added' ? '📦' : '❌'}</span>
                                                    <span>{toolCall.result.message}</span>
                                                </div>
                                            )}
                                            {toolCall.name === 'update_character' && toolCall.result.message && (
                                                <div className="mt-1 text-green-300 flex items-center gap-2">
                                                    <span>✨</span>
                                                    <span>{toolCall.result.message}</span>
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
                                    {msg.content}
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
