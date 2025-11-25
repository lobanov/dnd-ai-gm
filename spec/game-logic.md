# Game Logic Specification

This document describes the core game logic components extracted from the React components to ensure better testability and separation of concerns.

## 1. Character Creation Logic
**Location**: `src/lib/character-creation.ts`

This module handles the business logic for creating a new character, including:
- **HP Calculation**: Calculating initial Hit Points based on Constitution modifier.
- **Inventory Normalization**: Converting raw inventory data from the generator into the application's `Item` format with unique IDs.
- **Character Assembly**: Combining user selections (Class, Race, Gender) with generated details (Stats, Backstory) and world data to form a complete `Character` object.

### Functions:
- `calculateInitialHp(conScore: number): number`
- `normalizeInventory(rawInventory: any[]): Item[]`
- `createCharacter(details: GeneratedDetails, world: GeneratedWorld, selection: CharacterSelection): Character`

## 2. D&D Rules
**Location**: `src/lib/dnd-rules.ts`

Contains pure functions for D&D 5e rules.
- **Stat Modifiers**: Calculating modifiers from ability scores.
- **Dice Rolling**: Simulating dice rolls.

### Functions:
- `calculateModifier(score: number): number`
- `rollDice(sides: number, count: number): number`

## 3. Game State Management
**Location**: `src/lib/store.ts` (Zustand Store)

Manages the global application state.
- **Actions**: `startGame`, `updateCharacter`, `addItem`, `removeItem`, etc.

## 4. Tool Processing
**Location**: `src/lib/game-logic.ts`

Handles the processing of tool calls from the LLM (Game Master).
- **Inventory Updates**: Parsing `update_inventory` calls.
- **Character Updates**: Parsing `update_character` calls.

### Functions:
- `processToolCalls(toolCalls: any[], store: GameStore): void`

## 5. Chat Logic
**Location**: `src/lib/chat-logic.ts`

Handles the conversion and management of chat messages between the LLM format and the application's internal format.
- **Message Conversion**: Converting `LLMMessage` to `DndMessage`.
- **Tool Result Updates**: Finding and updating the correct message in history when a tool result is received.

### Functions:
- `convertLlmMessageToDndMessage(message: LLMMessage): DndMessage`
- `updateMessageWithToolResult(chatHistory: DndMessage[], toolCallId: string, resultContent: any): { message: DndMessage; index: number } | null`

