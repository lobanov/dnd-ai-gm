# Game Loop Architecture

This document describes how the UI interacts with the game engine and LLM APIs in the D&D AI Game Master application.

## Overview

The application follows a clean architecture pattern with clear separation of concerns:

```
UI Layer (ChatInterface.tsx)
    ↓
Orchestration Layer (use-llm.ts)
    ↓
Service Layer (chat-service.ts) + Engine Layer (engine.ts)
    ↓
LLM Client Layer (client.ts)
```

## Component Responsibilities

### 1. UI Layer: ChatInterface.tsx

**Responsibilities:**
- Render chat messages and actions
- Handle user input
- Manage UI state (input field, loading indicators)
- Delegate game logic to hooks

**Key Actions:**
- User sends message → calls `sendMessage(content)`
- User selects action → calls `sendMessage(actionText + diceRoll)`
- User clicks retry → removes error, resends original message

### 2. Orchestration Layer: use-llm.ts

**Responsibilities:**
- Orchestrate the message flow between UI, game engine, and LLM
- Manage loading state
- Handle errors
- Coordinate state updates

**Message Flow:**
1. Receives user input from UI
2. Adds user message to chat history (UI + LLM)
3. Calls LLM client with current history
4. Processes LLM response through `ChatService`
5. Updates game state via store
6. Adds response messages to UI

```typescript
async sendMessage(content: string) {
    // 1. Add user message to history
    addUIMessage(userUIMsg);
    addLLMMessage(userLLMMsg);
    
    // 2. Call LLM
    const response = await client.sendMessage(llmHistory, character);
    
    // 3. Update LLM history with tool calls
    setLLMHistory([...currentLLMHistory, ...response.llmHistoryUpdates]);
    
    // 4. Process dice rolls from history
    const diceMessages = ChatService.processHistoryUpdates(response.llmHistoryUpdates);
    diceMessages.forEach(msg => addUIMessage(msg));
    
    // 5. Process narrative/actions/state updates
    const { uiMessages, characterUpdates, actions } = 
        ChatService.processAssistantMessage(response.message, character);
    
    // 6. Apply updates to store
    uiMessages.forEach(msg => addUIMessage(msg));
    updateCharacter(characterUpdates);
    setCurrentActions(actions);
}
```

### 3. Service Layer: chat-service.ts

**Responsibilities:**
- Transform LLM responses into game state updates
- Generate UI messages from LLM data
- Process tool calls (dice rolls)
- Delegate pure calculations to engine

**Key Methods:**

#### processAssistantMessage()
Processes a single LLM assistant message and returns UI updates and state changes.

```typescript
static processAssistantMessage(message: AssistantMessage, currentCharacter: Character) {
    // 1. Extract narrative -> create UI message
    // 2. Process HP updates -> call engine.calculateNewCharacterState()
    // 3. Process inventory updates -> call engine.calculateNewInventory()
    // 4. Return { uiMessages, characterUpdates, actions }
}
```

#### processHistoryUpdates()
Extracts tool call results (dice rolls) from LLM message history for UI display.

```typescript
static processHistoryUpdates(messages: LLMMessage[]) {
    // Find assistant messages with tool_calls
    // Find matching tool result messages
    // Generate UI messages for dice rolls
    // Return uiMessages array
}
```

### 4. Engine Layer: engine.ts

**Responsibilities:**
- Pure game logic calculations
- No side effects
- No external dependencies
- Fully testable

**Functions:**

#### calculateNewInventory()
```typescript
function calculateNewInventory(
    currentInventory: Item[],
    updates: InventoryUpdates
): { newInventory: Item[]; logs: string[] }
```
- Handles item additions and removals
- Updates quantities
- Generates log messages
- Returns new inventory state immutably

#### calculateNewCharacterState()
```typescript
function calculateNewCharacterState(
    character: Character,
    updates: CharacterUpdates
): { newCharacter: Character; logs: string[] }
```
- Applies HP changes
- Handles other character stat updates
- Generates log messages
- Returns new character state immutably

#### rollDice()
```typescript
function rollDice(notation: string): { rolls: number[]; total: number; modifier: number }
```
- Parses dice notation (e.g., "2d6+3")
- Performs random rolls
- Calculates total with modifiers
- Returns detailed roll information

### 5. LLM Client Layer: client.ts

**Responsibilities:**
- Execute 2-phase LLM protocol
- Handle tool calls during narrative generation
- Manage OpenAI API communication

**Two-Phase Protocol:**

**Phase 1: Narrative Generation**
```typescript
// Generate narrative with tool support
const narrativeCompletion = await openai.chat.completions.create({
    model,
    messages: narrativeMessages,
    tools: [roll_dice, update_hp, update_inventory],
    tool_choice: 'auto'
});

// Execute tools in a loop until narrative is complete
while (!finishedNarrative) {
    if (hasToolCalls) {
        // Execute tool, add result to history
        // Continue loop
    } else {
        narrative = content;
        finishedNarrative = true;
    }
}
```

**Phase 2: Action Generation**
```typescript
// Generate player actions based on narrative
const actionCompletion = await openai.chat.completions.create({
    model,
    messages: [...history, narrativeMessage],
    response_format: GM_ACTIONS_SCHEMA // Structured output
});
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User types message in ChatInterface                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ useLLM.sendMessage()                                             │
│ - Add user message to UI + LLM history                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ HttpLLMClient.sendMessage()                                      │
│ Phase 1: Generate narrative (with tool calls)                    │
│ Phase 2: Generate actions (structured output)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Returns: { message: AssistantMessage, llmHistoryUpdates }        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ChatService.processHistoryUpdates()                              │
│ - Extract dice roll results from tool calls                      │
│ - Generate "🎲 GM Rolled 1d20: 15" messages                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ChatService.processAssistantMessage()                            │
│ - Extract narrative → UI message                                 │
│ - HP updates → engine.calculateNewCharacterState()               │
│ - Inventory updates → engine.calculateNewInventory()             │
│ - Actions → return as-is                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ useLLM applies updates                                           │
│ - Add UI messages to chat                                        │
│ - Update character state in store                                │
│ - Set current actions for player                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ UI re-renders with new messages and actions                      │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

The application uses Zustand for state management with two separate histories:

- **UI History** (`chatHistory`): Messages displayed in the chat interface
- **LLM History** (`llmHistory`): Full conversation context including tool calls

This separation allows:
- Clean UI without technical tool call details
- Complete LLM context for better responses
- Easier testing and debugging

## Key Design Principles

1. **Pure Functions**: All game logic in `engine.ts` is pure and testable
2. **Single Responsibility**: Each layer has a clear, focused purpose
3. **Immutability**: State updates return new objects, never mutate
4. **Separation of Concerns**: UI, orchestration, business logic, and API are decoupled
5. **Testability**: Pure functions and dependency injection enable comprehensive testing
