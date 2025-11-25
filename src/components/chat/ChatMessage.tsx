import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2 } from 'lucide-react';
import { Message as DndMessage } from '@/types/dnd';

interface ChatMessageProps {
    message: DndMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
    return (
        <div
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className={`max-w-[80%] p-4 rounded-lg ${message.role === 'user'
                    ? 'bg-indigo-900/50 text-indigo-100 border border-indigo-800'
                    : message.role === 'system'
                        ? 'bg-red-900/20 text-red-400 border border-red-900/30 text-sm font-mono'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 font-serif leading-relaxed'
                    }`}
            >
                {/* Display tool calls if present */}
                {message.meta?.toolCalls && message.meta.toolCalls.length > 0 && (
                    <div className="mb-3 space-y-2">
                        {message.meta.toolCalls.map((toolCall: any, idx: number) => (
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
                {message.role === 'user' ? (
                    message.content
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
                        {message.content || ''}
                    </ReactMarkdown>
                )}
            </div>
        </div>
    );
}
