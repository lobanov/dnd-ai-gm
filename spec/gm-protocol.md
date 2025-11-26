# GM Protocol Specification

This document describes the interaction protocol between the frontend (UI/React) and the backend (LLM/API) in the D&D AI Game Master application.

**Current Architecture**: Structured Output (JSON Mode)
**Previous Architecture**: Tool Calling Loop (Deprecated)

---

## Overview

The application uses a **Structured Output** protocol where:
1.  **User sends a message** (or selects an action).
2.  **Backend generates a single structured response** containing:
    -   Narrative text
    -   Available next actions
    -   State updates (HP, Inventory)
3.  **Frontend applies updates immediately** and displays the narrative.

Unlike the previous tool-calling loop, this approach is **single-turn**: the LLM decides everything (narrative, outcomes, state changes) in one pass, ensuring consistency and reducing latency.

---

## Message Types

### Frontend → Backend

The frontend sends the conversation history and current character context to `/api/chat`:

```typescript
interface ChatRequest {
  messages: Message[];
  character: Character; // Full character state for context
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

**Context Management**:
-   **Narrative Focus**: The message history sent to the LLM should primarily contain the narrative flow.
-   **Action Stripping**: Previous structured actions (the buttons the user clicked) are generally *not* included in the history as raw JSON. Instead, the user's *selection* is recorded as a user message (e.g., "I search the room").

### Backend → Frontend

The backend returns a structured response derived from the LLM's JSON output:

```typescript
interface LLMResponse {
  message: AssistantMessage;
}

interface AssistantMessage {
  role: 'assistant';
  content: string; // The main narrative
  
  // Structured Data
  actions: GameAction[];
  characterUpdates?: CharacterUpdates;
  inventoryUpdates?: InventoryUpdates;
}

interface GameAction {
  id: string;
  description: string;
  diceRoll?: string;   // e.g., "1d20+5"
  diceReason?: string; // e.g., "Investigation check"
  difficultyClass?: number; // DC for the check
}
```

---

## Structured Response Protocol

### JSON Schema

The backend enforces a strict JSON schema on the LLM using OpenAI's `response_format`. This ensures the LLM *always* returns valid data for the game engine.

**Schema Definition** (`src/app/api/chat/route.ts`):

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "gm_response",
    "schema": {
      "type": "object",
      "properties": {
        "narrative": { "type": "string" },
        "actions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "description": { "type": "string" },
              "diceRoll": { "type": "string" },
              "diceReason": { "type": "string" },
              "difficultyClass": { "type": "number" }
            },
            "required": ["id", "description"]
          }
        },
        "characterUpdates": {
          "type": "object",
          "properties": {
            "hp": { "type": "number" }
          }
        },
        "inventoryUpdates": {
          "type": "object",
          "properties": {
            "add": { "type": "array", "items": { ... } },
            "remove": { "type": "array", "items": { ... } }
          }
        }
      },
      "required": ["narrative", "actions"]
    }
  }
}
```

### System Prompt

The system prompt (`src/lib/gm-prompts.ts`) instructs the GM to:
1.  Act as an expert Dungeon Master.
2.  Manage rules, story, and world state.
3.  **Determine outcomes internally**: Instead of asking the frontend to roll dice, the GM decides if a roll is needed for *future* actions, or narrates the result of *past* actions based on the user's input.
4.  **Specify Difficulty**: For actions requiring rolls, the GM must provide the Difficulty Class (DC).
5.  Output strictly in the defined JSON format.

---

## Interaction Flow

### 1. User Action
The user types a message ("I kick down the door") or clicks a pre-defined action button.
**Note**: When a user clicks an action button, the frontend sends the **full description** of the action (e.g., "I search the room for traps") as the user message, not just the ID. This ensures the LLM has the full context of what was attempted.

### 2. Backend Processing
The backend:
1.  Injects the **System Prompt**.
2.  Injects the **Character Context** (stats, inventory) so the GM knows what the player has.
3.  Sends the **Conversation History**.
4.  Requests a **JSON completion** from the LLM.

### 3. LLM Decision
The LLM processes the input and decides:
-   **Narrative**: "You kick the door with all your might..."
-   **Consequences**: Did the door break? Did the player take damage?
-   **Next Options**: What can the player do now? (Enter room, Listen, etc.)

It constructs the JSON object:
```json
{
  "narrative": "The door splinters and crashes open! You take 1 point of bruising damage from the impact.",
  "characterUpdates": { "hp": 14 },
  "actions": [
    { "id": "enter", "description": "Enter the room" },
    { "id": "listen", "description": "Listen for enemies", "diceRoll": "1d20+2", "diceReason": "Perception", "difficultyClass": 15 }
  ]
}
```

### 4. Frontend Execution
The frontend receives the response and:
1.  **Updates State**: Applies `characterUpdates` (HP) and `inventoryUpdates` immediately to the Zustand store.
2.  **Displays Narrative**: Shows the text in the chat window.
3.  **Presents Actions**: Renders the `actions` as clickable buttons for the user.

---

## State Management

### Backend (Stateless)
The backend remains stateless. It relies on the frontend to provide the full `messages` history and the current `character` state with every request.

### Frontend (Zustand)
The frontend is the "source of truth" for the game state.
-   **Character Store**: Holds HP, stats, inventory. Updated by `characterUpdates` / `inventoryUpdates`.
-   **Chat Store**: Holds the message history. Updated by `narrative`.
-   **Action State**: Holds the list of currently available actions.

---

## Key Benefits of New Protocol

1.  **Reliability**: JSON Schema guarantees the UI always has valid actions to render.
2.  **Simplicity**: Removes the complex recursive loop of tool calls.
3.  **Context Awareness**: The GM always has the latest character state injected into the prompt, preventing hallucinations about inventory or HP.
4.  **Atomic Updates**: Narrative and state changes happen together, preventing desync (e.g., text says "you found a sword" but inventory didn't update).
