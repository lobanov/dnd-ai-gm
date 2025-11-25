import React from 'react';
import { CLASS_PRESETS, RACES } from '@/lib/dnd-rules';

interface CharacterSelectionStepProps {
    selectedGender: string;
    setSelectedGender: (gender: string) => void;
    selectedRace: string;
    setSelectedRace: (race: string) => void;
    selectedClass: string;
    setSelectedClass: (cls: string) => void;
    onNext: () => void;
    onQuickStart?: () => void;
    hasPreviousData?: boolean;
}

const GENDERS = ['Male', 'Female'];
const CLASSES = Object.keys(CLASS_PRESETS);

export function CharacterSelectionStep({
    selectedGender,
    setSelectedGender,
    selectedRace,
    setSelectedRace,
    selectedClass,
    setSelectedClass,
    onNext,
    onQuickStart,
    hasPreviousData
}: CharacterSelectionStepProps) {
    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                    {GENDERS.map((gender) => (
                        <button
                            key={gender}
                            onClick={() => setSelectedGender(gender)}
                            className={`p-3 rounded border transition-all ${selectedGender === gender
                                ? 'bg-amber-900/30 border-amber-500 text-amber-200'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {gender}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Race</label>
                <select
                    value={selectedRace}
                    onChange={(e) => setSelectedRace(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors text-slate-200"
                >
                    {RACES.map((race) => (
                        <option key={race} value={race}>{race}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Class</label>
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
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Starting Stats
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {Object.entries(CLASS_PRESETS[selectedClass]).map(([stat, val]) => (
                        <div key={stat} className="bg-slate-900 p-2 rounded">
                            <span className="text-slate-500 text-xs block">{stat}</span>
                            <span className="font-bold text-slate-200">{val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={onNext}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
                Continue to Character Details
            </button>

            {onQuickStart && (
                <button
                    onClick={onQuickStart}
                    className="w-full bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium py-3 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                >
                    {hasPreviousData
                        ? 'Quick Start (Reuse Previous Character)'
                        : 'Quick Start (Skip Character Generation)'}
                </button>
            )}
        </div>
    );
}
