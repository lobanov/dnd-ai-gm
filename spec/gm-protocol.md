# GM Protocol Specification

This document describes the interaction protocol between the frontend (UI/React) and the backend (LLM/API) in the D&D AI Game Master application.

**Current Architecture**: Two-Phase Generation (Narrative -> Actions) with Decoupled State
**Previous Architecture**: Single-Turn Structured Output (Deprecated)

---

## Overview

The application uses a **Two-Phase** protocol to ensure high-quality narrative and valid game actions:

1.  **Phase 1: Narrative Generation**
    -   The GM generates the story response in rich text (Markdown).
    -   The GM can use tools (e.g., `roll_dice`) *during* this phase if the story requires it (e.g., an enemy attacks).
    -   **Output**: Pure text (narrative).

2.  **Phase 2: Action Generation**
    -   The GM analyzes the generated narrative and the current state.
    -   The GM produces a structured list of valid actions the player can take next.
    -   **Output**: JSON (list of actions).

This split approach allows for:
-   **Rich Narrative**: The LLM isn't constrained by JSON schema for the story, allowing for better formatting and flow.
-   **Valid Actions**: Actions are generated in a dedicated step with strict schema enforcement.
-   **Decoupled State**: The UI history (what the player sees) is separate from the LLM history (context window), preventing context pollution.

---

## Message Types & State

We maintain two separate histories:

### 1. UI History (`UIMessage`)
What the player sees in the chat interface.
```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Markdown supported
  timestamp: number;
}
```

### 2. LLM History (`LLMMessage`)
The actual context sent to the LLM.
```typescript
interface LLMMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}
```

**Key Difference**:
-   **UI**: Shows "I attack the goblin" (User) -> "The goblin dodges..." (Assistant).
-   **LLM**: May contain tool calls and intermediate steps that are hidden from the UI to keep it clean.

---

## Interaction Flow

### 1. User Action
The user types a message or clicks an action.
-   **UI Update**: The action is immediately added to `UIMessage` history.
-   **LLM Update**: The action is added to `LLMMessage` history.

### 2. Phase 1: Narrative Generation
The backend sends the `LLMMessage` history to the LLM.

**System Prompt Instructions**:
-   "Do NOT describe what the player can do next."
-   "Only roll dice if the story requires it (e.g., opponent attack). For player actions, use the provided roll result to narrate the outcome."

**Process**:
1.  LLM generates text.
2.  **Tool Use**: If the LLM wants to roll dice (e.g., for an NPC), it calls `roll_dice`.
    -   Backend executes tool.
    -   Result is appended to `LLMMessage` history.
    -   LLM is called again with the tool result.
3.  **Completion**: LLM finishes the narrative.

**Result**:
-   The final narrative text is added to `UIMessage` history (displayed to user).
-   The final narrative text is added to `LLMMessage` history (context for next phase).

### 3. Phase 2: Action Generation
The backend asks the LLM to generate actions based on the new narrative.

**Input**:
-   Full `LLMMessage` history (including the just-generated narrative).

**Output Schema** (`GM_ACTIONS_SCHEMA`):
```json
{
  "actions": [
    {
      "id": "attack",
      "description": "Attack the goblin",
      "diceRoll": "1d20+5",
      "diceReason": "Attack Roll",
      "difficultyClass": 12
    }
  ]
}
```

**Result**:
-   The actions are sent to the UI to be rendered as buttons.
-   They are *not* permanently added to the history until the user selects one.

---

## State Management (Zustand)

The frontend store manages the two histories:

```typescript
interface GameStore {
  // ...
  chatHistory: UIMessage[];
  llmHistory: LLMMessage[];
  
  // Actions
  addUIMessage: (msg: UIMessage) => void;
  addLLMMessage: (msg: LLMMessage) => void;
}
```

### Resetting
When `resetGame` is called, both histories are cleared.

---

## Benefits

1.  **Better Storytelling**: Narrative is not constrained by JSON structure.
2.  **Clean UI**: Players don't see tool calls or JSON blobs.
3.  **Robust Context**: LLM sees exactly what happened (including tool results), while UI stays player-focused.
4.  **Valid Actions**: Dedicated step ensures actions always match the current situation.

