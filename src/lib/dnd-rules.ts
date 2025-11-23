import { Stats, StatName } from '@/types/dnd';

export function calculateModifier(score: number): number {
    return Math.floor((score - 10) / 2);
}

export function rollDice(sides: number, count: number = 1): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
}

export function getStatModifier(stats: Stats, stat: StatName): number {
    return calculateModifier(stats[stat]);
}

export const INITIAL_STATS: Stats = {
    STR: 10,
    DEX: 10,
    CON: 10,
    INT: 10,
    WIS: 10,
    CHA: 10,
};

export const CLASS_PRESETS: Record<string, Stats> = {
    Fighter: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 },
    Wizard: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 },
    Rogue: { STR: 10, DEX: 16, CON: 12, INT: 12, WIS: 10, CHA: 14 },
    Cleric: { STR: 12, DEX: 10, CON: 14, INT: 10, WIS: 16, CHA: 12 },
};

export const INITIAL_CHARACTER = {
    name: 'Adventurer',
    class: 'Fighter',
    gender: 'Male',
    level: 1,
    hp: 10,
    maxHp: 10,
    stats: INITIAL_STATS,
    inventory: [],
    skills: [],
};
