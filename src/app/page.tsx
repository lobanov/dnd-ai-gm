'use client';

import React, { useEffect, useState } from 'react';
import { CharacterSheet } from '@/components/CharacterSheet';
import { ChatInterface } from '@/components/ChatInterface';
import { CharacterCreation } from '@/components/CharacterCreation';
import { useGameStore } from '@/lib/store';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const { isGameStarted, resetGame } = useGameStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isGameStarted) {
    return <CharacterCreation />;
  }

  return (
    <main className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 flex flex-col gap-4 p-4 border-r border-slate-800 bg-slate-950/50 overflow-y-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-amber-500 font-serif tracking-tight">AI Dungeon Master</h1>
          <p className="text-xs text-slate-500">Powered by OpenAI</p>
        </div>

        <CharacterSheet />

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to start a new game? Current progress will be lost.')) {
                resetGame();
              }
            }}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-sm border border-slate-800"
          >
            <RefreshCw size={16} />
            New Game
          </button>

          <div className="text-xs text-slate-600 text-center">
            D&D 5e Compatible System
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 flex flex-col p-4 min-w-0">
        <ChatInterface />
      </section>
    </main>
  );
}
