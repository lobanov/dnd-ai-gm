import React from 'react';
import { GeneratedDetails } from '@/lib/character-creation';

interface CharacterDetailsStepProps {
    selectedGender: string;
    selectedRace: string;
    selectedClass: string;
    generatedDetails: GeneratedDetails | null;
    isGenerating: boolean;
    error: string | null;
    onGenerate: () => void;
    onBack: () => void;
    onNext: () => void;
}

export function CharacterDetailsStep({
    selectedGender,
    selectedRace,
    selectedClass,
    generatedDetails,
    isGenerating,
    error,
    onGenerate,
    onBack,
    onNext
}: CharacterDetailsStepProps) {
    return (
        <div className="space-y-6">
            {/* Summary of selections */}
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Your Selection
                </h3>
                <div className="text-sm space-y-1">
                    <p><span className="text-slate-500">Gender:</span> <span className="text-slate-200">{selectedGender}</span></p>
                    <p><span className="text-slate-500">Race:</span> <span className="text-slate-200">{selectedRace}</span></p>
                    <p><span className="text-slate-500">Class:</span> <span className="text-slate-200">{selectedClass}</span></p>
                </div>
            </div>

            {isGenerating && (
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Generating character details...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded p-4 text-red-300">
                    <p className="font-bold mb-1">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {generatedDetails && !isGenerating && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                            <div className="bg-slate-950 border border-slate-700 rounded px-4 py-3 text-slate-200">
                                {generatedDetails.name}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Stats</label>
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                {Object.entries(generatedDetails.stats).map(([stat, val]) => (
                                    <div key={stat} className="bg-slate-950 p-2 rounded border border-slate-700">
                                        <span className="text-slate-500 text-xs block">{stat}</span>
                                        <span className="font-bold text-slate-200">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Backstory</label>
                            <div className="bg-slate-950 border border-slate-700 rounded px-4 py-3 text-slate-300 text-sm leading-relaxed">
                                {generatedDetails.backstory}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onBack}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={onGenerate}
                            disabled={isGenerating}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-amber-400 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Regenerate
                        </button>
                        <button
                            onClick={onNext}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                </>
            )}

            {!isGenerating && !generatedDetails && !error && (
                <button
                    onClick={onGenerate}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Generate Details
                </button>
            )}
        </div>
    );
}
