/**
 * JSON schemas for LLM structured outputs
 * These schemas are used to enforce specific response formats from the LLM
 */

// Schema for GM chat responses
export const GM_RESPONSE_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'gm_response',
        schema: {
            type: 'object',
            properties: {
                narrative: {
                    type: 'string',
                    description: 'The narrative description of what happens next.'
                },
                actions: {
                    type: 'array',
                    description: '2-5 actions the player can take next.',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            diceRoll: { type: 'string', description: 'Dice notation if a roll is required (e.g. "2d6+3")' },
                            diceReason: { type: 'string', description: 'Reason for the dice roll' },
                            difficultyClass: { type: 'number', description: 'Difficulty Class (DC) for the check if applicable' }
                        },
                        required: ['id', 'description']
                    }
                },
                characterUpdates: {
                    type: 'object',
                    properties: {
                        hp: { type: 'number' }
                    }
                },
                inventoryUpdates: {
                    type: 'object',
                    properties: {
                        add: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    slug: { type: 'string' },
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    quantity: { type: 'number' }
                                },
                                required: ['slug', 'name', 'description', 'quantity']
                            }
                        },
                        remove: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    slug: { type: 'string' },
                                    quantityChange: { type: 'number' }
                                },
                                required: ['slug', 'quantityChange']
                            }
                        }
                    }
                }
            },
            required: ['narrative', 'actions']
        }
    }
} as const;

// Schema for character details generation
export const CHARACTER_DETAILS_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'character_details',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'A fitting character name' },
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
                    required: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
                    additionalProperties: false
                },
                backstory: { type: 'string', description: 'A compelling backstory (2-3 sentences)' }
            },
            required: ['name', 'stats', 'backstory'],
            additionalProperties: false
        }
    }
} as const;

// Schema for name generation
export const NAME_GENERATION_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'character_name',
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'A creative and fitting fantasy name' }
            },
            required: ['name'],
            additionalProperties: false
        }
    }
} as const;

// Schema for world generation
export const WORLD_GENERATION_SCHEMA = {
    type: 'json_schema',
    json_schema: {
        name: 'world_generation',
        schema: {
            type: 'object',
            properties: {
                inventory: {
                    type: 'array',
                    description: 'Starting inventory (3-5 items)',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            quantity: { type: 'number' }
                        },
                        required: ['name', 'description', 'quantity'],
                        additionalProperties: false
                    }
                },
                setting: {
                    type: 'string',
                    description: 'A paragraph with concise setting description'
                }
            },
            required: ['inventory', 'setting'],
            additionalProperties: false
        }
    }
} as const;
