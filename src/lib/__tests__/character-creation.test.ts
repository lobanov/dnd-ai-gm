import { calculateInitialHp, normalizeInventory, createCharacter, CharacterSelection, GeneratedDetails, GeneratedWorld } from '../character-creation';
import { Stats } from '@/types/dnd';

describe('Character Creation Logic', () => {
    describe('calculateInitialHp', () => {
        it('should calculate HP correctly for average CON', () => {
            expect(calculateInitialHp(10)).toBe(10); // 10 + 0
        });

        it('should calculate HP correctly for high CON', () => {
            expect(calculateInitialHp(14)).toBe(12); // 10 + 2
        });

        it('should calculate HP correctly for low CON', () => {
            expect(calculateInitialHp(8)).toBe(9); // 10 - 1
        });
    });

    describe('normalizeInventory', () => {
        it('should convert raw items to Item objects with IDs', () => {
            const rawInventory = [
                { name: 'Sword', description: 'Sharp', quantity: 1 },
                { name: 'Potion', description: 'Healing', quantity: 2 },
            ];

            const inventory = normalizeInventory(rawInventory);

            expect(inventory).toHaveLength(2);
            expect(inventory[0]).toMatchObject({
                name: 'Sword',
                description: 'Sharp',
                quantity: 1,
            });
            expect(inventory[0].id).toBeDefined();
            expect(inventory[1]).toMatchObject({
                name: 'Potion',
                description: 'Healing',
                quantity: 2,
            });
        });
    });

    describe('createCharacter', () => {
        const selection: CharacterSelection = {
            class: 'Fighter',
            race: 'Human',
            gender: 'Male',
        };

        const stats: Stats = {
            STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8
        };

        const details: GeneratedDetails = {
            name: 'Test Hero',
            stats: stats,
            backstory: 'A brave hero.',
        };

        const world: GeneratedWorld = {
            inventory: [{ name: 'Sword', description: 'Sharp', quantity: 1 }],
            setting: 'A dark dungeon.',
        };

        it('should create a complete character object', () => {
            const character = createCharacter(selection, details, world);

            expect(character).toMatchObject({
                name: 'Test Hero',
                class: 'Fighter',
                race: 'Human',
                gender: 'Male',
                level: 1,
                hp: 12, // 10 + 2 (CON 14)
                maxHp: 12,
                stats: stats,
                backstory: 'A brave hero.',
            });

            expect(character.inventory).toHaveLength(1);
            expect(character.inventory[0].name).toBe('Sword');
        });
    });
});
