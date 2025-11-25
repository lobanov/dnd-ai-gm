# GM Protocol Specification

This document describes the interaction protocol between the frontend (UI/React) and the backend (LLM/API) in the D&D AI Game Master application, with a focus on how tool calls and chat history are managed.

---

## Overview

The application uses a **conversational loop** where:
1. User sends a message
2. Backend processes it with LLM
3. LLM may request tool calls (dice rolls, inventory updates, etc.)
4. Frontend executes tools and sends results back
5. Loop continues until LLM provides a final response (no more tool calls)

---

## Message Types

### Frontend → Backend

The frontend sends an array of messages to `/api/chat`:

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | GameToolResult;
  toolCallId?: string;        // Only for tool messages
  toolCalls?: ToolCall[];     // Only for assistant messages
}
```

**Message Roles**:
- `user`: Player input (e.g., "I search the room")
- `assistant`: Previous LLM responses (for context)
- `system`: System prompts (e.g., initial adventure prompt)
- `tool`: Results from tool executions

### Backend → Frontend

The backend returns:

```typescript
interface LLMResponse {
  message: AssistantMessage;
}

interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  toolCalls?: Array<{
    id: string;
    tool: GameTool;
  }>;
}
```

---

## Chat History Management

### Frontend State (useLLM hook)

**Location**: `src/lib/llm/use-llm.ts`

The `useLLM` hook maintains the **complete conversation history** in memory:

```typescript
const [messages, setMessages] = useState<Message[]>([]);
```

**Key Behaviors**:
1. **Optimistic Updates**: User messages are immediately added to history before sending
2. **Synchronous Ref**: `messagesRef.current` keeps the latest state for async callbacks
3. **Continuous Loop**: Automatically sends tool results back to LLM until conversation completes

**Message Flow**:
```
1. User input → Add to history
2. Send to backend → Get assistant response
3. Add assistant response to history
4. If toolCalls exist:
   a. Execute tools locally
   b. Add tool result messages to history
   c. Send updated history to backend (goto step 2)
5. If no toolCalls → Conversation complete
```

### Backend Processing

**Location**: `src/app/api/chat/route.ts`

The backend is **stateless** - it receives the full conversation history on each request.

**Translation Flow**:
1. **Receive agnostic messages** from frontend
2. **Translate to OpenAI format**:
   ```typescript
   // Tool messages require special handling
   if (msg.role === 'tool') {
     return {
       role: 'tool',
       tool_call_id: msg.toolCallId,
       content: JSON.stringify(msg.content)  // Serialize result
     };
   }
   ```
3. **Send to OpenAI** with tool definitions
4. **Translate response back** to agnostic format
5. **Return to frontend**

---

## Tool Call Protocol

### Tool Definitions

**Backend** (`src/app/api/chat/route.ts`): Defines tools for OpenAI:

```typescript
const OPENAI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'roll_dice',
      description: 'Roll dice for skill checks, attacks, damage...',
      parameters: {
        type: 'object',
        properties: {
          dice: { type: 'string', description: 'Dice notation (e.g., "1d20+5")' },
          reason: { type: 'string', description: 'Reason for the roll' }
        },
        required: ['dice', 'reason']
      }
    }
  },
  // ... other tools: add_inventory, update_inventory, update_character, get_character_stats
];
```

### Tool Execution Flow

#### 1. LLM Requests Tool Call

Backend receives LLM response with tool calls:
```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "roll_dice",
        "arguments": "{\"dice\":\"1d20+5\",\"reason\":\"Perception check\"}"
      }
    }
  ]
}
```

Backend translates to agnostic format and returns:
```typescript
{
  message: {
    role: 'assistant',
    content: null,
    toolCalls: [{
      id: 'call_abc123',
      tool: {
        name: 'roll_dice',
        args: { dice: '1d20+5', reason: 'Perception check' }
      }
    }]
  }
}
```

#### 2. Frontend Executes Tool

**Location**: `src/lib/llm/use-llm.ts` → `executeTool()`

The frontend executes the tool **locally** using the Zustand store:

```typescript
const executeTool = async (tool: GameTool, store: GameStore): Promise<GameToolResult> => {
  switch (tool.name) {
    case 'roll_dice': {
      // Parse dice notation
      const match = dice.match(/(\d+)d(\d+)([+-]\d+)?/);
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      const modifier = match[3] ? parseInt(match[3]) : 0;
      
      // Roll dice
      const rolls = [];
      for (let i = 0; i < count; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      const total = rolls.reduce((a, b) => a + b, 0) + modifier;
      
      return {
        dice, reason, rolls, modifier, total,
        description: `Rolled ${dice} for ${reason}: [${rolls.join(', ')}] + ${modifier} = ${total}`
      };
    }
    
    case 'add_inventory': {
      // Add items to Zustand store
      items.forEach(item => {
        store.addItem({
          id: `${Date.now()}-${Math.random()}`,
          name: item.name,
          description: item.description,
          quantity: item.quantity
        });
      });
      return { success: true, message: '...' };
    }
    
    // ... other tools
  }
};
```

**Why Local Execution?**
- **Immediate UI updates**: Character stats, inventory, HP change instantly
- **Deterministic**: No network latency or errors
- **Secure**: Server doesn't need write access to client state

#### 3. Frontend Sends Tool Results Back

After executing tools, frontend creates tool messages:

```typescript
const toolResults: Message[] = [];
for (const call of toolCalls) {
  const result = await executeTool(call.tool, store);
  toolResults.push({
    role: 'tool',
    toolCallId: call.id,
    content: result  // GameToolResult object
  });
}

// Add to history and send back to LLM
currentHistory = [...currentHistory, ...toolResults];
await client.sendMessage(currentHistory);
```

#### 4. Backend Sends Tool Results to LLM

Backend translates tool messages back to OpenAI format:

```typescript
if (msg.role === 'tool') {
  return {
    role: 'tool',
    tool_call_id: msg.toolCallId,
    content: JSON.stringify(msg.content)  // Serialize the result object
  };
}
```

LLM receives the tool results and continues the narrative:
```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "{\"dice\":\"1d20+5\",\"total\":18,\"description\":\"Rolled 1d20+5 for Perception check: [13] + 5 = 18\"}"
}
```

LLM then responds with narrative incorporating the roll result:
```
"You rolled an 18 for Perception! You notice a hidden door behind the tapestry..."
```

---

## Complete Conversation Example

### Initial User Message

**Frontend → Backend**:
```json
{
  "messages": [
    { "role": "system", "content": "You are a Game Master for D&D..." },
    { "role": "user", "content": "I search the room for traps" }
  ]
}
```

### First LLM Response (with tool call)

**Backend → Frontend**:
```json
{
  "message": {
    "role": "assistant",
    "content": null,
    "toolCalls": [{
      "id": "call_1",
      "tool": {
        "name": "roll_dice",
        "args": { "dice": "1d20+2", "reason": "Investigation check for traps" }
      }
    }]
  }
}
```

### Frontend Executes Tool

Frontend adds assistant message to history, executes tool, and prepares tool result:

**History State**:
```json
[
  { "role": "system", "content": "..." },
  { "role": "user", "content": "I search the room for traps" },
  { "role": "assistant", "content": null, "toolCalls": [...] },
  { 
    "role": "tool", 
    "toolCallId": "call_1",
    "content": {
      "dice": "1d20+2",
      "total": 15,
      "rolls": [13],
      "modifier": 2,
      "description": "Rolled 1d20+2 for Investigation check for traps: [13] + 2 = 15"
    }
  }
]
```

### Second Request with Tool Results

**Frontend → Backend** (sends updated history):
```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "I search the room for traps" },
    { "role": "assistant", "content": null, "toolCalls": [...] },
    { "role": "tool", "toolCallId": "call_1", "content": { ... } }
  ]
}
```

### Final LLM Response (no tool calls)

**Backend → Frontend**:
```json
{
  "message": {
    "role": "assistant",
    "content": "You rolled a 15 on your Investigation check. You carefully examine the room and discover a pressure plate near the doorway. It appears to trigger dart traps in the walls.",
    "toolCalls": undefined
  }
}
```

**Loop ends** because `toolCalls` is empty.

---

## UI State Synchronization

### Store Updates

**Location**: `src/lib/llm/use-llm.ts` → `executeTool()`

Tools directly mutate the Zustand store:

```typescript
// Example: update_character tool
case 'update_character': {
  if (hp !== undefined) {
    store.updateCharacter({ hp });  // Immediate store update
  }
  return { success: true, message: `HP -> ${hp}` };
}
```

### Display in Chat

**Location**: `src/components/chat/ChatMessage.tsx`

Tool calls are displayed in the chat UI:

```tsx
{msg.meta?.toolCalls?.map((toolCall, idx) => (
  <div className="tool-call-display">
    <span>🛠️ {toolCall.name}</span>
    {toolCall.result && (
      <>
        {toolCall.name === 'roll_dice' && (
          <div>🎲 {toolCall.result.description}</div>
        )}
        {toolCall.name === 'update_inventory' && (
          <div>📦 {toolCall.result.message}</div>
        )}
      </>
    )}
  </div>
))}
```

**Timing**:
1. Assistant message arrives → Tool call shown with "Executing..."
2. Tool executes → Store updates immediately
3. Tool result arrives → Tool call display updated with result
4. Next assistant message → Narrative incorporating tool result

---

## Error Handling

### Tool Execution Errors

If a tool fails:

```typescript
try {
  const result = await executeTool(call.tool, store);
  toolResults.push({ role: 'tool', toolCallId: call.id, content: result });
} catch (error) {
  // Send error back to LLM
  toolResults.push({
    role: 'tool',
    toolCallId: call.id,
    content: { success: false, message: `Error: ${error.message}` }
  });
}
```

LLM receives the error and can adjust narrative:
```
"You attempt to use the potion, but it has already been consumed."
```

### Network Errors

**Frontend**: `useLLM` hook calls `onError` callback:
```typescript
try {
  const response = await client.sendMessage(currentHistory);
} catch (error) {
  if (onError) onError(error);
}
```

**ChatInterface** displays error message:
```typescript
onError: (error) => {
  const errorMsg: DndMessage = {
    role: 'system',
    content: `Error: ${error.message}`,
    timestamp: Date.now(),
  };
  addMessage(errorMsg);
}
```

---

## Key Design Decisions

### 1. Stateless Backend
- **Pros**: Scalable, no session management, easy to debug
- **Cons**: Full history sent on each request (bandwidth)
- **Mitigation**: Messages are relatively small, compression could be added

### 2. Frontend Tool Execution
- **Pros**: Instant UI updates, deterministic results, reduced latency
- **Cons**: Client must implement all tool logic
- **Security**: OK because this is a single-player game with no PvP

### 3. Continuous Loop
- **Pros**: Handles multi-tool scenarios automatically
- **Cons**: Could loop infinitely if LLM misbehaves
- **Mitigation**: Could add max iteration limit (not currently implemented)

### 4. Agnostic Message Format
- **Pros**: Easy to switch LLM providers, clean separation
- **Cons**: Requires translation layer
- **Benefit**: Backend handles OpenAI specifics, frontend stays provider-agnostic

---

## Available Tools

| Tool | Purpose | Arguments | Returns |
|------|---------|-----------|---------|
| `roll_dice` | Dice rolls for checks, attacks, damage | `dice: string, reason: string` | `RollDiceResult` with rolls, total, description |
| `add_inventory` | Add new items | `items: Array<Item>` | `InventoryResult` with success status |
| `update_inventory` | Change item quantities | `updates: Array<{slug, quantityChange}>` | `InventoryResult` with changes |
| `update_character` | Modify HP, stats, level | `hp?, maxHp?, level?, stats?` | `CharacterUpdateResult` |
| `get_character_stats` | Retrieve current character data | (none) | `CharacterStatsResult` with full character |

---

## Future Improvements

1. **Message Compression**: Send only new messages instead of full history
2. **Tool Result Streaming**: Show tool execution progress in real-time
3. **Conversation Pruning**: Summarize old messages to reduce history size
4. **Retry Logic**: Automatic retry on transient network failures
5. **Tool Call Validation**: Validate tool arguments before execution
6. **Max Iteration Limit**: Prevent infinite tool call loops
