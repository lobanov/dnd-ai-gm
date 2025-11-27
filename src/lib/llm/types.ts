export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface UIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface LLMMessage {
    role: Role;
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface GameAction {
    id: string;
    description: string;
    diceRoll?: string; // e.g., "2d6+3"
    diceReason?: string; // What this roll is for
    difficultyClass?: number; // DC for the check if applicable
}

export interface CharacterUpdates {
    hp?: number; // Only HP for now
}

export interface InventoryUpdates {
    add?: Array<{ slug: string; name: string; description: string; quantity: number }>;
    remove?: Array<{ slug: string; quantityChange: number }>;
}

// Combined response from the LLM Service to the UI
export interface AssistantMessage {
    role: 'assistant';
    content: string; // narrative
    actions?: GameAction[];
    characterUpdates?: CharacterUpdates;
    inventoryUpdates?: InventoryUpdates;
    tool_calls?: ToolCall[];
}

export interface LLMResponse {
    message: AssistantMessage;
    // We might want to return the raw LLM history updates too, but for now let's keep it simple
    // and let the hook manage the history based on the response.
    // Actually, the client needs to return the updated LLM history because of the tool loops.
    llmHistoryUpdates: LLMMessage[];
}

export interface LLMClient {
    sendMessage(history: LLMMessage[], character: any): Promise<LLMResponse>;
}
