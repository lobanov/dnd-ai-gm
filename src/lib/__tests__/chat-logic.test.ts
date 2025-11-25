import { convertLlmMessageToDndMessage, updateMessageWithToolResult } from '../chat-logic';
import { AssistantMessage, ToolMessage } from '@/lib/llm/types';
import { Message as DndMessage } from '@/types/dnd';

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

        it('should convert an assistant message with tool calls', () => {
            const llmMsg: AssistantMessage = {
                role: 'assistant',
                content: null,
                toolCalls: [
                    {
                        id: 'call_123',
                        tool: {
                            name: 'roll_dice',
                            args: { dice: '1d20', reason: 'test' }
                        }
                    }
                ]
            };

            const dndMsg = convertLlmMessageToDndMessage(llmMsg);

            expect(dndMsg.role).toBe('assistant');
            expect(dndMsg.meta?.type).toBe('tool');
            expect(dndMsg.meta?.toolCalls).toHaveLength(1);
            expect(dndMsg.meta?.toolCalls?.[0].name).toBe('roll_dice');
            expect(dndMsg.meta?._toolCallIds).toContain('call_123');
        });
    });

    describe('updateMessageWithToolResult', () => {
        it('should update the correct message with tool result', () => {
            const chatHistory: DndMessage[] = [
                {
                    id: 'msg1',
                    role: 'assistant',
                    content: '',
                    timestamp: 100,
                    meta: {
                        type: 'tool',
                        toolCalls: [
                            { name: 'roll_dice', arguments: {}, result: null }
                        ],
                        _toolCallIds: ['call_123']
                    }
                }
            ];

            const result = updateMessageWithToolResult(chatHistory, 'call_123', 'Rolled 20');

            expect(result).not.toBeNull();
            expect(result?.index).toBe(0);
            expect(result?.message.meta?.toolCalls?.[0].result).toBe('Rolled 20');
        });

        it('should return null if tool call ID not found', () => {
            const chatHistory: DndMessage[] = [
                {
                    id: 'msg1',
                    role: 'assistant',
                    content: 'Hello',
                    timestamp: 100,
                    meta: { type: 'narration' }
                }
            ];

            const result = updateMessageWithToolResult(chatHistory, 'call_123', 'Rolled 20');

            expect(result).toBeNull();
        });
    });
});
