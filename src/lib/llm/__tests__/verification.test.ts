
import { HttpLLMClient } from '../client';
import { LLMMessage, LLMResponse } from '../types';

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

        // Mock the two-phase response
        let callCount = 0;
        const mockCreate = jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // Phase 1: Narrative generation (plain text)
                return Promise.resolve({
                    choices: [{
                        message: {
                            role: 'assistant',
                            content: 'Hello adventurer!'
                        }
                    }]
                });
            } else {
                // Phase 2: Action generation (JSON)
                return Promise.resolve({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                actions: [
                                    { id: 'action-1', description: 'Do something', diceRoll: '1d20', diceReason: 'Check' }
                                ]
                            })
                        }
                    }]
                });
            }
        });

        OpenAI.mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        }));

        const messages: LLMMessage[] = [{ role: 'user', content: 'Hi' }];
        const character = {
            name: 'Test',
            class: 'Fighter',
            level: 1,
            hp: 10,
            maxHp: 10,
            stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            race: 'Human',
            gender: 'Male',
            backstory: 'A brave fighter',
            inventory: [],
            skills: []
        };
        const response = await client.sendMessage(messages, character);

        expect(mockCreate).toHaveBeenCalledTimes(2); // Two phases
        expect(response.message.content).toBe('Hello adventurer!');
        expect(response.message.actions).toHaveLength(1);
        expect(response.message.actions![0].id).toBe('action-0');
    });

    it('throws error on missing environment variable', async () => {
        process.env.NEXT_PUBLIC_LLM_MODEL = undefined;

        const client2 = new HttpLLMClient();
        const messages: LLMMessage[] = [{ role: 'user', content: 'Hi' }];
        const character = {
            name: 'Test',
            class: 'Fighter',
            level: 1,
            hp: 10,
            maxHp: 10,
            stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            race: 'Human',
            gender: 'Male',
            backstory: 'A brave fighter',
            inventory: [],
            skills: []
        };

        await expect(client2.sendMessage(messages, character)).rejects.toThrow('NEXT_PUBLIC_LLM_MODEL environment variable is not configured');
    });
});
