import { useState, useCallback, useRef } from 'react';
import { Message, GameTool, GameToolResult, LLMClient, AssistantMessage } from './types';
import { useGameStore } from '@/lib/store';
import { Stats } from '@/types/dnd';

interface UseLLMProps {
    client: LLMClient;
    onMessageReceived?: (message: Message) => void;
    onError?: (error: Error) => void;
}

export function useLLM({ client, onMessageReceived, onError }: UseLLMProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesRef = useRef<Message[]>([]);

    // Sync ref with state to access latest messages in async callbacks
    messagesRef.current = messages;

    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    const sendMessage = async (content: string) => {
        setIsLoading(true);
        const userMsg: Message = { role: 'user', content };

        // Optimistic update
        const newHistory = [...messagesRef.current, userMsg];
        setMessages(newHistory);

        try {
            let currentHistory = newHistory;
            let keepGoing = true;

            while (keepGoing) {
                const response = await client.sendMessage(currentHistory);
                const assistantMsg = response.message;

                currentHistory = [...currentHistory, assistantMsg];
                setMessages(currentHistory);
                if (onMessageReceived) onMessageReceived(assistantMsg);

                if (assistantMsg.toolCalls && assistantMsg.toolCalls.length > 0) {
                    const toolResults = await processToolCalls(assistantMsg.toolCalls);
                    currentHistory = [...currentHistory, ...toolResults];
                    setMessages(currentHistory);

                    if (onMessageReceived) {
                        toolResults.forEach(result => onMessageReceived(result));
                    }
                    // Loop continues to send tool results back to LLM
                } else {
                    keepGoing = false;
                }
            }
        } catch (error: any) {
            console.error('Conversation error:', error);
            if (onError) onError(error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        sendMessage,
        isLoading,
        addMessage // Exposed to add initial system/welcome messages
    };
}

// Export for testing
export const executeTool = async (tool: GameTool, store: any): Promise<GameToolResult> => {
    switch (tool.name) {
        case 'roll_dice': {
            const { dice, reason } = tool.args;
            const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/);
            if (!match) {
                throw new Error('Invalid dice notation');
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

            return {
                dice,
                reason,
                rolls,
                modifier,
                total,
                description: `Rolled ${dice} for ${reason}: [${rolls.join(', ')}]${modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : ''} = ${total}`
            };
        }

        case 'add_inventory': {
            const { items } = tool.args;
            const results: string[] = [];

            items.forEach(item => {
                store.addItem({
                    id: `${Date.now()}-${Math.random()}`,
                    name: item.name,
                    description: item.description,
                    quantity: item.quantity
                });
                results.push(`${item.quantity}x ${item.name}`);
            });

            return {
                success: true,
                message: `Added ${results.join(', ')} to inventory`,
                items: results
            };
        }

        case 'update_inventory': {
            const { updates } = tool.args;
            const results: string[] = [];

            updates.forEach(update => {
                const currentInventory = store.character?.inventory || [];
                const item = currentInventory.find((i: any) => i.name.toLowerCase().replace(/\s+/g, '-') === update.slug || i.name === update.slug);

                if (item) {
                    if (update.quantityChange < 0) {
                        const newQuantity = item.quantity + update.quantityChange;
                        if (newQuantity <= 0) {
                            store.removeItem(item.id);
                            results.push(`Removed ${item.name}`);
                        } else {
                            const newInventory = store.character.inventory.map((i: any) =>
                                i.id === item.id ? { ...i, quantity: newQuantity } : i
                            );
                            store.updateCharacter({ inventory: newInventory });
                            results.push(`Removed ${Math.abs(update.quantityChange)}x ${item.name}`);
                        }
                    } else {
                        store.addItem({
                            ...item,
                            id: `${Date.now()}-${Math.random()}`,
                            quantity: update.quantityChange
                        });
                        results.push(`Added ${update.quantityChange}x ${item.name}`);
                    }
                } else {
                    results.push(`Item ${update.slug} not found`);
                }
            });

            return {
                success: true,
                message: results.join(', '),
                items: results
            };
        }

        case 'update_character': {
            const { hp, maxHp, level, stats } = tool.args;
            const changes: string[] = [];

            if (hp !== undefined) {
                store.updateCharacter({ hp });
                changes.push(`HP -> ${hp}`);
            }

            const currentChar = store.character;
            if (currentChar) {
                const updates: any = {};
                if (maxHp !== undefined) {
                    updates.maxHp = maxHp;
                    changes.push(`Max HP -> ${maxHp}`);
                }
                if (level !== undefined) {
                    updates.level = level;
                    changes.push(`Level -> ${level}`);
                }
                if (stats) {
                    updates.stats = { ...currentChar.stats, ...stats } as any;
                    changes.push(`Stats updated`);
                }

                if (Object.keys(updates).length > 0) {
                    store.setCharacter({ ...currentChar, ...updates });
                }
            }

            return {
                success: true,
                message: changes.length ? `Updated: ${changes.join(', ')}` : 'No changes',
                changes
            };
        }

        case 'get_character_stats': {
            const char = store.character;
            if (!char) throw new Error('No character found');

            return {
                name: char.name,
                class: char.class,
                level: char.level,
                hp: char.hp,
                maxHp: char.maxHp,
                stats: char.stats,
                inventory: char.inventory
            };
        }

        default:
            throw new Error(`Unknown tool: ${(tool as any).name}`);
    }
};

const processToolCalls = async (toolCalls: NonNullable<AssistantMessage['toolCalls']>) => {
    const toolResults: Message[] = [];
    const store = useGameStore.getState();

    for (const call of toolCalls) {
        try {
            const result = await executeTool(call.tool, store);
            toolResults.push({
                role: 'tool',
                toolCallId: call.id,
                content: result
            });
        } catch (error: any) {
            console.error(`Error executing tool ${call.tool.name}:`, error);
            toolResults.push({
                role: 'tool',
                toolCallId: call.id,
                content: {
                    success: false,
                    message: `Error: ${error.message}`,
                } as any
            });
        }
    }

    return toolResults;
};
