import { Character } from '@/types/dnd';
import { GM_TOOLS, getGMSystemPrompt } from '@/lib/gm-prompts';

/**
 * Create a test character with default values
 */
export function createTestCharacter(overrides?: Partial<Character>): Character {
    return {
        name: 'Test Hero',
        class: 'Fighter',
        gender: 'Male',
        level: 1,
        hp: 10,
        maxHp: 10,
        stats: {
            STR: 16,
            DEX: 12,
            CON: 14,
            INT: 10,
            WIS: 10,
            CHA: 8,
        },
        inventory: [],
        skills: [],
        ...overrides,
    };
}

/**
 * Call the LLM directly with messages and character state
 * This is a true evaluation test that hits the LLM endpoint directly
 */
export async function callChatAPI(messages: any[], character: Character) {
    const OpenAI = require('openai').default;

    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseURL = process.env.LLM_ENDPOINT;

    if (!apiKey || !model || !baseURL) {
        throw new Error('Missing LLM configuration in .env.local');
    }

    const openai = new OpenAI({ apiKey, baseURL });

    // Get system prompt from shared constants (same as the game uses)
    const systemPrompt = getGMSystemPrompt(character);

    // Prepare messages with system prompt prepended to first user message
    let llmMessages = [...messages];
    if (llmMessages.length > 0 && llmMessages[0].role === 'user') {
        llmMessages[0] = {
            ...llmMessages[0],
            content: `${systemPrompt}\n\n${llmMessages[0].content}`
        };
    }

    // Make initial request with tools (using shared tool definitions)
    const completion = await openai.chat.completions.create({
        model,
        messages: llmMessages,
        tools: GM_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
    });

    const responseMessage = completion.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    // If no tool calls, return simple response
    if (!toolCalls || toolCalls.length === 0) {
        return {
            content: responseMessage.content,
            role: 'assistant',
            toolCalls: []
        };
    }

    // Extract tool calls (filter for function calls)
    const functionToolCalls = toolCalls.filter((tc: any) => 'function' in tc);

    // Format tool calls for response
    const formattedToolCalls = functionToolCalls.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
        result: {} // We don't execute tools in eval tests, just check they were called
    }));

    return {
        content: responseMessage.content || '',
        role: 'assistant',
        toolCalls: formattedToolCalls
    };
}

/**
 * Assert that a tool was called with specific parameters
 */
export function assertToolCalled(
    toolCalls: any[] | undefined,
    toolName: string,
    expectedArgs?: Record<string, any>
): boolean {
    if (!toolCalls || toolCalls.length === 0) {
        return false;
    }

    const toolCall = toolCalls.find((tc: any) => tc.name === toolName);
    if (!toolCall) {
        return false;
    }

    if (expectedArgs) {
        for (const [key, value] of Object.entries(expectedArgs)) {
            if (toolCall.arguments[key] !== value) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Mock LLM response with tool calls
 */
export function createMockToolResponse(toolCalls: Array<{
    name: string;
    arguments: any;
    result: any;
}>) {
    return {
        content: 'Mock GM response based on tool results.',
        role: 'assistant',
        toolCalls,
    };
}

/**
 * Extract tool calls from response
 */
export function getToolCalls(response: any): any[] {
    return response.toolCalls || [];
}

/**
 * Check if dice roll tool was called
 */
export function wasDiceRolled(toolCalls: any[]): boolean {
    return toolCalls.some((tc: any) => tc.name === 'roll_dice');
}

/**
 * Check if inventory was updated
 */
export function wasInventoryUpdated(toolCalls: any[]): boolean {
    return toolCalls.some((tc: any) => tc.name === 'update_inventory');
}

/**
 * Check if character was updated
 */
export function wasCharacterUpdated(toolCalls: any[]): boolean {
    return toolCalls.some((tc: any) => tc.name === 'update_character');
}

/**
 * Get all dice rolls from tool calls
 */
export function getDiceRolls(toolCalls: any[]): any[] {
    return toolCalls
        .filter((tc: any) => tc.name === 'roll_dice')
        .map((tc: any) => tc.arguments); // Return arguments which contain dice, reason, etc.
}

/**
 * Wait for async operations (useful for rate limiting)
 */
export async function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
