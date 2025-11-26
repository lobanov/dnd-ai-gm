import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { CLASS_PRESETS, RACES } from '@/lib/dnd-rules';
import { createCharacter, GeneratedDetails, GeneratedWorld } from '@/lib/character-creation';
import { ProgressIndicator } from './character-creation/ProgressIndicator';
import { CharacterSelectionStep } from './character-creation/CharacterSelectionStep';
import { CharacterDetailsStep } from './character-creation/CharacterDetailsStep';
import { WorldGenerationStep } from './character-creation/WorldGenerationStep';
import { generateCharacterDetails, generateWorld } from '@/lib/llm/llm-service';

const CLASSES = Object.keys(CLASS_PRESETS);
const GENDERS = ['Male', 'Female'];

type Step = 1 | 2 | 3;

const STORAGE_KEY_DETAILS = 'dnd-last-character-details';
const STORAGE_KEY_WORLD = 'dnd-last-world';

export function CharacterCreation() {
    const { setCharacter, setSetting, startGame } = useGameStore();

    // Step tracking
    const [currentStep, setCurrentStep] = useState<Step>(1);

    // Track if we have previously generated data available for quick start
    const [hasPreviousData, setHasPreviousData] = useState(false);

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

    // Load previously generated data from localStorage on mount
    useEffect(() => {
        try {
            const storedDetails = localStorage.getItem(STORAGE_KEY_DETAILS);
            const storedWorld = localStorage.getItem(STORAGE_KEY_WORLD);
            if (storedDetails && storedWorld) {
                setHasPreviousData(true);
            }
        } catch (error) {
            console.error('Failed to load previous data:', error);
        }
    }, []);

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
            const data = await generateCharacterDetails(
                selectedGender,
                selectedRace,
                selectedClass
            );
            setGeneratedDetails(data);
            // Save to localStorage for future quick starts
            localStorage.setItem(STORAGE_KEY_DETAILS, JSON.stringify(data));
            setHasPreviousData(true);
        } catch (error) {
            console.error('Failed to generate details:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
            setDetailsError(errorMessage);
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleGenerateWorld = async () => {
        if (!generatedDetails) return;

        setIsGeneratingWorld(true);
        setWorldError(null);
        try {
            const data = await generateWorld(
                generatedDetails.name,
                selectedRace,
                selectedClass,
                generatedDetails.backstory
            );
            setGeneratedWorld(data);
            // Save to localStorage for future quick starts
            localStorage.setItem(STORAGE_KEY_WORLD, JSON.stringify(data));
            setHasPreviousData(true);
        } catch (error) {
            console.error('Failed to generate world:', error);
            const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
            setWorldError(errorMessage);
        } finally {
            setIsGeneratingWorld(false);
        }
    };

    const handleStartAdventure = () => {
        if (!generatedDetails || !generatedWorld) return;

        const newCharacter = createCharacter(
            {
                class: selectedClass,
                race: selectedRace,
                gender: selectedGender,
            },
            generatedDetails,
            generatedWorld
        );

        setCharacter(newCharacter);
        setSetting(generatedWorld.setting);
        startGame();
    };

    const handleQuickStart = () => {
        try {
            // Try to load previously generated data from localStorage
            const storedDetails = localStorage.getItem(STORAGE_KEY_DETAILS);
            const storedWorld = localStorage.getItem(STORAGE_KEY_WORLD);

            let detailsToUse: GeneratedDetails;
            let worldToUse: GeneratedWorld;

            if (storedDetails && storedWorld) {
                // Reuse previously generated character and world
                detailsToUse = JSON.parse(storedDetails);
                worldToUse = JSON.parse(storedWorld);
            } else {
                // Fallback to basic defaults if no previous data exists
                detailsToUse = {
                    name: `${selectedRace} ${selectedClass}`,
                    stats: CLASS_PRESETS[selectedClass],
                    backstory: `A ${selectedGender.toLowerCase()} ${selectedRace.toLowerCase()} ${selectedClass.toLowerCase()} ready for adventure.`
                };

                worldToUse = {
                    inventory: [
                        { name: 'Basic Sword', description: 'A simple but reliable weapon', quantity: 1 },
                        { name: 'Leather Armor', description: 'Light protective gear', quantity: 1 },
                        { name: 'Healing Potion', description: 'Restores health when consumed', quantity: 2 },
                    ],
                    setting: 'You stand at the entrance of a mysterious forest, ready to begin your adventure.'
                };
            }

            const newCharacter = createCharacter(
                {
                    class: selectedClass,
                    race: selectedRace,
                    gender: selectedGender,
                },
                detailsToUse,
                worldToUse
            );

            setCharacter(newCharacter);
            setSetting(worldToUse.setting);
            startGame();
        } catch (error) {
            console.error('Failed to quick start:', error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-200 p-4 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-8 p-8 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl my-8">
                <ProgressIndicator
                    currentStep={currentStep}
                    totalSteps={3}
                    labels={['Character Selection', 'Character Details', 'World & Inventory']}
                />

                {currentStep === 1 && (
                    <CharacterSelectionStep
                        selectedGender={selectedGender}
                        setSelectedGender={setSelectedGender}
                        selectedRace={selectedRace}
                        setSelectedRace={setSelectedRace}
                        selectedClass={selectedClass}
                        setSelectedClass={setSelectedClass}
                        onNext={() => {
                            setCurrentStep(2);
                            setGeneratedDetails(null);
                        }}
                        onQuickStart={handleQuickStart}
                        hasPreviousData={hasPreviousData}
                    />
                )}

                {currentStep === 2 && (
                    <CharacterDetailsStep
                        selectedGender={selectedGender}
                        selectedRace={selectedRace}
                        selectedClass={selectedClass}
                        generatedDetails={generatedDetails}
                        isGenerating={isGeneratingDetails}
                        error={detailsError}
                        onGenerate={handleGenerateDetails}
                        onBack={() => setCurrentStep(1)}
                        onNext={() => {
                            setCurrentStep(3);
                            setGeneratedWorld(null);
                        }}
                    />
                )}

                {currentStep === 3 && generatedDetails && (
                    <WorldGenerationStep
                        generatedDetails={generatedDetails}
                        selectedRace={selectedRace}
                        selectedClass={selectedClass}
                        generatedWorld={generatedWorld}
                        isGenerating={isGeneratingWorld}
                        error={worldError}
                        onGenerate={handleGenerateWorld}
                        onBack={() => setCurrentStep(2)}
                        onStartAdventure={handleStartAdventure}
                    />
                )}
            </div>
        </div>
    );
}
