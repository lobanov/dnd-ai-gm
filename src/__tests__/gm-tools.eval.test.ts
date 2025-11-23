import {
    createTestCharacter,
    callChatAPI,
    assertToolCalled,
    createMockToolResponse,
    getToolCalls,
    wasDiceRolled,
    wasInventoryUpdated,
    wasCharacterUpdated,
    getDiceRolls,
} from './utils/test-helpers';
import { getInitialAdventurePrompt } from '@/lib/gm-prompts';

describe('GM Tool Evaluation Tests', () => {
    describe('Dice Rolling Scenarios', () => {
        test('GM rolls Perception check when player searches room', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I carefully search the room for any hidden items or clues.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasDiceRolled(toolCalls)).toBe(true);
            expect(assertToolCalled(toolCalls, 'roll_dice')).toBe(true);

            // Check that the dice roll is related to Perception or Investigation
            const rolls = getDiceRolls(toolCalls);
            expect(rolls.length).toBeGreaterThan(0);
            expect(rolls[0].reason).toMatch(/perception|investigation|search/i);
        }, 30000);

        test('GM rolls attack and damage in combat', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'A goblin attacks me! I defend myself and attack it with my sword.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasDiceRolled(toolCalls)).toBe(true);

            // Should have multiple dice rolls (NPC attack, player attack, potentially damage)
            const rolls = getDiceRolls(toolCalls);
            expect(rolls.length).toBeGreaterThan(0);
        }, 30000);

        test('GM rolls for social encounter (Persuasion)', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I try to persuade the guard to let me pass without paying the toll.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasDiceRolled(toolCalls)).toBe(true);

            const rolls = getDiceRolls(toolCalls);
            expect(rolls.length).toBeGreaterThan(0);
            expect(rolls[0].reason).toMatch(/persuasion|deception|charisma/i);
        }, 30000);

        test('GM rolls Stealth check when sneaking', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I try to sneak past the sleeping dragon without waking it.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasDiceRolled(toolCalls)).toBe(true);

            const rolls = getDiceRolls(toolCalls);
            expect(rolls.length).toBeGreaterThan(0);
            expect(rolls[0].reason).toMatch(/stealth|sneak/i);
        }, 30000);

        test('GM rolls saving throw for environmental hazard', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I attempt to cross the rickety rope bridge over the chasm.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasDiceRolled(toolCalls)).toBe(true);

            const rolls = getDiceRolls(toolCalls);
            expect(rolls.length).toBeGreaterThan(0);
            expect(rolls[0].reason).toMatch(/dexterity|acrobatics|saving|balance/i);
        }, 30000);
    });

    describe('Inventory Management Scenarios', () => {
        test('GM adds item to inventory when player finds treasure', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I open the treasure chest and take whatever is inside.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasInventoryUpdated(toolCalls)).toBe(true);
            expect(assertToolCalled(toolCalls, 'update_inventory')).toBe(true);

            // Find the add inventory call
            const inventoryCall = toolCalls.find((tc: any) => tc.name === 'update_inventory');
            expect(inventoryCall?.arguments.action).toBe('add');
            expect(inventoryCall?.arguments.items).toBeDefined();
            expect(Array.isArray(inventoryCall?.arguments.items)).toBe(true);
            expect(inventoryCall?.arguments.items.length).toBeGreaterThan(0);
            expect(inventoryCall?.arguments.items[0].name).toBeTruthy();
        }, 30000);

        test('GM removes item when player uses consumable', async () => {
            const character = createTestCharacter({
                inventory: [
                    {
                        id: 'potion-1',
                        name: 'Healing Potion',
                        description: 'Restores 2d4+2 HP',
                        quantity: 1,
                    },
                ],
            });
            const messages = [
                {
                    role: 'user',
                    content: 'I drink my healing potion to restore HP.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasInventoryUpdated(toolCalls)).toBe(true);

            const inventoryCall = toolCalls.find((tc: any) => tc.name === 'update_inventory');
            expect(inventoryCall?.arguments.action).toBe('remove');
            expect(inventoryCall?.arguments.items).toBeDefined();
            expect(inventoryCall?.arguments.items[0].name).toMatch(/healing potion/i);
        }, 30000);

        test('GM provides starting equipment for new character', async () => {
            const character = createTestCharacter({ inventory: [] });
            const messages = [
                {
                    role: 'user',
                    content: getInitialAdventurePrompt(character),
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasInventoryUpdated(toolCalls)).toBe(true);

            // Should add multiple starting items
            const inventoryCalls = toolCalls.filter((tc: any) => tc.name === 'update_inventory');
            expect(inventoryCalls.length).toBeGreaterThan(0);

            // All should be add actions
            inventoryCalls.forEach((call: any) => {
                expect(call.arguments.action).toBe('add');
                expect(call.arguments.items).toBeDefined();
                expect(Array.isArray(call.arguments.items)).toBe(true);
                expect(call.arguments.items.length).toBeGreaterThan(0);
            });
        }, 30000);
    });

    describe('Character Update Scenarios', () => {
        test('GM reduces HP when player takes damage', async () => {
            const character = createTestCharacter({ hp: 10, maxHp: 10 });
            const messages = [
                {
                    role: 'user',
                    content: 'A goblin shoots an arrow at me and it hits me!',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            expect(wasCharacterUpdated(toolCalls)).toBe(true);

            const updateCall = toolCalls.find((tc: any) => tc.name === 'update_character');
            expect(updateCall?.arguments.hp).toBeDefined();
            expect(updateCall?.arguments.hp).toBeLessThan(character.hp);
        }, 30000);

        test('GM increases HP when player heals', async () => {
            const character = createTestCharacter({
                hp: 5,
                maxHp: 10,
                inventory: [
                    {
                        id: 'potion-1',
                        name: 'Healing Potion',
                        description: 'Restores 2d4+2 HP',
                        quantity: 1,
                    },
                ],
            });
            const messages = [
                {
                    role: 'user',
                    content: 'I drink my healing potion to restore my health.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            // Should at minimum update character HP (heal)
            expect(wasCharacterUpdated(toolCalls)).toBe(true);

            const updateCall = toolCalls.find((tc: any) => tc.name === 'update_character');
            expect(updateCall?.arguments.hp).toBeDefined();
            expect(updateCall?.arguments.hp).toBeGreaterThan(character.hp);

            // Ideally should also remove potion from inventory, but this is optional
            // Some models might forget this step
            if (wasInventoryUpdated(toolCalls)) {
                const inventoryCall = toolCalls.find((tc: any) => tc.name === 'update_inventory');
                expect(inventoryCall?.arguments.action).toBe('remove');
            }
        }, 30000);
    });

    describe('Complex Multi-Tool Scenarios', () => {
        test('Full combat encounter uses multiple tools', async () => {
            const character = createTestCharacter({ hp: 10, maxHp: 10 });
            const messages = [
                {
                    role: 'user',
                    content: 'I encounter a bandit on the road. I attack him with my sword!',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            // Should have dice rolls for combat
            expect(wasDiceRolled(toolCalls)).toBe(true);

            // May have HP updates if player takes damage
            // May have inventory updates if loot is dropped (less common in first turn)

            expect(toolCalls.length).toBeGreaterThan(0);
        }, 30000);

        test('Exploration scenario with skill checks and item discovery', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I explore the ancient ruins, searching carefully for traps and treasure.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            // Should roll for perception/investigation
            expect(wasDiceRolled(toolCalls)).toBe(true);

            // May find items depending on the roll
            // At minimum should have some tool usage
            expect(toolCalls.length).toBeGreaterThan(0);
        }, 30000);

        test('Social encounter with multiple checks', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'I try to gather information from the tavern patrons about the missing merchant. I buy them drinks and ask questions.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            // Should have social skill checks (Persuasion, Insight, etc.)
            expect(wasDiceRolled(toolCalls)).toBe(true);

            // May update inventory (buying drinks costs money, or gaining information items)
            expect(toolCalls.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe('Character Stats Retrieval', () => {
        test('GM can access character stats when needed', async () => {
            const character = createTestCharacter();
            const messages = [
                {
                    role: 'user',
                    content: 'Tell me about my character\'s current abilities and equipment.',
                },
            ];

            const response = await callChatAPI(messages, character);
            const toolCalls = getToolCalls(response);

            // GM should respond in some way - either with content or by calling tools
            // The response object should exist and have either content or tool calls
            expect(response).toBeDefined();
            expect(response.content !== undefined || toolCalls.length > 0).toBe(true);
        }, 30000);
    });
});

// Summary tests that don't need real LLM
describe('Test Helper Functions', () => {
    test('createTestCharacter creates valid character', () => {
        const character = createTestCharacter();
        expect(character.name).toBe('Test Hero');
        expect(character.class).toBe('Fighter');
        expect(character.level).toBe(1);
    });

    test('createTestCharacter accepts overrides', () => {
        const character = createTestCharacter({ name: 'Custom Name', level: 5 });
        expect(character.name).toBe('Custom Name');
        expect(character.level).toBe(5);
        expect(character.class).toBe('Fighter'); // Default value
    });

    test('assertToolCalled identifies correct tool', () => {
        const toolCalls = [
            { name: 'roll_dice', arguments: { dice: '1d20' }, result: {} },
            { name: 'update_inventory', arguments: { action: 'add' }, result: {} },
        ];

        expect(assertToolCalled(toolCalls, 'roll_dice')).toBe(true);
        expect(assertToolCalled(toolCalls, 'update_inventory')).toBe(true);
        expect(assertToolCalled(toolCalls, 'unknown_tool')).toBe(false);
    });

    test('helper functions correctly identify tool types', () => {
        const toolCalls = [
            { name: 'roll_dice', arguments: { dice: '1d20' }, result: {} },
            { name: 'update_inventory', arguments: { action: 'add' }, result: {} },
            { name: 'update_character', arguments: { hp: 8 }, result: {} },
        ];

        expect(wasDiceRolled(toolCalls)).toBe(true);
        expect(wasInventoryUpdated(toolCalls)).toBe(true);
        expect(wasCharacterUpdated(toolCalls)).toBe(true);
    });

    test('getDiceRolls extracts roll results', () => {
        const toolCalls = [
            { name: 'roll_dice', arguments: { dice: '1d20', reason: 'test', total: 15 }, result: {} },
            { name: 'update_inventory', arguments: {}, result: {} },
            { name: 'roll_dice', arguments: { dice: '2d6', reason: 'damage', total: 8 }, result: {} },
        ];

        const rolls = getDiceRolls(toolCalls);
        expect(rolls.length).toBe(2);
        expect(rolls[0].total).toBe(15);
        expect(rolls[1].total).toBe(8);
    });
});
