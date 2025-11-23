import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { CLASS_PRESETS, INITIAL_CHARACTER } from '@/lib/dnd-rules';
import { Character } from '@/types/dnd';

const CLASSES = Object.keys(CLASS_PRESETS);

export function CharacterCreation() {
    const { setCharacter, startGame } = useGameStore();
    const [name, setName] = useState('');
    const [selectedClass, setSelectedClass] = useState(CLASSES[0]);

    const handleStart = () => {
        if (!name.trim()) return;

        const stats = CLASS_PRESETS[selectedClass];

        // Simple HP calculation: Base 10 + CON mod
        const conMod = Math.floor((stats.CON - 10) / 2);
        const hp = 10 + conMod;

        const newCharacter: Character = {
            ...INITIAL_CHARACTER,
            name: name.trim(),
            class: selectedClass,
            stats: stats,
            hp: hp,
            maxHp: hp,
        };

        setCharacter(newCharacter);
        startGame();
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-slate-200 p-4">
            <div className="w-full max-w-md space-y-8 p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-amber-500 font-serif mb-2">Create Character</h1>
                    <p className="text-slate-400">Begin your adventure</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-2 focus:outline-none focus:border-amber-500 transition-colors"
                            placeholder="Enter character name..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Class</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CLASSES.map((cls) => (
                                <button
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`p-3 rounded border transition-all ${selectedClass === cls
                                            ? 'bg-amber-900/30 border-amber-500 text-amber-200'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {cls}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded border border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Starting Stats</h3>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            {Object.entries(CLASS_PRESETS[selectedClass]).map(([stat, val]) => (
                                <div key={stat} className="bg-slate-900 p-1 rounded">
                                    <span className="text-slate-500 text-xs block">{stat}</span>
                                    <span className="font-bold text-slate-200">{val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    disabled={!name.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Start Adventure
                </button>
            </div>
        </div>
    );
}
