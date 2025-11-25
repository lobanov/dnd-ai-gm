import { convertLlmMessageToDndMessage, rollDice, processCharacterUpdates, processInventoryUpdates } from '../chat-logic';
import { AssistantMessage } from '@/lib/llm/types';
import { INITIAL_CHARACTER } from '@/lib/dnd-rules';

describe('Chat Logic', () => {
    describe('convertLlmMessageToDndMessage', () => {
        it('should convert a simple assistant message', () => {
            const llmMsg: AssistantMessage = {
                role: 'assistant',
                content: 'Hello world',
            };

            const dndMsg = convertLlmMessageToDndMessage(llmMsg);

            expect(dndMsg.role).toBe('assistant');
            expect(dndMsg.content).toBe('Hello world');
            expect(dndMsg.meta?.type).toBe('narration');
        });

        it('should convert an assistant message with actions', () => {
            const llmMsg: AssistantMessage = {
                role: 'assistant',
                content: 'Choose your path',
                actions: [
                    { id: '1', description: 'Go left', diceRoll: '1d20', diceReason: 'Check' }
                ]
            };

            const dndMsg = convertLlmMessageToDndMessage(llmMsg);

            expect(dndMsg.role).toBe('assistant');
            expect(dndMsg.meta?.type).toBe('action_request');
            expect(dndMsg.meta?.actions).toHaveLength(1);
            expect(dndMsg.meta?.actions?.[0].id).toBe('1');
        });
    });

    describe('rollDice', () => {
        it('should correctly parse and roll dice', () => {
            const result = rollDice('1d20+5');
            expect(result.rolls).toHaveLength(1);
            expect(result.modifier).toBe(5);
            expect(result.total).toBeGreaterThanOrEqual(6);
            expect(result.total).toBeLessThanOrEqual(25);
        });

        it('should handle multiple dice', () => {
            const result = rollDice('2d6');
            expect(result.rolls).toHaveLength(2);
            expect(result.modifier).toBe(0);
            expect(result.total).toBeGreaterThanOrEqual(2);
            expect(result.total).toBeLessThanOrEqual(12);
        });
    });

    describe('processCharacterUpdates', () => {
        it('should update HP', () => {
            const store = {
                character: { ...INITIAL_CHARACTER, hp: 10 },
                updateCharacter: jest.fn()
            } as any;

            const changes = processCharacterUpdates({ hp: 5 }, store);

            expect(store.updateCharacter).toHaveBeenCalledWith({ hp: 5 });
            expect(changes).toContain('HP -> 5');
        });
    });

    describe('processInventoryUpdates', () => {
        it('should add items', () => {
            const store = {
                addItem: jest.fn()
            } as any;

            const changes = processInventoryUpdates({
                add: [{ slug: 'sword', name: 'Sword', description: 'Sharp', quantity: 1 }]
            }, store);

            expect(store.addItem).toHaveBeenCalled();
            expect(changes[0]).toContain('Added 1x Sword');
        });
    });
});
