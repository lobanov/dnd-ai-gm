import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Character, GameState, Message, Item } from '@/types/dnd';
import { INITIAL_CHARACTER } from '@/lib/dnd-rules';

interface GameStore extends GameState {
    isGameStarted: boolean;
    startGame: () => void;
    setCharacter: (character: Character) => void;
    updateCharacter: (updates: Partial<Character>) => void;
    addMessage: (message: Message) => void;
    clearChat: () => void;
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            character: INITIAL_CHARACTER,
            chatHistory: [],
            isConfigured: false,
            isGameStarted: false,

            startGame: () => set({ isGameStarted: true }),

            setCharacter: (character) => set({ character }),

            updateCharacter: (updates) =>
                set((state) => ({
                    character: { ...state.character, ...updates },
                })),

            addMessage: (message) =>
                set((state) => ({
                    chatHistory: [...state.chatHistory, message],
                })),

            clearChat: () => set({ chatHistory: [] }),

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

            resetGame: () =>
                set({
                    character: INITIAL_CHARACTER,
                    chatHistory: [],
                    isGameStarted: false,
                }),
        }),
        {
            name: 'dnd-ai-game-storage',
        }
    )
);
