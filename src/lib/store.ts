import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Character, GameState, Message, Item } from '@/types/dnd';
import { INITIAL_CHARACTER } from '@/lib/dnd-rules';

export interface GameStore extends GameState {
    isGameStarted: boolean;
    startGame: () => void;
    setCharacter: (character: Character) => void;
    updateCharacter: (updates: Partial<Character>) => void;
    addMessage: (message: Message) => void;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    clearChat: () => void;
    addItem: (item: Item) => void;
    removeItem: (itemId: string) => void;
    setSetting: (setting: string) => void;
    resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
    persist(
        (set) => ({
            character: INITIAL_CHARACTER,
            chatHistory: [],
            isConfigured: false,
            isGameStarted: false,
            setting: undefined,

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

            updateMessage: (id, updates) =>
                set((state) => ({
                    chatHistory: state.chatHistory.map((msg) =>
                        msg.id === id ? { ...msg, ...updates } : msg
                    ),
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
                    isGameStarted: false,
                    setting: undefined,
                })),
        }),
        {
            name: 'dnd-ai-game-storage',
        }
    )
);
