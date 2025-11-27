import { calculateNewInventory, calculateNewCharacterState, rollDice } from '@/lib/game/engine';
import { Character, Item } from '@/types/dnd';

describe('Game Engine', () => {
    describe('calculateNewInventory', () => {
        const mockInventory: Item[] = [
            { id: '1', name: 'Potion', description: 'Heals 10 HP', quantity: 1 },
            { id: '2', name: 'Sword', description: 'Sharp', quantity: 1 }
        ];

        it('should add items correctly', () => {
            const updates = {
                add: [{ slug: 'shield', name: 'Shield', description: 'Protects', quantity: 1 }]
            };
            const { newInventory, logs } = calculateNewInventory(mockInventory, updates);

            expect(newInventory).toHaveLength(3);
            expect(newInventory.find(i => i.name === 'Shield')).toBeDefined();
            expect(logs).toContain('Added 1x Shield');
        });

        it('should remove items correctly', () => {
            const updates = {
                remove: [{ slug: 'potion', quantityChange: -1 }]
            };
            const { newInventory, logs } = calculateNewInventory(mockInventory, updates);

            expect(newInventory).toHaveLength(1);
            expect(newInventory.find(i => i.name === 'Potion')).toBeUndefined();
            expect(logs).toContain('Removed Potion');
        });

        it('should decrease quantity if not fully removed', () => {
            const multiInventory = [{ ...mockInventory[0], quantity: 5 }];
            const updates = {
                remove: [{ slug: 'potion', quantityChange: -2 }]
            };
            const { newInventory, logs } = calculateNewInventory(multiInventory, updates);

            expect(newInventory).toHaveLength(1);
            expect(newInventory[0].quantity).toBe(3);
            expect(logs).toContain('Removed 2x Potion');
        });
    });

    describe('calculateNewCharacterState', () => {
        const mockCharacter: Character = {
            name: 'Hero',
            class: 'Fighter',
            race: 'Human',
            gender: 'Male',
            level: 1,
            hp: 10,
            maxHp: 20,
            stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
            inventory: [],
            skills: [],
            backstory: ''
        };

        it('should update HP', () => {
            const updates = { hp: 15 };
            const { newCharacter, logs } = calculateNewCharacterState(mockCharacter, updates);

            expect(newCharacter.hp).toBe(15);
            expect(logs).toContain('HP -> 15');
        });
    });

    describe('rollDice', () => {
        it('should roll within range', () => {
            const { total, rolls } = rollDice('1d6');
            expect(total).toBeGreaterThanOrEqual(1);
            expect(total).toBeLessThanOrEqual(6);
            expect(rolls).toHaveLength(1);
        });

        it('should handle modifiers', () => {
            const { total, modifier } = rollDice('1d20+5');
            expect(modifier).toBe(5);
            expect(total).toBeGreaterThanOrEqual(6);
            expect(total).toBeLessThanOrEqual(25);
        });
    });
});
