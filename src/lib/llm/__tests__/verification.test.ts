
import { HttpLLMClient } from '../client';
import { executeTool } from '../use-llm';
import { GameTool, Message } from '../types';

// Mock fetch
global.fetch = jest.fn();

describe('HttpLLMClient', () => {
    let client: HttpLLMClient;

    beforeEach(() => {
        client = new HttpLLMClient();
        (global.fetch as jest.Mock).mockClear();
    });

    it('sends messages and returns response', async () => {
        const mockResponse = {
            message: {
                role: 'assistant',
                content: 'Hello!',
                toolCalls: []
            }
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const messages: Message[] = [{ role: 'user', content: 'Hi' }];
        const response = await client.sendMessage(messages);

        expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ messages })
        }));
        expect(response).toEqual(mockResponse);
    });

    it('throws error on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            statusText: 'Internal Server Error',
            status: 500,
            json: async () => ({ error: 'Internal Server Error' })
        });

        const messages: Message[] = [{ role: 'user', content: 'Hi' }];
        await expect(client.sendMessage(messages)).rejects.toThrow('Internal Server Error');
    });
});

describe('executeTool', () => {
    let mockStore: any;

    beforeEach(() => {
        mockStore = {
            character: {
                hp: 10,
                maxHp: 20,
                stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
                inventory: [
                    { id: '1', name: 'Potion', quantity: 1 }
                ]
            },
            updateCharacter: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn()
        };
    });

    it('executes roll_dice', async () => {
        const tool: GameTool = {
            name: 'roll_dice',
            args: { dice: '1d20', reason: 'Test' }
        };
        const result = await executeTool(tool, mockStore);
        if ('rolls' in result) {
            expect(result.rolls.length).toBe(1);
            expect(result.total).toBeGreaterThanOrEqual(1);
            expect(result.total).toBeLessThanOrEqual(20);
        } else {
            fail('Expected RollDiceResult');
        }
    });

    it('executes add_inventory', async () => {
        const tool: GameTool = {
            name: 'add_inventory',
            args: {
                items: [{ slug: 'sword', name: 'Sword', description: 'Sharp', quantity: 1 }]
            }
        };
        const result = await executeTool(tool, mockStore);
        expect(mockStore.addItem).toHaveBeenCalled();
        if ('success' in result) {
            expect(result.success).toBe(true);
        } else {
            fail('Expected InventoryResult');
        }
    });

    it('executes update_character', async () => {
        const tool: GameTool = {
            name: 'update_character',
            args: { hp: 15 }
        };
        const result = await executeTool(tool, mockStore);
        expect(mockStore.updateCharacter).toHaveBeenCalledWith({ hp: 15 });
        if ('success' in result) {
            expect(result.success).toBe(true);
        } else {
            fail('Expected CharacterUpdateResult');
        }
    });
});
