import { Character, Item, Stats } from '@/types/dnd';
import { calculateModifier } from '@/lib/dnd-rules';

export interface CharacterSelection {
    class: string;
    race: string;
    gender: string;
}

export interface GeneratedDetails {
    name: string;
    stats: Stats;
    backstory: string;
}

export interface GeneratedWorld {
    inventory: Array<{ name: string; description: string; quantity: number }>;
    setting: string;
}

/**
 * Calculates initial HP based on Constitution score.
 * Base HP is 10 + CON modifier.
 */
export function calculateInitialHp(conScore: number): number {
    const conMod = calculateModifier(conScore);
    return 10 + conMod;
}

/**
 * Converts raw inventory data into the application's Item format.
 * Assigns unique IDs to each item.
 */
export function normalizeInventory(rawInventory: Array<{ name: string; description: string; quantity: number }>): Item[] {
    return rawInventory.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
    }));
}

/**
 * Assembles a complete Character object from selection and generated data.
 */
export function createCharacter(
    selection: CharacterSelection,
    details: GeneratedDetails,
    world: GeneratedWorld
): Character {
    const hp = calculateInitialHp(details.stats.CON);
    const inventory = normalizeInventory(world.inventory);

    return {
        name: details.name,
        class: selection.class,
        race: selection.race,
        gender: selection.gender,
        level: 1,
        hp: hp,
        maxHp: hp,
        stats: details.stats,
        inventory: inventory,
        skills: [],
        backstory: details.backstory,
    };
}
