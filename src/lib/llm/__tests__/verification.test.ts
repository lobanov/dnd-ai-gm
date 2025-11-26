
import { HttpLLMClient } from '../client';
import { Message, LLMResponse } from '../types';

// Mock OpenAI
jest.mock('openai', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        }))
    };
});

// Mock environment variable
const originalEnv = process.env;

describe('HttpLLMClient', () => {
    let client: HttpLLMClient;

    beforeEach(() => {
        // Set up environment
        process.env = {
            ...originalEnv,
            NEXT_PUBLIC_LLM_MODEL: 'gpt-4o'
        };
        client = new HttpLLMClient();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    it('sends messages and returns response', async () => {
        const OpenAI = require('openai').default;
        const mockCreate = jest.fn().mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        narrative: 'Hello adventurer!',
                        actions: [
                            { id: 'action-1', description: 'Do something', diceRoll: '1d20', diceReason: 'Check' }
                        ],
                        characterUpdates: { hp: 10 },
                        inventoryUpdates: { add: [], remove: [] }
                    })
                }
            }]
        });

        OpenAI.mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        }));

        const messages: Message[] = [{ role: 'user', content: 'Hi' }];
        const character = {
            name: 'Test',
            class: 'Fighter',
            level: 1,
            hp: 10,
            maxHp: 10,
            stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            race: 'Human',
            backstory: 'A brave fighter',
            inventory: []
        };
        const response = await client.sendMessage(messages, character);

        expect(mockCreate).toHaveBeenCalled();
        expect(response.message.content).toBe('Hello adventurer!');
        expect(response.message.actions).toHaveLength(1);
        expect(response.message.actions![0].id).toBe('action-1');
    });

    it('throws error on missing environment variable', async () => {
        process.env.NEXT_PUBLIC_LLM_MODEL = undefined;

        const client2 = new HttpLLMClient();
        const messages: Message[] = [{ role: 'user', content: 'Hi' }];
        const character = {
            name: 'Test',
            class: 'Fighter',
            level: 1,
            hp: 10,
            maxHp: 10,
            stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            race: 'Human',
            backstory: 'A brave fighter',
            inventory: []
        };

        await expect(client2.sendMessage(messages, character)).rejects.toThrow('NEXT_PUBLIC_LLM_MODEL environment variable is not configured');
    });
});
