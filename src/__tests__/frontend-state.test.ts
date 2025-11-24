import { processToolCalls } from '@/lib/game-logic';
import { GameStore } from '@/lib/store';
import { Character, Item } from '@/types/dnd';

// Mock character data
const mockCharacter: Character = {
    name: 'Test Hero',
    class: 'Fighter',
    gender: 'Non-binary',
    level: 1,
    hp: 10,
    maxHp: 10,
    stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    inventory: [
        { id: 'item-1', name: 'Old Sword', description: 'Rusty', quantity: 1 },
        { id: 'item-2', name: 'Potion', description: 'Heals', quantity: 1 }
    ],
    skills: []
};

// Create a mock store
function createMockStore(): GameStore {
    return {
        character: { ...mockCharacter },
        chatHistory: [],
        isConfigured: true,
        isGameStarted: true,
        startGame: jest.fn(),
        setCharacter: jest.fn(),
        updateCharacter: jest.fn(),
        addMessage: jest.fn(),
        clearChat: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        resetGame: jest.fn()
    } as unknown as GameStore;
}

describe('Frontend State Logic', () => {
    let store: GameStore;

    beforeEach(() => {
        store = createMockStore();
    });

    test('processToolCalls handles update_inventory (add)', () => {
        const toolCalls = [{
            name: 'update_inventory',
            result: {
                success: true,
                results: [
                    {
                        action: 'added',
                        item: { id: 'new-1', name: 'New Item', description: 'Shiny', quantity: 1 }
                    }
                ]
            }
        }];

        processToolCalls(toolCalls, store);

        expect(store.addItem).toHaveBeenCalledTimes(1);
        expect(store.addItem).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Item'
        }));
    });

    test('processToolCalls handles update_inventory (remove)', () => {
        const toolCalls = [{
            name: 'update_inventory',
            result: {
                success: true,
                results: [
                    {
                        action: 'removed',
                        itemName: 'Old Sword'
                    }
                ]
            }
        }];

        processToolCalls(toolCalls, store);

        expect(store.removeItem).toHaveBeenCalledTimes(1);
        expect(store.removeItem).toHaveBeenCalledWith('item-1');
    });

    test('processToolCalls handles multiple inventory updates', () => {
        const toolCalls = [{
            name: 'update_inventory',
            result: {
                success: true,
                results: [
                    {
                        action: 'added',
                        item: { id: 'new-1', name: 'New Item', description: 'Shiny', quantity: 1 }
                    },
                    {
                        action: 'removed',
                        itemName: 'Potion'
                    }
                ]
            }
        }];

        processToolCalls(toolCalls, store);

        expect(store.addItem).toHaveBeenCalledTimes(1);
        expect(store.removeItem).toHaveBeenCalledTimes(1);
        expect(store.removeItem).toHaveBeenCalledWith('item-2');
    });

    test('processToolCalls handles update_character', () => {
        const toolCalls = [{
            name: 'update_character',
            result: {
                success: true,
                updates: { hp: 5 }
            }
        }];

        processToolCalls(toolCalls, store);

        expect(store.updateCharacter).toHaveBeenCalledTimes(1);
        expect(store.updateCharacter).toHaveBeenCalledWith({ hp: 5 });
    });

    test('processToolCalls handles mixed tool calls', () => {
        const toolCalls = [
            {
                name: 'update_inventory',
                result: {
                    success: true,
                    results: [{ action: 'added', item: { id: 'x', name: 'X', description: 'X', quantity: 1 } }]
                }
            },
            {
                name: 'update_character',
                result: {
                    success: true,
                    updates: { hp: 8 }
                }
            }
        ];

        processToolCalls(toolCalls, store);

        expect(store.addItem).toHaveBeenCalledTimes(1);
        expect(store.updateCharacter).toHaveBeenCalledTimes(1);
    });
});
