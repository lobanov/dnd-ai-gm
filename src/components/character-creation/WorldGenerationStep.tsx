import React from 'react';
import { GeneratedDetails, GeneratedWorld } from '@/lib/character-creation';

interface WorldGenerationStepProps {
    generatedDetails: GeneratedDetails;
    selectedRace: string;
    selectedClass: string;
    generatedWorld: GeneratedWorld | null;
    isGenerating: boolean;
    error: string | null;
    onGenerate: () => void;
    onBack: () => void;
    onStartAdventure: () => void;
}

export function WorldGenerationStep({
    generatedDetails,
    selectedRace,
    selectedClass,
    generatedWorld,
    isGenerating,
    error,
    onGenerate,
    onBack,
    onStartAdventure
}: WorldGenerationStepProps) {
    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Character Summary
                </h3>
                <div className="text-sm space-y-1">
                    <p><span className="text-slate-500">Name:</span> <span className="text-amber-400 font-semibold">{generatedDetails.name}</span></p>
                    <p><span className="text-slate-500">Race/Class:</span> <span className="text-slate-200">{selectedRace} {selectedClass}</span></p>
                </div>
            </div>

            {isGenerating && (
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Generating world and inventory...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-900/20 border border-red-700 rounded p-4 text-red-300">
                    <p className="font-bold mb-1">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {generatedWorld && !isGenerating && (
                <>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Starting Inventory</label>
                            <div className="bg-slate-950 border border-slate-700 rounded divide-y divide-slate-800">
                                {generatedWorld.inventory.map((item, index) => (
                                    <div key={index} className="p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-slate-200 font-medium">{item.name}</span>
                                            <span className="text-slate-500 text-sm">×{item.quantity}</span>
                                        </div>
                                        <p className="text-slate-400 text-sm">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Your World</label>
                            <div className="bg-slate-950 border border-slate-700 rounded px-4 py-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {generatedWorld.setting}
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
                            onClick={onStartAdventure}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            Start Adventure
                        </button>
                    </div>
                </>
            )}

            {!isGenerating && !generatedWorld && !error && (
                <button
                    onClick={onGenerate}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Generate World
                </button>
            )}
        </div>
    );
}
