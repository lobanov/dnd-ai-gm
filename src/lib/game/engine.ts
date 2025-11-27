import { Character, Item, Stats } from '@/types/dnd';
import { InventoryUpdates, CharacterUpdates } from '@/lib/llm/types';

/**
 * Pure function to calculate the new inventory state based on updates.
 */
export function calculateNewInventory(
    currentInventory: Item[],
    updates: InventoryUpdates
): { newInventory: Item[]; logs: string[] } {
    let newInventory = [...currentInventory];
    const logs: string[] = [];

    // Handle additions
    if (updates.add) {
        updates.add.forEach(item => {
            newInventory.push({
                id: `${Date.now()}-${Math.random()}`,
                name: item.name,
                description: item.description,
                quantity: item.quantity
            });
            logs.push(`Added ${item.quantity}x ${item.name}`);
        });
    }

    // Handle removals
    if (updates.remove) {
        updates.remove.forEach(update => {
            const itemIndex = newInventory.findIndex(
                (i) => i.name.toLowerCase().replace(/\s+/g, '-') === update.slug || i.name === update.slug
            );

            if (itemIndex !== -1) {
                const item = newInventory[itemIndex];
                const newQuantity = item.quantity + update.quantityChange; // quantityChange is negative

                if (newQuantity <= 0) {
                    newInventory = newInventory.filter((_, idx) => idx !== itemIndex);
                    logs.push(`Removed ${item.name}`);
                } else {
                    newInventory = newInventory.map((i, idx) =>
                        idx === itemIndex ? { ...i, quantity: newQuantity } : i
                    );
                    logs.push(`Removed ${Math.abs(update.quantityChange)}x ${item.name}`);
                }
            }
        });
    }

    return { newInventory, logs };
}

/**
 * Pure function to calculate new character state based on updates.
 */
export function calculateNewCharacterState(
    character: Character,
    updates: CharacterUpdates
): { newCharacter: Character; logs: string[] } {
    let newCharacter = { ...character };
    const logs: string[] = [];

    if (updates.hp !== undefined) {
        newCharacter.hp = updates.hp;
        logs.push(`HP -> ${updates.hp}`);
    }

    // Add other character updates here as needed (e.g. stats, level, etc.)

    return { newCharacter, logs };
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
