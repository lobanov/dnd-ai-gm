import { ChatService } from '@/lib/game/chat-service';
import { AssistantMessage, LLMMessage } from '@/lib/llm/types';
import { Character } from '@/types/dnd';

describe('ChatService', () => {
    const mockCharacter: Character = {
        name: 'Hero',
        class: 'Fighter',
        race: 'Human',
        gender: 'Male',
        level: 1,
        hp: 10,
        maxHp: 20,
        stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        inventory: [],
        skills: [],
        backstory: ''
    };

    describe('processAssistantMessage', () => {
        it('should process narrative', () => {
            const message: AssistantMessage = {
                role: 'assistant',
                content: 'Hello adventurer!'
            };
            const { uiMessages } = ChatService.processAssistantMessage(message, mockCharacter);
            expect(uiMessages).toHaveLength(1);
            expect(uiMessages[0].content).toBe('Hello adventurer!');
        });

        it('should process character updates', () => {
            const message: AssistantMessage = {
                role: 'assistant',
                content: 'You take damage.',
                characterUpdates: { hp: 5 }
            };
            const { characterUpdates } = ChatService.processAssistantMessage(message, mockCharacter);
            expect(characterUpdates.hp).toBe(5);
        });

        it('should process inventory updates', () => {
            const message: AssistantMessage = {
                role: 'assistant',
                content: 'You find a sword.',
                inventoryUpdates: {
                    add: [{ slug: 'sword', name: 'Sword', description: 'Sharp', quantity: 1 }]
                }
            };
            const { uiMessages, characterUpdates } = ChatService.processAssistantMessage(message, mockCharacter);
            expect(characterUpdates.inventory).toHaveLength(1);
            expect(uiMessages.some(m => m.content.includes('Added 1x Sword'))).toBe(true);
        });
    });

    describe('processHistoryUpdates', () => {
        it('should extract dice rolls', () => {
            const messages: LLMMessage[] = [
                {
                    role: 'assistant',
                    content: '',
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: {
                            name: 'roll_dice',
                            arguments: JSON.stringify({ notation: '1d20', reason: 'Attack' })
                        }
                    }]
                },
                {
                    role: 'tool',
                    tool_call_id: 'call_1',
                    content: JSON.stringify({ result: 15 })
                }
            ];

            const uiMessages = ChatService.processHistoryUpdates(messages);
            expect(uiMessages).toHaveLength(1);
            expect(uiMessages[0].content).toContain('🎲 **GM Rolled 1d20**: 15');
        });
    });
});
