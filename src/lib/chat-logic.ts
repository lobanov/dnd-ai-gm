import { Message as DndMessage, MessageRole } from '@/types/dnd';
import { Message as LLMMessage, AssistantMessage } from '@/lib/llm/types';

/**
 * Converts an LLM message to the application's DndMessage format.
 */
export function convertLlmMessageToDndMessage(message: LLMMessage): DndMessage {
    // Only assistant messages have toolCalls
    const toolCalls = message.role === 'assistant' ? (message as AssistantMessage).toolCalls : undefined;

    return {
        id: (Date.now() + Math.random()).toString(),
        role: message.role === 'tool' ? 'assistant' : message.role as MessageRole,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        timestamp: Date.now(),
        meta: toolCalls ? {
            type: 'tool',
            toolCalls: toolCalls.map(tc => ({
                name: tc.tool.name,
                arguments: tc.tool.args,
                result: null as any
            })),
            _toolCallIds: toolCalls.map(tc => tc.id)
        } : { type: 'narration' }
    };
}

/**
 * Finds the assistant message that initiated a tool call and updates it with the result.
 * Returns the updated message and its index, or null if not found.
 */
export function updateMessageWithToolResult(
    chatHistory: DndMessage[],
    toolCallId: string,
    resultContent: any
): { message: DndMessage; index: number } | null {
    // Search backwards
    for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (
            msg.role === 'assistant' &&
            msg.meta?.type === 'tool' &&
            msg.meta._toolCallIds?.includes(toolCallId)
        ) {
            const toolCallIndex = msg.meta._toolCallIds.indexOf(toolCallId);
            if (toolCallIndex !== -1) {
                const updatedToolCalls = [...(msg.meta.toolCalls || [])];
                updatedToolCalls[toolCallIndex] = {
                    ...updatedToolCalls[toolCallIndex],
                    result: resultContent
                };

                const updatedMessage = {
                    ...msg,
                    meta: {
                        ...msg.meta,
                        toolCalls: updatedToolCalls
                    }
                };

                return { message: updatedMessage, index: i };
            }
        }
    }
    return null;
}
