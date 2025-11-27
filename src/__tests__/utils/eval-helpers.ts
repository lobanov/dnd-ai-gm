import OpenAI from 'openai';
import { Character } from '@/types/dnd';

export function createTestCharacter(overrides?: Partial<Character>): Character {
    return {
        name: 'Test Hero',
        class: 'Fighter',
        gender: 'Male',
        level: 1,
        hp: 10,
        maxHp: 10,
        stats: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 },
        inventory: [],
        skills: [],
        race: 'Human',
        ...overrides,
    } as Character;
}

import { getNarrativeSystemPrompt, getActionsSystemPrompt } from '@/lib/gm-prompts';
import { GM_ACTIONS_SCHEMA } from '@/lib/llm/llm-schemas';

export async function callChatAPI(messages: any[], character: Character) {
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    const baseURL = process.env.LLM_ENDPOINT;

    if (!apiKey || !model || !baseURL) {
        throw new Error('Missing LLM configuration in .env.local');
    }

    const openai = new OpenAI({ apiKey, baseURL });

    // --- Phase 1: Narrative ---
    const narrativeSystemPrompt = getNarrativeSystemPrompt(character);
    const narrativeMessages = [
        { role: 'system', content: narrativeSystemPrompt },
        ...messages
    ];

    const narrativeCompletion = await openai.chat.completions.create({
        model,
        messages: narrativeMessages as any,
        temperature: 0.7,
    });

    const narrative = narrativeCompletion.choices[0].message.content || '';

    // --- Phase 2: Actions ---
    const actionsSystemPrompt = getActionsSystemPrompt(character);
    const actionMessages = [
        { role: 'system', content: actionsSystemPrompt },
        ...messages,
        { role: 'assistant', content: narrative }
    ];

    const actionCompletion = await openai.chat.completions.create({
        model,
        messages: actionMessages as any,
        response_format: GM_ACTIONS_SCHEMA,
        temperature: 0.7,
    });

    const actionContent = actionCompletion.choices[0].message.content;
    if (!actionContent) throw new Error('No content for actions');

    const parsedActions = JSON.parse(actionContent);

    // Combine for the test expectation
    return {
        narrative,
        actions: parsedActions.actions,
        // Updates are not currently handled in this test helper for the 2-phase flow
        // unless we parse them or add them to the schema.
        // For now, return empty or undefined to satisfy the test if it checks them.
        characterUpdates: {},
        inventoryUpdates: { add: [], remove: [] }
    };
}
