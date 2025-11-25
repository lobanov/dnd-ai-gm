import { useState } from 'react';
import { GameAction } from '@/types/dnd';
import { Dice5 } from 'lucide-react';
import { rollDice } from '@/lib/chat-logic';

interface ActionSelectorProps {
    actions: GameAction[];
    onActionSelect: (actionId: string, diceTotal?: number) => void;
    disabled?: boolean;
}

export function ActionSelector({ actions, onActionSelect, disabled }: ActionSelectorProps) {
    const [rollingActionId, setRollingActionId] = useState<string | null>(null);
    const [rollResult, setRollResult] = useState<{ total: number, notation: string } | null>(null);

    const handleActionClick = async (action: GameAction) => {
        if (disabled || rollingActionId) return;

        if (action.diceRoll) {
            setRollingActionId(action.id);

            // Simulate roll delay for effect
            await new Promise(resolve => setTimeout(resolve, 600));

            const result = rollDice(action.diceRoll);
            setRollResult({ total: result.total, notation: action.diceRoll });

            // Wait a moment to show result before proceeding
            await new Promise(resolve => setTimeout(resolve, 1000));

            onActionSelect(action.id, result.total);
            setRollingActionId(null);
            setRollResult(null);
        } else {
            onActionSelect(action.id);
        }
    };

    return (
        <div className="flex flex-col gap-3 mt-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-1">
                What do you do?
            </h3>
            <div className="grid grid-cols-1 gap-3">
                {actions.map((action) => {
                    const isRolling = rollingActionId === action.id;
                    const showResult = isRolling && rollResult;

                    return (
                        <button
                            key={action.id}
                            onClick={() => handleActionClick(action)}
                            disabled={disabled || (rollingActionId !== null && !isRolling)}
                            className={`
                                relative p-4 text-left rounded-lg border transition-all duration-200
                                ${disabled || (rollingActionId !== null && !isRolling)
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                                    : 'bg-slate-900 border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200 shadow-sm hover:shadow-md'
                                }
                                ${isRolling ? 'border-amber-500 bg-slate-800' : ''}
                            `}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <span className="font-medium">{action.description}</span>
                                {action.diceRoll && (
                                    <div className={`
                                        flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded
                                        ${isRolling
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-slate-800 text-slate-400'
                                        }
                                    `}>
                                        <Dice5 className={`w-3.5 h-3.5 ${isRolling ? 'animate-spin' : ''}`} />
                                        <span>{showResult ? rollResult.total : action.diceRoll}</span>
                                    </div>
                                )}
                            </div>
                            {action.diceReason && (
                                <div className="text-xs text-slate-500 mt-1">
                                    {action.diceReason}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
