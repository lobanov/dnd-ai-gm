import { Message as DndMessage, MessageRole } from '@/types/dnd';
import { Message as LLMMessage, AssistantMessage, CharacterUpdates, InventoryUpdates } from '@/lib/llm/types';
import { GameStore } from '@/lib/store';

/**
 * Converts an LLM message to the application's DndMessage format.
 */
export function convertLlmMessageToDndMessage(message: LLMMessage): DndMessage {
    const assistantMsg = message.role === 'assistant' ? (message as AssistantMessage) : undefined;

    return {
        id: (Date.now() + Math.random()).toString(),
        role: message.role as MessageRole,
        content: message.content || '',
        timestamp: Date.now(),
        meta: assistantMsg?.actions ? {
            type: 'action_request',
            actions: assistantMsg.actions
        } : { type: 'narration' }
    };
}

/**
 * Process character updates from structured output
 */
export function processCharacterUpdates(updates: CharacterUpdates, store: GameStore): string[] {
    const changes: string[] = [];
    const currentChar = store.character;

    if (!currentChar) return changes;

    if (updates.hp !== undefined) {
        store.updateCharacter({ hp: updates.hp });
        changes.push(`HP -> ${updates.hp}`);
    }

    return changes;
}

/**
 * Process inventory updates from structured output
 */
export function processInventoryUpdates(updates: InventoryUpdates, store: GameStore): string[] {
    const changes: string[] = [];

    if (updates.add) {
        updates.add.forEach(item => {
            store.addItem({
                id: `${Date.now()}-${Math.random()}`,
                name: item.name,
                description: item.description,
                quantity: item.quantity
            });
            changes.push(`Added ${item.quantity}x ${item.name}`);
        });
    }

    if (updates.remove) {
        updates.remove.forEach(update => {
            const currentInventory = store.character?.inventory || [];
            const item = currentInventory.find((i: any) => i.name.toLowerCase().replace(/\s+/g, '-') === update.slug || i.name === update.slug);

            if (item) {
                const newQuantity = item.quantity + update.quantityChange; // quantityChange is negative for removal
                if (newQuantity <= 0) {
                    store.removeItem(item.id);
                    changes.push(`Removed ${item.name}`);
                } else {
                    const newInventory = store.character.inventory.map((i: any) =>
                        i.id === item.id ? { ...i, quantity: newQuantity } : i
                    );
                    store.updateCharacter({ inventory: newInventory });
                    changes.push(`Removed ${Math.abs(update.quantityChange)}x ${item.name}`);
                }
            }
        });
    }

    return changes;
}

/**
 * Roll dice based on notation (e.g., "2d6+3")
 */
export function rollDice(notation: string): {
    rolls: number[];
    total: number;
    modifier: number;
} {
    const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) {
        throw new Error(`Invalid dice notation: ${notation}`);
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;
    const rolls = [];

    for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    return { rolls, total, modifier };
}
