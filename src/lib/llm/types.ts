export type Role = 'user' | 'assistant' | 'system';

export interface UserMessage {
    role: 'user';
    content: string;
}

export interface SystemMessage {
    role: 'system';
    content: string;
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

export interface AssistantMessage {
    role: 'assistant';
    content: string; // narrative
    actions?: GameAction[];
    characterUpdates?: CharacterUpdates;
    inventoryUpdates?: InventoryUpdates;
}

export type Message = UserMessage | SystemMessage | AssistantMessage;

export interface LLMResponse {
    message: AssistantMessage;
}

export interface LLMClient {
    sendMessage(messages: Message[], character: any): Promise<LLMResponse>;
}
