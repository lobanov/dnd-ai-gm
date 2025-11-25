import React from 'react';

interface ProgressIndicatorProps {
    currentStep: number;
    totalSteps: number;
    labels: string[];
}

export function ProgressIndicator({ currentStep, totalSteps, labels }: ProgressIndicatorProps) {
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-amber-500 font-serif mb-4">Create Character</h1>
            <div className="flex justify-center gap-2 mb-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                    <div
                        key={step}
                        className={`h-2 w-16 rounded ${step <= currentStep ? 'bg-amber-500' : 'bg-slate-700'}`}
                    />
                ))}
            </div>
            <p className="text-sm text-slate-400">
                Step {currentStep} of {totalSteps}: {labels[currentStep - 1]}
            </p>
        </div>
    );
}
