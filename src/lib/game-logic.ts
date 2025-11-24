import { GameStore } from '@/lib/store';

/**
 * Process tool calls from the GM and update the game state
 */
export function processToolCalls(toolCalls: any[], store: GameStore) {
    if (!toolCalls) return;

    for (const toolCall of toolCalls) {
        if (toolCall.name === 'update_inventory' && toolCall.result.success) {
            // Process each item in the results array
            if (toolCall.result.results && Array.isArray(toolCall.result.results)) {
                console.log('Processing batch inventory update:', toolCall.result.results);
                for (const itemResult of toolCall.result.results) {
                    processInventoryItem(itemResult, store);
                }
            } else if (toolCall.result.item) {
                // Legacy fallback for single item
                console.log('Processing legacy inventory update:', toolCall.result.item);
                processInventoryItem({ action: 'added', item: toolCall.result.item }, store);
            }
        } else if (toolCall.name === 'update_character' && toolCall.result.success) {
            console.log('Processing character update:', toolCall.result.updates);
            store.updateCharacter(toolCall.result.updates);
        }
    }
}

function processInventoryItem(itemResult: any, store: GameStore) {
    if (itemResult.action === 'added') {
        store.addItem(itemResult.item);
    } else if (itemResult.action === 'removed') {
        // Use removeItem action which handles state correctly
        if (store.removeItem) {
            const currentInventory = store.character.inventory;
            const itemToRemove = currentInventory.find(i => i.name === itemResult.itemName);
            if (itemToRemove) {
                store.removeItem(itemToRemove.id);
            }
        } else {
            const currentInventory = store.character.inventory;
            store.updateCharacter({
                inventory: currentInventory.filter(i => i.name !== itemResult.itemName)
            });
        }
    }
}

