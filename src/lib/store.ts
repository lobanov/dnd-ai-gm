import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Character, GameState, Item } from '@/types/dnd';
import { UIMessage, LLMMessage, GameAction } from '@/lib/llm/types';
import { INITIAL_CHARACTER } from '@/lib/dnd-rules';

export interface GameStore extends GameState {
    isGameStarted: boolean;
    currentActions: GameAction[];

    // Decoupled Histories
    chatHistory: UIMessage[]; // For UI display
    llmHistory: LLMMessage[]; // For LLM context

    startGame: () => void;
    setCharacter: (character: Character) => void;
    updateCharacter: (updates: Partial<Character>) => void;

    // Message Actions
    addUIMessage: (message: UIMessage) => void;
    addLLMMessage: (message: LLMMessage) => void;
    setLLMHistory: (history: LLMMessage[]) => void;

    clearChat: () => void;
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    setSetting: (setting: string) => void;
    resetGame: () => void;
    setCurrentActions: (actions: GameAction[]) => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            character: INITIAL_CHARACTER,
            chatHistory: [],
            llmHistory: [],
            isConfigured: false,
            isGameStarted: false,
            setting: undefined,
            currentActions: [],

            startGame: () => set({ isGameStarted: true }),

            setCharacter: (character) => set({ character }),

            updateCharacter: (updates) =>
                set((state) => ({
                    character: { ...state.character, ...updates },
                })),

            addUIMessage: (message) =>
                set((state) => ({
                    chatHistory: [...state.chatHistory, message],
                })),

            addLLMMessage: (message) =>
                set((state) => ({
                    llmHistory: [...state.llmHistory, message],
                })),

            setLLMHistory: (history) => set({ llmHistory: history }),

            clearChat: () => set({ chatHistory: [], llmHistory: [] }),

            addItem: (item) =>
                set((state) => ({
                    character: {
                        ...state.character,
                        inventory: [...state.character.inventory, item],
                    },
                })),

            removeItem: (itemId) =>
                set((state) => ({
                    character: {
                        ...state.character,
                        inventory: state.character.inventory.filter((i) => i.id !== itemId),
                    },
                })),

            setSetting: (setting) => set({ setting }),

            resetGame: () =>
                set((state) => ({
                    character: {
                        ...INITIAL_CHARACTER,
                        name: state.character.name,
                        class: state.character.class,
                        race: state.character.race,
                        gender: state.character.gender,
                    },
                    chatHistory: [],
                    llmHistory: [],
                    isGameStarted: false,
                    setting: undefined,
                    currentActions: [],
                })),

            setCurrentActions: (actions) => set({ currentActions: actions }),
        }),
        {
            name: 'dnd-ai-game-storage',
        }
    )
);
