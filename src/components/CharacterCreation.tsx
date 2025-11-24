import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { CLASS_PRESETS, RACES } from '@/lib/dnd-rules';
import { Character, Item, Stats } from '@/types/dnd';

const CLASSES = Object.keys(CLASS_PRESETS);
const GENDERS = ['Male', 'Female'];

type Step = 1 | 2 | 3;

interface GeneratedDetails {
    name: string;
    stats: Stats;
    backstory: string;
}

interface GeneratedWorld {
    inventory: Array<{ name: string; description: string; quantity: number }>;
    setting: string;
}

export function CharacterCreation() {
    const { setCharacter, setSetting, startGame } = useGameStore();

    // Step tracking
    const [currentStep, setCurrentStep] = useState<Step>(1);

    // Step 1 - Selection
    const [selectedClass, setSelectedClass] = useState(CLASSES[0]);
    const [selectedRace, setSelectedRace] = useState(RACES[0]);
    const [selectedGender, setSelectedGender] = useState(GENDERS[0]);

    // Step 2 - Generated details
    const [generatedDetails, setGeneratedDetails] = useState<GeneratedDetails | null>(null);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [detailsError, setDetailsError] = useState<string | null>(null);

    // Step 3 - Generated world
    const [generatedWorld, setGeneratedWorld] = useState<GeneratedWorld | null>(null);
    const [isGeneratingWorld, setIsGeneratingWorld] = useState(false);
    const [worldError, setWorldError] = useState<string | null>(null);

    // Auto-generate when entering step 2
    useEffect(() => {
        if (currentStep === 2 && !generatedDetails) {
            handleGenerateDetails();
        }
    }, [currentStep]);

    // Auto-generate when entering step 3
    useEffect(() => {
        if (currentStep === 3 && !generatedWorld && generatedDetails) {
            handleGenerateWorld();
        }
    }, [currentStep]);

    const handleGenerateDetails = async () => {
        setIsGeneratingDetails(true);
        setDetailsError(null);
        try {
            const response = await fetch('/api/generate-character-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterClass: selectedClass,
                    race: selectedRace,
                    gender: selectedGender
                }),
            });
            const data = await response.json();
            if (data.error) {
                setDetailsError(data.error);
                console.error('Failed to generate details:', data.error);
            } else {
                setGeneratedDetails(data);
            }
        } catch (error) {
            console.error('Failed to generate details:', error);
            setDetailsError('Network error. Please try again.');
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleGenerateWorld = async () => {
        if (!generatedDetails) return;

        setIsGeneratingWorld(true);
        setWorldError(null);
        try {
            const response = await fetch('/api/generate-world', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: generatedDetails.name,
                    race: selectedRace,
                    characterClass: selectedClass,
                    backstory: generatedDetails.backstory,
                }),
            });
            const data = await response.json();
            if (data.error) {
                setWorldError(data.error);
                console.error('Failed to generate world:', data.error);
            } else {
                setGeneratedWorld(data);
            }
        } catch (error) {
            console.error('Failed to generate world:', error);
            setWorldError('Network error. Please try again.');
        } finally {
            setIsGeneratingWorld(false);
        }
    };

    const handleStartAdventure = () => {
        if (!generatedDetails || !generatedWorld) return;

        const stats = generatedDetails.stats;
        const conMod = Math.floor((stats.CON - 10) / 2);
        const hp = 10 + conMod;

        // Convert generated inventory to Item format with IDs
        const inventory: Item[] = generatedWorld.inventory.map((item, index) => ({
            id: `${Date.now()}-${index}`,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
        }));

        const newCharacter: Character = {
            name: generatedDetails.name,
            class: selectedClass,
            race: selectedRace,
            gender: selectedGender,
            level: 1,
            hp: hp,
            maxHp: hp,
            stats: stats,
            inventory: inventory,
            skills: [],
            backstory: generatedDetails.backstory,
        };

        setCharacter(newCharacter);
        setSetting(generatedWorld.setting);
        startGame();
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 p-4 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-8 p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl my-8">
                {/* Header with Step Indicator */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-amber-500 font-serif mb-4">Create Character</h1>
                    <div className="flex justify-center gap-2 mb-2">
                        {[1, 2, 3].map((step) => (
                            <div
                                key={step}
                                className={`h-2 w-16 rounded ${step <= currentStep ? 'bg-amber-500' : 'bg-slate-700'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-slate-400">
                        Step {currentStep} of 3: {
                            currentStep === 1 ? 'Character Selection' :
                                currentStep === 2 ? 'Character Details' :
                                    'World & Inventory'
                        }
                    </p>
                </div>

                {/* Step 1: Selection */}
                {currentStep === 1 && (
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
                            onClick={() => {
                                setCurrentStep(2);
                                setGeneratedDetails(null); // Reset to trigger regeneration
                            }}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            Continue to Character Details
                        </button>
                    </div>
                )}

                {/* Step 2: Character Details */}
                {currentStep === 2 && (
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

                        {isGeneratingDetails && (
                            <div className="text-center p-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                                <p className="text-slate-400">Generating character details...</p>
                            </div>
                        )}

                        {detailsError && (
                            <div className="bg-red-900/20 border border-red-700 rounded p-4 text-red-300">
                                <p className="font-bold mb-1">Error</p>
                                <p className="text-sm">{detailsError}</p>
                            </div>
                        )}

                        {generatedDetails && !isGeneratingDetails && (
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
                                        onClick={() => setCurrentStep(1)}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleGenerateDetails}
                                        disabled={isGeneratingDetails}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-amber-400 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentStep(3);
                                            setGeneratedWorld(null); // Reset to trigger regeneration
                                        }}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </>
                        )}

                        {!isGeneratingDetails && !generatedDetails && !detailsError && (
                            <button
                                onClick={handleGenerateDetails}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Generate Details
                            </button>
                        )}
                    </div>
                )}

                {/* Step 3: World & Inventory */}
                {currentStep === 3 && generatedDetails && (
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

                        {isGeneratingWorld && (
                            <div className="text-center p-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                                <p className="text-slate-400">Generating world and inventory...</p>
                            </div>
                        )}

                        {worldError && (
                            <div className="bg-red-900/20 border border-red-700 rounded p-4 text-red-300">
                                <p className="font-bold mb-1">Error</p>
                                <p className="text-sm">{worldError}</p>
                            </div>
                        )}

                        {generatedWorld && !isGeneratingWorld && (
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
                                        onClick={() => setCurrentStep(2)}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleGenerateWorld}
                                        disabled={isGeneratingWorld}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-amber-400 font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={handleStartAdventure}
                                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                                    >
                                        Start Adventure
                                    </button>
                                </div>
                            </>
                        )}

                        {!isGeneratingWorld && !generatedWorld && !worldError && (
                            <button
                                onClick={handleGenerateWorld}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Generate World
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
