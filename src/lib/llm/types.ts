export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface UserMessage {
    role: 'user';
    content: string;
}

export interface SystemMessage {
    role: 'system';
    content: string;
}

export interface AssistantMessage {
    role: 'assistant';
    content: string | null;
    toolCalls?: Array<{
        id: string;
        tool: GameTool;
    }>;
}

export interface ToolMessage {
    role: 'tool';
    toolCallId: string;
    content: GameToolResult;
}

export type Message = UserMessage | SystemMessage | AssistantMessage | ToolMessage;

// Tool Definitions
export interface RollDiceTool {
    name: 'roll_dice';
    args: {
        dice: string; // e.g., "1d20+5"
        reason: string;
    };
}

export interface AddInventoryTool {
    name: 'add_inventory';
    args: {
        items: Array<{
            slug: string;
            name: string;
            description: string;
            quantity: number;
        }>;
    };
}

export interface UpdateInventoryTool {
    name: 'update_inventory';
    args: {
        updates: Array<{
            slug: string;
            quantityChange: number; // Positive to add, negative to remove
        }>;
    };
}

export interface UpdateCharacterTool {
    name: 'update_character';
    args: {
        hp?: number;
        maxHp?: number;
        level?: number;
        stats?: Record<string, number>;
    };
}

export interface GetCharacterStatsTool {
    name: 'get_character_stats';
    args: Record<string, never>;
}

export type GameTool =
    | RollDiceTool
    | AddInventoryTool
    | UpdateInventoryTool
    | UpdateCharacterTool
    | GetCharacterStatsTool;

// Tool Result Definitions
export interface RollDiceResult {
    dice: string;
    reason: string;
    rolls: number[];
    modifier: number;
    total: number;
    description: string;
}

export interface InventoryResult {
    success: boolean;
    message: string;
    items?: string[]; // Summary of items affected
}

export interface CharacterUpdateResult {
    success: boolean;
    message: string;
    changes: string[];
}

export interface CharacterStatsResult {
    name: string;
    class: string;
    level: number;
    hp: number;
    maxHp: number;
    stats: Record<string, number>;
    inventory: any[]; // Typed properly in actual code
}

export type GameToolResult =
    | RollDiceResult
    | InventoryResult
    | CharacterUpdateResult
    | CharacterStatsResult;

export interface LLMResponse {
    message: AssistantMessage;
}

export interface LLMClient {
    sendMessage(messages: Message[]): Promise<LLMResponse>;
}
