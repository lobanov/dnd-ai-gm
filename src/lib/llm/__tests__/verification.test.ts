
import { HttpLLMClient } from '../client';
import { Message, LLMResponse } from '../types';

// Mock fetch
global.fetch = jest.fn();

describe('HttpLLMClient', () => {
    let client: HttpLLMClient;

    beforeEach(() => {
        client = new HttpLLMClient();
        (global.fetch as jest.Mock).mockClear();
    });

    it('sends messages and returns response', async () => {
        const mockResponse: LLMResponse = {
            message: {
                role: 'assistant',
                content: 'Hello!',
                actions: [
                    { id: 'action-1', description: 'Do something', diceRoll: '1d20', diceReason: 'Check' }
                ],
                characterUpdates: { hp: 10 },
                inventoryUpdates: { add: [], remove: [] }
            }
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const messages: Message[] = [{ role: 'user', content: 'Hi' }];
        const character = { name: 'Test', class: 'Fighter', level: 1, hp: 10, maxHp: 10, stats: {} };
        const response = await client.sendMessage(messages, character);

        expect(global.fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ messages, character })
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
        const character = { name: 'Test', class: 'Fighter', level: 1, hp: 10, maxHp: 10, stats: {} };
        await expect(client.sendMessage(messages, character)).rejects.toThrow('Internal Server Error');
    });
});
