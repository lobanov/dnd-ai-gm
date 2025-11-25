import React from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    onSend: () => void;
    isLoading: boolean;
}

export function ChatInput({ input, setInput, onSend, isLoading }: ChatInputProps) {
    return (
        <div className="p-4 bg-slate-900 border-t border-slate-800">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSend()}
                    placeholder="What do you do?"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-4 py-2 focus:outline-none focus:border-amber-500 transition-colors"
                    disabled={isLoading}
                />
                <button
                    onClick={onSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
