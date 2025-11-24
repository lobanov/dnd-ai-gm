import React from 'react';
import { useGameStore } from '@/lib/store';
import { getStatModifier } from '@/lib/dnd-rules';
import { StatName } from '@/types/dnd';

export function CharacterSheet() {
    const { character } = useGameStore();

    return (
        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg border border-slate-700 w-full max-w-md space-y-6 font-serif">
            <div className="border-b border-slate-700 pb-4">
                <h2 className="text-2xl font-bold text-amber-500">{character.name}</h2>
                <p className="text-slate-400">Level {character.level} {character.race} {character.class}</p>
                <div className="mt-2 flex items-center gap-4">
                    <div className="bg-red-900/30 px-3 py-1 rounded border border-red-900/50">
                        <span className="text-xs text-red-400 uppercase tracking-wider">HP</span>
                        <div className="text-xl font-bold text-red-200">{character.hp} / {character.maxHp}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {(Object.keys(character.stats) as StatName[]).map((stat) => {
                    const score = character.stats[stat];
                    const mod = getStatModifier(character.stats, stat);
                    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;

                    return (
                        <div key={stat} className="flex flex-col items-center bg-slate-800 p-2 rounded border border-slate-700">
                            <span className="text-xs text-slate-500 font-bold">{stat}</span>
                            <span className="text-xl font-bold">{score}</span>
                            <span className="text-xs bg-slate-700 px-1.5 rounded text-amber-400">{modStr}</span>
                        </div>
                    );
                })}
            </div>

            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Inventory</h3>
                {character.inventory.length === 0 ? (
                    <p className="text-sm text-slate-600 italic">Empty</p>
                ) : (
                    <ul className="space-y-1">
                        {character.inventory.map((item) => (
                            <li key={item.id} className="text-sm flex justify-between items-center bg-slate-800/50 px-2 py-1 rounded">
                                <span>{item.name}</span>
                                <span className="text-slate-500">x{item.quantity}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
