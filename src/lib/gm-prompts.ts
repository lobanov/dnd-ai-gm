import { Character } from '@/types/dnd';
import OpenAI from 'openai';

/**
 * Tool definitions for the GM agent
 */
export const GM_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_character_stats',
            description: 'Get the current character statistics, HP, inventory, and other details',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'roll_dice',
            description: 'Roll dice for skill checks, attacks, damage, or any other random events. Returns the individual rolls and total.',
            parameters: {
                type: 'object',
                properties: {
                    dice: {
                        type: 'string',
                        description: 'Dice notation (e.g., "1d20", "2d6+3", "1d20+5")'
                    },
                    reason: {
                        type: 'string',
                        description: 'The reason for the roll (e.g., "Perception check", "Goblin attack", "Fire damage")'
                    }
                },
                required: ['dice', 'reason']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_inventory',
            description: 'Add or remove items from the character inventory. Can add/remove multiple items at once.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['add', 'remove'],
                        description: 'Whether to add or remove items'
                    },
                    items: {
                        type: 'array',
                        description: 'Array of items to add or remove',
                        items: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Name of the item'
                                },
                                description: {
                                    type: 'string',
                                    description: 'Brief description of the item'
                                },
                                quantity: {
                                    type: 'number',
                                    description: 'Quantity of the item'
                                }
                            },
                            required: ['name', 'description', 'quantity']
                        }
                    }
                },
                required: ['action', 'items']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_character',
            description: 'Update character stats like HP, stats (STR, DEX, etc.), or level',
            parameters: {
                type: 'object',
                properties: {
                    hp: {
                        type: 'number',
                        description: 'New HP value (can be positive for healing or negative for damage)'
                    },
                    maxHp: {
                        type: 'number',
                        description: 'New maximum HP value'
                    },
                    level: {
                        type: 'number',
                        description: 'New level'
                    },
                    stats: {
                        type: 'object',
                        properties: {
                            STR: { type: 'number' },
                            DEX: { type: 'number' },
                            CON: { type: 'number' },
                            INT: { type: 'number' },
                            WIS: { type: 'number' },
                            CHA: { type: 'number' }
                        },
                        description: 'Updated stats object'
                    }
                }
            }
        }
    }
];

/**
 * Generate the system prompt for the GM
 */
export function getGMSystemPrompt(character: Character): string {
    return `You are an expert Dungeon Master for a D&D 5e game. 
Your goal is to provide an immersive, text-based roleplaying experience.

Rules:
1. Follow D&D 5e rules for checks and combat where possible in a narrative format.
2. Use the roll_dice tool when skill checks, attack rolls, or damage rolls are needed.
3. Use the update_character tool to modify HP when the player takes damage or heals.
4. Use the update_inventory tool to add items when the player finds loot or purchases items, and to remove items when they are used or sold.
5. Keep descriptions vivid but concise.
6. Manage the story, NPCs, and world state.
7. Do not break character unless explaining a rule.
8. YOU are responsible for rolling dice for NPCs and events using the roll_dice tool.

Available Tools:
- get_character_stats: Get current character information
- roll_dice: Roll dice for any checks, attacks, or damage
- update_inventory: Add or remove items from the character's inventory
- update_character: Modify HP, stats, or level

Current Character:
Name: ${character.name}
Race: ${character.race}
Class: ${character.class}
Level: ${character.level}
HP: ${character.hp}/${character.maxHp}`;
}

/**
 * Generate the initial adventure prompt when starting a new game
 */
export function getInitialAdventurePrompt(character: Character, setting?: string): string {
    const backstory = character.backstory || `A brave adventurer ready to face the unknown.`;
    const worldSetting = setting || `You find yourself in a typical fantasy realm, ready for adventure.`;

    return `The player is ${character.name}, a level ${character.level} ${character.race} ${character.class}.

Their backstory: ${backstory}

The world and current situation: ${worldSetting}

The player's starting inventory has already been set up. Please begin the adventure by:
1. Narrating their backstory as an introduction (in third person or dramatic style)
2. Describing the setting and their current situation (based on the world description above)
3. Welcoming the player into the story with "You find yourself..." or similar
4. Ending with "What do you do?"

Make it immersive and engaging, building on the backstory and setting provided above.`;
}

